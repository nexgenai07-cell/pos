import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import Select from "@/components/ui/Select";
import { useLocale } from "@/lib/i18n/useLocale";
import { LOCALES, type Locale } from "@/lib/i18n/types";

/**
 * Language picker. Built on the shared ui/Select so it inherits the existing
 * form styling instead of introducing a second control style
 * (docs/architecture-plan.md §12 — one UI kit per project).
 *
 * Lives in the Topbar and on the login page, since staff need to pick their
 * language before they authenticate, not after.
 */
export default function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1.5">
      <Languages className="h-3.5 w-3.5 flex-none text-ink-muted" strokeWidth={2} aria-hidden="true" />
      <Select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.label")}
        title={t("language.label")}
        className="h-8 w-32 py-1 text-xs"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`language.${code}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
