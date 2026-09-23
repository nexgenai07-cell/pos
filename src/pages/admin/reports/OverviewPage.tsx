import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DollarSign, Receipt, TrendingUp, Boxes, ArrowRight } from "lucide-react";
import { getReportsOverview, getSalesOverview, type ReportsOverview } from "@/lib/api/reports";
import { getLowStockItems } from "@/lib/api/inventory";
import type { InventoryItem } from "@/types";
import { formatCurrency } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleLineChart } from "@/components/reports/charts";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";
import { rangeLabel } from "@/lib/filters";

export default function OverviewPage() {
  const { t } = useTranslation("reports");
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

  const REPORT_LINKS = [
    { to: "/admin/reports/sales", label: t("page.sales.title"), blurb: t("page.sales.blurb") },
    { to: "/admin/reports/product-performance", label: t("page.productPerformance.title"), blurb: t("page.productPerformance.blurb") },
    { to: "/admin/reports/peak-hours", label: t("page.peakHours.title"), blurb: t("page.peakHours.blurb") },
    { to: "/admin/reports/margins", label: t("page.margins.title"), blurb: t("page.margins.blurb") },
    { to: "/admin/reports/table-turnover", label: t("page.tableTurnover.title"), blurb: t("page.tableTurnover.blurb") },
    { to: "/admin/reports/wastage", label: t("page.wastage.title"), blurb: t("page.wastage.blurb") },
    { to: "/admin/reports/repeat-customers", label: t("page.repeatCustomers.title"), blurb: t("page.repeatCustomers.blurb") },
  ];

  const range = rangeLabel(dateRange);

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.overview.eyebrow")}
        title={t("page.overview.title")}
        description={t("page.overview.description", { range })}
        actions={<ReportDateFilterButton state={dateRange} />}
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="overview" />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={DollarSign} label={t("kpi.overview.revenue.title")} value={formatCurrency(overview?.totalRevenue ?? 0)} />
        <KpiTile icon={Receipt} label={t("kpi.overview.orders.title")} value={String(overview?.orderCount ?? 0)} />
        <KpiTile
          icon={TrendingUp}
          label={t("kpi.overview.avgOrderValue.title")}
          value={formatCurrency(overview?.averageOrderValue ?? 0)}
        />
        <KpiTile
          icon={Boxes}
          label={t("kpi.overview.lowStock.title")}
          value={String(overview?.lowStockCount ?? 0)}
          sub={overview && overview.lowStockCount > 0 ? t("kpi.overview.lowStock.sub") : undefined}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ChartWrapper title={t("charts.revenueTrend", { range })}>
          {trend && trend.length > 0 ? (
            <SimpleLineChart data={trend} valueFormatter={(value) => formatCurrency(value)} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-soft">{t("charts.revenueTrendEmpty")}</p>
          )}
        </ChartWrapper>

        <div className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("lowStock.heading")}</p>
            <Link to="/admin/inventory/stock" className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
              {t("lowStock.viewAll")}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2.5} />
            </Link>
          </div>
          {lowStock === null ? null : lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("lowStock.empty")}</p>
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
              {lowStock.length > 5 && <p className="pt-1 text-xs text-ink-soft">{t("lowStock.more", { count: lowStock.length - 5 })}</p>}
            </div>
          )}
        </div>
      </div>

      {overview?.topProduct && (
        <p className="mt-4 text-sm text-ink-soft">
          {t("summary.topSeller", { name: overview.topProduct.name, revenue: formatCurrency(overview.topProduct.revenue) })}
        </p>
      )}

      <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("backToReports")}</p>
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
