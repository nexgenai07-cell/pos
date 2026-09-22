import type { Branch } from "@/types";

// Hardcoded to one branch for now, but every entity in this app already
// carries branchId — adding a second branch later is a data change, not a
// redesign. See docs/architecture-plan.md §11 ("Multi-branch").
export const BRANCH: Branch = {
  id: "default",
  name: "Smoke & Char — Riyadh",
  address: "King Fahd Road, Riyadh",
  timezone: "Asia/Riyadh",
  currency: "SAR",
};
