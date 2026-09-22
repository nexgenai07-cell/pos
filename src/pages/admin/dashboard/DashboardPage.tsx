import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import type { Category, Table } from "@/types";
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
import { formatDate } from "@/lib/format";
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

const PAYMENT_METHODS = ["cash", "card", "other"];
const ORDER_STATUSES = ["open", "sent", "preparing", "ready", "served", "closed", "cancelled"];

const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "good" | "danger" | "info"> = {
  open: "accent",
  sent: "info",
  preparing: "info",
  ready: "good",
  served: "neutral",
  closed: "neutral",
  cancelled: "danger",
};

export default function DashboardPage() {
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
  if (customFrom || customTo) {
    chips.push({ key: "range", label: `Window: ${rangeLabel({ days, from: customFrom, to: customTo })}` });
  } else if (days !== 14) {
    chips.push({ key: "range", label: `Window: last ${days} days` });
  }
  if (categoryId !== "all") {
    chips.push({
      key: "category",
      label: `Category: ${categories.find((category) => category.id === categoryId)?.name ?? categoryId}`,
    });
  }
  if (method !== "all") chips.push({ key: "method", label: `Paid by ${method}` });
  if (status !== "all") chips.push({ key: "status", label: `Orders: ${status}` });
  if (tableId !== "all") {
    chips.push({ key: "table", label: `Table: ${tables.find((table) => table.id === tableId)?.label ?? tableId}` });
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
  const methodChart = current?.byMethod ?? [];
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
      header: "Table",
      sortable: true,
      accessor: (row) => row.tableLabel,
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.tableLabel}</p>
          <p className="text-xs text-ink-soft">{row.source === "qr" ? "QR order" : "POS"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusPill label={row.status} tone={STATUS_TONE[row.status] ?? "neutral"} size="sm" />,
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      align: "right",
      accessor: (row) => row.itemCount,
      render: (row) => <span className="tabular-nums text-ink-soft">{row.itemCount}</span>,
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      align: "right",
      accessor: (row) => row.total,
      render: (row) => <span className="tabular-nums font-medium text-ink">${row.total.toFixed(2)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      sortable: true,
      accessor: (row) => row.methods,
      render: (row) => <span className="text-xs text-ink-soft">{row.methods}</span>,
    },
    {
      key: "opened",
      header: "Opened",
      sortable: true,
      accessor: (row) => row.openedAt,
      render: (row) => <span className="text-ink-soft">{formatDate(row.openedAt)}</span>,
    },
  ];
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Quick review"
        description={
          summary
            ? `${summary.window.from} → ${summary.window.to} · compared with ${summary.window.previousFrom} → ${summary.window.previousTo}`
            : "Loading the latest numbers…"
        }
        actions={
          <>
            <SearchInput value={orderSearch} onChange={setOrderSearch} placeholder="Search orders…" className="w-48" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Button variant="secondary" onClick={handleExport} title="Export the filtered orders">
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              CSV
            </Button>
            <Button variant="secondary" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
              Refresh
            </Button>
            <Link to="/admin/reports">
              <Button>All reports</Button>
            </Link>
          </>
        }
      />

      <FilterPanel open={open} title="Filter everything on this page" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Window" htmlFor="dash-days">
            <Select id="dash-days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {RANGE_PRESETS.map((option) => (
                <option key={option} value={option}>
                  Last {option} days
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="From" htmlFor="dash-from" hint="Overrides the preset">
            <Input id="dash-from" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </FilterField>

          <FilterField label="To" htmlFor="dash-to">
            <Input id="dash-to" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </FilterField>

          <FilterField label="Category" htmlFor="dash-category">
            <Select id="dash-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Payment method" htmlFor="dash-method">
            <Select id="dash-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="all">Any method</option>
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Order status" htmlFor="dash-status">
            <Select id="dash-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Any status</option>
              {ORDER_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Table" htmlFor="dash-table" className="sm:col-span-2">
            <Select id="dash-table" value={tableId} onChange={(event) => setTableId(event.target.value)}>
              <option value="all">Every table</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Live counts" className="sm:col-span-2 lg:col-span-3">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {summary?.openOrderCount ?? 0} open orders · {summary?.tableStatus.occupied ?? 0} seated ·{" "}
              {summary?.tableStatus.needsBill ?? 0} waiting on bill · {summary?.productCount ?? 0} menu items ·{" "}
              {summary?.customerCount ?? 0} customers
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>
      <Card className="mt-4" padding="md">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Live order status</p>
        <div className="flex flex-wrap items-center gap-2">
          {ORDER_STATUS_LIST.map((orderStatus) => (
            <StatusPill
              key={orderStatus}
              label={`${orderStatus} · ${summary?.statusCounts[orderStatus] ?? 0}`}
              tone={STATUS_TONE[orderStatus] ?? "neutral"}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <StatusPill label={`Empty tables · ${summary?.tableStatus.empty ?? 0}`} tone="neutral" />
          <StatusPill label={`Occupied · ${summary?.tableStatus.occupied ?? 0}`} tone="accent" />
          <StatusPill label={`Needs bill · ${summary?.tableStatus.needsBill ?? 0}`} tone="warn" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile
          icon={DollarSign}
          label="Revenue"
          value={`$${(current?.revenue ?? 0).toFixed(2)}`}
          delta={summary?.deltas.revenue ?? null}
          deltaLabel={`vs previous ${summary?.window.days ?? 14} days`}
          highlight
        />
        <KpiTile
          icon={Receipt}
          label="Orders"
          value={String(current?.orderCount ?? 0)}
          delta={summary?.deltas.orderCount ?? null}
          deltaLabel={`vs previous ${summary?.window.days ?? 14} days`}
        />
        <KpiTile
          icon={TrendingUp}
          label="Avg. order value"
          value={`$${(current?.averageOrderValue ?? 0).toFixed(2)}`}
          delta={summary?.deltas.averageOrderValue ?? null}
          deltaLabel="vs previous window"
        />
        <KpiTile icon={Clock} label="Open orders" value={String(summary?.openOrderCount ?? 0)} sub="not settled yet" />
        <KpiTile
          icon={Boxes}
          label="Low stock"
          value={String(lowStock.length)}
          sub={lowStock.length ? "at or below par level" : "everything above par"}
        />
        <KpiTile
          icon={Trash2}
          label="Waste cost"
          value={`$${(summary?.waste.cost ?? 0).toFixed(2)}`}
          sub={`${summary?.waste.events ?? 0} waste events`}
        />
        <KpiTile
          icon={LayoutGrid}
          label="Tables seated"
          value={String(summary?.tableStatus.occupied ?? 0)}
          sub={`${summary?.tableStatus.needsBill ?? 0} waiting on bill`}
        />
        <KpiTile
          icon={Users}
          label="Customers"
          value={String(summary?.customerCount ?? 0)}
          sub="with a phone on file"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartWrapper
          title={`Revenue by day (${summary?.window.days ?? 14} days)`}
          action={
            <Link
              to="/admin/reports/sales"
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Full sales report
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          }
        >
          {trendChart.length > 0 ? (
            <SimpleLineChart data={trendChart} valueFormatter={(value) => `$${value.toFixed(0)}`} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">No settled orders in this window with these filters.</p>
          )}
        </ChartWrapper>

        <ChartWrapper title="Payment mix">
          {methodChart.length > 0 ? (
            <SimplePieChart data={methodChart} valueFormatter={(value) => `$${value.toFixed(0)}`} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">Nothing collected in this window yet.</p>
          )}
        </ChartWrapper>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartWrapper title="Revenue by category">
          {categoryChart.length > 0 ? (
            <SimpleBarChart data={categoryChart} horizontalBars valueFormatter={(value) => `$${value.toFixed(0)}`} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">No category sales to break down yet.</p>
          )}
        </ChartWrapper>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Top sellers</p>
            <Link
              to="/admin/reports/product-performance"
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Product performance
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
          {(current?.topProducts.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">No sales match the current filters.</p>
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
                    {product.unitsSold} sold · <span className="font-semibold tabular-nums text-ink">${product.revenue.toFixed(0)}</span>
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
            Recent & settled orders {orderSearch ? `· filtered by “${orderSearch}”` : ""}
          </p>
          <DataTable
            columns={orderColumns}
            data={recentOrders.length === 0 ? [] : filteredOrders}
            keyField={(row) => row.id}
            emptyIcon={Receipt}
            emptyTitle={orderSearch ? "No orders match that search" : "No orders in this window"}
            emptyDescription={
              orderSearch
                ? "Clear the search to see the full recent list."
                : "Widen the date window or clear the filters to see orders here."
            }
          />
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Low stock watchlist</p>
            <Link to="/admin/inventory/stock" className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover">
              Restock
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">Everything is above par level.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{item.name}</span>
                  <StatusPill
                    label={`${item.currentStock} ${item.unit}`}
                    tone={item.currentStock === 0 ? "danger" : "warn"}
                    size="sm"
                  />
                </div>
              ))}
              {lowStock.length > 8 && <p className="pt-1 text-xs text-ink-soft">+{lowStock.length - 8} more</p>}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/admin/reports/sales", label: "Sales", blurb: "Revenue by day and payment mix" },
          { to: "/admin/reports/margins", label: "Margins", blurb: "Food cost vs revenue per item" },
          { to: "/admin/reports/wastage", label: "Wastage", blurb: "What's being thrown out" },
          { to: "/admin/reports/peak-hours", label: "Peak hours", blurb: "When service actually happens" },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card-hover rounded-xl border border-border bg-surface-raised p-4 shadow-sm"
          >
            <p className="font-semibold text-ink">{link.label}</p>
            <p className="mt-1 text-xs text-ink-soft">{link.blurb}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
