import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
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

export default function RecipesPage() {
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
      label: `Category: ${categories.find((category) => category.id === categoryFilter)?.name ?? categoryFilter}`,
    });
  }
  if (recipeFilter !== "all") chips.push({ key: "recipe", label: `Recipe: ${recipeFilter === "with" ? "costed" : "missing"}` });
  if (sortKey !== "name") chips.push({ key: "sort", label: `Sorted by ${sortKey}` });

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
    if (!window.confirm(`Delete the recipe for "${product.name}"? The product itself stays on the menu.`)) return;
    setClearingId(product.id);
    try {
      await deleteRecipeForProduct(product.id);
      refresh();
      showToast("Recipe deleted", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setClearingId(null);
    }
  }

  const columns: DataTableColumn<ProductWithCategory>[] = [
    {
      key: "name",
      header: "Product",
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
      header: "Category",
      sortable: true,
      accessor: (product) => product.categoryName,
      render: (product) => <span className="text-ink-soft">{product.categoryName}</span>,
    },
    {
      key: "ingredients",
      header: "Ingredients",
      sortable: true,
      accessor: (product) => recipeFor(product.id)?.items.length ?? 0,
      render: (product) => {
        const recipe = recipeFor(product.id);
        return recipe && recipe.items.length > 0 ? (
          <StatusPill label={`${recipe.items.length} ingredients`} tone="accent" size="sm" />
        ) : (
          <StatusPill label="No recipe" tone="warn" size="sm" />
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
                {hasRecipe ? "Edit recipe" : "Add recipe"}
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleClearRecipe(product)}
              loading={clearingId === product.id}
              disabled={!hasRecipe}
              title={hasRecipe ? "Delete this recipe" : "Nothing to delete"}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Inventory"
        title="Recipes"
        description="See which products have a costed recipe and edit the ingredient quantities behind them."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
          </>
        }
      />

      <FilterPanel open={open} title="Filter recipes" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Category" htmlFor="recipe-category">
            <Select id="recipe-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Recipe" htmlFor="recipe-status">
            <Select
              id="recipe-status"
              value={recipeFilter}
              onChange={(event) => setRecipeFilter(event.target.value as RecipeFilter)}
            >
              <option value="all">Any</option>
              <option value="with">Has recipe</option>
              <option value="without">Missing recipe</option>
            </Select>
          </FilterField>

          <FilterField label="Sort by" htmlFor="recipe-sort">
            <Select id="recipe-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">Product name</option>
              <option value="category">Category</option>
              <option value="ingredients">Most ingredients</option>
            </Select>
          </FilterField>

          <FilterField label="Costing coverage">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {costedCount} of {products?.length ?? 0} products costed
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
        emptyTitle={search || activeCount > 0 ? "No products match" : "No products yet"}
        emptyDescription={
          search || activeCount > 0
            ? "Try a different search or clear the filters."
            : "Products added to the menu will appear here."
        }
      />

      <p className="mt-3 text-xs text-ink-soft">
        Recipes decide what stock is deducted when an item is fired to the kitchen. Delete a recipe to stop deducting without touching the menu item.
      </p>
    </AdminShell>
  );
}
