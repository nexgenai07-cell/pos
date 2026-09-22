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

const STATUS_TONE: Record<TableStatus, "neutral" | "accent" | "warn"> = {
  empty: "neutral",
  occupied: "accent",
  "needs-bill": "warn",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  empty: "Empty",
  occupied: "Occupied",
  "needs-bill": "Needs bill",
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

  const refresh = useCallback(() => {
    getTables().then(setTables);
  }, []);

  useEffect(() => {
    refresh();
    return on("table:updated", refresh);
  }, [refresh]);

  const activeCount = countActiveFilters({ status: statusFilter !== "all" ? statusFilter : "", sort: sortKey !== "label" ? sortKey : "" });

  const chips: FilterChip[] = [];
  if (statusFilter !== "all") chips.push({ key: "status", label: `Status: ${STATUS_LABEL[statusFilter]}` });
  if (sortKey !== "label") chips.push({ key: "sort", label: "Sorted by status" });

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
      sortKey === "status" ? a.status.localeCompare(b.status) : a.label.localeCompare(b.label, undefined, { numeric: true })
    );
  }, [tables, search, statusFilter, sortKey]);

  const inUseCount = (tables ?? []).filter((table) => table.status !== "empty" || table.sessionToken).length;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      await createTable({ label: newLabel });
      setNewLabel("");
      refresh();
      showToast("Table added", "success");
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
      showToast("Table renamed", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(table: Table) {
    if (!window.confirm(`Remove table "${table.label}" from the floor plan?`)) return;
    setDeletingId(table.id);
    try {
      await deleteTable(table.id);
      refresh();
      showToast("Table removed", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }
  const columns: DataTableColumn<Table>[] = [
    {
      key: "label",
      header: "Table",
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
      header: "Status",
      sortable: true,
      accessor: (table) => table.status,
      render: (table) => <StatusPill label={STATUS_LABEL[table.status]} tone={STATUS_TONE[table.status]} size="sm" />,
    },
    {
      key: "session",
      header: "QR session",
      accessor: (table) => (table.sessionToken ? 1 : 0),
      render: (table) =>
        table.sessionToken ? (
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-ink-soft">{table.qrCode}</code>
        ) : (
          <span className="text-ink-soft/60">not seated</span>
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
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={savingEdit}>
              Cancel
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
              Rename
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(table)}
              loading={deletingId === table.id}
              disabled={table.status !== "empty" || Boolean(table.sessionToken)}
              title={table.status !== "empty" || table.sessionToken ? "In use — close the bill first" : "Remove this table"}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Delete
            </Button>
          </div>
        ),
    },
  ];
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Floor plan"
        title="Tables"
        description="Add or rename the tables on this floor. POS reads this list for its table map."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search tables…" className="w-48" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title="Filter tables" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Status" htmlFor="table-status">
            <Select id="table-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="all">Any status</option>
              <option value="empty">Empty</option>
              <option value="occupied">Occupied</option>
              <option value="needs-bill">Needs bill</option>
            </Select>
          </FilterField>
          <FilterField label="Sort by" htmlFor="table-sort">
            <Select id="table-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="label">Table name</option>
              <option value="status">Status</option>
            </Select>
          </FilterField>
          <FilterField label="Right now" className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {filtered?.length ?? 0} of {tables?.length ?? 0} tables shown · {inUseCount} currently in use
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
              New table
            </label>
            <Input
              id="new-table-label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="e.g. Patio 6"
              required
            />
          </div>
          <Button type="submit" loading={creating}>
            Add table
          </Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(table) => table.id}
        emptyIcon={LayoutGrid}
        emptyTitle={search || activeCount > 0 ? "No tables match" : "No tables yet"}
        emptyDescription={
          search || activeCount > 0
            ? "Try a different search or clear the filters."
            : "Add your first table above — it appears instantly on the POS table map."
        }
      />

      <p className="mt-3 text-xs text-ink-soft">
        Tables with an open bill can't be deleted — settle the bill from POS first. QR sessions are minted when a table is opened.
      </p>
    </AdminShell>
  );
}
