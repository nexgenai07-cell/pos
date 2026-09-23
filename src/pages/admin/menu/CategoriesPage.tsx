import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/types";
import { createCategory, deleteCategory, getCategories, getProducts, updateCategory, type ProductWithCategory } from "@/lib/api/products";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("menu");
  const { t: tCommon } = useTranslation("common");

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
  if (sizeFilter !== "all") {
    chips.push({
      key: "size",
      label: sizeFilter === "empty" ? t("categoriesPage.chips.usageEmpty") : t("categoriesPage.chips.usagePopulated"),
    });
  }
  if (sortBy !== "order") {
    const sortLabel = sortBy === "name" ? t("categoriesPage.sortBy.name") : t("categoriesPage.sortBy.products");
    chips.push({ key: "sort", label: t("categoriesPage.chips.sortedBy", { sort: sortLabel }) });
  }

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
      showToast(t("categoriesPage.toastCreated"), "success");
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
      showToast(t("categoriesPage.toastUpdated"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(category: CategoryRow) {
    if (!window.confirm(t("categoriesPage.deleteConfirm", { name: category.name }))) return;
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      refresh();
      showToast(t("categoriesPage.toastDeleted"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }
  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "sortOrder",
      header: t("categoriesPage.columns.order"),
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
      header: t("categoriesPage.columns.name"),
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
      header: t("categoriesPage.columns.products"),
      sortable: true,
      align: "right",
      accessor: (row) => row.productCount,
      render: (row) => (
        <StatusPill
          label={row.productCount === 0 ? t("categoriesPage.productCountEmpty") : t("categoriesPage.productCount", { count: row.productCount })}
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
              {tCommon("actions.save")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={savingEdit}>
              {tCommon("actions.cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => startEdit(row)}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.edit")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row)}
              loading={deletingId === row.id}
              disabled={row.productCount > 0}
              title={row.productCount > 0 ? t("categoriesPage.deleteDisabledTitle") : t("categoriesPage.deleteTitle")}
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
        eyebrow={t("categoriesPage.eyebrow")}
        title={t("categoriesPage.title")}
        description={t("categoriesPage.description")}
        actions={
          <>
            <Link to="/admin/menu" className="text-sm font-medium text-accent hover:text-accent-hover">
              ← {t("categoriesPage.back")}
            </Link>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("categoriesPage.searchPlaceholder")}
              className="w-52"
            />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title={t("categoriesPage.filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("categoriesPage.usage.label")} htmlFor="category-usage">
            <Select
              id="category-usage"
              value={sizeFilter}
              onChange={(event) => setSizeFilter(event.target.value as typeof sizeFilter)}
            >
              <option value="all">{t("categoriesPage.usage.all")}</option>
              <option value="populated">{t("categoriesPage.usage.populated")}</option>
              <option value="empty">{t("categoriesPage.usage.empty")}</option>
            </Select>
          </FilterField>
          <FilterField label={t("categoriesPage.sortBy.label")} htmlFor="category-sort">
            <Select id="category-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="order">{t("categoriesPage.sortBy.order")}</option>
              <option value="name">{t("categoriesPage.sortBy.name")}</option>
              <option value="products">{t("categoriesPage.sortBy.products")}</option>
            </Select>
          </FilterField>
          <FilterField label={t("categoriesPage.showingLabel")} className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("categoriesPage.showing", { shown: filtered.length, total: rows.length })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <Card className="mb-4" padding="md">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <InlineLabel label={t("categoriesPage.newCategory.label")} htmlFor="new-category-name">
              <Input
                id="new-category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("categoriesPage.newCategory.placeholder")}
                required
              />
            </InlineLabel>
          </div>
          <div className="w-28">
            <InlineLabel label={t("categoriesPage.newCategory.sortOrderLabel")} htmlFor="new-category-order">
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
            {t("categoriesPage.addButton")}
          </Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(row) => row.id}
        emptyIcon={Tags}
        emptyTitle={search || activeCount > 0 ? t("categoriesPage.emptyFilteredTitle") : t("categoriesPage.emptyTitle")}
        emptyDescription={
          search || activeCount > 0
            ? t("categoriesPage.emptyFilteredDescription")
            : t("categoriesPage.emptyDescription")
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
