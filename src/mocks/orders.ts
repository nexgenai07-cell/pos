import type { Order } from "@/types";
import { SEEDED_ORDERS } from "@/mocks/seed";

// Runtime mock store, mutated by lib/api/orders.ts as POS creates/updates
// orders. Pre-seeded with fabricated history (see mocks/seed.ts) so the
// Phase 5 reports have something to aggregate on first load.
export const ORDERS: Order[] = [...SEEDED_ORDERS];
