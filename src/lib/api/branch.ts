import type { Branch } from "@/types";
import { BRANCH } from "@/mocks/branch";

export async function getBranch(): Promise<Branch> {
  return BRANCH;
}

export async function updateBranch(updates: Partial<Omit<Branch, "id">>): Promise<Branch> {
  Object.assign(BRANCH, updates);
  return BRANCH;
}
