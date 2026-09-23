import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTableTurnover, type TableTurnoverRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function TableTurnoverPage() {
  const { t } = useTranslation("reports");
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
        eyebrow={t("page.tableTurnover.eyebrow")}
        title={t("page.tableTurnover.title")}
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="table-turnover" />

      <div className="mb-2 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile
          label={t("kpi.tableTurnover.overallAvg.title")}
          value={t("charts.minutesUnit", { count: formatNumber(overall, { maximumFractionDigits: 0 }) })}
          sub={t("kpi.tableTurnover.overallAvg.sub")}
        />
        <KpiTile label={t("kpi.tableTurnover.tablesTracked.title")} value={String(rows.length)} sub={t("kpi.tableTurnover.tablesTracked.sub")} />
      </div>

      <p className="mb-5 text-xs text-ink-soft">
        {t("summary.tableTurnover.overallAvg", { minutes: formatNumber(overall, { maximumFractionDigits: 0 }) })}{" "}
        {t("summary.tableTurnover.tablesTracked", { count: formatNumber(rows.length) })}
      </p>

      <ChartWrapper title={t("charts.avgMinutesByTable")}>
        <SimpleBarChart
          data={chartData}
          valueFormatter={(value) => t("charts.minutesUnit", { count: formatNumber(value, { maximumFractionDigits: 0 }) })}
          horizontalBars
        />
      </ChartWrapper>
    </AdminShell>
  );
}
