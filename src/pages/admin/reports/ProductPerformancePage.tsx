import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function ProductPerformancePage() {
  const dateRange = useReportDateRange("report-product-performance-filters");
  const [rows, setRows] = useState<ProductPerformanceRow[] | null>(null);

  useEffect(() => {
    getProductPerformance({ from: dateRange.range.from, to: dateRange.range.to }).then(setRows);
  }, [dateRange.range.from, dateRange.range.to]);

  const best = [...(rows ?? [])].sort((a, b) => b.revenue - a.revenue).slice(0, 3).map((row) => row.productId);
  const worst = [...(rows ?? [])].sort((a, b) => a.revenue - b.revenue).slice(0, 3).map((row) => row.productId);
  const topChart = (rows ?? []).slice(0, 8).map((row) => ({ label: row.name, value: row.revenue }));

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
      header: "Product",
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      accessor: (row) => row.categoryName,
      render: (row) => <span className="text-ink-soft">{row.categoryName}</span>,
    },
    {
      key: "unitsSold",
      header: "Units sold",
      sortable: true,
      align: "right",
      accessor: (row) => row.unitsSold,
      render: (row) => <span className="tabular-nums text-ink">{row.unitsSold}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      sortable: true,
      align: "right",
      accessor: (row) => row.revenue,
      render: (row) => <span className="tabular-nums text-ink">${row.revenue.toFixed(2)}</span>,
    },
    {
      key: "flag",
      header: "",
      render: (row) => (
        <>
          {best.includes(row.productId) && <StatusPill label="Best seller" tone="good" />}
          {worst.includes(row.productId) && <StatusPill label="Worst seller" tone="warn" />}
        </>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Reports"
        title="Product performance"
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="product-performance" />

      {rows && rows.length > 0 && (
        <ChartWrapper title="Top sellers by revenue">
          <SimpleBarChart data={topChart} valueFormatter={(value) => `$${value.toFixed(0)}`} horizontalBars />
        </ChartWrapper>
      )}

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={rows}
          keyField={(row) => row.productId}
          emptyIcon={BarChart3}
          emptyTitle="No sales yet"
          emptyDescription="Closed orders will show up here as products sell."
        />
      </div>
    </AdminShell>
  );
}
