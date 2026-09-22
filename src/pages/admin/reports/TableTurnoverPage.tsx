import { useEffect, useState } from "react";
import { getTableTurnover, type TableTurnoverRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function TableTurnoverPage() {
  const dateRange = useReportDateRange("report-table-turnover-filters");
  const [rows, setRows] = useState<TableTurnoverRow[]>([]);
  const [overall, setOverall] = useState(0);

  useEffect(() => {
    getTableTurnover({ from: dateRange.range.from, to: dateRange.range.to }).then(({ rows: data, overallAverageMinutes }) => {
      setRows(data);
      setOverall(overallAverageMinutes);
    });
  }, [dateRange.range.from, dateRange.range.to]);

  const chartData = rows.map((row) => ({ label: row.label, value: row.averageMinutes }));

  function handleExport() {
    exportToCsv("table-turnover", rows, [
      { header: "Table", accessor: (row) => row.label },
      { header: "Orders", accessor: (row) => row.orders },
      { header: "Avg. minutes held", accessor: (row) => row.averageMinutes.toFixed(1) },
    ]);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Reports"
        title="Table turnover"
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="table-turnover" />

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label="Overall average" value={`${overall.toFixed(0)} min`} sub="open → close" />
        <KpiTile label="Tables tracked" value={String(rows.length)} />
      </div>

      <ChartWrapper title="Average time held, per table">
        <SimpleBarChart data={chartData} valueFormatter={(value) => `${value.toFixed(0)}m`} horizontalBars />
      </ChartWrapper>
    </AdminShell>
  );
}
