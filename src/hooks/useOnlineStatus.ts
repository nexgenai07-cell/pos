import { useEffect, useState } from "react";

/**
 * Scaffolding only — see docs/architecture-plan.md §11 ("Offline POS"). All
 * POS writes already funnel through lib/api, so a real offline queue later
 * only touches those files. This hook just surfaces connectivity; it doesn't
 * queue or replay anything.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
