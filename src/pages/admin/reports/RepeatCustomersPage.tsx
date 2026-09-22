import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getRepeatCustomers, type RepeatCustomerRow } from "@/lib/api/reports";
import { exportToCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import KpiTile from "@/components/reports/KpiTile";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import BackToReports from "@/components/reports/BackToReports";
import ReportExportBar from "@/components/reports/ReportExportBar";
import { ReportDateFilterButton, ReportDateFilterPanel, useReportDateRange } from "@/components/reports/ReportDateFilter";

export default function RepeatCustomersPage() {
  const dateRange = useReportDateRange("report-repeat-customers-filters");
  const [rows, setRows] = useState<RepeatCustomerRow[] | null>(null);
  const [share, setShare] = useState(0);

  useEffect(() => {
    getRepeatCustomers({ from: dateRange.range.from, to: dateRange.range.to }).then(({ rows: data, repeatOrderShare }) => {
      setRows(data);
      setShare(repeatOrderShare);
    });
  }, [dateRange.range.from, dateRange.range.to]);

  function handleExport() {
    exportToCsv("repeat-customers", rows ?? [], [
      { header: "Phone", accessor: (row) => row.phone },
      { header: "Visits", accessor: (row) => row.visits },
      { header: "Total spend", accessor: (row) => row.totalSpend.toFixed(2) },
      { header: "Last order", accessor: (row) => row.lastOrderAt },
    ]);
  }

  const columns: DataTableColumn<RepeatCustomerRow>[] = [
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      accessor: (row) => row.phone,
      render: (row) => <span className="font-medium text-ink">{row.phone}</span>,
    },
    {
      key: "visits",
      header: "Visits",
      sortable: true,
      align: "right",
      accessor: (row) => row.visits,
      render: (row) => <span className="tabular-nums text-ink">{row.visits}</span>,
    },
    {
      key: "totalSpend",
      header: "Total spend",
      sortable: true,
      align: "right",
      accessor: (row) => row.totalSpend,
      render: (row) => <span className="tabular-nums text-ink">${row.totalSpend.toFixed(2)}</span>,
    },
    {
      key: "lastOrder",
      header: "Last order",
      sortable: true,
      accessor: (row) => row.lastOrderAt,
      render: (row) => <span className="text-ink-soft">{formatDate(row.lastOrderAt)}</span>,
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Reports"
        title="Repeat customers"
        actions={
          <>
            <ReportDateFilterButton state={dateRange} />
            <ReportExportBar onExportCsv={handleExport} />
            <BackToReports />
          </>
        }
      />

      <ReportDateFilterPanel state={dateRange} idPrefix="repeat-customers" />

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label="Repeat customers" value={String((rows ?? []).length)} />
        <KpiTile label="Orders from repeats" value={`${share.toFixed(0)}%`} sub="of orders with a phone on file" />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyField={(row) => row.customerId}
        emptyIcon={Users}
        emptyTitle="No repeat customers yet"
        emptyDescription="Customers who order more than once will show up here."
      />

      <p className="mt-3 text-xs text-ink-soft">
        Only counts orders where a phone number was captured — optional on POS, required on the QR ordering flow.
      </p>
    </AdminShell>
  );
}
