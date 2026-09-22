import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

const SECTIONS = [
  { test: (p: string) => p === "/admin" || p.startsWith("/admin/dashboard"), key: "sections.dashboard" },
  { test: (p: string) => p.startsWith("/pos"), key: "sections.pos" },
  { test: (p: string) => p.startsWith("/kds"), key: "sections.kds" },
  { test: (p: string) => p.startsWith("/admin/menu"), key: "sections.menu" },
  { test: (p: string) => p.startsWith("/admin/tables"), key: "sections.tables" },
  { test: (p: string) => p.startsWith("/admin/inventory"), key: "sections.inventory" },
  { test: (p: string) => p.startsWith("/admin/staff"), key: "sections.staff" },
  { test: (p: string) => p.startsWith("/admin/reports"), key: "sections.reports" },
  { test: (p: string) => p.startsWith("/admin/settings"), key: "sections.settings" },
] as const;

function sectionKey(pathname: string) {
  return SECTIONS.find((entry) => entry.test(pathname))?.key ?? "brand";
}

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const { t } = useTranslation("nav");
  const { t: tCommon } = useTranslation("common");

  return (
    <header className="flex h-12 flex-none items-center justify-between gap-3 border-b border-border bg-surface-raised/85 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label={t("aria.openMenu")}
          className="flex-none rounded-md p-1 text-ink-soft hover:bg-accent-soft/60 hover:text-accent-strong md:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <span className="text-ember-gradient">{t("brand")}</span>
          <span className="mx-1.5 text-border-strong">/</span> {t(sectionKey(location.pathname))}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2 text-xs font-medium text-ink-soft">
        <LanguageSwitcher />
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${isOnline ? "bg-status-ready" : "bg-status-warn"}`} />
          {isOnline ? tCommon("state.online") : tCommon("state.offline")}
        </span>
      </div>
    </header>
  );
}
