import type { InventoryItem, Order, OrderItem, OrderStatus, StockMovement } from "@/types";
import { ORDERS } from "@/mocks/orders";
import { STOCK_MOVEMENTS } from "@/mocks/stockMovements";
import { INVENTORY_ITEMS } from "@/mocks/inventoryItems";
import { PRODUCTS } from "@/mocks/products";
import { CATEGORIES } from "@/mocks/categories";
import { CUSTOMERS } from "@/mocks/customers";
import { TABLES } from "@/mocks/tables";
import { isoDateOffset } from "@/lib/filters";

/**
 * Pure aggregations over the mock stores — every report reads through here,
 * never the mocks directly, so swapping to real queries later only touches
 * this file. See docs/architecture-plan.md §07/§10.
 */

function closedOrders(): Order[] {
  return ORDERS.filter((order) => order.status === "closed");
}

// Voided items never count as revenue in any report — see §11.
function billableItems(order: Order): OrderItem[] {
  return order.items.filter((item) => item.status !== "voided");
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** `from`/`to` are inclusive ISO dates; empty means unbounded on that side. */
function inWindow(iso: string, from: string, to: string): boolean {
  const day = dayOf(iso);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export interface ReportRangeFilter {
  /** Used only when neither `from` nor `to` is set. */
  days?: number;
  from?: string;
  to?: string;
}

/** Every report accepts either a `days` preset or an explicit from/to — same shape the shared date-filter UI produces. */
function resolveReportRange(filter: ReportRangeFilter): { from: string; to: string } {
  if (filter.from || filter.to) return { from: filter.from ?? "", to: filter.to ?? "" };
  return { from: isoDateOffset((filter.days ?? 14) - 1), to: "" };
}

export interface SalesOverview {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  byDay: { date: string; revenue: number; orders: number }[];
  byMethod: { method: string; amount: number }[];
}

export async function getSalesOverview(filter: ReportRangeFilter = {}): Promise<SalesOverview> {
  const { from, to } = resolveReportRange(filter);
  const inRange = closedOrders().filter((order) => inWindow(order.openedAt, from, to));

  const byDayMap = new Map<string, { revenue: number; orders: number }>();
  const byMethodMap = new Map<string, number>();
  let totalRevenue = 0;

  for (const order of inRange) {
    const revenue = billableItems(order).reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    totalRevenue += revenue;

    const day = order.openedAt.slice(0, 10);
    const entry = byDayMap.get(day) ?? { revenue: 0, orders: 0 };
    entry.revenue += revenue;
    entry.orders += 1;
    byDayMap.set(day, entry);

    for (const payment of order.payments) {
      byMethodMap.set(payment.method, (byMethodMap.get(payment.method) ?? 0) + payment.amount);
    }
  }

  return {
    totalRevenue,
    orderCount: inRange.length,
    averageOrderValue: inRange.length ? totalRevenue / inRange.length : 0,
    byDay: [...byDayMap.entries()].map(([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
    byMethod: [...byMethodMap.entries()].map(([method, amount]) => ({ method, amount })),
  };
}

export interface ProductPerformanceRow {
  productId: string;
  name: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
}

export async function getProductPerformance(filter: ReportRangeFilter = {}): Promise<ProductPerformanceRow[]> {
  const { from, to } = resolveReportRange(filter);
  const totals = new Map<string, { unitsSold: number; revenue: number }>();
  for (const order of closedOrders().filter((order) => inWindow(order.openedAt, from, to))) {
    for (const item of billableItems(order)) {
      const entry = totals.get(item.productId) ?? { unitsSold: 0, revenue: 0 };
      entry.unitsSold += item.quantity;
      entry.revenue += item.priceSnapshot * item.quantity;
      totals.set(item.productId, entry);
    }
  }

  return [...totals.entries()]
    .map(([productId, value]) => {
      const product = PRODUCTS.find((entry) => entry.id === productId);
      const categoryName = CATEGORIES.find((category) => category.id === product?.categoryId)?.name ?? "Uncategorized";
      return { productId, name: product?.name ?? productId, categoryName, ...value };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface PeakHourRow {
  hour: number;
  orders: number;
}

export async function getPeakHours(filter: ReportRangeFilter = {}): Promise<PeakHourRow[]> {
  const { from, to } = resolveReportRange(filter);
  const counts = new Array(24).fill(0) as number[];
  for (const order of closedOrders().filter((order) => inWindow(order.openedAt, from, to))) {
    counts[new Date(order.openedAt).getHours()] += 1;
  }
  return counts.map((orders, hour) => ({ hour, orders }));
}

export interface MarginRow {
  productId: string;
  name: string;
  revenue: number;
  cost: number;
  marginAmount: number;
  marginPct: number;
}

export async function getMargins(filter: ReportRangeFilter = {}): Promise<{ rows: MarginRow[]; blendedMarginPct: number }> {
  const { from, to } = resolveReportRange(filter);
  const totals = new Map<string, { name: string; revenue: number; cost: number }>();
  for (const order of closedOrders().filter((order) => inWindow(order.openedAt, from, to))) {
    for (const item of billableItems(order)) {
      const product = PRODUCTS.find((entry) => entry.id === item.productId);
      const entry = totals.get(item.productId) ?? { name: item.nameSnapshot, revenue: 0, cost: 0 };
      entry.revenue += item.priceSnapshot * item.quantity;
      entry.cost += (product?.costPrice ?? 0) * item.quantity;
      totals.set(item.productId, entry);
    }
  }

  const rows = [...totals.entries()]
    .map(([productId, value]) => {
      const marginAmount = value.revenue - value.cost;
      const marginPct = value.revenue ? (marginAmount / value.revenue) * 100 : 0;
      return { productId, ...value, marginAmount, marginPct };
    })
    .sort((a, b) => b.marginAmount - a.marginAmount);

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const blendedMarginPct = totalRevenue ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return { rows, blendedMarginPct };
}

export interface TableTurnoverRow {
  tableId: string;
  label: string;
  orders: number;
  averageMinutes: number;
}

export async function getTableTurnover(
  filter: ReportRangeFilter = {}
): Promise<{ rows: TableTurnoverRow[]; overallAverageMinutes: number }> {
  const { from, to } = resolveReportRange(filter);
  const totals = new Map<string, number[]>();
  for (const order of closedOrders().filter((order) => inWindow(order.openedAt, from, to))) {
    if (!order.tableId || !order.closedAt) continue;
    const minutes = (new Date(order.closedAt).getTime() - new Date(order.openedAt).getTime()) / 60_000;
    totals.set(order.tableId, [...(totals.get(order.tableId) ?? []), minutes]);
  }

  const rows = [...totals.entries()]
    .map(([tableId, durations]) => ({
      tableId,
      label: TABLES.find((table) => table.id === tableId)?.label ?? tableId,
      orders: durations.length,
      averageMinutes: durations.reduce((sum, value) => sum + value, 0) / durations.length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const totalOrders = rows.reduce((sum, row) => sum + row.orders, 0);
  const overallAverageMinutes = totalOrders
    ? rows.reduce((sum, row) => sum + row.averageMinutes * row.orders, 0) / totalOrders
    : 0;

  return { rows, overallAverageMinutes };
}

export interface WastageRow {
  inventoryItemId: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export async function getWastage(
  filter: ReportRangeFilter = {}
): Promise<{ rows: WastageRow[]; totalCost: number; totalEvents: number; recent: StockMovement[] }> {
  const { from, to } = resolveReportRange(filter);
  const wasteMovements = STOCK_MOVEMENTS.filter(
    (movement) => movement.reason === "waste" && inWindow(movement.createdAt, from, to)
  );
  const totals = new Map<string, { quantity: number; cost: number }>();

  for (const movement of wasteMovements) {
    const item = INVENTORY_ITEMS.find((entry) => entry.id === movement.inventoryItemId);
    if (!item) continue;
    const quantity = Math.abs(movement.quantityDelta);
    const entry = totals.get(item.id) ?? { quantity: 0, cost: 0 };
    entry.quantity += quantity;
    entry.cost += quantity * item.costPerUnit;
    totals.set(item.id, entry);
  }

  const rows = [...totals.entries()]
    .map(([inventoryItemId, value]) => {
      const item = INVENTORY_ITEMS.find((entry) => entry.id === inventoryItemId);
      return { inventoryItemId, name: item?.name ?? inventoryItemId, unit: item?.unit ?? "", ...value };
    })
    .sort((a, b) => b.cost - a.cost);

  return {
    rows,
    totalCost: rows.reduce((sum, row) => sum + row.cost, 0),
    totalEvents: wasteMovements.length,
    recent: [...wasteMovements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  };
}

export interface RepeatCustomerRow {
  customerId: string;
  phone: string;
  visits: number;
  totalSpend: number;
  lastOrderAt: string;
}

export async function getRepeatCustomers(
  filter: ReportRangeFilter = {}
): Promise<{ rows: RepeatCustomerRow[]; repeatOrderShare: number }> {
  const { from, to } = resolveReportRange(filter);
  const totals = new Map<string, { visits: number; totalSpend: number; lastOrderAt: string }>();
  let ordersWithCustomer = 0;

  for (const order of closedOrders().filter((order) => inWindow(order.openedAt, from, to))) {
    if (!order.customerId) continue;
    ordersWithCustomer += 1;
    const revenue = billableItems(order).reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    const entry = totals.get(order.customerId) ?? { visits: 0, totalSpend: 0, lastOrderAt: order.openedAt };
    entry.visits += 1;
    entry.totalSpend += revenue;
    if (order.openedAt > entry.lastOrderAt) entry.lastOrderAt = order.openedAt;
    totals.set(order.customerId, entry);
  }

  const rows = [...totals.entries()]
    .map(([customerId, value]) => ({
      customerId,
      phone: CUSTOMERS.find((customer) => customer.id === customerId)?.phone ?? "—",
      ...value,
    }))
    .filter((row) => row.visits > 1)
    .sort((a, b) => b.visits - a.visits);

  const repeatOrders = rows.reduce((sum, row) => sum + row.visits, 0);

  return { rows, repeatOrderShare: ordersWithCustomer ? (repeatOrders / ordersWithCustomer) * 100 : 0 };
}

export interface ReportsOverview {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  lowStockCount: number;
  topProduct?: { name: string; revenue: number };
}

export async function getReportsOverview(filter: ReportRangeFilter = {}): Promise<ReportsOverview> {
  const [sales, products] = await Promise.all([getSalesOverview(filter), getProductPerformance(filter)]);
  return {
    totalRevenue: sales.totalRevenue,
    orderCount: sales.orderCount,
    averageOrderValue: sales.averageOrderValue,
    lowStockCount: INVENTORY_ITEMS.filter((item) => item.currentStock <= item.parLevel).length,
    topProduct: products[0] ? { name: products[0].name, revenue: products[0].revenue } : undefined,
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Dashboard (quick review) aggregations.

   Everything the dashboard shows funnels through getDashboardSummary() so one
   set of filters drives the KPIs, the charts, the watchlists and the recent
   orders table together. Filter values are plain strings — "all" (or an empty
   string) means "don't filter on this".
   ──────────────────────────────────────────────────────────────────────── */

export interface DashboardFilters {
  /** Inclusive ISO dates (YYYY-MM-DD). Empty means unbounded on that side. */
  from?: string;
  to?: string;
  /** Product category id, or "all" — filters item-level revenue. */
  categoryId?: string;
  /** Payment method, or "all" — keeps only orders settled (partly) that way. */
  method?: string;
  /** Order status, or "all". */
  status?: string;
  /** Table id, or "all". */
  tableId?: string;
}

export interface SalesTotals {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface DashboardSummary {
  current: SalesTotals & {
    byDay: { date: string; revenue: number; orders: number }[];
    byMethod: { label: string; value: number }[];
    byCategory: { label: string; value: number }[];
    topProducts: { productId: string; name: string; unitsSold: number; revenue: number }[];
  };
  previous: SalesTotals;
  /** Percentage change vs the previous equal-length window; null when there's no baseline. */
  deltas: { revenue: number | null; orderCount: number | null; averageOrderValue: number | null };
  window: { from: string; to: string; previousFrom: string; previousTo: string; days: number };
  openOrderCount: number;
  lowStock: InventoryItem[];
  waste: { cost: number; events: number };
  tableStatus: { empty: number; occupied: number; needsBill: number };
  /** Live counts of every order, across all time, by status — not scoped to the window. */
  statusCounts: Record<OrderStatus, number>;
  productCount: number;
  customerCount: number;
}

/** Canonical order of the order-status lifecycle, used anywhere a status board is drawn. */
export const ORDER_STATUS_LIST: OrderStatus[] = ["open", "sent", "preparing", "ready", "served", "closed", "cancelled"];

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dayOf(date.toISOString());
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function orderMatches(order: Order, filters: DashboardFilters): boolean {
  if (filters.status && filters.status !== "all" && order.status !== filters.status) return false;
  if (filters.tableId && filters.tableId !== "all" && order.tableId !== filters.tableId) return false;
  if (filters.method && filters.method !== "all") {
    if (!order.payments.some((payment) => payment.method === filters.method)) return false;
  }
  return true;
}

function itemInScope(productId: string, filters: DashboardFilters): boolean {
  if (!filters.categoryId || filters.categoryId === "all") return true;
  return PRODUCTS.find((product) => product.id === productId)?.categoryId === filters.categoryId;
}

/** Billable revenue + a per-day rollup for one already-filtered order set. */
function totalsFor(orders: Order[], filters: DashboardFilters) {
  const byDay = new Map<string, { revenue: number; orders: number }>();
  let revenue = 0;

  for (const order of orders) {
    const items = billableItems(order).filter((item) => itemInScope(item.productId, filters));
    revenue += items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

    const day = dayOf(order.openedAt);
    const entry = byDay.get(day) ?? { revenue: 0, orders: 0 };
    entry.revenue += items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    entry.orders += 1;
    byDay.set(day, entry);
  }

  return {
    revenue,
    orderCount: orders.length,
    averageOrderValue: orders.length ? revenue / orders.length : 0,
    byDay,
  };
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardSummary(filters: DashboardFilters = {}): Promise<DashboardSummary> {
  const today = dayOf(new Date().toISOString());
  const to = filters.to || today;
  const from = filters.from || shiftDay(to, -13);
  const days = daysBetween(from, to);
  const previousTo = shiftDay(from, -1);
  const previousFrom = shiftDay(previousTo, -(days - 1));

  const closed = closedOrders();
  const currentOrders = closed.filter((order) => inWindow(order.openedAt, from, to) && orderMatches(order, filters));
  const previousOrders = closed.filter(
    (order) => inWindow(order.openedAt, previousFrom, previousTo) && orderMatches(order, filters)
  );

  const current = totalsFor(currentOrders, filters);
  const previous = totalsFor(previousOrders, filters);

  const byMethod = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const productTotals = new Map<string, { name: string; unitsSold: number; revenue: number }>();

  for (const order of currentOrders) {
    for (const payment of order.payments) {
      byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + payment.amount);
    }

    for (const item of billableItems(order)) {
      if (!itemInScope(item.productId, filters)) continue;

      const categoryId = PRODUCTS.find((product) => product.id === item.productId)?.categoryId;
      const categoryName = CATEGORIES.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
      const lineRevenue = item.priceSnapshot * item.quantity;

      byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + lineRevenue);

      const entry = productTotals.get(item.productId) ?? { name: item.nameSnapshot, unitsSold: 0, revenue: 0 };
      entry.unitsSold += item.quantity;
      entry.revenue += lineRevenue;
      productTotals.set(item.productId, entry);
    }
  }

  const wasteMovements = STOCK_MOVEMENTS.filter(
    (movement) => movement.reason === "waste" && inWindow(movement.createdAt, from, to)
  );
  const wasteCost = wasteMovements.reduce((sum, movement) => {
    const item = INVENTORY_ITEMS.find((entry) => entry.id === movement.inventoryItemId);
    return sum + Math.abs(movement.quantityDelta) * (item?.costPerUnit ?? 0);
  }, 0);

  return {
    current: {
      revenue: current.revenue,
      orderCount: current.orderCount,
      averageOrderValue: current.averageOrderValue,
      byDay: [...current.byDay.entries()]
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byMethod: [...byMethod.entries()].map(([label, value]) => ({ label, value })),
      byCategory: [...byCategory.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      topProducts: [...productTotals.entries()]
        .map(([productId, value]) => ({ productId, ...value }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    },
    previous,
    deltas: {
      revenue: percentChange(current.revenue, previous.revenue),
      orderCount: percentChange(current.orderCount, previous.orderCount),
      averageOrderValue: percentChange(current.averageOrderValue, previous.averageOrderValue),
    },
    window: { from, to, previousFrom, previousTo, days },
    openOrderCount: ORDERS.filter((order) => order.status !== "closed" && order.status !== "cancelled").length,
    lowStock: INVENTORY_ITEMS.filter((item) => item.currentStock <= item.parLevel),
    waste: { cost: wasteCost, events: wasteMovements.length },
    tableStatus: {
      empty: TABLES.filter((table) => table.status === "empty").length,
      occupied: TABLES.filter((table) => table.status === "occupied").length,
      needsBill: TABLES.filter((table) => table.status === "needs-bill").length,
    },
    statusCounts: ORDER_STATUS_LIST.reduce((acc, orderStatus) => {
      acc[orderStatus] = ORDERS.filter((order) => order.status === orderStatus).length;
      return acc;
    }, {} as Record<OrderStatus, number>),
    productCount: PRODUCTS.length,
    customerCount: CUSTOMERS.length,
  };
}

export interface RecentOrderRow {
  id: string;
  openedAt: string;
  status: Order["status"];
  source: Order["source"];
  tableLabel: string;
  itemCount: number;
  total: number;
  methods: string;
}

/** Newest first — the "what's happening right now" half of the dashboard. */
export async function getRecentOrders(filters: DashboardFilters = {}, limit = 25): Promise<RecentOrderRow[]> {
  return ORDERS.filter((order) => {
    if ((filters.from || filters.to) && !inWindow(order.openedAt, filters.from ?? "", filters.to ?? "")) return false;
    return orderMatches(order, filters);
  })
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, limit)
    .map((order) => {
      const items = billableItems(order);
      return {
        id: order.id,
        openedAt: order.openedAt,
        status: order.status,
        source: order.source,
        tableLabel: TABLES.find((table) => table.id === order.tableId)?.label ?? "Takeaway",
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        total: items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
        methods: order.payments.length
          ? [...new Set(order.payments.map((payment) => payment.method))].join(", ")
          : "unpaid",
      };
    });
}
