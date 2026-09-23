import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Download, Pencil, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InventoryItem, Supplier } from "@/types";
import {
  adjustStock,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  updateInventoryItem,
} from "@/lib/api/inventory";
import { getRecipes } from "@/lib/api/recipes";
import { getSuppliers } from "@/lib/api/suppliers";
import { on } from "@/lib/eventBus";
import { exportToCsv } from "@/lib/csv";
import { formatCurrency, formatNumber } from "@/lib/format";
import { countActiveFilters, matchesSearch, uniqueSorted } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
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

type StockStatus = "all" | "low" | "ok" | "out";
type SortKey = "name" | "stock" | "par" | "value";

const STOCK_STATUS_LABEL_KEY = {
  low: "stockPage.atOrBelowPar",
  out: "stockPage.outOfStock",
  ok: "stockPage.healthy",
} as const satisfies Record<Exclude<StockStatus, "all">, string>;

const SORT_KEY_LABEL_KEY = {
  name: "stockPage.sortName",
  stock: "stockPage.sortLowestOnHand",
  par: "stockPage.sortHighestPar",
  value: "stockPage.sortValue",
} as const satisfies Record<SortKey, string>;

interface Draft {
  name: string;
  unit: string;
  supplierId: string;
  parLevel: string;
  costPerUnit: string;
  currentStock: string;
}

const EMPTY_DRAFT: Draft = { name: "", unit: "unit", supplierId: "", parLevel: "", costPerUnit: "", currentStock: "0" };

function statusOf(item: InventoryItem): Exclude<StockStatus, "all"> {
  if (item.currentStock <= 0) return "out";
  if (item.currentStock <= item.parLevel) return "low";
  return "ok";
}

