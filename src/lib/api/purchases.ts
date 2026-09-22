import type { Purchase } from "@/types";
import { PURCHASES } from "@/mocks/purchases";
import { INVENTORY_ITEMS } from "@/mocks/inventoryItems";
import { adjustStock } from "@/lib/api/inventory";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreatePurchaseInput {
  branchId?: string;
  supplierId: string;
  items: { inventoryItemId: string; quantity: number; unitCost: number }[];
}

export async function getPurchases(): Promise<Purchase[]> {
  return PURCHASES;
}

export async function getPurchaseById(id: string): Promise<Purchase | undefined> {
  return PURCHASES.find((entry) => entry.id === id);
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const purchase: Purchase = {
    id: generateId("po"),
    branchId: input.branchId ?? "default",
    supplierId: input.supplierId,
    items: input.items,
    status: "ordered",
    orderedAt: new Date().toISOString(),
  };
  PURCHASES.push(purchase);
  return purchase;
}

/** Only draft/ordered POs can be removed — a received one is part of the stock history. */
export async function deletePurchase(id: string): Promise<void> {
  const index = PURCHASES.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Purchase ${id} not found`);
  if (PURCHASES[index].status === "received") {
    throw new Error("Received purchase orders can't be deleted.");
  }
  PURCHASES.splice(index, 1);
}

/**
 * Editing a PO is only allowed while stock hasn't arrived yet — receiving is
 * what commits the numbers, so a received order is immutable history.
 */
export async function updatePurchase(id: string, input: CreatePurchaseInput & { status?: Purchase["status"] }): Promise<Purchase> {
  const purchase = PURCHASES.find((entry) => entry.id === id);
  if (!purchase) throw new Error(`Purchase ${id} not found`);
  if (purchase.status === "received") {
    throw new Error("Received purchase orders can't be edited.");
  }
  if (!input.items.length) throw new Error("A purchase order needs at least one line item.");

  purchase.supplierId = input.supplierId;
  purchase.items = input.items;
  if (input.status) purchase.status = input.status;
  return purchase;
}

/** Stock only actually arrives here — creating a PO doesn't touch stock. */
export async function receivePurchase(id: string): Promise<Purchase> {
  const purchase = PURCHASES.find((entry) => entry.id === id);
  if (!purchase) throw new Error(`Purchase ${id} not found`);

  for (const line of purchase.items) {
    await adjustStock(line.inventoryItemId, line.quantity, "purchase");
    const inventoryItem = INVENTORY_ITEMS.find((item) => item.id === line.inventoryItemId);
    if (inventoryItem) inventoryItem.costPerUnit = line.unitCost;
  }
  purchase.status = "received";
  purchase.receivedAt = new Date().toISOString();
  return purchase;
}
