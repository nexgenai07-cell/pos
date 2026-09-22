import type { Table } from "@/types";

// Same table numbering as restaurant-website's mocks/tables.ts for a coherent
// demo story — these are still two independent mock stores (§05), not wired
// together. Tables start empty here; POS "open table" sets status + a token.
export const TABLES: Table[] = [
  { id: "t1", branchId: "default", label: "Table 1", qrCode: "", status: "empty" },
  { id: "t2", branchId: "default", label: "Table 2", qrCode: "", status: "empty" },
  { id: "t3", branchId: "default", label: "Table 3", qrCode: "", status: "empty" },
  { id: "t4", branchId: "default", label: "Table 4", qrCode: "", status: "empty" },
  { id: "t5", branchId: "default", label: "Table 5", qrCode: "", status: "empty" },
  { id: "t6", branchId: "default", label: "Table 6", qrCode: "", status: "empty" },
];
