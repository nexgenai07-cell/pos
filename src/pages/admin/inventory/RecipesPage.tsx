import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Category, Recipe } from "@/types";
import { getCategories, getProducts, type ProductWithCategory } from "@/lib/api/products";
import { deleteRecipeForProduct, getRecipes } from "@/lib/api/recipes";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import DataTable, { DataTableThumbnail, type DataTableColumn } from "@/components/ui/DataTable";
import {
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToggleButton,
  useFilterPanelState,
  type FilterChip,
} from "@/components/ui/FilterPanel";

type RecipeFilter = "all" | "with" | "without";
type SortKey = "name" | "category" | "ingredients";

const SORT_KEY_LABEL_KEY = {
  name: "recipesPage.sortProductName",
  category: "recipesPage.sortCategory",
  ingredients: "recipesPage.sortMostIngredients",
} as const satisfies Record<SortKey, string>;

export default function RecipesPage() {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const [products, setProducts] = useState<ProductWithCategory[] | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [clearingId, setClearingId] = useState<string | null>(null);

  const { open, toggle } = useFilterPanelState("recipe-filters");
  const { showToast } = useToast();

  const refresh = useCallback(() => {
    getProducts().then(setProducts);
    getRecipes().then(setRecipes);
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function recipeFor(productId: string) {
    return recipes.find((entry) => entry.productId === productId);
  }

  const activeCount = countActiveFilters({
    category: categoryFilter !== "all" ? categoryFilter : "",
    recipe: recipeFilter !== "all" ? recipeFilter : "",
    sort: sortKey !== "name" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (categoryFilter !== "all") {
    chips.push({
      key: "category",
      label: t("recipesPage.chipCategory", {
        category: categories.find((category) => category.id === categoryFilter)?.name ?? categoryFilter,
      }),
    });
  }
  if (recipeFilter !== "all") {
    chips.push({
      key: "recipe",
      label: t("recipesPage.chipRecipe", {
        state: recipeFilter === "with" ? t("recipesPage.chipRecipeCosted") : t("recipesPage.chipRecipeMissing"),
      }),
    });
  }
  if (sortKey !== "name")
    chips.push({ key: "sort", label: t("recipesPage.chipSortedBy", { sort: t(SORT_KEY_LABEL_KEY[sortKey]) }) });

  function removeChip(key: string) {
    if (key === "category") setCategoryFilter("all");
    if (key === "recipe") setRecipeFilter("all");
    if (key === "sort") setSortKey("name");
  }

  function resetFilters() {
    setCategoryFilter("all");
    setRecipeFilter("all");
    setSortKey("name");
  }

  const filtered = useMemo(() => {
    if (!products) return null;
    const list = products.filter((product) => {
      if (!matchesSearch(`${product.name} ${product.categoryName}`, search)) return false;
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;

      const recipe = recipes.find((entry) => entry.productId === product.id);
      const hasRecipe = Boolean(recipe && recipe.items.length > 0);
      if (recipeFilter === "with" && !hasRecipe) return false;
      if (recipeFilter === "without" && hasRecipe) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortKey === "category") return a.categoryName.localeCompare(b.categoryName);
      if (sortKey === "ingredients") {
        const aCount = recipes.find((entry) => entry.productId === a.id)?.items.length ?? 0;
        const bCount = recipes.find((entry) => entry.productId === b.id)?.items.length ?? 0;
        return bCount - aCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, recipes, search, categoryFilter, recipeFilter, sortKey]);

  const costedCount = (products ?? []).filter((product) => (recipeFor(product.id)?.items.length ?? 0) > 0).length;

  async function handleClearRecipe(product: ProductWithCategory) {
    if (!window.confirm(t("recipesPage.confirmDelete", { name: product.name }))) return;
    setClearingId(product.id);
    try {
      await deleteRecipeForProduct(product.id);
      refresh();
      showToast(t("recipesPage.toastDeleted"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setClearingId(null);
    }
  }

  const columns: DataTableColumn<ProductWithCategory>[] = [
    {
      key: "name",
      header: t("recipesPage.colProduct"),
      sortable: true,
      accessor: (product) => product.name,
      render: (product) => (
        <div className="flex items-center gap-3">
          <DataTableThumbnail src={product.image} alt={product.name} />
          <span className="font-medium text-ink">{product.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: t("recipesPage.colCategory"),
      sortable: true,
      accessor: (product) => product.categoryName,
      render: (product) => <span className="text-ink-soft">{product.categoryName}</span>,
    },
    {
      key: "ingredients",
      header: t("recipesPage.colIngredients"),
      sortable: true,
      accessor: (product) => recipeFor(product.id)?.items.length ?? 0,
      render: (product) => {
        const recipe = recipeFor(product.id);
        return recipe && recipe.items.length > 0 ? (
          <StatusPill label={t("recipesPage.ingredientsCount", { count: recipe.items.length })} tone="accent" size="sm" />
        ) : (
          <StatusPill label={t("recipesPage.noRecipe")} tone="warn" size="sm" />
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (product) => {
        const hasRecipe = (recipeFor(product.id)?.items.length ?? 0) > 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Link to={`/admin/inventory/recipes/${product.id}`}>
              <Button variant="secondary" size="sm">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                {hasRecipe ? t("recipesPage.editRecipe") : t("recipesPage.addRecipe")}
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleClearRecipe(product)}
              loading={clearingId === product.id}
              disabled={!hasRecipe}
              title={hasRecipe ? t("recipesPage.deleteEnabledTitle") : t("recipesPage.deleteDisabledTitle")}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.delete")}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("recipesPage.eyebrow")}
        title={t("recipesPage.title")}
        description={t("recipesPage.description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("recipesPage.searchPlaceholder")} className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title={t("recipesPage.filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("recipesPage.categoryLabel")} htmlFor="recipe-category">
            <Select id="recipe-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{t("recipesPage.allCategories")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("recipesPage.recipeLabel")} htmlFor="recipe-status">
            <Select
              id="recipe-status"
              value={recipeFilter}
              onChange={(event) => setRecipeFilter(event.target.value as RecipeFilter)}
            >
              <option value="all">{t("recipesPage.anyRecipe")}</option>
              <option value="with">{t("recipesPage.hasRecipe")}</option>
              <option value="without">{t("recipesPage.missingRecipe")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("recipesPage.sortByLabel")} htmlFor="recipe-sort">
            <Select id="recipe-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">{t("recipesPage.sortProductName")}</option>
              <option value="category">{t("recipesPage.sortCategory")}</option>
              <option value="ingredients">{t("recipesPage.sortMostIngredients")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("recipesPage.costingCoverageLabel")}>
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("recipesPage.costingCoverageSummary", { costed: costedCount, total: products?.length ?? 0 })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(product) => product.id}
        emptyIcon={ClipboardList}
        emptyTitle={search || activeCount > 0 ? t("recipesPage.emptyFilteredTitle") : t("recipesPage.emptyTitle")}
        emptyDescription={
          search || activeCount > 0
            ? t("recipesPage.emptyFilteredDescription")
            : t("recipesPage.emptyDescription")
        }
      />

      <p className="mt-3 text-xs text-ink-soft">{t("recipesPage.footerNote")}</p>
    </AdminShell>
  );
}
