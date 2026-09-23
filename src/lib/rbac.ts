import type { StaffRole } from "@/types";

/**
 * Single source of truth for what each role can reach. Route guards in
 * App.tsx and the Sidebar's nav filtering both read from here, so there's
 * exactly one place that says "kitchen never touches POS/payments" etc.
 */
export type Area = "admin" | "pos" | "kds";

const AREA_ROLES: Record<Area, StaffRole[]> = {
  admin: ["owner", "manager"],
  pos: ["owner", "manager", "cashier"],
  kds: ["owner", "manager", "kitchen"],
};

export function canAccessArea(role: StaffRole | undefined, area: Area): boolean {
  if (!role) return false;
  return AREA_ROLES[area].includes(role);
}

/** Which area a route belongs to, or null for routes with no area restriction (e.g. /login). */
export function areaForPath(pathname: string): Area | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/kds")) return "kds";
  return null;
}

/** Where a role lands right after login, and where a blocked area redirects back to. */
export function landingPathFor(role: StaffRole): string {
  if (role === "kitchen") return "/kds";
  if (role === "cashier") return "/pos";
  return "/admin/dashboard"; // manager, owner
}

