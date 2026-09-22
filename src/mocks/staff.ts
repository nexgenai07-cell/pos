import type { Staff } from "@/types";

// Mock auth — PIN only, no password hashing needed at this phase.
export const STAFF: Staff[] = [
  { id: "s1", branchId: "default", name: "Amir (Owner)", role: "owner", pin: "1111" },
  { id: "s2", branchId: "default", name: "Sara (Manager)", role: "manager", pin: "2222" },
  { id: "s3", branchId: "default", name: "Junaid (Cashier)", role: "cashier", pin: "3333" },
  { id: "s4", branchId: "default", name: "Bilal (Kitchen)", role: "kitchen", pin: "4444" },
];
