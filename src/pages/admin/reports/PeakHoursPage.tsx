import { useEffect, useState } from "react";
import { getPeakHours, type PeakHourRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

function formatHour(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

export default function PeakHoursPage() {
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
        eyebrow="Reports"
        title="Peak hours"
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
          Busiest hour: <span className="font-semibold text-ink">{formatHour(busiest.hour)}</span> — {busiest.orders} orders opened.
        </p>
      )}

      <ChartWrapper title="Orders opened, by hour of day">
        <SimpleBarChart data={chartData} valueFormatter={(value) => `${value} orders`} />
      </ChartWrapper>
    </AdminShell>
  );
}
