import type { Customer } from "@/types";
import { SEEDED_CUSTOMERS } from "@/mocks/seed";

// Runtime mock store, mutated by lib/api/customers.ts. Pre-seeded so the
// repeat-customers report has real history — see mocks/seed.ts.
export const CUSTOMERS: Customer[] = [...SEEDED_CUSTOMERS];
