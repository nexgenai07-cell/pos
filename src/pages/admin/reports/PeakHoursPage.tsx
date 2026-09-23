import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPeakHours, type PeakHourRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { formatTime, formatNumber } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

function formatHour(hour: number): string {
  return formatTime(`${String(hour).padStart(2, "0")}:00`, { minute: undefined });
}

export default function PeakHoursPage() {
  const { t } = useTranslation("reports");
  const dateRange = useReportDateRange("report-peak-hours-filters");
  const [rows, setRows] = useState<PeakHourRow[]>([]);

  useEffect(() => {
    getPeakHours({ from: dateRange.range.from, to: dateRange.range.to }).then(setRows);
  }, [dateRange.range.from, dateRange.range.to]);

  const busiest = [...rows].sort((a, b) => b.orders - a.orders)[0];
  const chartData = rows.map((row) => ({ label: formatHour(row.hour), value: row.orders }));

  function handleExport() {
    exportToCsv("peak-hours", rows, [
      { header: "Hour", accessor: (row) => formatHour(row.hour) },
      { header: "Orders", accessor: (row) => row.orders },
    ]);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.peakHours.eyebrow")}
        title={t("page.peakHours.title")}
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="peak-hours" />

      {busiest && busiest.orders > 0 && (
        <p className="mb-4 text-sm text-ink-soft">
          {t("summary.busiestHour", { hour: formatHour(busiest.hour), count: formatNumber(busiest.orders) })}
        </p>
      )}

      <ChartWrapper title={t("charts.ordersByHour")}>
        <SimpleBarChart data={chartData} valueFormatter={(value) => t("charts.ordersUnit", { count: formatNumber(value) })} />
      </ChartWrapper>
    </AdminShell>
  );
}
