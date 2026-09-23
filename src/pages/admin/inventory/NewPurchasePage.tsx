import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InventoryItem, Supplier } from "@/types";
import { getInventoryItems } from "@/lib/api/inventory";
import { getSuppliers } from "@/lib/api/suppliers";
import { createPurchase } from "@/lib/api/purchases";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BackLink from "@/components/ui/BackLink";

interface Line {
  inventoryItemId: string;
  quantity: string;
  unitCost: string;
}

export default function NewPurchasePage() {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ inventoryItemId: "", quantity: "", unitCost: "" }]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getSuppliers().then((list) => {
      setSuppliers(list);
      setSupplierId(list[0]?.id ?? "");
    });
    getInventoryItems().then((list) => {
      setInventoryItems(list);
      setLines([{ inventoryItemId: list[0]?.id ?? "", quantity: "", unitCost: "" }]);
    });
  }, []);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { inventoryItemId: inventoryItems[0]?.id ?? "", quantity: "", unitCost: "" }]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const items = lines
      .filter((line) => line.inventoryItemId && Number(line.quantity) > 0)
      .map((line) => ({
        inventoryItemId: line.inventoryItemId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost) || 0,
      }));
    if (!supplierId || !items.length) return;

    setSaving(true);
    await createPurchase({ supplierId, items });
    showToast(t("newPurchasePage.toastCreated"), "success");
    navigate("/admin/inventory/purchases");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("newPurchasePage.eyebrow")}
        title={t("newPurchasePage.title")}
        description={t("newPurchasePage.description")}
        actions={<BackLink to="/admin/inventory/purchases" label={t("purchaseForm.backToPurchases")} />}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <FormField label={t("purchaseForm.supplierLabel")} htmlFor="supplier">
          <Select id="supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="max-w-sm">
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </FormField>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("purchaseForm.lineItemsLabel")}</p>
          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={line.inventoryItemId}
                  onChange={(event) => updateLine(index, { inventoryItemId: event.target.value })}
                  className="min-w-[10rem] flex-1 py-1.5!"
                >
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t("purchaseForm.itemUnitFormat", { name: item.name, unit: item.unit })}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0"
                  placeholder={t("purchaseForm.quantityPlaceholder")}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  className="w-24 py-1.5!"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("purchaseForm.unitCostPlaceholder")}
                  value={line.unitCost}
                  onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                  className="w-24 py-1.5!"
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label={t("purchaseForm.removeLineAria")}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t("purchaseForm.addLine")}
          </button>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            {t("newPurchasePage.submitButton")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/purchases")} disabled={saving}>
            {tCommon("actions.cancel")}
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
