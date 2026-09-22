import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-status-ready/30 text-status-ready",
  error: "border-status-danger/30 text-status-danger",
  info: "border-accent/30 text-accent",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const { t } = useTranslation("common");

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 end-5 z-50 flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink shadow-md ${TONE_CLASSES[toast.tone]}`}
            >
              <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
              <span>{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label={t("actions.dismiss")}
                className="ms-1 flex-none text-ink-soft transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
