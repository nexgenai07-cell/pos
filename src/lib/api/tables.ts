import type { Table } from "@/types";
import { TABLES } from "@/mocks/tables";
import { emit } from "@/lib/eventBus";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateToken(label: string): string {
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getTables(): Promise<Table[]> {
  return TABLES;
}

export async function getTableById(id: string): Promise<Table | undefined> {
  return TABLES.find((table) => table.id === id);
}

export async function createTable(input: { label: string; branchId?: string }): Promise<Table> {
  const label = input.label.trim();
  if (!label) throw new Error("Table label is required.");
  if (TABLES.some((table) => table.label.trim().toLowerCase() === label.toLowerCase())) {
    throw new Error(`A table called "${label}" already exists.`);
  }

  const table: Table = {
    id: generateId("table"),
    branchId: input.branchId ?? "default",
    label,
    qrCode: "",
    status: "empty",
  };
  TABLES.push(table);
  emit("table:updated", { id: table.id });
  return table;
}

export async function updateTable(id: string, updates: { label?: string }): Promise<Table> {
  const table = TABLES.find((entry) => entry.id === id);
  if (!table) throw new Error(`Table ${id} not found`);

  if (updates.label !== undefined) {
    const label = updates.label.trim();
    if (!label) throw new Error("Table label is required.");
    if (TABLES.some((entry) => entry.id !== id && entry.label.trim().toLowerCase() === label.toLowerCase())) {
      throw new Error(`A table called "${label}" already exists.`);
    }
    table.label = label;
  }

  emit("table:updated", { id: table.id });
  return table;
}

/** A seated table can't vanish from under an open bill — close it out first. */
export async function deleteTable(id: string): Promise<void> {
  const index = TABLES.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Table ${id} not found`);

  const table = TABLES[index];
  if (table.status !== "empty" || table.sessionToken) {
    throw new Error("This table is in use — close out its bill before removing it.");
  }

  TABLES.splice(index, 1);
  emit("table:updated", { id });
}

/** Mints a fresh session token for the QR flow — see docs/architecture-plan.md §11. */
export async function openTable(id: string): Promise<Table> {
  const table = TABLES.find((item) => item.id === id);
  if (!table) throw new Error(`Table ${id} not found`);
  table.sessionToken = generateToken(table.label);
  table.qrCode = `/t/${table.sessionToken}`;
  table.status = "occupied";
  emit("table:updated", { id: table.id });
  return table;
}

export async function markNeedsBill(id: string): Promise<Table> {
  const table = TABLES.find((item) => item.id === id);
  if (!table) throw new Error(`Table ${id} not found`);
  table.status = "needs-bill";
  emit("table:updated", { id: table.id });
  return table;
}

/** DEV-ONLY DEMO HACK — see hooks/useQrBridgeSync.ts. Flags a table occupied
 *  when a bridged website order arrives for it, purely for display. */
export async function ensureOccupied(id: string): Promise<void> {
  const table = TABLES.find((item) => item.id === id);
  if (!table || table.status !== "empty") return;
  table.status = "occupied";
  emit("table:updated", { id: table.id });
}

/** Clears the session token so old QR codes/receipts stop resolving. */
export async function closeTable(id: string): Promise<Table> {
  const table = TABLES.find((item) => item.id === id);
  if (!table) throw new Error(`Table ${id} not found`);
  table.sessionToken = undefined;
  table.qrCode = "";
  table.status = "empty";
  emit("table:updated", { id: table.id });
  return table;
}
