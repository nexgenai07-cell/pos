import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, TrendingUp, Boxes, ArrowRight } from "lucide-react";
import { getReportsOverview, getSalesOverview, type ReportsOverview } from "@/lib/api/reports";
import { getLowStockItems } from "@/lib/api/inventory";
import type { InventoryItem } from "@/types";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleLineChart } from "@/components/reports/charts";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";
import { rangeLabel } from "@/lib/filters";

const REPORT_LINKS = [
  { to: "/admin/reports/sales", label: "Sales", blurb: "Revenue by day, payment mix" },
  { to: "/admin/reports/product-performance", label: "Product performance", blurb: "Best & worst sellers" },
  { to: "/admin/reports/peak-hours", label: "Peak hours", blurb: "When orders actually happen" },
  { to: "/admin/reports/margins", label: "Margins", blurb: "Food cost vs revenue" },
  { to: "/admin/reports/table-turnover", label: "Table turnover", blurb: "How long tables are held" },
  { to: "/admin/reports/wastage", label: "Wastage", blurb: "What's being thrown out, and its cost" },
  { to: "/admin/reports/repeat-customers", label: "Repeat customers", blurb: "Who keeps coming back" },
];

export default function OverviewPage() {
  const dateRange = useReportDateRange("report-overview-filters");
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [trend, setTrend] = useState<{ label: string; value: number }[] | null>(null);
  const [lowStock, setLowStock] = useState<InventoryItem[] | null>(null);

  useEffect(() => {
    const filter = { from: dateRange.range.from, to: dateRange.range.to };
    getReportsOverview(filter).then(setOverview);
    getSalesOverview(filter).then((sales) => setTrend(sales.byDay.map((day) => ({ label: day.date.slice(5), value: day.revenue }))));
    getLowStockItems().then(setLowStock);
  }, [dateRange.range.from, dateRange.range.to]);

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Reports"
        title="Overview"
        description={`${rangeLabel(dateRange)} across sales, orders, and stock.`}
        actions={<ReportDateFilterButton state={dateRange} />}
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="overview" />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={DollarSign} label="Revenue" value={`$${(overview?.totalRevenue ?? 0).toFixed(2)}`} />
        <KpiTile icon={Receipt} label="Orders" value={String(overview?.orderCount ?? 0)} />
        <KpiTile icon={TrendingUp} label="Avg. order value" value={`$${(overview?.averageOrderValue ?? 0).toFixed(2)}`} />
        <KpiTile
          icon={Boxes}
          label="Low stock items"
          value={String(overview?.lowStockCount ?? 0)}
          sub={overview && overview.lowStockCount > 0 ? "check Inventory → Stock" : undefined}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ChartWrapper title={`Revenue trend (${rangeLabel(dateRange)})`}>
          {trend && trend.length > 0 ? (
            <SimpleLineChart data={trend} valueFormatter={(value) => `$${value.toFixed(0)}`} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">No closed orders in this window yet.</p>
          )}
        </ChartWrapper>

        <div className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Low stock</p>
            <Link to="/admin/inventory/stock" className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
              View all
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
          {lowStock === null ? null : lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">Everything is above par level.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{item.name}</span>
                  <StatusPill
                    label={`${item.currentStock} ${item.unit}`}
                    tone={item.currentStock === 0 ? "danger" : "warn"}
                    size="sm"
                  />
                </div>
              ))}
              {lowStock.length > 5 && <p className="pt-1 text-xs text-ink-soft">+{lowStock.length - 5} more</p>}
            </div>
          )}
        </div>
      </div>

      {overview?.topProduct && (
        <p className="mt-4 text-sm text-ink-soft">
          Top seller so far: <span className="font-semibold text-ink">{overview.topProduct.name}</span> — $
          {overview.topProduct.revenue.toFixed(2)} in revenue.
        </p>
      )}

      <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-soft">All reports</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_LINKS.map((report) => (
          <Link
            key={report.to}
            to={report.to}
            className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
          >
            <p className="font-semibold text-ink">{report.label}</p>
            <p className="mt-1 text-xs text-ink-soft">{report.blurb}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
