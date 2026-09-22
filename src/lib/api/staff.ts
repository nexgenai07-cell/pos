import type { Shift, Staff, StaffRole } from "@/types";
import { STAFF } from "@/mocks/staff";
import { SHIFTS } from "@/mocks/shifts";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getStaffList(): Promise<Staff[]> {
  return STAFF;
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
  return STAFF.find((member) => member.id === id);
}

export async function loginWithPin(staffId: string, pin: string): Promise<Staff | undefined> {
  const staff = STAFF.find((member) => member.id === staffId);
  return staff && staff.pin === pin ? staff : undefined;
}

export async function createStaff(input: { name: string; role: StaffRole; pin: string; branchId?: string }): Promise<Staff> {
  const staff: Staff = {
    id: generateId("staff"),
    branchId: input.branchId ?? "default",
    name: input.name,
    role: input.role,
    pin: input.pin,
  };
  STAFF.push(staff);
  return staff;
}

export async function updateStaff(id: string, updates: Partial<Pick<Staff, "name" | "role" | "pin">>): Promise<Staff> {
  const member = STAFF.find((entry) => entry.id === id);
  if (!member) throw new Error(`Staff ${id} not found`);
  Object.assign(member, updates);
  return member;
}

export async function deleteStaff(id: string): Promise<void> {
  const index = STAFF.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Staff ${id} not found`);
  STAFF.splice(index, 1);
}

export async function getShiftsForStaff(staffId: string): Promise<Shift[]> {
  return SHIFTS.filter((shift) => shift.staffId === staffId).sort((a, b) => b.clockIn.localeCompare(a.clockIn));
}

export async function getActiveShift(staffId: string): Promise<Shift | undefined> {
  return SHIFTS.find((shift) => shift.staffId === staffId && !shift.clockOut);
}

export async function clockIn(staffId: string): Promise<Shift> {
  const existing = await getActiveShift(staffId);
  if (existing) return existing;
  const shift: Shift = { id: generateId("shift"), staffId, clockIn: new Date().toISOString() };
  SHIFTS.push(shift);
  return shift;
}

export async function clockOut(staffId: string): Promise<Shift | undefined> {
  const shift = SHIFTS.find((entry) => entry.staffId === staffId && !entry.clockOut);
  if (!shift) return undefined;
  shift.clockOut = new Date().toISOString();
  return shift;
}
