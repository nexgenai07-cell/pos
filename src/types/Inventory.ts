export interface RecipeItem {
  inventoryItemId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  productId: string;
  items: RecipeItem[];
}

export interface InventoryItem {
  id: string;
  branchId: string;
  name: string;
  unit: string;
  currentStock: number;
  parLevel: number;
  costPerUnit: number;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactInfo: string;
}

export type PurchaseStatus = "draft" | "ordered" | "received";

export interface Purchase {
  id: string;
  branchId: string;
  supplierId: string;
  items: { inventoryItemId: string; quantity: number; unitCost: number }[];
  status: PurchaseStatus;
  orderedAt: string;
  receivedAt?: string;
}

export type StockMovementReason = "sale" | "purchase" | "waste" | "adjustment";

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  quantityDelta: number;
  reason: StockMovementReason;
  orderId?: string;
  createdAt: string;
}
