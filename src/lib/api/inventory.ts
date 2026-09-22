import type { InventoryItem, StockMovement, StockMovementReason } from "@/types";
import { INVENTORY_ITEMS } from "@/mocks/inventoryItems";
import { STOCK_MOVEMENTS } from "@/mocks/stockMovements";
import { RECIPES } from "@/mocks/recipes";
import { emit } from "@/lib/eventBus";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  return INVENTORY_ITEMS;
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | undefined> {
  return INVENTORY_ITEMS.find((item) => item.id === id);
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  return INVENTORY_ITEMS.filter((item) => item.currentStock <= item.parLevel);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return STOCK_MOVEMENTS;
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, "name" | "unit" | "parLevel" | "costPerUnit" | "supplierId" | "currentStock">>
): Promise<InventoryItem> {
  const item = INVENTORY_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`Inventory item ${id} not found`);
  Object.assign(item, updates);
  emit("inventory:updated", { id: item.id });
  return item;
}

export interface CreateInventoryItemInput {
  branchId?: string;
  name: string;
  unit: string;
  currentStock?: number;
  parLevel?: number;
  costPerUnit?: number;
  supplierId?: string;
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const name = input.name.trim();
  if (!name) throw new Error("Ingredient name is required.");

  const duplicate = INVENTORY_ITEMS.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (duplicate) throw new Error(`"${name}" is already tracked.`);

  const item: InventoryItem = {
    id: generateId("inv"),
    branchId: input.branchId ?? "default",
    name,
    unit: input.unit.trim() || "unit",
    currentStock: Math.max(0, input.currentStock ?? 0),
    parLevel: Math.max(0, input.parLevel ?? 0),
    costPerUnit: Math.max(0, input.costPerUnit ?? 0),
    supplierId: input.supplierId || undefined,
  };

  INVENTORY_ITEMS.push(item);
  emit("inventory:updated", { id: item.id });
  return item;
}

/**
 * Refuses to remove an ingredient a recipe still deducts from — that would
 * silently break stock deduction at the POS. Past stock movements are left
 * alone (the audit trail is append-only, per §10), so history stays intact.
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  const index = INVENTORY_ITEMS.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Inventory item ${id} not found`);

  const usedByRecipes = RECIPES.filter((recipe) => recipe.items.some((line) => line.inventoryItemId === id));
  if (usedByRecipes.length > 0) {
    throw new Error(
      `Still used by ${usedByRecipes.length} recipe${usedByRecipes.length === 1 ? "" : "s"} — remove it from those first.`
    );
  }

  INVENTORY_ITEMS.splice(index, 1);
  emit("inventory:updated", { id });
}

/**
 * The one place stock ever changes. Every deduction/receipt/waste/adjustment
 * logs a StockMovement with a reason — see docs/architecture-plan.md §10,
 * the wastage/margin reports depend on this trail existing from day one.
 */
export async function adjustStock(
  inventoryItemId: string,
  quantityDelta: number,
  reason: StockMovementReason,
  orderId?: string
): Promise<InventoryItem> {
  const item = INVENTORY_ITEMS.find((entry) => entry.id === inventoryItemId);
  if (!item) throw new Error(`Inventory item ${inventoryItemId} not found`);

  item.currentStock = Math.max(0, item.currentStock + quantityDelta);

  const movement: StockMovement = {
    id: generateId("mv"),
    inventoryItemId,
    quantityDelta,
    reason,
    orderId,
    createdAt: new Date().toISOString(),
  };
  STOCK_MOVEMENTS.push(movement);
  emit("inventory:updated", { id: item.id });
  return item;
}
