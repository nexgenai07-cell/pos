import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const SECTIONS: { test: (path: string) => boolean; label: string }[] = [
  { test: (p) => p === "/admin" || p.startsWith("/admin/dashboard"), label: "Dashboard" },
  { test: (p) => p.startsWith("/pos"), label: "Point of Sale" },
  { test: (p) => p.startsWith("/kds"), label: "Kitchen Display" },
  { test: (p) => p.startsWith("/admin/menu"), label: "Menu" },
  { test: (p) => p.startsWith("/admin/tables"), label: "Floor plan" },
  { test: (p) => p.startsWith("/admin/inventory"), label: "Inventory" },
  { test: (p) => p.startsWith("/admin/staff"), label: "Staff" },
  { test: (p) => p.startsWith("/admin/reports"), label: "Reports" },
  { test: (p) => p.startsWith("/admin/settings"), label: "Settings" },
];

function sectionLabel(pathname: string): string {
  return SECTIONS.find((entry) => entry.test(pathname))?.label ?? "Smoke & Char";
}

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const isOnline = useOnlineStatus();

  return (
    <header className="flex h-12 flex-none items-center justify-between border-b border-border bg-surface-raised/85 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex-none rounded-md p-1 text-ink-soft hover:bg-accent-soft/60 hover:text-accent-strong md:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <span className="text-ember-gradient">Smoke &amp; Char</span>
          <span className="mx-1.5 text-border-strong">/</span> {sectionLabel(location.pathname)}
        </p>
      </div>
      <div className="flex flex-none items-center gap-1.5 text-xs font-medium text-ink-soft">
        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-status-ready" : "bg-status-warn"}`} />
        <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
      </div>
    </header>
  );
}
