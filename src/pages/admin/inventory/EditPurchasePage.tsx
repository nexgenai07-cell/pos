import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import type { InventoryItem, PurchaseStatus, Supplier } from "@/types";
import { getInventoryItems } from "@/lib/api/inventory";
import { getSuppliers } from "@/lib/api/suppliers";
import { getPurchaseById, updatePurchase } from "@/lib/api/purchases";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
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

export default function EditPurchasePage() {
  const { purchaseId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState<PurchaseStatus>("ordered");
  const [lines, setLines] = useState<Line[]>([]);
  const [orderReference, setOrderReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInventoryItems().then(setInventoryItems);
    getSuppliers().then(setSuppliers);

    getPurchaseById(purchaseId).then((purchase) => {
      if (!purchase) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrderReference(purchase.id);
      setSupplierId(purchase.supplierId);
      setStatus(purchase.status);
      setLocked(purchase.status === "received");
      setLines(
        purchase.items.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          quantity: String(line.quantity),
          unitCost: String(line.unitCost),
        }))
      );
      setLoading(false);
    });
  }, [purchaseId]);

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

    if (!supplierId || !items.length) {
      showToast("Pick a supplier and at least one line item", "error");
      return;
    }

    setSaving(true);
    try {
      await updatePurchase(purchaseId, { supplierId, items, status });
      showToast("Purchase order updated", "success");
      navigate("/admin/inventory/purchases");
    } catch (error) {
      showToast(errorMessage(error), "error");
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Inventory · Purchases" title="Loading purchase order…" />
      </AdminShell>
    );
  }

  if (notFound) {
    return (
      <AdminShell>
        <PageHeader
          eyebrow="Inventory · Purchases"
          title="Purchase order not found"
          description="It may have been deleted."
          actions={<BackLink to="/admin/inventory/purchases" label="Back to purchases" />}
        />
      </AdminShell>
    );
  }

  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0);

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Inventory · Purchases"
        title={`Edit ${orderReference}`}
        description={
          locked
            ? "This order has already been received, so its lines are locked."
            : "Change the supplier, quantities or status while stock hasn't arrived yet."
        }
        actions={
          <>
            <StatusPill label={status} tone={status === "received" ? "good" : status === "ordered" ? "accent" : "neutral"} />
            <BackLink to="/admin/inventory/purchases" label="Back to purchases" />
          </>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Supplier" htmlFor="edit-po-supplier">
            <Select
              id="edit-po-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              disabled={locked}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Status" htmlFor="edit-po-status" hint="Draft stays internal until you order it">
            <Select
              id="edit-po-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PurchaseStatus)}
              disabled={locked}
            >
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
            </Select>
          </FormField>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Line items</p>
            <p className="text-xs text-ink-soft">
              Order total <span className="font-semibold tabular-nums text-ink">${total.toFixed(2)}</span>
            </p>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={line.inventoryItemId}
                  onChange={(event) => updateLine(index, { inventoryItemId: event.target.value })}
                  className="min-w-[10rem] flex-1 py-1.5!"
                  disabled={locked}
                >
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0"
                  placeholder="quantity"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  className="w-24 py-1.5!"
                  disabled={locked}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="unit cost"
                  value={line.unitCost}
                  onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                  className="w-24 py-1.5!"
                  disabled={locked}
                />
                {!locked && lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label="Remove line"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!locked && (
            <button
              type="button"
              onClick={addLine}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Add line
            </button>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={locked}>
            Save changes
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/purchases")} disabled={saving}>
            Cancel
          </Button>
          {locked && (
            <p className="text-xs text-ink-soft">
              Received orders are immutable — the stock movements they created are already on the books.
            </p>
          )}
        </div>
      </form>
    </AdminShell>
  );
}
