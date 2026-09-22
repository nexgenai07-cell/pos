import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Mail, Pencil, Trash2 } from "lucide-react";
import type { Supplier } from "@/types";
import { deleteSupplier, getSuppliers } from "@/lib/api/suppliers";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
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

type ContactFilter = "all" | "yes" | "no";
type SortKey = "name" | "contact";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { open, toggle } = useFilterPanelState("supplier-filters");

  const refresh = useCallback(() => {
    getSuppliers().then(setSuppliers);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(supplier: Supplier) {
    if (!window.confirm(`Delete supplier "${supplier.name}"? This can't be undone.`)) return;
    setDeletingId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      refresh();
      showToast("Supplier deleted", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = countActiveFilters({
    contact: contactFilter !== "all" ? contactFilter : "",
    sort: sortKey !== "name" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (contactFilter !== "all") chips.push({ key: "contact", label: `Contact: ${contactFilter === "yes" ? "on file" : "missing"}` });
  if (sortKey !== "name") chips.push({ key: "sort", label: `Sorted by ${sortKey}` });

  function removeChip(key: string) {
    if (key === "contact") setContactFilter("all");
    if (key === "sort") setSortKey("name");
  }

  function resetFilters() {
    setContactFilter("all");
    setSortKey("name");
  }

  const filtered = useMemo(() => {
    if (!suppliers) return null;
    const list = suppliers.filter((supplier) => {
      if (!matchesSearch(`${supplier.name} ${supplier.contactInfo}`, search)) return false;
      if (contactFilter === "yes" && !supplier.contactInfo) return false;
      if (contactFilter === "no" && supplier.contactInfo) return false;
      return true;
    });

    return [...list].sort((a, b) =>
      sortKey === "contact" ? a.contactInfo.localeCompare(b.contactInfo) : a.name.localeCompare(b.name)
    );
  }, [suppliers, search, contactFilter, sortKey]);

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      accessor: (supplier) => supplier.name,
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft">
            <Building2 className="h-4 w-4 text-accent" strokeWidth={2} />
          </div>
          <span className="font-medium text-ink">{supplier.name}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      sortable: true,
      accessor: (supplier) => supplier.contactInfo,
      render: (supplier) =>
        supplier.contactInfo ? (
          <span className="flex items-center gap-1.5 text-ink-soft">
            <Mail className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
            {supplier.contactInfo}
          </span>
        ) : (
          <span className="text-ink-soft/60">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (supplier) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/inventory/suppliers/${supplier.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(supplier)} loading={deletingId === supplier.id}>
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
        eyebrow="Inventory"
        title="Suppliers"
        description="Vendors you order ingredients from."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Link to="/admin/inventory/suppliers/new">
              <Button>New supplier</Button>
            </Link>
          </>
        }
      />

      <FilterPanel open={open} title="Filter suppliers" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Contact info" htmlFor="supplier-contact-filter">
            <Select
              id="supplier-contact-filter"
              value={contactFilter}
              onChange={(event) => setContactFilter(event.target.value as ContactFilter)}
            >
              <option value="all">Any</option>
              <option value="yes">Has contact details</option>
              <option value="no">Missing contact details</option>
            </Select>
          </FilterField>

          <FilterField label="Sort by" htmlFor="supplier-sort">
            <Select id="supplier-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">Name</option>
              <option value="contact">Contact info</option>
            </Select>
          </FilterField>

          <FilterField label="Showing" className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {filtered?.length ?? 0} of {suppliers?.length ?? 0} suppliers shown
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(supplier) => supplier.id}
        emptyIcon={Building2}
        emptyTitle={search || activeCount > 0 ? "No suppliers match" : "No suppliers yet"}
        emptyDescription={
          search || activeCount > 0 ? "Try a different search or clear the filters." : "Add a supplier to start creating purchase orders."
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/inventory/suppliers/new">
              <Button size="sm">New supplier</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
