import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StockMovement } from "@/types";
import { getWastage, type WastageRow } from "@/lib/api/reports";
import { getInventoryItems } from "@/lib/api/inventory";
import type { InventoryItem } from "@/types";
import { exportToCsv } from "@/lib/csv";
import { formatDate, formatCurrency, formatNumber } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import { ChartWrapper } from "@/components/reports/ChartWrapper";
import { SimpleBarChart } from "@/components/reports/charts";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import Card from "@/components/ui/Card";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function WastagePage() {
  const { t } = useTranslation("reports");
  const dateRange = useReportDateRange("report-wastage-filters");
  const [rows, setRows] = useState<WastageRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [recent, setRecent] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    getWastage({ from: dateRange.range.from, to: dateRange.range.to }).then((data) => {
      setRows(data.rows);
      setTotalCost(data.totalCost);
      setTotalEvents(data.totalEvents);
      setRecent(data.recent);
    });
    getInventoryItems().then(setItems);
  }, [dateRange.range.from, dateRange.range.to]);

  const chartData = rows.map((row) => ({ label: row.name, value: row.cost }));

  function handleExport() {
    exportToCsv("wastage", rows, [
      { header: "Ingredient", accessor: (row) => row.name },
      { header: "Quantity", accessor: (row) => row.quantity },
      { header: "Unit", accessor: (row) => row.unit },
      { header: "Cost", accessor: (row) => row.cost.toFixed(2) },
    ]);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("page.wastage.eyebrow")}
        title={t("page.wastage.title")}
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="wastage" />

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label={t("kpi.wastage.wasteValue.title")} sub={t("kpi.wastage.wasteValue.sub")} value={formatCurrency(totalCost)} />
        <KpiTile label={t("kpi.wastage.wasteOrders.title")} sub={t("kpi.wastage.wasteOrders.sub")} value={formatNumber(totalEvents)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartWrapper title={t("charts.wasteCostByIngredient")}>
          <SimpleBarChart data={chartData} valueFormatter={(value) => formatCurrency(value)} horizontalBars />
        </ChartWrapper>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("page.wastage.recentLogHeading")}</p>
          <div className="space-y-1.5 text-sm">
            {recent.map((movement) => {
              const item = items.find((entry) => entry.id === movement.inventoryItemId);
              return (
                <div key={movement.id} className="flex items-center justify-between text-ink-soft">
                  <span>{item?.name ?? movement.inventoryItemId}</span>
                  <span className="tabular-nums text-ink">
                    {formatNumber(Math.abs(movement.quantityDelta))} {item?.unit} · {formatDate(movement.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
