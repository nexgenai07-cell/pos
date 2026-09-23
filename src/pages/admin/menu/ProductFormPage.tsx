import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Category } from "@/types";
import { createProduct, getCategories, getProductById, updateProduct, type ProductInput } from "@/lib/api/products";
import { WEEKDAYS, todayWeekday, type Weekday } from "@/lib/weekday";
import { badgeLabel, weekdayLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("menu");
  const { t: tCommon } = useTranslation("common");

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
      showToast(t("productForm.errors.nameAndCategory"), "error");
      return;
    }
    if (dealEnabled && dealWindows.length === 0) {
      showToast(t("productForm.errors.dealWindows"), "error");
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
        showToast(t("productForm.toastUpdated"), "success");
      } else {
        await createProduct(input);
        showToast(t("productForm.toastCreated"), "success");
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
        <PageHeader eyebrow={t("productForm.eyebrow")} title={t("productForm.loadingTitle")} />
        <p className="text-sm text-ink-soft">{t("productForm.loadingBody")}</p>
      </AdminShell>
    );
  }

  if (notFound) {
    return (
      <AdminShell>
        <PageHeader
          eyebrow={t("productForm.eyebrow")}
          title={t("productForm.notFound.title")}
          description={t("productForm.notFound.body")}
          actions={<BackLink to="/admin/menu" label={t("productForm.back")} />}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("productForm.eyebrow")}
        title={isEdit ? name || t("productForm.titleEdit") : t("productForm.titleNew")}
        description={t("productForm.description")}
        actions={<BackLink to="/admin/menu" label={t("productForm.back")} />}
      />

      <Card className="max-w-2xl" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t("productForm.form.name")} htmlFor="product-name" required>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("productForm.form.namePlaceholder")}
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("productForm.form.category.label")} htmlFor="product-category" required>
              <Select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t("productForm.form.availability.label")} htmlFor="product-availability">
              <Select
                id="product-availability"
                value={isAvailable ? "yes" : "no"}
                onChange={(event) => setIsAvailable(event.target.value === "yes")}
              >
                <option value="yes">{t("productForm.form.availability.onMenu")}</option>
                <option value="no">{t("productForm.form.availability.hidden")}</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label={t("productForm.form.days.label")}
            htmlFor="product-days"
            hint={
              days.length === 0
                ? t("productForm.form.days.hintEveryDay")
                : t("productForm.form.days.hintSpecificDays", {
                    days: days.map((day) => weekdayLabel(tCommon, day)).join(", "),
                  })
            }
          >
            <div id="product-days" role="group" aria-label={t("productForm.form.days.label")} className="flex flex-wrap gap-1.5">
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
                    title={day === todayWeekday() ? t("productForm.form.days.today") : undefined}
                  >
                    {weekdayLabel(tCommon, day)}
                  </button>
                );
              })}
              {days.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDays([])}
                  className="rounded-full px-2 py-1 text-xs font-medium text-ink-soft hover:text-accent-strong"
                >
                  {t("productForm.form.days.everyDay")}
                </button>
              )}
            </div>
          </FormField>

          <FormField
            label={t("productForm.form.deal.label")}
            htmlFor="product-deal-toggle"
            hint={t("productForm.form.deal.hint")}
          >
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                id="product-deal-toggle"
                type="checkbox"
                checked={dealEnabled}
                onChange={(event) => {
                  setDealEnabled(event.target.checked);
                  if (event.target.checked && dealWindows.length === 0) {
                    setDealWindows([
                      {
                        day: todayWeekday(),
                        startTime: t("dealWindows.seedStart"),
                        endTime: t("dealWindows.seedEnd"),
                      },
                    ]);
                  }
                }}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              {t("productForm.form.deal.toggle")}
            </label>

            {dealEnabled && (
              <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface-sunken p-3">
                <FormField
                  label={t("productForm.form.deal.price.label")}
                  htmlFor="product-deal-price"
                  hint={t("productForm.form.deal.price.hint")}
                >
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

          <FormField label={t("productForm.form.description.label")} htmlFor="product-description">
            <textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              placeholder={t("productForm.form.description.placeholder")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("productForm.form.price.label")}
              htmlFor="product-price"
              required
              hint={t("productForm.form.price.hint")}
            >
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

            <FormField
              label={t("productForm.form.costPrice.label")}
              htmlFor="product-cost"
              hint={t("productForm.form.costPrice.hint")}
            >
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
            <FormField
              label={t("productForm.form.image.label")}
              htmlFor="product-image"
              hint={t("productForm.form.image.hint")}
            >
              <Input
                id="product-image"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder={t("productForm.form.image.placeholder")}
              />
            </FormField>

            <FormField label={t("productForm.form.badge.label")} htmlFor="product-badge">
              <Select
                id="product-badge"
                value={badge}
                onChange={(event) => setBadge(event.target.value as (typeof BADGES)[number])}
              >
                {BADGES.map((option) => (
                  <option key={option} value={option}>
                    {option === "none" ? t("productForm.form.badge.none") : badgeLabel(tCommon, option)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {image && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken p-3">
              <DataTableThumbnail src={image} alt={name || "Product preview"} size={48} />
              <p className="text-xs text-ink-soft">{t("productForm.form.image.previewNote")}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              {isEdit ? tCommon("actions.saveChanges") : t("productForm.createButton")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/menu")} disabled={saving}>
              {tCommon("actions.cancel")}
            </Button>
            {isEdit && <p className="ms-auto text-xs text-ink-soft">{t("productForm.recipeNote")}</p>}
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
