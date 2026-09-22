import type { Supplier } from "@/types";
import { SUPPLIERS } from "@/mocks/suppliers";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSuppliers(): Promise<Supplier[]> {
  return SUPPLIERS;
}

export async function getSupplierById(id: string): Promise<Supplier | undefined> {
  return SUPPLIERS.find((entry) => entry.id === id);
}

export async function createSupplier(input: { name: string; contactInfo: string }): Promise<Supplier> {
  const supplier: Supplier = { id: generateId("sup"), ...input };
  SUPPLIERS.push(supplier);
  return supplier;
}

export async function updateSupplier(id: string, updates: { name?: string; contactInfo?: string }): Promise<Supplier> {
  const supplier = SUPPLIERS.find((entry) => entry.id === id);
  if (!supplier) throw new Error(`Supplier ${id} not found`);
  Object.assign(supplier, updates);
  return supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const index = SUPPLIERS.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Supplier ${id} not found`);
  SUPPLIERS.splice(index, 1);
}
