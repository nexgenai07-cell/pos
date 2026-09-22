export type OrderItemStatus =
  | "pending"
  | "fired"
  | "preparing"
  | "ready"
  | "served"
  | "voided";

export interface OrderItem {
  id: string;
  productId: string;
  /** Captured at order time — never re-read the live Product. */
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  status: OrderItemStatus;
  notes?: string;
}

export type PaymentMethod = "cash" | "card" | "other";

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  tip?: number;
  paidAt: string;
}

export type OrderStatus =
  | "open"
  | "sent"
  | "preparing"
  | "ready"
  | "served"
  | "closed"
  | "cancelled";

export interface Order {
  id: string;
  branchId: string;
  tableId?: string;
  customerId?: string;
  source: "pos" | "qr";
  staffId?: string;
  items: OrderItem[];
  status: OrderStatus;
  payments: Payment[];
  openedAt: string;
  closedAt?: string;
}
