import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSalesOverview, type SalesOverview } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { rangeLabel } from "@/lib/filters";
import { formatCurrency } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleLineChart, SimplePieChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function SalesPage() {
  const { t } = useTranslation("reports");
  const dateRange = useReportDateRange("report-sales-filters");
  const [data, setData] = useState<SalesOverview | null>(null);

  useEffect(() => {
    setData(null);
    getSalesOverview({ from: dateRange.range.from, to: dateRange.range.to }).then(setData);
  }, [dateRange.range.from, dateRange.range.to]);

  const byDayChart = (data?.byDay ?? []).map((day) => ({ label: day.date.slice(5), value: day.revenue }));
  const byMethodChart = (data?.byMethod ?? []).map((row) => ({ label: row.method, value: row.amount }));

  function handleExport() {
    exportToCsv(`sales-${dateRange.range.from || "start"}_${dateRange.range.to || "today"}`, data?.byDay ?? [], [
      { header: "Date", accessor: (row) => row.date },
      { header: "Revenue", accessor: (row) => row.revenue.toFixed(2) },
      { header: "Orders", accessor: (row) => row.orders },
    ]);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.sales.eyebrow")}
        title={t("page.sales.titleWithRange", { range: rangeLabel(dateRange) })}
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="sales" />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label={t("kpi.sales.revenue.title")} sub={t("kpi.sales.revenue.sub")} value={formatCurrency(data?.totalRevenue ?? 0)} />
        <KpiTile label={t("kpi.sales.orders.title")} sub={t("kpi.sales.orders.sub")} value={String(data?.orderCount ?? 0)} />
        <KpiTile
          label={t("kpi.sales.avgOrderValue.title")}
          sub={t("kpi.sales.avgOrderValue.sub")}
          value={formatCurrency(data?.averageOrderValue ?? 0)}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartWrapper title={t("charts.revenueByDay")}>
          <SimpleLineChart data={byDayChart} valueFormatter={(value) => formatCurrency(value)} />
        </ChartWrapper>

        <ChartWrapper title={t("charts.byPaymentMethod")}>
          <SimplePieChart data={byMethodChart} valueFormatter={(value) => formatCurrency(value)} />
        </ChartWrapper>
      </div>
    </AdminShell>
  );
}
