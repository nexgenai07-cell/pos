import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart } from "lucide-react";
import { getMargins, type MarginRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { formatCurrency, formatNumber } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import StatusPill from "@/components/ui/StatusPill";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function MarginsPage() {
  const { t } = useTranslation("reports");
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
      header: t("columns.margins.product"),
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "revenue",
      header: t("columns.margins.revenue"),
      sortable: true,
      align: "right",
      accessor: (row) => row.revenue,
      render: (row) => <span className="tabular-nums text-ink-soft">{formatCurrency(row.revenue)}</span>,
    },
    {
      key: "cost",
      header: t("columns.margins.cost"),
      sortable: true,
      align: "right",
      accessor: (row) => row.cost,
      render: (row) => <span className="tabular-nums text-ink-soft">{formatCurrency(row.cost)}</span>,
    },
    {
      key: "margin",
      header: t("columns.margins.margin"),
      sortable: true,
      align: "right",
      accessor: (row) => row.marginAmount,
      render: (row) => <span className="tabular-nums text-ink">{formatCurrency(row.marginAmount)}</span>,
    },
    {
      key: "marginPct",
      header: t("columns.margins.marginPct"),
      sortable: true,
      align: "right",
      accessor: (row) => row.marginPct,
      render: (row) => (
        <StatusPill
          label={`${formatNumber(row.marginPct, { maximumFractionDigits: 0 })}%`}
          tone={row.marginPct >= 60 ? "good" : row.marginPct >= 40 ? "accent" : "warn"}
        />
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.margins.eyebrow")}
        title={t("page.margins.title")}
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
        <KpiTile
          label={t("kpi.margins.grossMargin.title")}
          sub={t("kpi.margins.grossMargin.sub")}
          value={`${formatNumber(blended, { maximumFractionDigits: 1 })}%`}
        />
        <KpiTile
          label={t("kpi.margins.revenue.title")}
          sub={t("kpi.margins.revenue.sub")}
          value={formatCurrency((rows ?? []).reduce((s, r) => s + r.revenue, 0))}
        />
        <KpiTile
          label={t("kpi.margins.foodCost.title")}
          sub={t("kpi.margins.foodCost.sub")}
          value={formatCurrency((rows ?? []).reduce((s, r) => s + r.cost, 0))}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyField={(row) => row.productId}
        emptyIcon={PieChart}
        emptyTitle={t("empty.noMarginSales.title")}
        emptyDescription={t("empty.noMarginSales.description")}
      />
    </AdminShell>
  );
}
