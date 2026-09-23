import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, Trash2, ClipboardList, UtensilsCrossed } from "lucide-react";
import type { Category, Order, OrderItemStatus, Table } from "@/types";
import { getCategories, getProducts, type ProductWithCategory } from "@/lib/api/products";
import { getTableById } from "@/lib/api/tables";
import { addItemToOrder, getOrCreateOpenOrder, getOrderTotal, sendToKitchen, updateItemQuantity } from "@/lib/api/orders";
import { on } from "@/lib/eventBus";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "react-i18next";
import { badgeLabel, orderItemStatusLabel } from "@/lib/i18n/labels";
import { formatCurrency } from "@/lib/format";

const ITEM_STATUS_TONE: Record<OrderItemStatus, "neutral" | "warn" | "accent" | "good" | "danger"> = {
  pending: "neutral",
  fired: "warn",
  preparing: "accent",
  ready: "good",
  served: "good",
  voided: "danger",
};

export default function OrderBuilderPage() {
  const { tableId = "" } = useParams();
  const { staff } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");

  const [table, setTable] = useState<Table | null>(null);
  const [products, setProducts] = useState<ProductWithCategory[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  const refreshOrder = useCallback(async () => {
    if (!staff) return;
    const current = await getOrCreateOpenOrder(tableId, staff.id);
    setOrder({ ...current, items: [...current.items] });
  }, [tableId, staff]);

  useEffect(() => {
    getTableById(tableId).then((value) => setTable(value ?? null));
    getProducts().then(setProducts);
    getCategories().then(setCategories);
    refreshOrder();
    // Live: kitchen marking an item ready reflects on this ticket instantly —
    // see docs/architecture-plan.md §08.
    return on("order:updated", refreshOrder);
  }, [tableId, refreshOrder]);

  const categoryTabs = ["All", ...categories.map((category) => category.name)];
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.categoryName === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  async function handleAdd(product: ProductWithCategory) {
    if (!order) return;
    await addItemToOrder(order.id, product, 1);
    refreshOrder();
  }

  async function handleQuantityChange(itemId: string, quantity: number) {
    if (!order) return;
    await updateItemQuantity(order.id, itemId, quantity);
    refreshOrder();
  }

  async function handleSendToKitchen() {
    if (!order) return;
    await sendToKitchen(order.id);
    refreshOrder();
    showToast(t("toastSent"), "success");
  }

  const total = order ? getOrderTotal(order) : 0;
  const hasPendingItems = order?.items.some((item) => item.status === "pending") ?? false;

  return (
    <AdminShell fitScreen>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={table ? table.label : t("tableFallback")}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/pos/table/${tableId}/payment`)}>
            {t("goToPayment")}
          </Button>
        }
      />

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
        <section className="flex flex-col lg:min-h-0">
          <div className="flex flex-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium uppercase tracking-wide transition-all active:scale-95 ${
                    activeCategory === category ? "border-accent bg-accent text-white" : "border-border text-ink-soft hover:border-accent"
                  }`}
                >
                  {category === "All" ? t("allCategory") : category}
                </button>
              ))}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder={t("searchMenu")} className="sm:w-56" />
          </div>

          {products === null ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={UtensilsCrossed} title={t("noMatchTitle")} description={t("noMatchDescription")} />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:auto-rows-min lg:overflow-y-auto lg:pb-1 lg:pe-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAdd(product)}
                  disabled={!product.isAvailable}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface-raised text-start shadow-sm transition-all hover:border-accent hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                  <div className="relative h-24 w-full flex-none overflow-hidden bg-surface">
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    {product.badge && (
                      <span className="absolute start-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {badgeLabel(tCommon, product.badge)}
                      </span>
                    )}
                    {!product.isAvailable && (
                      <span className="absolute inset-0 flex items-center justify-center bg-surface-raised/80 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                        {t("unavailable")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                    <span className="truncate text-sm font-medium text-ink">{product.name}</span>
                    <span className="text-xs font-semibold text-accent">{formatCurrency(product.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:min-h-0">
          <Card padding="none" className="flex h-fit flex-col lg:h-full">
            <h2 className="flex-none border-b border-border p-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {t("ticket")}
            </h2>
            <div className="divide-y divide-border p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {order?.items.length ? (
                order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{item.nameSnapshot}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-ink-soft">{formatCurrency(item.priceSnapshot)}</span>
                        <StatusPill
                          label={item.status === "pending" ? t("notSent") : orderItemStatusLabel(tCommon, item.status)}
                          tone={ITEM_STATUS_TONE[item.status]}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        aria-label={item.quantity === 1 ? t("removeItem") : t("decreaseQuantity")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-soft transition-colors active:scale-95 hover:border-status-danger hover:text-status-danger"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        ) : (
                          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                      </button>
                      <span className="w-5 text-center text-xs font-semibold text-ink">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        aria-label={t("increaseQuantity")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-soft transition-colors active:scale-95 hover:border-accent hover:text-accent"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={ClipboardList} title={t("ticketEmptyTitle")} description={t("ticketEmptyDescription")} />
              )}
            </div>

            <div className="flex-none border-t border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-soft">{t("total")}</span>
                <span className="text-lg font-semibold text-ink">{formatCurrency(total)}</span>
              </div>
              <Button onClick={handleSendToKitchen} disabled={!hasPendingItems} className="mt-4 w-full">
                {hasPendingItems ? t("sendToKitchen") : t("sentToKitchen")}
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}
