import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { ProductWithCategory } from "@/lib/api/products";
import { getProductById, getProducts, removeProductDeal, setProductDeal } from "@/lib/api/products";
import { todayWeekday } from "@/lib/weekday";
import type { DealWindow } from "@/lib/deals";
import { errorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BackLink from "@/components/ui/BackLink";
import DealWindowsEditor from "@/components/menu/DealWindowsEditor";

/**
 * One form for both create and edit, same pattern as ProductFormPage.
 * Create: pick any product that doesn't already have a deal.
 * Edit: the product is fixed (its id comes from the route), only the deal itself changes.
 */
export default function DealFormPage() {
  const { productId } = useParams<{ productId?: string }>();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation("menu");
  const { t: tCommon } = useTranslation("common");

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(productId ?? "");
  const [dealPrice, setDealPrice] = useState("");
  const [dealWindows, setDealWindows] = useState<DealWindow[]>([
    { day: todayWeekday(), startTime: t("dealWindows.seedStart"), endTime: t("dealWindows.seedEnd") },
  ]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts);

    if (!productId) return;
    getProductById(productId).then((product) => {
      if (!product || !product.deal) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSelectedProductId(product.id);
      setDealPrice(String(product.deal.price));
      setDealWindows(product.deal.windows);
      setLoading(false);
    });
  }, [productId]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  // On create, only offer products that don't already have a deal — editing an existing one happens via its own row.
  const productOptions = isEdit ? products : products.filter((product) => !product.deal || product.id === selectedProductId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProductId) {
      showToast(t("dealFormPage.errors.productRequired"), "error");
      return;
    }
    if (dealWindows.length === 0) {
      showToast(t("dealFormPage.errors.windowsRequired"), "error");
      return;
    }

    setSaving(true);
    try {
      await setProductDeal(selectedProductId, { price: Number(dealPrice) || 0, windows: dealWindows });
      showToast(isEdit ? t("dealFormPage.toastUpdated") : t("dealFormPage.toastCreated"), "success");
      navigate("/admin/menu/deals");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!productId) return;
    if (!window.confirm(t("dealFormPage.removeConfirm"))) return;
    setDeleting(true);
    try {
      await removeProductDeal(productId);
      showToast(t("dealFormPage.toastRemoved"), "success");
      navigate("/admin/menu/deals");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <PageHeader eyebrow={t("dealFormPage.eyebrow")} title={t("dealFormPage.loadingTitle")} />
        <p className="text-sm text-ink-soft">{t("dealFormPage.loadingBody")}</p>
      </AdminShell>
    );
  }

  if (notFound) {
    return (
      <AdminShell>
        <PageHeader
          eyebrow={t("dealFormPage.eyebrow")}
          title={t("dealFormPage.notFound.title")}
          description={t("dealFormPage.notFound.body")}
          actions={<BackLink to="/admin/menu/deals" label={t("dealFormPage.back")} />}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("dealFormPage.eyebrow")}
        title={isEdit ? t("dealFormPage.titleEditPrefix", { name: selectedProduct?.name ?? "…" }) : t("dealFormPage.titleNew")}
        description={t("dealFormPage.description")}
        actions={<BackLink to="/admin/menu/deals" label={t("dealFormPage.back")} />}
      />

      <Card className="max-w-2xl" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t("dealFormPage.form.product.label")} htmlFor="deal-product" required>
            <Select
              id="deal-product"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              disabled={isEdit}
            >
              <option value="">{t("dealFormPage.form.product.placeholder")}</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({formatCurrency(product.price)})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label={t("dealFormPage.form.price.label")}
            htmlFor="deal-price"
            required
            hint={
              selectedProduct
                ? t("dealFormPage.form.price.hint", { price: formatCurrency(selectedProduct.price) })
                : undefined
            }
          >
            <Input
              id="deal-price"
              type="number"
              min="0"
              step="0.01"
              value={dealPrice}
              onChange={(event) => setDealPrice(event.target.value)}
              required
            />
          </FormField>

          <FormField label={t("dealFormPage.form.activeDuring")} htmlFor="deal-windows">
            <div id="deal-windows">
              <DealWindowsEditor windows={dealWindows} onChange={setDealWindows} />
            </div>
          </FormField>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              {isEdit ? tCommon("actions.saveChanges") : t("dealFormPage.createButton")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/menu/deals")} disabled={saving}>
              {tCommon("actions.cancel")}
            </Button>
            {isEdit && (
              <Button type="button" variant="danger" className="ms-auto" onClick={handleDelete} loading={deleting}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                {t("dealFormPage.removeButton")}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
