import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/config";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import App from "@/App";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      {/* Translations load over HTTP (see lib/i18n/config.ts), so first paint
          waits on the namespace fetch — reuse the app's own Skeleton. */}
      <Suspense fallback={<Skeleton className="h-screen w-full rounded-none" />}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </Suspense>
    </I18nextProvider>
  </StrictMode>
);
