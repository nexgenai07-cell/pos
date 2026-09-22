import type { Order, OrderItem, Payment, PaymentMethod } from "@/types";
import type { ProductWithCategory } from "@/lib/api/products";
import { ORDERS } from "@/mocks/orders";
import { emit } from "@/lib/eventBus";
import { deductStockForOrderItem } from "@/lib/api/recipes";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  return ORDERS.find((order) => order.id === id);
}

export async function getOpenOrderForTable(tableId: string): Promise<Order | undefined> {
  return ORDERS.find((order) => order.tableId === tableId && order.status !== "closed" && order.status !== "cancelled");
}

export async function getOrCreateOpenOrder(tableId: string, staffId: string, branchId = "default"): Promise<Order> {
  const existing = await getOpenOrderForTable(tableId);
  if (existing) return existing;

  const order: Order = {
    id: generateId("order"),
    branchId,
    tableId,
    source: "pos",
    staffId,
    items: [],
    status: "open",
    payments: [],
    openedAt: new Date().toISOString(),
  };
  ORDERS.push(order);
  return order;
}

export async function addItemToOrder(orderId: string, product: ProductWithCategory, quantity = 1): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const existing = order.items.find((item) => item.productId === product.id && item.status === "pending");
  if (existing) {
    existing.quantity += quantity;
  } else {
    const newItem: OrderItem = {
      id: generateId("item"),
      productId: product.id,
      nameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity,
      status: "pending",
    };
    order.items.push(newItem);
  }
  emit("order:updated", { id: order.id });
  return order;
}

export async function updateItemQuantity(orderId: string, itemId: string, quantity: number): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  if (quantity <= 0) {
    order.items = order.items.filter((item) => item.id !== itemId);
  } else {
    const item = order.items.find((entry) => entry.id === itemId);
    if (item) item.quantity = quantity;
  }
  emit("order:updated", { id: order.id });
  return order;
}

/**
 * Marks pending items as fired, moves the order into the kitchen queue, and
 * deducts recipe ingredient stock for each newly-fired item — deduction
 * happens here, not at placement or completion. See §11.
 */
export async function sendToKitchen(orderId: string): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const newlyFired = order.items.filter((item) => item.status === "pending");
  newlyFired.forEach((item) => {
    item.status = "fired";
  });
  order.status = "sent";

  for (const item of newlyFired) {
    await deductStockForOrderItem(item.productId, item.quantity, order.id);
  }

  emit("order:updated", { id: order.id });
  return order;
}

/** Orders with at least one item the kitchen still needs to act on. */
export async function getKitchenTickets(): Promise<Order[]> {
  return ORDERS.filter(
    (order) =>
      order.status !== "closed" &&
      order.status !== "cancelled" &&
      order.items.some((item) => item.status === "fired" || item.status === "preparing")
  );
}

export async function updateItemStatus(orderId: string, itemId: string, status: OrderItem["status"]): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  const item = order.items.find((entry) => entry.id === itemId);
  if (item) item.status = status;
  if (order.items.every((entry) => entry.status === "ready" || entry.status === "served" || entry.status === "voided")) {
    order.status = "ready";
  }
  emit("order:updated", { id: order.id });
  return order;
}

/** Optional — links a phone-identified Customer to a dine-in order at payment time. */
export async function attachCustomer(orderId: string, customerId: string): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  order.customerId = customerId;
  return order;
}

export function getOrderTotal(order: Order): number {
  return order.items
    .filter((item) => item.status !== "voided")
    .reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
}

export async function recordPayment(
  orderId: string,
  input: { amount: number; method: PaymentMethod; tip?: number }
): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const payment: Payment = {
    id: generateId("pay"),
    amount: input.amount,
    method: input.method,
    tip: input.tip,
    paidAt: new Date().toISOString(),
  };
  order.payments.push(payment);
  emit("order:updated", { id: order.id });
  return order;
}

/**
 * DEV-ONLY DEMO HACK — see hooks/useQrBridgeSync.ts. Inserts an order that
 * actually originated on restaurant-website, deducting stock the same way a
 * POS "send to kitchen" would. Not part of the real architecture — there is
 * no such bridge without a real backend (§08).
 */
export async function importBridgeOrder(order: Order): Promise<void> {
  if (ORDERS.some((existing) => existing.id === order.id)) return;
  ORDERS.push(order);

  for (const item of order.items) {
    if (item.status === "fired" || item.status === "preparing") {
      await deductStockForOrderItem(item.productId, item.quantity, order.id);
    }
  }

  emit("order:updated", { id: order.id });
}

export async function closeOrder(orderId: string): Promise<Order> {
  const order = ORDERS.find((item) => item.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  order.status = "closed";
  order.closedAt = new Date().toISOString();
  emit("order:updated", { id: order.id });
  return order;
}
