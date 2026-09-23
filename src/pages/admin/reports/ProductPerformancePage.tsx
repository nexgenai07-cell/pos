import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { formatCurrency, formatNumber } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import KpiTile from "@/components/reports/KpiTile";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function ProductPerformancePage() {
  const { t } = useTranslation("reports");
  const dateRange = useReportDateRange("report-product-performance-filters");
  const [rows, setRows] = useState<ProductPerformanceRow[] | null>(null);

  useEffect(() => {
    getProductPerformance({ from: dateRange.range.from, to: dateRange.range.to }).then(setRows);
  }, [dateRange.range.from, dateRange.range.to]);

  const sortedByRevenue = [...(rows ?? [])].sort((a, b) => b.revenue - a.revenue);
  const best = sortedByRevenue.slice(0, 3).map((row) => row.productId);
  const worst = [...(rows ?? [])].sort((a, b) => a.revenue - b.revenue).slice(0, 3).map((row) => row.productId);
  const topChart = (rows ?? []).slice(0, 8).map((row) => ({ label: row.name, value: row.revenue }));

  const totalRevenue = (rows ?? []).reduce((sum, row) => sum + row.revenue, 0);
  const totalUnitsSold = (rows ?? []).reduce((sum, row) => sum + row.unitsSold, 0);
  const topSeller = sortedByRevenue[0];

  function handleExport() {
    exportToCsv("product-performance", rows ?? [], [
      { header: "Product", accessor: (row) => row.name },
      { header: "Category", accessor: (row) => row.categoryName },
      { header: "Units sold", accessor: (row) => row.unitsSold },
      { header: "Revenue", accessor: (row) => row.revenue.toFixed(2) },
    ]);
  }

  const columns: DataTableColumn<ProductPerformanceRow>[] = [
    {
      key: "name",
      header: t("columns.productPerformance.product"),
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "category",
      header: t("columns.productPerformance.category"),
      sortable: true,
      accessor: (row) => row.categoryName,
      render: (row) => <span className="text-ink-soft">{row.categoryName}</span>,
    },
    {
      key: "unitsSold",
      header: t("columns.productPerformance.unitsSold"),
      sortable: true,
      align: "right",
      accessor: (row) => row.unitsSold,
      render: (row) => <span className="tabular-nums text-ink">{formatNumber(row.unitsSold)}</span>,
    },
    {
      key: "revenue",
      header: t("columns.productPerformance.revenue"),
      sortable: true,
      align: "right",
      accessor: (row) => row.revenue,
      render: (row) => <span className="tabular-nums text-ink">{formatCurrency(row.revenue)}</span>,
    },
    {
      key: "flag",
      header: "",
      render: (row) => (
        <>
          {best.includes(row.productId) && <StatusPill label={t("flags.bestSeller")} tone="good" />}
          {worst.includes(row.productId) && <StatusPill label={t("flags.worstSeller")} tone="warn" />}
        </>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.productPerformance.eyebrow")}
        title={t("page.productPerformance.title")}
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="product-performance" />

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile
          label={t("kpi.productPerformance.totalRevenue.title")}
          sub={t("kpi.productPerformance.totalRevenue.sub")}
          value={formatCurrency(totalRevenue)}
        />
        <KpiTile
          label={t("kpi.productPerformance.unitsSold.title")}
          sub={t("kpi.productPerformance.unitsSold.sub")}
          value={formatNumber(totalUnitsSold)}
        />
        <KpiTile
          label={t("kpi.productPerformance.topSeller.title")}
          sub={t("kpi.productPerformance.topSeller.sub")}
          value={topSeller ? topSeller.name : "—"}
        />
      </div>

      {rows && rows.length > 0 && (
        <ChartWrapper title={t("charts.topSellersByRevenue")}>
          <SimpleBarChart data={topChart} valueFormatter={(value) => formatCurrency(value)} horizontalBars />
        </ChartWrapper>
      )}

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={rows}
          keyField={(row) => row.productId}
          emptyIcon={BarChart3}
          emptyTitle={t("empty.noProductSales.title")}
          emptyDescription={t("empty.noProductSales.description")}
        />
      </div>
    </AdminShell>
  );
}
