import type { Customer, Order, OrderItem, Payment, PaymentMethod, StockMovement } from "@/types";
import { PRODUCTS } from "@/mocks/products";
import { TABLES } from "@/mocks/tables";
import { STAFF } from "@/mocks/staff";
import { INVENTORY_ITEMS } from "@/mocks/inventoryItems";

/**
 * Fabricated order/customer/waste history so the reports in Phase 5 have
 * something real to aggregate on first load, instead of an empty dashboard.
 * Generated once at module load — see docs/architecture-plan.md §09 ("Reports
 * need realistic historical mock data to be meaningfully testable").
 */

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// Lunch (12–14) and dinner (18–21) service get more weight than the rest of the day.
function weightedHour(): number {
  const roll = Math.random();
  if (roll < 0.4) return randomInt(12, 14);
  if (roll < 0.8) return randomInt(18, 21);
  return randomInt(10, 22);
}

const posStaff = STAFF.filter((member) => member.role === "cashier" || member.role === "manager" || member.role === "owner");
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "other"];

function buildCustomers(count: number): Customer[] {
  const customers: Customer[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = randomInt(1, 60);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    customers.push({
      id: generateId("cust"),
      branchId: "default",
      phone: `555-01${String(10 + i).padStart(2, "0")}`,
      createdAt,
      lastOrderAt: createdAt,
    });
  }
  return customers;
}

function buildOrders(customers: Customer[], count: number): Order[] {
  const orders: Order[] = [];

  for (let i = 0; i < count; i++) {
    const dayOffset = randomInt(0, 13);
    const openedAt = new Date();
    openedAt.setDate(openedAt.getDate() - dayOffset);
    openedAt.setHours(weightedHour(), randomInt(0, 59), 0, 0);

    const durationMinutes = randomInt(18, 75);
    const closedAt = new Date(openedAt.getTime() + durationMinutes * 60_000);

    const itemCount = randomInt(1, 4);
    const items: OrderItem[] = [];
    for (let j = 0; j < itemCount; j++) {
      const product = pick(PRODUCTS);
      const quantity = randomInt(1, 3);
      const isVoided = Math.random() < 0.06;
      items.push({
        id: generateId("item"),
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        quantity,
        status: isVoided ? "voided" : "served",
      });
    }

    const subtotal = items
      .filter((item) => item.status !== "voided")
      .reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

    const payments: Payment[] = subtotal > 0
      ? [
          {
            id: generateId("pay"),
            amount: subtotal,
            method: pick(PAYMENT_METHODS),
            tip: Math.random() < 0.6 ? Number((subtotal * randomInt(5, 18) / 100).toFixed(2)) : 0,
            paidAt: closedAt.toISOString(),
          },
        ]
      : [];

    // ~65% of orders are tied to a repeat-visit-eligible customer.
    const customerId = Math.random() < 0.65 ? pick(customers).id : undefined;

    orders.push({
      id: generateId("order"),
      branchId: "default",
      tableId: pick(TABLES).id,
      customerId,
      source: "pos",
      staffId: pick(posStaff).id,
      items,
      status: "closed",
      payments,
      openedAt: openedAt.toISOString(),
      closedAt: closedAt.toISOString(),
    });
  }

  return orders.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}

function buildWaste(count: number): StockMovement[] {
  const movements: StockMovement[] = [];
  for (let i = 0; i < count; i++) {
    const item = pick(INVENTORY_ITEMS);
    const daysAgo = randomInt(0, 13);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
    const quantity = item.unit === "g" || item.unit === "ml" ? randomInt(50, 400) : randomInt(1, 6);
    movements.push({
      id: generateId("mv"),
      inventoryItemId: item.id,
      quantityDelta: -quantity,
      reason: "waste",
      createdAt: createdAt.toISOString(),
    });
  }
  return movements.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const SEEDED_CUSTOMERS = buildCustomers(18);
export const SEEDED_ORDERS = buildOrders(SEEDED_CUSTOMERS, 70);
export const SEEDED_WASTE = buildWaste(20);
