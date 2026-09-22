import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, INTL_TAGS, LOCALES, NAMESPACES, directionFor, isLocale, type Locale } from "./types";

/**
 * Locale persistence — same "smoke-and-char-*" convention as AuthContext
 * ("smoke-and-char-admin-staff") and Sidebar ("smoke-and-char-sidebar-collapsed").
 */
export const LOCALE_STORAGE_KEY = "smoke-and-char-locale";

/**
 * Translations are fetched over HTTP from public/locales/{{lng}}/{{ns}}.json
 * instead of being bundled. Today that resolves to a static file on the same
 * origin; when the real backend lands, only this string changes to point at
 * the API — the same "swap the internals, not the callers" seam used by
 * src/lib/api/* (see docs/architecture-plan.md §07).
 */
export const TRANSLATIONS_LOAD_PATH = "/locales/{{lng}}/{{ns}}.json";

function applyDocumentLanguage(language: string) {
  const locale = isLocale(language) ? language : DEFAULT_LOCALE;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = directionFor(locale);
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...LOCALES],
    // Never request "ar-SA" — only ever "en"/"ar" — so a regional OS setting
    // can't 404 the namespace fetch.
    load: "currentOnly",
    fallbackLng: DEFAULT_LOCALE,
    ns: [...NAMESPACES],
    defaultNS: "common",
    backend: { loadPath: TRANSLATIONS_LOAD_PATH },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    // React escapes interpolated values already.
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: true },
    // Dev-only: surface every key we forgot to add, and never silently 404 a namespace.
    saveMissing: import.meta.env.DEV,
    saveMissingTo: "all",
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => {
          console.warn(`[i18n] missing key "${key}" in ns "${ns}" for ${lngs.join(", ")}`);
        }
      : undefined,
  });

/**
 * Applying lang/dir here (rather than in a component effect) means the switch
 * lands before React re-renders, so there is no flash of LTR layout. i18next
 * emits languageChanged on init as well, which covers first paint.
 */
i18n.on("languageChanged", applyDocumentLanguage);

/**
 * The resolved locale right now. For non-component code that can't call the
 * useLocale() hook — lib/format.ts, lib/filters.ts, sort comparators.
 */
export function currentLocale(): Locale {
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  return isLocale(resolved) ? resolved : DEFAULT_LOCALE;
}

/** BCP-47 tag for Intl formatting — Western digits in Arabic (see INTL_TAGS). */
export function currentIntlLocale(): string {
  return INTL_TAGS[currentLocale()];
}

export default i18n;
