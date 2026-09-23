import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InventoryItem, RecipeItem } from "@/types";
import { getProductById, type ProductWithCategory } from "@/lib/api/products";
import { getInventoryItems } from "@/lib/api/inventory";
import { getRecipeForProduct, setRecipeForProduct } from "@/lib/api/recipes";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BackLink from "@/components/ui/BackLink";
import { DataTableThumbnail } from "@/components/ui/DataTable";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";

export default function RecipeEditorPage() {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const hasRecipe = Object.values(quantities).some((value) => Number(value) > 0);

  useEffect(() => {
    getProductById(productId).then((value) => setProduct(value ?? null));
    getInventoryItems().then(setInventoryItems);
    getRecipeForProduct(productId).then((recipe) => {
      if (!recipe) return;
      const initial: Record<string, string> = {};
      recipe.items.forEach((item) => {
        initial[item.inventoryItemId] = String(item.quantity);
      });
      setQuantities(initial);
    });
  }, [productId]);

  function handleQuantityChange(inventoryItemId: string, value: string) {
    setQuantities((current) => ({ ...current, [inventoryItemId]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const items: RecipeItem[] = inventoryItems
      .filter((item) => Number(quantities[item.id]) > 0)
      .map((item) => ({ inventoryItemId: item.id, quantity: Number(quantities[item.id]), unit: item.unit }));

    await setRecipeForProduct(productId, items);
    setSaving(false);
    showToast(t("recipeEditorPage.toastSaved"), "success");
  }

  async function handleClear() {
    if (!window.confirm(t("recipeEditorPage.confirmClear"))) return;
    setClearing(true);
    await setRecipeForProduct(productId, []);
    setQuantities({});
    setClearing(false);
    showToast(t("recipeEditorPage.toastCleared"), "success");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("recipeEditorPage.eyebrow")}
        title={product ? product.name : t("recipeEditorPage.fallbackTitle")}
        description={t("recipeEditorPage.description")}
        actions={<BackLink to="/admin/inventory/recipes" label={t("recipeEditorPage.backToRecipes")} />}
      />

      {product && (
        <div className="mb-4 flex items-center gap-3">
          <DataTableThumbnail src={product.image} alt={product.name} size={48} />
          <div>
            <p className="text-sm font-medium text-ink">{product.name}</p>
            <p className="text-xs text-ink-soft">{product.categoryName}</p>
          </div>
        </div>
      )}

      <TableContainer className="max-w-xl">
        <Table>
          <THead>
            <Th>{t("recipeEditorPage.colIngredient")}</Th>
            <Th>{t("recipeEditorPage.colQuantityPerOrder")}</Th>
          </THead>
          <TBody>
            {inventoryItems.map((item) => (
              <Tr key={item.id}>
                <Td className="text-ink">{item.name}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={quantities[item.id] ?? ""}
                      onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                      className="w-20 py-1!"
                    />
                    <span className="text-xs text-ink-soft">{item.unit}</span>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableContainer>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}>
          {t("recipeEditorPage.saveRecipe")}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/admin/inventory/recipes")}>
          {tCommon("actions.cancel")}
        </Button>
        {hasRecipe && (
          <Button variant="danger" onClick={handleClear} loading={clearing} className="ms-auto">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {t("recipeEditorPage.clearRecipe")}
          </Button>
        )}
      </div>
    </AdminShell>
  );
}
