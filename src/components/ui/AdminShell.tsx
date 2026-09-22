import { useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/ui/Sidebar";
import Topbar from "@/components/ui/Topbar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function AdminShell({
  children,
  fitScreen = false,
}: {
  children: ReactNode;
  /** Desktop-only: fills the viewport with no page scroll, so screens like POS/KDS manage their own internal scroll regions instead. Falls back to normal page scroll below the lg breakpoint. */
  fitScreen?: boolean;
}) {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation("common");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen print:block print:h-auto">
      <div className="print:hidden">
        <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        </div>
        {!isOnline && (
          <div className="flex flex-none items-center justify-center gap-2 bg-status-warn px-5 py-1.5 text-center text-xs font-semibold text-white print:hidden">
            <WifiOff className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
            {t("state.offlineNote")}
          </div>
        )}
        <main className={`flex-1 overflow-y-auto print:overflow-visible ${fitScreen ? "lg:overflow-hidden" : ""}`}>
          <div
            className={`mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6 print:max-w-none print:px-0 print:py-0 ${
              fitScreen ? "lg:flex lg:h-full lg:flex-col lg:py-4" : ""
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