export default function StockPage() {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipeUsage, setRecipeUsage] = useState<Map<string, number>>(new Map());

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const [editorMode, setEditorMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [wasteInputs, setWasteInputs] = useState<Record<string, string>>({});

  const { open, toggle } = useFilterPanelState("stock-filters");
  const { showToast } = useToast();

  const refresh = useCallback(() => {
    getInventoryItems().then(setItems);
    getSuppliers().then(setSuppliers);
    getRecipes().then((recipes) => {
      const usage = new Map<string, number>();
      recipes.forEach((recipe) =>
        recipe.items.forEach((line) => usage.set(line.inventoryItemId, (usage.get(line.inventoryItemId) ?? 0) + 1))
      );
      setRecipeUsage(usage);
    });
  }, []);

  useEffect(() => {
    refresh();
    return on("inventory:updated", refresh);
  }, [refresh]);

  const units = uniqueSorted((items ?? []).map((item) => item.unit));

  const activeCount = countActiveFilters({
    supplier: supplierFilter !== "all" ? supplierFilter : "",
    status: statusFilter !== "all" ? statusFilter : "",
    unit: unitFilter !== "all" ? unitFilter : "",
    sort: sortKey !== "name" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (supplierFilter !== "all") {
    chips.push({
      key: "supplier",
      label: t("stockPage.chipSupplier", {
        name:
          supplierFilter === "none"
            ? t("stockPage.chipSupplierUnassigned")
            : suppliers.find((supplier) => supplier.id === supplierFilter)?.name ?? supplierFilter,
      }),
    });
  }
  if (statusFilter !== "all")
    chips.push({ key: "status", label: t("stockPage.chipStatus", { status: t(STOCK_STATUS_LABEL_KEY[statusFilter]) }) });
  if (unitFilter !== "all") chips.push({ key: "unit", label: t("stockPage.chipUnit", { unit: unitFilter }) });
  if (sortKey !== "name") chips.push({ key: "sort", label: t("stockPage.chipSortedBy", { sort: t(SORT_KEY_LABEL_KEY[sortKey]) }) });

  function removeChip(key: string) {
    if (key === "supplier") setSupplierFilter("all");
    if (key === "status") setStatusFilter("all");
    if (key === "unit") setUnitFilter("all");
    if (key === "sort") setSortKey("name");
  }

  function resetFilters() {
    setSupplierFilter("all");
    setStatusFilter("all");
    setUnitFilter("all");
    setSortKey("name");
  }

  const filtered = useMemo(() => {
    if (!items) return null;
    const list = items.filter((item) => {
      if (!matchesSearch(item.name, search)) return false;
      if (supplierFilter === "none" && item.supplierId) return false;
      if (supplierFilter !== "all" && supplierFilter !== "none" && item.supplierId !== supplierFilter) return false;
      if (statusFilter !== "all" && statusOf(item) !== statusFilter) return false;
      if (unitFilter !== "all" && item.unit !== unitFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortKey === "stock") return a.currentStock - b.currentStock;
      if (sortKey === "par") return a.parLevel - b.parLevel;
      if (sortKey === "value") return b.currentStock * b.costPerUnit - a.currentStock * a.costPerUnit;
      return a.name.localeCompare(b.name);
    });
  }, [items, search, supplierFilter, statusFilter, unitFilter, sortKey]);

  const lowStockCount = (items ?? []).filter((item) => statusOf(item) !== "ok").length;
  const stockValue = (items ?? []).reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0);
  function openNew() {
    setEditorMode("new");
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function openEdit(item: InventoryItem) {
    setEditorMode("edit");
    setEditingId(item.id);
    setDraft({
      name: item.name,
      unit: item.unit,
      supplierId: item.supplierId ?? "",
      parLevel: String(item.parLevel),
      costPerUnit: String(item.costPerUnit),
      currentStock: String(item.currentStock),
    });
  }

  function closeEditor() {
    setEditorMode("closed");
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function saveEditor(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        unit: draft.unit,
        supplierId: draft.supplierId,
        parLevel: Number(draft.parLevel) || 0,
        costPerUnit: Number(draft.costPerUnit) || 0,
        currentStock: Number(draft.currentStock) || 0,
      };

      if (editorMode === "edit" && editingId) {
        await updateInventoryItem(editingId, payload);
        showToast(t("stockPage.toastUpdated"), "success");
      } else {
        await createInventoryItem(payload);
        showToast(t("stockPage.toastAdded"), "success");
      }
      closeEditor();
      refresh();
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!window.confirm(t("stockPage.confirmDelete", { name: item.name }))) return;
    setDeletingId(item.id);
    try {
      await deleteInventoryItem(item.id);
      refresh();
      showToast(t("stockPage.toastDeleted"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogWaste(itemId: string) {
    const quantity = Number(wasteInputs[itemId]);
    if (!quantity || quantity <= 0) return;
    await adjustStock(itemId, -quantity, "waste");
    setWasteInputs((current) => ({ ...current, [itemId]: "" }));
    refresh();
    showToast(t("stockPage.toastWasteLogged"), "success");
  }

  function handleExport() {
    exportToCsv("stock", filtered ?? [], [
      { header: "Ingredient", accessor: (row) => row.name },
      { header: "Unit", accessor: (row) => row.unit },
      { header: "On hand", accessor: (row) => row.currentStock },
      { header: "Par level", accessor: (row) => row.parLevel },
      { header: "Cost per unit", accessor: (row) => row.costPerUnit.toFixed(3) },
      { header: "Stock value", accessor: (row) => (row.currentStock * row.costPerUnit).toFixed(2) },
      { header: "Status", accessor: (row) => statusOf(row) },
    ]);
  }
  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: "name",
      header: t("stockPage.colIngredient"),
      sortable: true,
      accessor: (item) => item.name,
      render: (item) => (
        <div>
          <p className="font-medium text-ink">{item.name}</p>
          <p className="text-xs text-ink-soft">
            {recipeUsage.get(item.id)
              ? t("stockPage.usedInRecipes", { count: recipeUsage.get(item.id) })
              : t("stockPage.noRecipe")}
          </p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: t("stockPage.colSupplier"),
      sortable: true,
      accessor: (item) => suppliers.find((supplier) => supplier.id === item.supplierId)?.name ?? "",
      render: (item) => (
        <span className="text-ink-soft">
          {suppliers.find((supplier) => supplier.id === item.supplierId)?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "stock",
      header: t("stockPage.colOnHand"),
      sortable: true,
      align: "right",
      accessor: (item) => item.currentStock,
      render: (item) => (
        <span className="tabular-nums text-ink">
          {formatNumber(item.currentStock)} {item.unit}
        </span>
      ),
    },
    {
      key: "parLevel",
      header: t("stockPage.colParLevel"),
      sortable: true,
      align: "right",
      accessor: (item) => item.parLevel,
      render: (item) => (
        <span className="tabular-nums text-ink-soft">
          {formatNumber(item.parLevel)} {item.unit}
        </span>
      ),
    },
    {
      key: "cost",
      header: t("stockPage.colCostPerUnit"),
      sortable: true,
      align: "right",
      accessor: (item) => item.costPerUnit,
      render: (item) => <span className="tabular-nums text-ink-soft">{formatCurrency(item.costPerUnit)}</span>,
    },
    {
      key: "status",
      header: t("stockPage.colStatus"),
      sortable: true,
      accessor: (item) => (item.currentStock <= item.parLevel ? 0 : 1),
      render: (item) => {
        const status = statusOf(item);
        return (
          <StatusPill
            label={status === "out" ? t("stockPage.statusOut") : status === "low" ? t("stockPage.statusLow") : t("stockPage.statusOk")}
            tone={status === "out" ? "danger" : status === "low" ? "warn" : "good"}
            size="sm"
          />
        );
      },
    },
    {
      key: "waste",
      header: t("stockPage.colLogWaste"),
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min="0"
            placeholder={t("stockPage.wastePlaceholder")}
            value={wasteInputs[item.id] ?? ""}
            onChange={(event) => setWasteInputs((current) => ({ ...current, [item.id]: event.target.value }))}
            className="w-16 py-1! text-xs"
          />
          <Button variant="secondary" size="sm" onClick={() => handleLogWaste(item.id)}>
            {t("stockPage.logButton")}
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            {tCommon("actions.edit")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(item)}
            loading={deletingId === item.id}
            disabled={recipeUsage.has(item.id)}
            title={recipeUsage.has(item.id) ? t("stockPage.deleteDisabledTitle") : t("stockPage.deleteEnabledTitle")}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {tCommon("actions.delete")}
          </Button>
        </div>
      ),
    },
  ];

  const editing = editorMode !== "closed";
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("stockPage.eyebrow")}
        title={t("stockPage.title")}
        description={t("stockPage.description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("stockPage.searchPlaceholder")} className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Button variant="secondary" onClick={handleExport} title={t("stockPage.exportTitle")}>
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {t("stockPage.exportButton")}
            </Button>
            <Button onClick={editing ? closeEditor : openNew}>{editing ? t("stockPage.closeForm") : t("stockPage.newIngredient")}</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("stockPage.statTracked")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatNumber(items?.length ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-status-warn/30 bg-status-warn/10 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-status-warn">{t("stockPage.statLowOrOut")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-status-warn">{formatNumber(lowStockCount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("stockPage.statStockValue")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatCurrency(stockValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("stockPage.statShowing")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatNumber(filtered?.length ?? 0)}</p>
        </div>
      </div>

      <FilterPanel open={open} title={t("stockPage.filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("stockPage.supplierLabel")} htmlFor="stock-supplier">
            <Select id="stock-supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="all">{t("stockPage.allSuppliers")}</option>
              <option value="none">{t("stockPage.noSupplierAssigned")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("stockPage.stockStatusLabel")} htmlFor="stock-status">
            <Select id="stock-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StockStatus)}>
              <option value="all">{t("stockPage.anyLevel")}</option>
              <option value="low">{t("stockPage.atOrBelowPar")}</option>
              <option value="out">{t("stockPage.outOfStock")}</option>
              <option value="ok">{t("stockPage.healthy")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("stockPage.unitLabel")} htmlFor="stock-unit">
            <Select id="stock-unit" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
              <option value="all">{t("stockPage.anyUnit")}</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("stockPage.sortByLabel")} htmlFor="stock-sort">
            <Select id="stock-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">{t("stockPage.sortName")}</option>
              <option value="stock">{t("stockPage.sortLowestOnHand")}</option>
              <option value="par">{t("stockPage.sortHighestPar")}</option>
              <option value="value">{t("stockPage.sortValue")}</option>
            </Select>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      {editing && (
        <Card className="mt-4 border-accent/30 shadow-md" padding="lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
              {editorMode === "edit" ? t("stockPage.editorTitleEdit") : t("stockPage.editorTitleNew")}
            </p>
            <button
              type="button"
              onClick={closeEditor}
              aria-label={t("stockPage.closeFormAria")}
              className="rounded-md p-1 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <form onSubmit={saveEditor} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("stockPage.fieldName")} htmlFor="stock-name" required>
                <Input
                  id="stock-name"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </FormField>

              <FormField label={t("stockPage.fieldUnit")} htmlFor="stock-unit-field" hint={t("stockPage.fieldUnitHint")}>
                <Input
                  id="stock-unit-field"
                  value={draft.unit}
                  onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                />
              </FormField>

              <FormField label={t("stockPage.fieldSupplier")} htmlFor="stock-supplier-field">
                <Select
                  id="stock-supplier-field"
                  value={draft.supplierId}
                  onChange={(event) => setDraft((current) => ({ ...current, supplierId: event.target.value }))}
                >
                  <option value="">{t("stockPage.notAssigned")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t("stockPage.fieldParLevel")} htmlFor="stock-par" hint={t("stockPage.fieldParLevelHint")}>
                <Input
                  id="stock-par"
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.parLevel}
                  onChange={(event) => setDraft((current) => ({ ...current, parLevel: event.target.value }))}
                />
              </FormField>

              <FormField label={t("stockPage.fieldCostPerUnit")} htmlFor="stock-cost">
                <Input
                  id="stock-cost"
                  type="number"
                  min="0"
                  step="0.001"
                  value={draft.costPerUnit}
                  onChange={(event) => setDraft((current) => ({ ...current, costPerUnit: event.target.value }))}
                />
              </FormField>

              <FormField label={t("stockPage.fieldOnHand")} htmlFor="stock-onhand" hint={t("stockPage.fieldOnHandHint")}>
                <Input
                  id="stock-onhand"
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.currentStock}
                  onChange={(event) => setDraft((current) => ({ ...current, currentStock: event.target.value }))}
                />
              </FormField>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                {editorMode === "edit" ? tCommon("actions.saveChanges") : t("stockPage.addIngredientButton")}
              </Button>
              <Button type="button" variant="secondary" onClick={closeEditor} disabled={saving}>
                {tCommon("actions.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={filtered}
          keyField={(item) => item.id}
          emptyIcon={Boxes}
          emptyTitle={search || activeCount > 0 ? t("stockPage.emptyFilteredTitle") : t("stockPage.emptyTitle")}
          emptyDescription={
            search || activeCount > 0
              ? t("stockPage.emptyFilteredDescription")
              : t("stockPage.emptyDescription")
          }
          emptyAction={
            activeCount === 0 &&
            !search && (
              <Button size="sm" onClick={openNew}>
                {t("stockPage.emptyActionNew")}
              </Button>
            )
          }
        />
      </div>
    </AdminShell>
  );
}
