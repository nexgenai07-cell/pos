import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import type { Table, TableStatus } from "@/types";
import { getTables, openTable } from "@/lib/api/tables";
import { on } from "@/lib/eventBus";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { tableStatusLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";

const STATUS_TONE: Record<TableStatus, "neutral" | "accent" | "warn"> = {
  empty: "neutral",
  occupied: "accent",
  "needs-bill": "warn",
};

/** Legend + tile order — labels come from common:status via tableStatusLabel(). */
const LEGEND_STATUSES: TableStatus[] = ["empty", "occupied", "needs-bill"];

const STATUS_DOT: Record<TableStatus, string> = {
  empty: "bg-status-empty",
  occupied: "bg-accent",
  "needs-bill": "bg-status-warn",
};

export default function TableMapPage() {
  const [tables, setTables] = useState<Table[] | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");

  const refresh = useCallback(() => {
    getTables().then(setTables);
  }, []);

  useEffect(() => {
    refresh();
    // Live: a table opened/closed from any device on the same origin
    // updates this map instantly — see docs/architecture-plan.md §08.
    return on("table:updated", refresh);
  }, [refresh]);

  async function handleTableClick(table: Table) {
    if (table.status === "needs-bill") {
      navigate(`/pos/table/${table.id}/payment`);
      return;
    }
    if (table.status === "empty") {
      await openTable(table.id);
    }
    navigate(`/pos/table/${table.id}`);
  }

  return (
    <AdminShell fitScreen>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("map.title")}
        actions={
          <div className="flex items-center gap-3 text-xs font-medium text-ink-soft">
            {LEGEND_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                {tableStatusLabel(tCommon, status)}
              </span>
            ))}
          </div>
        }
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-1">
        {tables === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title={t("map.emptyTitle")}
            description={t("map.emptyDescription")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className="flex min-h-24 flex-col items-start justify-center gap-2.5 rounded-xl border border-border bg-surface-raised p-5 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md active:scale-[0.98] active:shadow-sm"
              >
                <span className="text-lg font-semibold text-ink">{table.label}</span>
                <StatusPill label={tableStatusLabel(tCommon, table.status)} tone={STATUS_TONE[table.status]} />
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
