import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Boxes,
  Clock,
  DollarSign,
  Download,
  LayoutGrid,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Category, OrderStatus, PaymentMethod, Table } from "@/types";
import {
  getDashboardSummary,
  getRecentOrders,
  ORDER_STATUS_LIST,
  type DashboardFilters,
  type DashboardSummary,
  type RecentOrderRow,
} from "@/lib/api/reports";
import { getCategories } from "@/lib/api/products";
import { getTables } from "@/lib/api/tables";
import { on } from "@/lib/eventBus";
import { exportToCsv } from "@/lib/csv";
import { countActiveFilters, matchesSearch, RANGE_PRESETS, rangeLabel, resolveRange } from "@/lib/filters";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { orderStatusLabel, paymentMethodLabel, tableStatusLabel } from "@/lib/i18n/labels";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from "@/components/reports/charts";
import {
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToggleButton,
  useFilterPanelState,
  type FilterChip,
} from "@/components/ui/FilterPanel";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "other"];
const ORDER_STATUSES: OrderStatus[] = ["open", "sent", "preparing", "ready", "served", "closed", "cancelled"];

const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "good" | "danger" | "info"> = {
  open: "accent",
  sent: "info",
  preparing: "info",
  ready: "good",
  served: "neutral",
  closed: "neutral",
  cancelled: "danger",
};

