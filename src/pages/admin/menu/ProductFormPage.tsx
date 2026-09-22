import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Category } from "@/types";
import { createProduct, getCategories, getProductById, updateProduct, type ProductInput } from "@/lib/api/products";
import { WEEKDAYS, WEEKDAY_LABELS, todayWeekday, type Weekday } from "@/lib/weekday";
import type { DealWindow } from "@/lib/deals";
import { errorMessage } from "@/lib/errors";
import DealWindowsEditor from "@/components/menu/DealWindowsEditor";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BackLink from "@/components/ui/BackLink";
import { DataTableThumbnail } from "@/components/ui/DataTable";

const BADGES = ["none", "New", "Popular"] as const;

/**
 * One form for both create and edit — the route decides which. Keeps the
 * field list, validation and layout in exactly one place.
 */
export default function ProductFormPage() {
  const { productId } = useParams<{ productId?: string }>();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [image, setImage] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [badge, setBadge] = useState<(typeof BADGES)[number]>("none");
  const [days, setDays] = useState<Weekday[]>([]);
  const [dealEnabled, setDealEnabled] = useState(false);
  const [dealPrice, setDealPrice] = useState("");
  const [dealWindows, setDealWindows] = useState<DealWindow[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getCategories().then((list) => {
      setCategories(list);
      setCategoryId((current) => current || list[0]?.id || "");
    });

    if (!productId) return;
    getProductById(productId).then((product) => {
      if (!product) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setName(product.name);
      setCategoryId(product.categoryId);
      setDescription(product.description);
      setPrice(String(product.price));
      setCostPrice(String(product.costPrice));
      setImage(product.image);
      setIsAvailable(product.isAvailable);
      setBadge(product.badge && product.badge !== "Deal" ? product.badge : "none");
      setDays(product.days ?? []);
      setDealEnabled(Boolean(product.deal));
      setDealPrice(product.deal ? String(product.deal.price) : "");
      setDealWindows(product.deal?.windows ?? []);
      setLoading(false);
    });
  }, [productId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !categoryId) {
      showToast("Name and category are required", "error");
      return;
    }
    if (dealEnabled && dealWindows.length === 0) {
      showToast("Add at least one day and time window for the deal, or turn it off", "error");
      return;
    }

    const input: ProductInput = {
      name,
      categoryId,
      description,
      price: Number(price) || 0,
      costPrice: Number(costPrice) || 0,
      image,
      isAvailable,
      badge: badge === "none" ? null : badge,
      days,
      deal: dealEnabled ? { price: Number(dealPrice) || 0, windows: dealWindows } : undefined,
    };

    setSaving(true);
    try {
      if (isEdit && productId) {
        await updateProduct(productId, input);
        showToast("Product updated", "success");
      } else {
        await createProduct(input);
        showToast("Product created", "success");
      }
      navigate("/admin/menu");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Menu · Product" title="Loading product…" />
        <p className="text-sm text-ink-soft">Fetching the current menu item…</p>
      </AdminShell>
    );
  }

  if (notFound) {
    return (
      <AdminShell>
        <PageHeader
          eyebrow="Menu · Product"
          title="Product not found"
          description="It may have been deleted from the menu."
          actions={<BackLink to="/admin/menu" label="Back to menu" />}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={isEdit ? "Menu · Edit product" : "Menu · New product"}
        title={isEdit ? name || "Edit product" : "New product"}
        description="Price, cost and availability here flow straight through to POS and the QR menu."
        actions={<BackLink to="/admin/menu" label="Back to menu" />}
      />

      <Card className="max-w-2xl" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="product-name" required>
            <Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="product-category" required>
              <Select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Availability" htmlFor="product-availability">
              <Select
                id="product-availability"
                value={isAvailable ? "yes" : "no"}
                onChange={(event) => setIsAvailable(event.target.value === "yes")}
              >
                <option value="yes">On menu</option>
                <option value="no">Hidden from menu</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Available on"
            htmlFor="product-days"
            hint={
              days.length === 0
                ? "Every day. Pick specific days to make this a day-limited item (e.g. a weekend special)."
                : `Shows on the customer menu only on: ${days.map((day) => WEEKDAY_LABELS[day]).join(", ")}.`
            }
          >
            <div id="product-days" role="group" aria-label="Available on" className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
                    }
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-border bg-surface-raised text-ink-soft hover:border-accent"
                    } ${day === todayWeekday() ? "ring-1 ring-inset ring-accent/30" : ""}`}
                    title={day === todayWeekday() ? "Today" : undefined}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
              {days.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDays([])}
                  className="rounded-full px-2 py-1 text-xs font-medium text-ink-soft hover:text-accent-strong"
                >
                  Every day
                </button>
              )}
            </div>
          </FormField>

          <FormField
            label="Limited-time deal"
            htmlFor="product-deal-toggle"
            hint="A special price that only applies during specific day+time windows — everything else shows the regular price."
          >
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                id="product-deal-toggle"
                type="checkbox"
                checked={dealEnabled}
                onChange={(event) => {
                  setDealEnabled(event.target.checked);
                  if (event.target.checked && dealWindows.length === 0) {
                    setDealWindows([{ day: todayWeekday(), startTime: "11:00", endTime: "14:00" }]);
                  }
                }}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Run a deal for this item
            </label>

            {dealEnabled && (
              <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface-sunken p-3">
                <FormField label="Deal price" htmlFor="product-deal-price" hint="Must be less than the regular sell price">
                  <Input
                    id="product-deal-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={dealPrice}
                    onChange={(event) => setDealPrice(event.target.value)}
                  />
                </FormField>

                <DealWindowsEditor windows={dealWindows} onChange={setDealWindows} />
              </div>
            )}
          </FormField>

          <FormField label="Description" htmlFor="product-description">
            <textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              placeholder="What's in it?"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Sell price" htmlFor="product-price" required hint="Charged at POS">
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </FormField>

            <FormField label="Cost price" htmlFor="product-cost" hint="Used when no recipe exists">
              <Input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(event) => setCostPrice(event.target.value)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <FormField label="Image path" htmlFor="product-image" hint="e.g. /burger1.jfif — served from /public">
              <Input
                id="product-image"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="/burger1.jfif"
              />
            </FormField>

            <FormField label="Badge" htmlFor="product-badge">
              <Select
                id="product-badge"
                value={badge}
                onChange={(event) => setBadge(event.target.value as (typeof BADGES)[number])}
              >
                {BADGES.map((option) => (
                  <option key={option} value={option}>
                    {option === "none" ? "No badge" : option}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {image && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken p-3">
              <DataTableThumbnail src={image} alt={name || "Product preview"} size={48} />
              <p className="text-xs text-ink-soft">Preview — the same image is used on the POS grid and QR menu.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              {isEdit ? "Save changes" : "Create product"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/menu")} disabled={saving}>
              Cancel
            </Button>
            {isEdit && (
              <p className="ml-auto text-xs text-ink-soft">
                Recipe &amp; stock deductions are managed under Inventory → Recipes.
              </p>
            )}
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
