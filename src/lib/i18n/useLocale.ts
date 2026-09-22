import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, directionFor, isLocale, type Direction, type Locale } from "./types";

export interface UseLocaleResult {
  /** The resolved, supported locale. */
  locale: Locale;
  /** "rtl" for Arabic, "ltr" for English. */
  dir: Direction;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
}

/**
 * Reads the active locale and exposes a setter. Deliberately side-effect free —
 * `lang`/`dir` on <html> are applied by config.ts's languageChanged listener,
 * so this hook is safe to call from any component.
 */
export function useLocale(): UseLocaleResult {
  const { i18n } = useTranslation();

  const resolved = i18n.resolvedLanguage ?? i18n.language;
  const locale: Locale = isLocale(resolved) ? resolved : DEFAULT_LOCALE;
  const dir = directionFor(locale);

  const setLocale = useCallback(
    (next: Locale) => {
      void i18n.changeLanguage(next);
    },
    [i18n]
  );

  return { locale, dir, isRtl: dir === "rtl", setLocale };
}
