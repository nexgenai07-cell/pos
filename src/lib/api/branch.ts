import type { Branch } from "@/types";
import { BRANCH } from "@/mocks/branch";

/**
 * The app is single-branch today, so lib/format.ts needs a *synchronous* handle
 * on the active branch's currency and timezone — it formats on every row of
 * every table and can't await a promise mid-render.
 *
 * That cache lives here rather than in format.ts because this module is the only
 * one allowed to touch mocks (docs/architecture-plan.md §07). When the real
 * backend lands, BRANCH becomes a fetched value and the accessor is unchanged.
 */
let activeBranch: Branch = BRANCH;

/** Synchronous read of the active branch. Prefer getBranch() outside formatters. */
export function getActiveBranch(): Branch {
  return activeBranch;
}

export async function getBranch(): Promise<Branch> {
  return activeBranch;
}

export async function updateBranch(updates: Partial<Omit<Branch, "id">>): Promise<Branch> {
  activeBranch = { ...activeBranch, ...updates };
  return activeBranch;
}
