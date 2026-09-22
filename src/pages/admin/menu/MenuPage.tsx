import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Percent, Tags, Trash2, UtensilsCrossed } from "lucide-react";
import type { Category } from "@/types";
import { deleteProduct, getCategories, getCustomerMenu, getProducts, type CustomerMenuCategory, type ProductWithCategory } from "@/lib/api/products";
import { getRecipes } from "@/lib/api/recipes";
import { on } from "@/lib/eventBus";
import { exportToCsv } from "@/lib/csv";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { describeDays, WEEKDAY_LABELS, todayWeekday } from "@/lib/weekday";
import { describeDeal } from "@/lib/deals";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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

type AvailabilityFilter = "all" | "available" | "unavailable";
type BadgeFilter = "all" | "New" | "Popular" | "none";
type RecipeFilter = "all" | "with" | "without";

export default function MenuPage() {
  const [products, setProducts] = useState<ProductWithCategory[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsWithRecipe, setProductsWithRecipe] = useState<Set<string>>(new Set());
  const [customerMenu, setCustomerMenu] = useState<CustomerMenuCategory[]>([]);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { open, toggle } = useFilterPanelState("menu-filters");
  const { showToast } = useToast();

  const refresh = useCallback(() => {
    getProducts().then(setProducts);
    getCategories().then(setCategories);
    getRecipes().then((recipes) =>
      setProductsWithRecipe(new Set(recipes.filter((recipe) => recipe.items.length > 0).map((recipe) => recipe.productId)))
    );
    getCustomerMenu().then(setCustomerMenu);
  }, []);



  useEffect(() => {
    refresh();
    return on("product:updated", refresh);
  }, [refresh]);

  const activeCount = countActiveFilters({
    category: categoryFilter !== "all" ? categoryFilter : "",
    availability: availability !== "all" ? availability : "",
    badge: badgeFilter !== "all" ? badgeFilter : "",
    recipe: recipeFilter !== "all" ? recipeFilter : "",
    priceMin,
    priceMax,
  });

  function resetFilters() {
    setCategoryFilter("all");
    setAvailability("all");
    setBadgeFilter("all");
    setRecipeFilter("all");
    setPriceMin("");
    setPriceMax("");
  }

  const chips: FilterChip[] = [];
  if (categoryFilter !== "all") {
    chips.push({
      key: "category",
      label: `Category: ${categories.find((category) => category.id === categoryFilter)?.name ?? categoryFilter}`,
    });
  }
  if (availability !== "all") chips.push({ key: "availability", label: `Availability: ${availability}` });
  if (badgeFilter !== "all") chips.push({ key: "badge", label: `Badge: ${badgeFilter}` });
  if (recipeFilter !== "all") {
    chips.push({ key: "recipe", label: `Recipe: ${recipeFilter === "with" ? "costed" : "missing"}` });
  }
  if (priceMin) chips.push({ key: "priceMin", label: `Min $${priceMin}` });
  if (priceMax) chips.push({ key: "priceMax", label: `Max $${priceMax}` });

  function removeChip(key: string) {
    if (key === "category") setCategoryFilter("all");
    if (key === "availability") setAvailability("all");
    if (key === "badge") setBadgeFilter("all");
    if (key === "recipe") setRecipeFilter("all");
    if (key === "priceMin") setPriceMin("");
    if (key === "priceMax") setPriceMax("");
  }
  const filtered = useMemo(() => {
    if (!products) return null;
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;

    return products.filter((product) => {
      if (!matchesSearch(`${product.name} ${product.description}`, search)) return false;
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
      if (availability === "available" && !product.isAvailable) return false;
      if (availability === "unavailable" && product.isAvailable) return false;
      if (badgeFilter === "none" && product.badge) return false;
      if (badgeFilter !== "all" && badgeFilter !== "none" && product.badge !== badgeFilter) return false;
      if (recipeFilter === "with" && !productsWithRecipe.has(product.id)) return false;
      if (recipeFilter === "without" && productsWithRecipe.has(product.id)) return false;
      if (min !== null && Number.isFinite(min) && product.price < min) return false;
      if (max !== null && Number.isFinite(max) && product.price > max) return false;
      return true;
    });
  }, [products, search, categoryFilter, availability, badgeFilter, recipeFilter, priceMin, priceMax, productsWithRecipe]);

  async function handleDelete(product: ProductWithCategory) {
    if (!window.confirm(`Delete "${product.name}"? Its recipe is removed too. This can't be undone.`)) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      refresh();
      showToast("Product deleted", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    exportToCsv("menu", filtered ?? [], [
      { header: "Product", accessor: (row) => row.name },
      { header: "Category", accessor: (row) => row.categoryName },
      { header: "Price", accessor: (row) => row.price.toFixed(2) },
      { header: "Cost", accessor: (row) => row.costPrice.toFixed(2) },
      {
        header: "Margin %",
        accessor: (row) => (row.price > 0 ? (((row.price - row.costPrice) / row.price) * 100).toFixed(1) : "0.0"),
      },
      { header: "Available", accessor: (row) => (row.isAvailable ? "yes" : "no") },
      { header: "Badge", accessor: (row) => row.badge ?? "" },
      { header: "Days", accessor: (row) => describeDays(row.days) },
      { header: "Deal price", accessor: (row) => (row.deal ? row.deal.price.toFixed(2) : "") },
      { header: "Deal schedule", accessor: (row) => describeDeal(row.deal) },
    ]);
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
          <div className="min-w-0">
            <p className="font-medium text-ink">{product.name}</p>
            <p className="max-w-[22rem] truncate text-xs text-ink-soft">{product.description}</p>
          </div>
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
      key: "price",
      header: "Price",
      sortable: true,
      align: "right",
      accessor: (product) => product.price,
      render: (product) => <span className="tabular-nums font-medium text-ink">${product.price.toFixed(2)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      align: "right",
      accessor: (product) => product.costPrice,
      render: (product) => <span className="tabular-nums text-ink-soft">${product.costPrice.toFixed(2)}</span>,
    },
    {
      key: "margin",
      header: "Margin",
      sortable: true,
      align: "right",
      accessor: (product) => (product.price > 0 ? ((product.price - product.costPrice) / product.price) * 100 : 0),
      render: (product) => {
        const margin = product.price > 0 ? ((product.price - product.costPrice) / product.price) * 100 : 0;
        return (
          <StatusPill
            label={`${margin.toFixed(0)}%`}
            tone={margin >= 60 ? "good" : margin >= 40 ? "accent" : "warn"}
            size="sm"
          />
        );
      },
    },
    {
      key: "availability",
      header: "Availability",
      sortable: true,
      accessor: (product) => (product.isAvailable ? 1 : 0),
      render: (product) => (
        <div className="flex items-center gap-1.5">
          <StatusPill label={product.isAvailable ? "On menu" : "Hidden"} tone={product.isAvailable ? "good" : "neutral"} size="sm" />
          {product.badge && <StatusPill label={product.badge} tone="info" size="sm" />}
        </div>
      ),
    },
    {
      key: "days",
      header: "Days",
      sortable: true,
      accessor: (product) => describeDays(product.days),
      render: (product) => (
        <StatusPill
          label={describeDays(product.days)}
          tone={product.days && product.days.length > 0 ? "info" : "neutral"}
          size="sm"
        />
      ),
    },
    {
      key: "deal",
      header: "Deal",
      accessor: (product) => (product.deal ? 1 : 0),
      render: (product) =>
        product.deal ? (
          <StatusPill
            label={`${formatCurrency(product.deal.price)} · ${describeDeal(product.deal)}`}
            tone="warn"
            size="sm"
          />
        ) : (
          <span className="text-xs text-ink-soft">—</span>
        ),
    },
    {
      key: "recipe",
      header: "Recipe",
      accessor: (product) => (productsWithRecipe.has(product.id) ? 1 : 0),
      render: (product) =>
        productsWithRecipe.has(product.id) ? (
          <StatusPill label="Costed" tone="accent" size="sm" />
        ) : (
          <StatusPill label="Missing" tone="warn" size="sm" />
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (product) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/inventory/recipes/${product.id}`} title="Edit recipe" className="text-xs font-medium text-ink-soft hover:text-accent">
            Recipe
          </Link>
          <Link to={`/admin/menu/${product.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(product)}
            loading={deletingId === product.id}
            title="Delete product"
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
        eyebrow="Menu"
        title="Menu"
        description="Every product you sell, its price, and whether it's costed. Add, edit or hide items here."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search menu…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Button
              variant="secondary"
              onClick={() => setShowCustomerMenu((current) => !current)}
              title="Preview what customers see on today's menu"
            >
              Today's customer menu
            </Button>
            <Button variant="secondary" onClick={handleExport} title="Export the filtered menu">
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              CSV
            </Button>
            <Link to="/admin/menu/categories">
              <Button variant="secondary">
                <Tags className="h-3.5 w-3.5" strokeWidth={2} />
                Categories
              </Button>
            </Link>
            <Link to="/admin/menu/deals">
              <Button variant="secondary">
                <Percent className="h-3.5 w-3.5" strokeWidth={2} />
                Deals
              </Button>
            </Link>
            <Link to="/admin/menu/new">
              <Button>New product</Button>
            </Link>
          </>
        }
      />

      {showCustomerMenu && (
        <Card className="mb-4" padding="md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            What customers see today ({WEEKDAY_LABELS[todayWeekday()]}) on the website &amp; QR menu
          </p>
          {customerMenu.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing is available today — check availability and day schedules.</p>
          ) : (
            <div className="space-y-3">
              {customerMenu.map((group) => (
                <div key={group.category.id}>
                  <p className="mb-1 text-xs font-semibold text-ink-soft">{group.category.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.products.map((product) => (
                      <StatusPill
                        key={product.id}
                        label={
                          product.onDeal && product.originalPrice != null
                            ? `${product.name} — ${formatCurrency(product.originalPrice)} → ${formatCurrency(product.price)}`
                            : `${product.name} — ${formatCurrency(product.price)}`
                        }
                        tone={product.onDeal ? "warn" : "good"}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <FilterPanel open={open} title="Filter the menu" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Category" htmlFor="menu-category">
            <Select id="menu-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Availability" htmlFor="menu-availability">
            <Select
              id="menu-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
            >
              <option value="all">Any</option>
              <option value="available">On menu</option>
              <option value="unavailable">Hidden</option>
            </Select>
          </FilterField>

          <FilterField label="Badge" htmlFor="menu-badge">
            <Select id="menu-badge" value={badgeFilter} onChange={(event) => setBadgeFilter(event.target.value as BadgeFilter)}>
              <option value="all">Any</option>
              <option value="New">New</option>
              <option value="Popular">Popular</option>
              <option value="none">No badge</option>
            </Select>
          </FilterField>

          <FilterField label="Recipe" htmlFor="menu-recipe">
            <Select
              id="menu-recipe"
              value={recipeFilter}
              onChange={(event) => setRecipeFilter(event.target.value as RecipeFilter)}
            >
              <option value="all">Any</option>
              <option value="with">Has recipe</option>
              <option value="without">Missing recipe</option>
            </Select>
          </FilterField>

          <FilterField label="Min price" htmlFor="menu-price-min">
            <Input
              id="menu-price-min"
              type="number"
              min="0"
              step="0.5"
              placeholder="0.00"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
          </FilterField>

          <FilterField label="Max price" htmlFor="menu-price-max">
            <Input
              id="menu-price-max"
              type="number"
              min="0"
              step="0.5"
              placeholder="99.00"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(product) => product.id}
        emptyIcon={UtensilsCrossed}
        emptyTitle={activeCount > 0 || search ? "No products match" : "No products yet"}
        emptyDescription={
          activeCount > 0 || search ? "Loosen a filter or clear the search to see more." : "Add the first item to your menu."
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/menu/new">
              <Button size="sm">New product</Button>
            </Link>
          )
        }
      />

      <p className="mt-3 text-xs text-ink-soft">
        Margin uses the recipe cost when one exists, otherwise the product's cost price. Prices here are what POS and the QR menu charge.
      </p>
    </AdminShell>
  );
}

