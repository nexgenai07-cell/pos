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
import { describeDays, todayWeekday } from "@/lib/weekday";
import { describeDeal } from "@/lib/deals";
import { badgeLabel, describeDaysLabel, describeDealLabel, weekdayLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";
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

const BADGE_ROW_KEY = {
  New: "badgeRow.new",
  Popular: "badgeRow.popular",
  Deal: "badgeRow.deal",
} as const;

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
  const { t } = useTranslation("menu");
  const { t: tCommon } = useTranslation("common");

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
      label: t("filters.chips.category", {
        name: categories.find((category) => category.id === categoryFilter)?.name ?? categoryFilter,
      }),
    });
  }
  if (availability !== "all") {
    chips.push({
      key: "availability",
      label: t("filters.chips.availability", {
        value: availability === "available" ? t("filters.availability.onMenu") : t("filters.availability.hidden"),
      }),
    });
  }
  if (badgeFilter !== "all") {
    chips.push({
      key: "badge",
      label: t("filters.chips.badge", {
        value: badgeFilter === "none" ? t("filters.badge.none") : badgeLabel(tCommon, badgeFilter),
      }),
    });
  }
  if (recipeFilter !== "all") {
    chips.push({
      key: "recipe",
      label: t("filters.chips.recipe", {
        value: recipeFilter === "with" ? t("filters.chips.recipeWith") : t("filters.chips.recipeWithout"),
      }),
    });
  }
  if (priceMin) chips.push({ key: "priceMin", label: t("filters.chips.priceMin", { value: priceMin }) });
  if (priceMax) chips.push({ key: "priceMax", label: t("filters.chips.priceMax", { value: priceMax }) });

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
    if (!window.confirm(`${t("delete.title", { name: product.name })} ${t("delete.body")}`)) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      refresh();
      showToast(t("menuPage.toastDeleted"), "success");
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
      header: t("columns.name"),
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
      header: t("columns.category"),
      sortable: true,
      accessor: (product) => product.categoryName,
      render: (product) => <span className="text-ink-soft">{product.categoryName}</span>,
    },
    {
      key: "price",
      header: t("columns.price"),
      sortable: true,
      align: "right",
      accessor: (product) => product.price,
      render: (product) => <span className="tabular-nums font-medium text-ink">${product.price.toFixed(2)}</span>,
    },
    {
      key: "cost",
      header: t("columns.cost"),
      sortable: true,
      align: "right",
      accessor: (product) => product.costPrice,
      render: (product) => <span className="tabular-nums text-ink-soft">${product.costPrice.toFixed(2)}</span>,
    },
    {
      key: "margin",
      header: t("columns.margin"),
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
      header: t("columns.availability"),
      sortable: true,
      accessor: (product) => (product.isAvailable ? 1 : 0),
      render: (product) => (
        <div className="flex items-center gap-1.5">
          <StatusPill
            label={product.isAvailable ? t("availabilityPill.onMenu") : t("availabilityPill.hidden")}
            tone={product.isAvailable ? "good" : "neutral"}
            size="sm"
          />
          {product.badge && (
            <span title={t(BADGE_ROW_KEY[product.badge])}>
              <StatusPill label={badgeLabel(tCommon, product.badge)} tone="info" size="sm" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "days",
      header: t("columns.days"),
      sortable: true,
      accessor: (product) => describeDaysLabel(tCommon, product.days),
      render: (product) => (
        <StatusPill
          label={describeDaysLabel(tCommon, product.days)}
          tone={product.days && product.days.length > 0 ? "info" : "neutral"}
          size="sm"
        />
      ),
    },
    {
      key: "deal",
      header: t("columns.deal"),
      accessor: (product) => (product.deal ? 1 : 0),
      render: (product) =>
        product.deal ? (
          <StatusPill
            label={`${formatCurrency(product.deal.price)} · ${describeDealLabel(tCommon, product.deal)}`}
            tone="warn"
            size="sm"
          />
        ) : (
          <span className="text-xs text-ink-soft">—</span>
        ),
    },
    {
      key: "recipe",
      header: t("columns.recipe"),
      accessor: (product) => (productsWithRecipe.has(product.id) ? 1 : 0),
      render: (product) =>
        productsWithRecipe.has(product.id) ? (
          <StatusPill label={t("recipeStatus.costed")} tone="accent" size="sm" />
        ) : (
          <StatusPill label={t("recipeStatus.missing")} tone="warn" size="sm" />
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (product) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/admin/inventory/recipes/${product.id}`}
            title={t("menuPage.recipeLinkTitle")}
            className="text-xs font-medium text-ink-soft hover:text-accent"
          >
            {t("menuPage.recipeLink")}
          </Link>
          <Link to={`/admin/menu/${product.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.edit")}
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(product)}
            loading={deletingId === product.id}
            title={t("delete.buttonTitle")}
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
        eyebrow={t("page.menu.eyebrow")}
        title={t("page.menu.title")}
        description={t("page.menu.description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("filters.searchPlaceholder")} className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Button
              variant="secondary"
              onClick={() => setShowCustomerMenu((current) => !current)}
              title={t("customerMenu.toggleTitle")}
            >
              {t("tabs.customerMenu")}
            </Button>
            <Button variant="secondary" onClick={handleExport} title={t("menuPage.csvButtonTitle")}>
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {t("menuPage.csvButton")}
            </Button>
            <Link to="/admin/menu/categories">
              <Button variant="secondary">
                <Tags className="h-3.5 w-3.5" strokeWidth={2} />
                {t("tabs.categories")}
              </Button>
            </Link>
            <Link to="/admin/menu/deals">
              <Button variant="secondary">
                <Percent className="h-3.5 w-3.5" strokeWidth={2} />
                {t("tabs.dealsTab")}
              </Button>
            </Link>
            <Link to="/admin/menu/new">
              <Button>{t("menuPage.newProductButton")}</Button>
            </Link>
          </>
        }
      />

      {showCustomerMenu && (
        <Card className="mb-4" padding="md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("customerMenu.heading", { weekday: weekdayLabel(tCommon, todayWeekday()) })}
          </p>
          {customerMenu.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("customerMenu.empty")}</p>
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
                            ? t("customerMenu.dealPriceLabel", {
                                name: product.name,
                                original: formatCurrency(product.originalPrice),
                                price: formatCurrency(product.price),
                              })
                            : t("customerMenu.priceLabel", { name: product.name, price: formatCurrency(product.price) })
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

      <FilterPanel open={open} title={t("filters.panelTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField label={t("filters.category.label")} htmlFor="menu-category">
            <Select id="menu-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{t("filters.category.all")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("filters.availability.label")} htmlFor="menu-availability">
            <Select
              id="menu-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
            >
              <option value="all">{t("filters.availability.any")}</option>
              <option value="available">{t("filters.availability.onMenu")}</option>
              <option value="unavailable">{t("filters.availability.hidden")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("filters.badge.label")} htmlFor="menu-badge">
            <Select id="menu-badge" value={badgeFilter} onChange={(event) => setBadgeFilter(event.target.value as BadgeFilter)}>
              <option value="all">{t("filters.availability.any")}</option>
              <option value="New">{badgeLabel(tCommon, "New")}</option>
              <option value="Popular">{badgeLabel(tCommon, "Popular")}</option>
              <option value="none">{t("filters.badge.none")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("filters.recipe.label")} htmlFor="menu-recipe">
            <Select
              id="menu-recipe"
              value={recipeFilter}
              onChange={(event) => setRecipeFilter(event.target.value as RecipeFilter)}
            >
              <option value="all">{t("filters.recipe.all")}</option>
              <option value="with">{t("filters.recipe.with")}</option>
              <option value="without">{t("filters.recipe.without")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("filters.priceMin.label")} htmlFor="menu-price-min">
            <Input
              id="menu-price-min"
              type="number"
              min="0"
              step="0.5"
              placeholder={t("filters.priceMin.placeholder")}
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
          </FilterField>

          <FilterField label={t("filters.priceMax.label")} htmlFor="menu-price-max">
            <Input
              id="menu-price-max"
              type="number"
              min="0"
              step="0.5"
              placeholder={t("filters.priceMax.placeholder")}
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
        emptyTitle={activeCount > 0 || search ? t("menuPage.emptyFilteredTitle") : t("menuPage.emptyTitle")}
        emptyDescription={
          activeCount > 0 || search ? t("menuPage.emptyFilteredDescription") : t("menuPage.emptyDescription")
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/menu/new">
              <Button size="sm">{t("menuPage.newProductButton")}</Button>
            </Link>
          )
        }
      />

      <p className="mt-3 text-xs text-ink-soft">{t("menuPage.footerNote")}</p>
    </AdminShell>
  );
}

