export type StaffRole = "owner" | "manager" | "cashier" | "kitchen";

export interface Staff {
  id: string;
  branchId: string;
  name: string;
  role: StaffRole;
  /** Mock auth — a PIN, not a real credential. */
  pin: string;
}

export interface Shift {
  id: string;
  staffId: string;
  clockIn: string;
  clockOut?: string;
}
