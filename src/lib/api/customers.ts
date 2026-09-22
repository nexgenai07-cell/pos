import type { Customer } from "@/types";
import { CUSTOMERS } from "@/mocks/customers";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getCustomers(): Promise<Customer[]> {
  return CUSTOMERS;
}

/** Optional on POS — dine-in customers are already identified by table. See §01. */
export async function findOrCreateCustomerByPhone(phone: string, branchId = "default"): Promise<Customer> {
  const existing = CUSTOMERS.find((customer) => customer.branchId === branchId && customer.phone === phone);
  if (existing) {
    existing.lastOrderAt = new Date().toISOString();
    return existing;
  }

  const customer: Customer = {
    id: generateId("cust"),
    branchId,
    phone,
    createdAt: new Date().toISOString(),
    lastOrderAt: new Date().toISOString(),
  };
  CUSTOMERS.push(customer);
  return customer;
}
