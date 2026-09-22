import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/types";
import { createCategory, deleteCategory, getCategories, getProducts, updateCategory, type ProductWithCategory } from "@/lib/api/products";
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

interface CategoryRow extends Category {
  productCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [saving, setSaving] = useState(false);

  const [sizeFilter, setSizeFilter] = useState<"all" | "empty" | "populated">("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "products">("order");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", sortOrder: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { open, toggle } = useFilterPanelState("menu-category-filters");
  const { showToast } = useToast();

  const refresh = useCallback(() => {
    getCategories().then(setCategories);
    getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows: CategoryRow[] = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        productCount: products.filter((product) => product.categoryId === category.id).length,
      })),
    [categories, products]
  );

  const activeCount = countActiveFilters({
    size: sizeFilter !== "all" ? sizeFilter : "",
    sort: sortBy !== "order" ? sortBy : "",
  });

  const chips: FilterChip[] = [];
  if (sizeFilter !== "all") chips.push({ key: "size", label: `Usage: ${sizeFilter === "empty" ? "empty" : "has products"}` });
  if (sortBy !== "order") chips.push({ key: "sort", label: `Sorted by ${sortBy}` });

  function removeChip(key: string) {
    if (key === "size") setSizeFilter("all");
    if (key === "sort") setSortBy("order");
  }

  function resetFilters() {
    setSizeFilter("all");
    setSortBy("order");
  }

  const filtered = useMemo(() => {
    const list = rows.filter((row) => {
      if (!matchesSearch(row.name, search)) return false;
      if (sizeFilter === "empty" && row.productCount > 0) return false;
      if (sizeFilter === "populated" && row.productCount === 0) return false;
      return true;
    });

    if (sortBy === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "products") return [...list].sort((a, b) => b.productCount - a.productCount);
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rows, search, sizeFilter, sortBy]);

  // Category counts are derived per row below, so no extra index is needed here.

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createCategory({ name, sortOrder: sortOrder ? Number(sortOrder) : undefined });
      setName("");
      setSortOrder("");
      refresh();
      showToast("Category created", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditDraft({ name: category.name, sortOrder: String(category.sortOrder) });
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      await updateCategory(id, { name: editDraft.name, sortOrder: Number(editDraft.sortOrder) || 0 });
      setEditingId(null);
      refresh();
      showToast("Category updated", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(category: CategoryRow) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      refresh();
      showToast("Category deleted", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }
  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "sortOrder",
      header: "#",
      sortable: true,
      align: "right",
      accessor: (row) => row.sortOrder,
      render: (row) =>
        editingId === row.id ? (
          <Input
            type="number"
            min="0"
            value={editDraft.sortOrder}
            onChange={(event) => setEditDraft((current) => ({ ...current, sortOrder: event.target.value }))}
            className="w-16 py-1! text-end"
          />
        ) : (
          <span className="tabular-nums text-ink-soft">{row.sortOrder}</span>
        ),
    },
    {
      key: "name",
      header: "Category",
      sortable: true,
      accessor: (row) => row.name,
      render: (row) =>
        editingId === row.id ? (
          <Input
            value={editDraft.name}
            onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
            className="max-w-xs py-1!"
          />
        ) : (
          <span className="font-medium text-ink">{row.name}</span>
        ),
    },
    {
      key: "products",
      header: "Products",
      sortable: true,
      align: "right",
      accessor: (row) => row.productCount,
      render: (row) => (
        <StatusPill
          label={row.productCount === 0 ? "Empty" : `${row.productCount} item${row.productCount === 1 ? "" : "s"}`}
          tone={row.productCount === 0 ? "warn" : "accent"}
          size="sm"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        editingId === row.id ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" onClick={() => saveEdit(row.id)} loading={savingEdit}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={savingEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => startEdit(row)}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row)}
              loading={deletingId === row.id}
              disabled={row.productCount > 0}
              title={row.productCount > 0 ? "Move its products to another category first" : "Delete category"}
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
        eyebrow="Menu · Categories"
        title="Menu categories"
        description="The tabs guests and cashiers see. Sort order controls where each one appears."
        actions={
          <>
            <Link to="/admin/menu" className="text-sm font-medium text-accent hover:text-accent-hover">
              ← Back to menu
            </Link>
            <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title="Filter categories" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Usage" htmlFor="category-usage">
            <Select
              id="category-usage"
              value={sizeFilter}
              onChange={(event) => setSizeFilter(event.target.value as typeof sizeFilter)}
            >
              <option value="all">All categories</option>
              <option value="populated">Has products</option>
              <option value="empty">Empty</option>
            </Select>
          </FilterField>
          <FilterField label="Sort by" htmlFor="category-sort">
            <Select id="category-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="order">Menu order</option>
              <option value="name">Name</option>
              <option value="products">Most products</option>
            </Select>
          </FilterField>
          <FilterField label="Showing" className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {filtered.length} of {rows.length} categories shown
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <Card className="mb-4" padding="md">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <InlineLabel label="New category" htmlFor="new-category-name">
              <Input
                id="new-category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Desserts"
                required
              />
            </InlineLabel>
          </div>
          <div className="w-28">
            <InlineLabel label="Sort order" htmlFor="new-category-order">
              <Input
                id="new-category-order"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                placeholder={String(categories.length + 1)}
              />
            </InlineLabel>
          </div>
          <Button type="submit" loading={saving}>
            Add category
          </Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(row) => row.id}
        emptyIcon={Tags}
        emptyTitle={search || activeCount > 0 ? "No categories match" : "No categories yet"}
        emptyDescription={
          search || activeCount > 0
            ? "Try a different search or clear the filters."
            : "Add a category above, then assign products to it from the menu."
        }
      />
    </AdminShell>
  );
}

/** Compact label wrapper so the inline create form matches FormField's look. */
function InlineLabel({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}
