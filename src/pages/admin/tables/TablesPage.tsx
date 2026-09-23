import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Pencil, Trash2 } from "lucide-react";
import type { Table, TableStatus } from "@/types";
import { createTable, deleteTable, getTables, updateTable } from "@/lib/api/tables";
import { on } from "@/lib/eventBus";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import {
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToggleButton,
  useFilterPanelState,
  type FilterChip,
} from "@/components/ui/FilterPanel";
import { tableStatusLabel } from "@/lib/i18n/labels";
import { useLocale } from "@/lib/i18n/useLocale";
import { useTranslation } from "react-i18next";

const STATUS_TONE: Record<TableStatus, "neutral" | "accent" | "warn"> = {
  empty: "neutral",
  occupied: "accent",
  "needs-bill": "warn",
};

type StatusFilter = "all" | TableStatus;
type SortKey = "label" | "status";

export default function TablesPage() {
  const [tables, setTables] = useState<Table[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("label");

  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { open, toggle } = useFilterPanelState("table-filters");
  const { showToast } = useToast();
  const { t } = useTranslation("tables");
  const { t: tCommon } = useTranslation("common");
  const { locale } = useLocale();

  const refresh = useCallback(() => {
    getTables().then(setTables);
  }, []);

  useEffect(() => {
    refresh();
    return on("table:updated", refresh);
  }, [refresh]);

  const activeCount = countActiveFilters({ status: statusFilter !== "all" ? statusFilter : "", sort: sortKey !== "label" ? sortKey : "" });

  const chips: FilterChip[] = [];
  if (statusFilter !== "all") chips.push({ key: "status", label: t("chipStatus", { status: tableStatusLabel(tCommon, statusFilter) }) });
  if (sortKey !== "label") chips.push({ key: "sort", label: t("chipSortedByStatus") });

  function removeChip(key: string) {
    if (key === "status") setStatusFilter("all");
    if (key === "sort") setSortKey("label");
  }

  function resetFilters() {
    setStatusFilter("all");
    setSortKey("label");
  }

  const filtered = useMemo(() => {
    if (!tables) return null;
    const list = tables.filter((table) => {
      if (!matchesSearch(table.label, search)) return false;
      if (statusFilter !== "all" && table.status !== statusFilter) return false;
      return true;
    });

    return [...list].sort((a, b) =>
      sortKey === "status"
        ? a.status.localeCompare(b.status, locale)
        : a.label.localeCompare(b.label, locale, { numeric: true })
    );
  }, [tables, search, statusFilter, sortKey, locale]);

  const inUseCount = (tables ?? []).filter((table) => table.status !== "empty" || table.sessionToken).length;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      await createTable({ label: newLabel });
      setNewLabel("");
      refresh();
      showToast(t("toastAdded"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    try {
      await updateTable(id, { label: editLabel });
      setEditingId(null);
      refresh();
      showToast(t("toastRenamed"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(table: Table) {
    if (!window.confirm(t("confirmDelete", { label: table.label }))) return;
    setDeletingId(table.id);
    try {
      await deleteTable(table.id);
      refresh();
      showToast(t("toastRemoved"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }
  const columns: DataTableColumn<Table>[] = [
    {
      key: "label",
      header: t("colTable"),
      sortable: true,
      accessor: (table) => table.label,
      render: (table) =>
        editingId === table.id ? (
          <Input
            value={editLabel}
            onChange={(event) => setEditLabel(event.target.value)}
            className="max-w-[10rem] py-1!"
            autoFocus
          />
        ) : (
          <span className="flex items-center gap-2 font-medium text-ink">
            <LayoutGrid className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            {table.label}
          </span>
        ),
    },
    {
      key: "status",
      header: t("colStatus"),
      sortable: true,
      accessor: (table) => table.status,
      render: (table) => <StatusPill label={tableStatusLabel(tCommon, table.status)} tone={STATUS_TONE[table.status]} size="sm" />,
    },
    {
      key: "session",
      header: t("colQrSession"),
      accessor: (table) => (table.sessionToken ? 1 : 0),
      render: (table) =>
        table.sessionToken ? (
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-ink-soft">{table.qrCode}</code>
        ) : (
          <span className="text-ink-soft/60">{t("notSeated")}</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (table) =>
        editingId === table.id ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" onClick={() => handleSaveEdit(table.id)} loading={savingEdit}>
              {tCommon("actions.save")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={savingEdit}>
              {tCommon("actions.cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingId(table.id);
                setEditLabel(table.label);
              }}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              {t("rename")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(table)}
              loading={deletingId === table.id}
              disabled={table.status !== "empty" || Boolean(table.sessionToken)}
              title={table.status !== "empty" || table.sessionToken ? t("inUseTitle") : t("removeTitle")}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.delete")}
            </Button>
          </div>
        ),
    },
  ];
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} className="w-48" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title={t("filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("statusLabel")} htmlFor="table-status">
            <Select id="table-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="all">{t("anyStatus")}</option>
              <option value="empty">{tableStatusLabel(tCommon, "empty")}</option>
              <option value="occupied">{tableStatusLabel(tCommon, "occupied")}</option>
              <option value="needs-bill">{tableStatusLabel(tCommon, "needs-bill")}</option>
            </Select>
          </FilterField>
          <FilterField label={t("sortBy")} htmlFor="table-sort">
            <Select id="table-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="label">{t("sortLabel")}</option>
              <option value="status">{t("sortStatus")}</option>
            </Select>
          </FilterField>
          <FilterField label={t("rightNow")} className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("summary", { shown: filtered?.length ?? 0, total: tables?.length ?? 0, inUse: inUseCount })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <Card className="mb-4" padding="md">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="new-table-label"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
            >
              {t("newTable")}
            </label>
            <Input
              id="new-table-label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder={t("newTablePlaceholder")}
              required
            />
          </div>
          <Button type="submit" loading={creating}>
            {t("addTable")}
          </Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(table) => table.id}
        emptyIcon={LayoutGrid}
        emptyTitle={search || activeCount > 0 ? t("emptyFilteredTitle") : t("emptyTitle")}
        emptyDescription={
          search || activeCount > 0 ? t("emptyFilteredDescription") : t("emptyDescription")
        }
      />

      <p className="mt-3 text-xs text-ink-soft">{t("footerNote")}</p>
    </AdminShell>
  );
}
