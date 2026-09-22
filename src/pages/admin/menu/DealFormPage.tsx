import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { ProductWithCategory } from "@/lib/api/products";
import { getProductById, getProducts, removeProductDeal, setProductDeal } from "@/lib/api/products";
import { todayWeekday } from "@/lib/weekday";
import type { DealWindow } from "@/lib/deals";
import { errorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
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

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(productId ?? "");
  const [dealPrice, setDealPrice] = useState("");
  const [dealWindows, setDealWindows] = useState<DealWindow[]>([
    { day: todayWeekday(), startTime: "11:00", endTime: "14:00" },
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
      showToast("Pick a product for this deal", "error");
      return;
    }
    if (dealWindows.length === 0) {
      showToast("Add at least one day and time window", "error");
      return;
    }

    setSaving(true);
    try {
      await setProductDeal(selectedProductId, { price: Number(dealPrice) || 0, windows: dealWindows });
      showToast(isEdit ? "Deal updated" : "Deal created", "success");
      navigate("/admin/menu/deals");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!productId) return;
    if (!window.confirm("Remove this deal? The item goes back to its regular price.")) return;
    setDeleting(true);
    try {
      await removeProductDeal(productId);
      showToast("Deal removed", "success");
      navigate("/admin/menu/deals");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Menu · Deal" title="Loading deal…" />
        <p className="text-sm text-ink-soft">Fetching the current deal…</p>
      </AdminShell>
    );
  }

  if (notFound) {
    return (
      <AdminShell>
        <PageHeader
          eyebrow="Menu · Deal"
          title="Deal not found"
          description="It may have already been removed."
          actions={<BackLink to="/admin/menu/deals" label="Back to deals" />}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={isEdit ? "Menu · Edit deal" : "Menu · New deal"}
        title={isEdit ? `Deal on ${selectedProduct?.name ?? "…"}` : "New deal"}
        description="A special price active only during the day+time windows below. Outside them, the item shows its regular price."
        actions={<BackLink to="/admin/menu/deals" label="Back to deals" />}
      />

      <Card className="max-w-2xl" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Product" htmlFor="deal-product" required>
            <Select
              id="deal-product"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              disabled={isEdit}
            >
              <option value="">Select a product…</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({formatCurrency(product.price)})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Deal price"
            htmlFor="deal-price"
            required
            hint={selectedProduct ? `Must be less than the regular price of ${formatCurrency(selectedProduct.price)}` : undefined}
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

          <FormField label="Active during" htmlFor="deal-windows">
            <div id="deal-windows">
              <DealWindowsEditor windows={dealWindows} onChange={setDealWindows} />
            </div>
          </FormField>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              {isEdit ? "Save changes" : "Create deal"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/menu/deals")} disabled={saving}>
              Cancel
            </Button>
            {isEdit && (
              <Button type="button" variant="danger" className="ml-auto" onClick={handleDelete} loading={deleting}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Remove deal
              </Button>
            )}
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
