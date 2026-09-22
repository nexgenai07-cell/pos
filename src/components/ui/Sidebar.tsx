import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Flame,
  LayoutGrid,
  LayoutDashboard,
  ChefHat,
  UtensilsCrossed,
  Tags,
  Percent,
  Boxes,
  ClipboardList,
  Truck,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBranch } from "@/lib/api/branch";
import { canAccessArea, type Area } from "@/lib/rbac";
import StatusPill from "@/components/ui/StatusPill";

const COLLAPSE_KEY = "smoke-and-char-sidebar-collapsed";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Restricts this link to roles that can access the area — see src/lib/rbac.ts. */
  area?: Area;
}

const OPERATIONS: NavItem[] = [
  { to: "/pos", label: "Tables", icon: LayoutGrid, area: "pos" },
  { to: "/kds", label: "Kitchen", icon: ChefHat, area: "kds" },
];

const OVERVIEW: NavItem[] = [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const MENU: NavItem[] = [
  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/admin/menu/categories", label: "Categories", icon: Tags },
  { to: "/admin/menu/deals", label: "Deals", icon: Percent },
];

const INVENTORY: NavItem[] = [
  { to: "/admin/inventory/stock", label: "Stock", icon: Boxes },
  { to: "/admin/inventory/recipes", label: "Recipes", icon: ClipboardList },
  { to: "/admin/inventory/purchases", label: "Purchases", icon: Truck },
  { to: "/admin/inventory/suppliers", label: "Suppliers", icon: Building2 },
];

const MANAGEMENT: NavItem[] = [
  { to: "/admin/staff", label: "Staff", icon: Users },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { staff, logout } = useAuth();
  const location = useLocation();
  const canSeeAdmin = staff?.role === "manager" || staff?.role === "owner";
  const operations = OPERATIONS.filter((item) => !item.area || canAccessArea(staff?.role, item.area));

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    getBranch().then((branch) => setBranchName(branch.name));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // localStorage unavailable — collapse state just won't persist.
    }
  }, [collapsed]);

  function isActive(to: string): boolean {
    // Exact-match the plain "list" links whose path is also a prefix of sibling routes
    // (e.g. "/admin/menu" vs "/admin/menu/categories"), so only one nav item lights up.
    return to === "/pos" || to === "/admin/menu" ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-none flex-col border-r border-border bg-surface-raised shadow-sm transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-17" : "md:w-64"} w-64`}
      >
        <div className={`flex items-center justify-between gap-2 px-4 py-4 ${collapsed ? "md:justify-center md:px-2" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ember-gradient shadow-warm">
              <Flame className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="truncate text-sm font-bold tracking-wide text-ink">SMOKE&amp;CHAR</p>
              <p className="truncate text-[11px] text-ink-soft">{branchName}</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex-none rounded-md p-1.5 text-ink-soft hover:bg-surface hover:text-ink md:hidden"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <NavGroup
            label={collapsed ? undefined : "Operations"}
            items={operations}
            isActive={isActive}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
          {canSeeAdmin && (
            <>
              <NavGroup
                label={collapsed ? undefined : "Overview"}
                items={OVERVIEW}
                isActive={isActive}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
              <NavGroup
                label={collapsed ? undefined : "Menu"}
                items={MENU}
                isActive={isActive}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
              <NavGroup
                label={collapsed ? undefined : "Inventory"}
                items={INVENTORY}
                isActive={isActive}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
              <NavGroup
                label={collapsed ? undefined : "Management"}
                items={MANAGEMENT}
                isActive={isActive}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
            </>
          )}
        </nav>

        {staff && (
          <div className="border-t border-border p-3">
            <div className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${collapsed ? "md:justify-center" : ""}`}>
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                {initials(staff.name)}
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                <p className="truncate text-sm font-medium text-ink">{staff.name}</p>
                <StatusPill label={staff.role} tone="accent" />
              </div>
              <button
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="flex-none rounded-md p-1.5 text-ink-soft transition-colors hover:bg-surface hover:text-status-danger"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-16 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised text-ink-soft shadow-sm transition-colors hover:border-accent hover:text-accent md:flex"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} /> : <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />}
        </button>
      </aside>
    </>
  );
}

function NavGroup({
  label,
  items,
  isActive,
  collapsed,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  isActive: (to: string) => boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-4">
      {label && (
        <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">{label}</p>
      )}
      <div className="space-y-0.5">
        {items.map(({ to, label: itemLabel, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              title={collapsed ? itemLabel : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                collapsed ? "md:justify-center" : ""
              } ${active ? "bg-ember-gradient text-white shadow-warm" : "text-ink-soft hover:bg-accent-soft/60 hover:text-accent-strong"}`}
            >
              <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
              <span className={collapsed ? "md:hidden" : ""}>{itemLabel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