const QUICK_LINKS = [
  { to: "/admin/reports/sales", key: "sales" as const },
  { to: "/admin/reports/margins", key: "margins" as const },
  { to: "/admin/reports/wastage", key: "wastage" as const },
  { to: "/admin/reports/peak-hours", key: "peakHours" as const },
];

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  const [days, setDays] = useState<number>(14);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [tableId, setTableId] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  const { open, toggle } = useFilterPanelState("dashboard-filters", true);

  const range = useMemo(() => resolveRange({ days, from: customFrom, to: customTo }), [days, customFrom, customTo]);

  const refresh = useCallback(() => {
    const active: DashboardFilters = { from: range.from, to: range.to, categoryId, method, status, tableId };
    getDashboardSummary(active).then(setSummary);
    getRecentOrders(active, 50).then(setRecentOrders);
  }, [range.from, range.to, categoryId, method, status, tableId]);

  useEffect(() => {
    refresh();
    const offOrder = on("order:updated", refresh);
    const offTable = on("table:updated", refresh);
    const offInventory = on("inventory:updated", refresh);
    return () => {
      offOrder();
      offTable();
      offInventory();
    };
  }, [refresh]);

  useEffect(() => {
    getCategories().then(setCategories);
    getTables().then(setTables);
  }, []);

  const activeCount = countActiveFilters({
    category: categoryId !== "all" ? categoryId : "",
    method: method !== "all" ? method : "",
    status: status !== "all" ? status : "",
    table: tableId !== "all" ? tableId : "",
    custom: customFrom || customTo ? "custom" : "",
  });

  const chips: FilterChip[] = [];
  if (customFrom || customTo || days !== 14) {
    chips.push({
      key: "range",
      label: t("filters.rangeChip", { window: rangeLabel({ days, from: customFrom, to: customTo }) }),
    });
  }
  if (categoryId !== "all") {
    chips.push({
      key: "category",
      label: t("filters.categoryChip", {
        category: categories.find((category) => category.id === categoryId)?.name ?? categoryId,
      }),
    });
  }
  if (method !== "all") {
    chips.push({ key: "method", label: t("filters.methodChip", { method: paymentMethodLabel(tCommon, method as PaymentMethod) }) });
  }
  if (status !== "all") {
    chips.push({ key: "status", label: t("filters.statusChip", { status: orderStatusLabel(tCommon, status as OrderStatus) }) });
  }
  if (tableId !== "all") {
    chips.push({
      key: "table",
      label: t("filters.tableChip", { table: tables.find((table) => table.id === tableId)?.label ?? tableId }),
    });
  }

  function removeChip(key: string) {
    if (key === "range") {
      setCustomFrom("");
      setCustomTo("");
      setDays(14);
    }
    if (key === "category") setCategoryId("all");
    if (key === "method") setMethod("all");
    if (key === "status") setStatus("all");
    if (key === "table") setTableId("all");
  }

  function resetFilters() {
    setCustomFrom("");
    setCustomTo("");
    setDays(14);
    setCategoryId("all");
    setMethod("all");
    setStatus("all");
    setTableId("all");
  }

  const current = summary?.current;
  const trendChart = (current?.byDay ?? []).map((day) => ({ label: day.date.slice(5), value: day.revenue }));
  const categoryChart = (current?.byCategory ?? []).slice(0, 6);
  const methodChart = (current?.byMethod ?? []).map((entry) => ({
    ...entry,
    label: paymentMethodLabel(tCommon, entry.label as PaymentMethod),
  }));
  const lowStock = summary?.lowStock ?? [];

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return recentOrders;
    return recentOrders.filter((order) => matchesSearch(`${order.id} ${order.tableLabel} ${order.status}`, orderSearch));
  }, [recentOrders, orderSearch]);

  function handleExport() {
    exportToCsv(`dashboard-orders-${range.from || "start"}_${range.to || "today"}`, filteredOrders, [
      { header: "Order", accessor: (row) => row.id },
      { header: "Opened", accessor: (row) => row.openedAt },
      { header: "Table", accessor: (row) => row.tableLabel },
      { header: "Status", accessor: (row) => row.status },
      { header: "Source", accessor: (row) => row.source },
      { header: "Items", accessor: (row) => row.itemCount },
      { header: "Total", accessor: (row) => row.total.toFixed(2) },
      { header: "Payment", accessor: (row) => row.methods },
    ]);
  }
  const orderColumns: DataTableColumn<RecentOrderRow>[] = [
    {
      key: "table",
      header: t("columns.table"),
      sortable: true,
      accessor: (row) => row.tableLabel,
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.tableLabel}</p>
          <p className="text-xs text-ink-soft">{row.source === "qr" ? t("columns.qrOrder") : t("columns.pos")}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusPill label={orderStatusLabel(tCommon, row.status)} tone={STATUS_TONE[row.status] ?? "neutral"} size="sm" />,
    },
    {
      key: "items",
      header: t("columns.items"),
      sortable: true,
      align: "right",
      accessor: (row) => row.itemCount,
      render: (row) => <span className="tabular-nums text-ink-soft">{formatNumber(row.itemCount)}</span>,
    },
    {
      key: "total",
      header: t("columns.total"),
      sortable: true,
      align: "right",
      accessor: (row) => row.total,
      render: (row) => <span className="tabular-nums font-medium text-ink">{formatCurrency(row.total)}</span>,
    },
    {
      key: "payment",
      header: t("columns.payment"),
      sortable: true,
      accessor: (row) => row.methods,
      render: (row) => <span className="text-xs text-ink-soft">{row.methods}</span>,
    },
    {
      key: "opened",
      header: t("columns.opened"),
      sortable: true,
      accessor: (row) => row.openedAt,
      render: (row) => <span className="text-ink-soft">{formatDate(row.openedAt)}</span>,
    },
  ];
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={
          summary
            ? t("page.description", {
                from: formatDate(summary.window.from),
                to: formatDate(summary.window.to),
                prevFrom: formatDate(summary.window.previousFrom),
                prevTo: formatDate(summary.window.previousTo),
              })
            : t("page.loading")
        }
        actions={
          <>
            <SearchInput value={orderSearch} onChange={setOrderSearch} placeholder={t("actions.searchPlaceholder")} className="w-48" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Button variant="secondary" onClick={handleExport} title={t("actions.exportTitle")}>
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {t("actions.exportCsv")}
            </Button>
            <Button variant="secondary" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
              {t("actions.refresh")}
            </Button>
            <Link to="/admin/reports">
              <Button>{t("actions.allReports")}</Button>
            </Link>
          </>
        }
      />

      <FilterPanel open={open} title={t("filters.panelTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField label={t("filters.window")} htmlFor="dash-days">
            <Select id="dash-days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {RANGE_PRESETS.map((option) => (
                <option key={option} value={option}>
                  {tCommon("range.lastDays", { count: option })}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.from")} htmlFor="dash-from" hint={t("filters.fromHint")}>
            <Input id="dash-from" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </FilterField>

          <FilterField label={t("filters.to")} htmlFor="dash-to">
            <Input id="dash-to" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </FilterField>

          <FilterField label={t("filters.category")} htmlFor="dash-category">
            <Select id="dash-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">{t("filters.allCategories")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.paymentMethod")} htmlFor="dash-method">
            <Select id="dash-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="all">{t("filters.anyMethod")}</option>
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {paymentMethodLabel(tCommon, option)}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.orderStatus")} htmlFor="dash-status">
            <Select id="dash-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">{t("filters.anyStatus")}</option>
              {ORDER_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {orderStatusLabel(tCommon, option)}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.table")} htmlFor="dash-table" className="sm:col-span-2">
            <Select id="dash-table" value={tableId} onChange={(event) => setTableId(event.target.value)}>
              <option value="all">{t("filters.everyTable")}</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.liveCounts")} className="sm:col-span-2 lg:col-span-3">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("filters.liveCountsSummary", {
                openOrders: summary?.openOrderCount ?? 0,
                occupied: summary?.tableStatus.occupied ?? 0,
                needsBill: summary?.tableStatus.needsBill ?? 0,
                products: summary?.productCount ?? 0,
                customers: summary?.customerCount ?? 0,
              })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>
      <Card className="mt-4" padding="md">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("liveOrderStatus.heading")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {ORDER_STATUS_LIST.map((orderStatus) => (
            <StatusPill
              key={orderStatus}
              label={t("liveOrderStatus.statusCount", {
                status: orderStatusLabel(tCommon, orderStatus),
                count: summary?.statusCounts[orderStatus] ?? 0,
              })}
              tone={STATUS_TONE[orderStatus] ?? "neutral"}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <StatusPill
            label={t("liveOrderStatus.statusCount", { status: tableStatusLabel(tCommon, "empty"), count: summary?.tableStatus.empty ?? 0 })}
            tone="neutral"
          />
          <StatusPill
            label={t("liveOrderStatus.statusCount", {
              status: tableStatusLabel(tCommon, "occupied"),
              count: summary?.tableStatus.occupied ?? 0,
            })}
            tone="accent"
          />
          <StatusPill
            label={t("liveOrderStatus.statusCount", {
              status: tableStatusLabel(tCommon, "needs-bill"),
              count: summary?.tableStatus.needsBill ?? 0,
            })}
            tone="warn"
          />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile
          icon={DollarSign}
          label={t("kpi.revenue.title")}
          value={formatCurrency(current?.revenue ?? 0)}
          delta={summary?.deltas.revenue ?? null}
          deltaLabel={t("kpi.deltaLabelDays", { count: summary?.window.days ?? 14 })}
          highlight
        />
        <KpiTile
          icon={Receipt}
          label={t("kpi.orders.title")}
          value={formatNumber(current?.orderCount ?? 0)}
          delta={summary?.deltas.orderCount ?? null}
          deltaLabel={t("kpi.deltaLabelDays", { count: summary?.window.days ?? 14 })}
        />
        <KpiTile
          icon={TrendingUp}
          label={t("kpi.avgOrderValue.title")}
          value={formatCurrency(current?.averageOrderValue ?? 0)}
          delta={summary?.deltas.averageOrderValue ?? null}
          deltaLabel={t("kpi.deltaLabelWindow")}
        />
        <KpiTile icon={Clock} label={t("kpi.openOrders.title")} value={formatNumber(summary?.openOrderCount ?? 0)} sub={t("kpi.openOrders.sub")} />
        <KpiTile
          icon={Boxes}
          label={t("kpi.lowStock.title")}
          value={formatNumber(lowStock.length)}
          sub={lowStock.length ? t("kpi.lowStock.subAlert") : t("kpi.lowStock.subOk")}
        />
        <KpiTile
          icon={Trash2}
          label={t("kpi.wasteCost.title")}
          value={formatCurrency(summary?.waste.cost ?? 0)}
          sub={t("kpi.wasteCost.sub", { count: summary?.waste.events ?? 0 })}
        />
        <KpiTile
          icon={LayoutGrid}
          label={t("kpi.tablesSeated.title")}
          value={formatNumber(summary?.tableStatus.occupied ?? 0)}
          sub={t("kpi.tablesSeated.sub", { count: summary?.tableStatus.needsBill ?? 0 })}
        />
        <KpiTile
          icon={Users}
          label={t("kpi.customers.title")}
          value={formatNumber(summary?.customerCount ?? 0)}
          sub={t("kpi.customers.sub")}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartWrapper
          title={t("charts.revenueByDay", { count: summary?.window.days ?? 14 })}
          action={
            <Link
              to="/admin/reports/sales"
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
            >
              {t("charts.fullSalesReport")}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2.5} />
            </Link>
          }
        >
          {trendChart.length > 0 ? (
            <SimpleLineChart data={trendChart} valueFormatter={(value) => formatCurrency(value)} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">{t("empty.noRevenueTrend")}</p>
          )}
        </ChartWrapper>

        <ChartWrapper title={t("charts.paymentMix")}>
          {methodChart.length > 0 ? (
            <SimplePieChart data={methodChart} valueFormatter={(value) => formatCurrency(value)} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">{t("empty.noPaymentMix")}</p>
          )}
        </ChartWrapper>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartWrapper title={t("charts.revenueByCategory")}>
          {categoryChart.length > 0 ? (
            <SimpleBarChart data={categoryChart} horizontalBars valueFormatter={(value) => formatCurrency(value)} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">{t("empty.noCategorySales")}</p>
          )}
        </ChartWrapper>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("charts.topSellers")}</p>
            <Link
              to="/admin/reports/product-performance"
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
            >
              {t("charts.productPerformance")}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2.5} />
            </Link>
          </div>
          {(current?.topProducts.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("empty.noTopSellers")}</p>
          ) : (
            <div className="space-y-2">
              {current?.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-strong">
                      {index + 1}
                    </span>
                    <span className="truncate text-ink">{product.name}</span>
                  </span>
                  <span className="flex-none text-xs text-ink-soft">
                    {t("charts.unitsSold", { count: product.unitsSold })} ·{" "}
                    <span className="font-semibold tabular-nums text-ink">{formatCurrency(product.revenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {orderSearch ? t("recentOrders.headingFiltered", { search: orderSearch }) : t("recentOrders.heading")}
          </p>
          <DataTable
            columns={orderColumns}
            data={recentOrders.length === 0 ? [] : filteredOrders}
            keyField={(row) => row.id}
            emptyIcon={Receipt}
            emptyTitle={orderSearch ? t("recentOrders.emptySearchTitle") : t("recentOrders.emptyTitle")}
            emptyDescription={
              orderSearch ? t("recentOrders.emptySearchDescription") : t("recentOrders.emptyDescription")
            }
          />
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("lowStockWatchlist.heading")}</p>
            <Link to="/admin/inventory/stock" className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover">
              {t("lowStockWatchlist.restock")}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2.5} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("lowStockWatchlist.empty")}</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{item.name}</span>
                  <StatusPill
                    label={`${formatNumber(item.currentStock)} ${item.unit}`}
                    tone={item.currentStock === 0 ? "danger" : "warn"}
                    size="sm"
                  />
                </div>
              ))}
              {lowStock.length > 8 && <p className="pt-1 text-xs text-ink-soft">{t("lowStockWatchlist.more", { count: lowStock.length - 8 })}</p>}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card-hover rounded-xl border border-border bg-surface-raised p-4 shadow-sm"
          >
            <p className="font-semibold text-ink">{t(`quickLinks.${link.key}.label`)}</p>
            <p className="mt-1 text-xs text-ink-soft">{t(`quickLinks.${link.key}.blurb`)}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
