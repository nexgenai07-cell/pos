import type { StockMovement } from "@/types";
import { SEEDED_WASTE } from "@/mocks/seed";

// Runtime mock store, mutated by lib/api/inventory.ts. Pre-seeded with waste
// events so the wastage report has real history — see mocks/seed.ts. This is
// the audit trail the wastage/margin reports read from, per §10.
export const STOCK_MOVEMENTS: StockMovement[] = [...SEEDED_WASTE];
