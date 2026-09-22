export type TableStatus = "empty" | "occupied" | "needs-bill";

export interface Table {
  id: string;
  branchId: string;
  label: string;
  qrCode: string;
  /** Minted when staff open a seating, cleared on close-out. */
  sessionToken?: string;
  status: TableStatus;
}
