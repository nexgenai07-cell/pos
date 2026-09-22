import { useEffect, useState } from "react";
import { PieChart } from "lucide-react";
import { getMargins, type MarginRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import StatusPill from "@/components/ui/StatusPill";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function MarginsPage() {
  const dateRange = useReportDateRange("report-margins-filters");
  const [rows, setRows] = useState<MarginRow[] | null>(null);
  const [blended, setBlended] = useState(0);

  useEffect(() => {
    getMargins({ from: dateRange.range.from, to: dateRange.range.to }).then(({ rows: data, blendedMarginPct }) => {
      setRows(data);
      setBlended(blendedMarginPct);
    });
  }, [dateRange.range.from, dateRange.range.to]);

  function handleExport() {
    exportToCsv("margins", rows ?? [], [
      { header: "Product", accessor: (row) => row.name },
      { header: "Revenue", accessor: (row) => row.revenue.toFixed(2) },
      { header: "Cost", accessor: (row) => row.cost.toFixed(2) },
      { header: "Margin", accessor: (row) => row.marginAmount.toFixed(2) },
      { header: "Margin %", accessor: (row) => row.marginPct.toFixed(1) },
    ]);
  }

  const columns: DataTableColumn<MarginRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      sortable: true,
      align: "right",
      accessor: (row) => row.revenue,
      render: (row) => <span className="tabular-nums text-ink-soft">${row.revenue.toFixed(2)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      align: "right",
      accessor: (row) => row.cost,
      render: (row) => <span className="tabular-nums text-ink-soft">${row.cost.toFixed(2)}</span>,
    },
    {
      key: "margin",
      header: "Margin",
      sortable: true,
      align: "right",
      accessor: (row) => row.marginAmount,
      render: (row) => <span className="tabular-nums text-ink">${row.marginAmount.toFixed(2)}</span>,
    },
    {
      key: "marginPct",
      header: "Margin %",
      sortable: true,
      align: "right",
      accessor: (row) => row.marginPct,
      render: (row) => (
        <StatusPill
          label={`${row.marginPct.toFixed(0)}%`}
          tone={row.marginPct >= 60 ? "good" : row.marginPct >= 40 ? "accent" : "warn"}
        />
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Reports"
        title="Food cost & margin"
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="margins" />

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label="Blended margin" value={`${blended.toFixed(1)}%`} />
        <KpiTile label="Total revenue" value={`$${(rows ?? []).reduce((s, r) => s + r.revenue, 0).toFixed(2)}`} />
        <KpiTile label="Total food cost" value={`$${(rows ?? []).reduce((s, r) => s + r.cost, 0).toFixed(2)}`} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyField={(row) => row.productId}
        emptyIcon={PieChart}
        emptyTitle="No sales yet"
        emptyDescription="Margins are calculated from closed orders."
      />
    </AdminShell>
  );
}
