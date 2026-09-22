import i18n from "@/lib/i18n/config";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/types";
import { getActiveBranch } from "@/lib/api/branch";

/**
 * Locale- and branch-aware formatting.
 *
 * Currency and timezone are read from the active Branch instead of being
 * hardcoded. The previous implementation emitted "$" unconditionally and called
 * toLocaleDateString(undefined, …) with no timeZone — so every date silently
 * followed the *browser's* timezone, letting a report land a day off for any
 * staff member whose machine sat in another zone. Branch.timezone was editable
 * in Settings but was never applied to anything.
 */

/**
 * Arabic is pinned to Western digits via the -u-nu-latn Unicode extension:
 * Intl's default for "ar" is Arabic-Indic numerals (٨٫٩٩), which regional POS
 * software does not use and which slow cashiers down on a keypad.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
};

function activeLocale(): Locale {
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  return isLocale(resolved) ? resolved : DEFAULT_LOCALE;
}

function activeDefaults(): { currency: string; timeZone: string } {
  const branch = getActiveBranch();
  return { currency: branch.currency, timeZone: branch.timezone };
}

export function formatCurrency(value: number, currency?: string): string {
  return new Intl.NumberFormat(INTL_LOCALE[activeLocale()], {
    style: "currency",
    currency: currency ?? activeDefaults().currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Pass `timeZone` to override the branch's zone; everything else is Intl options. */
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(INTL_LOCALE[activeLocale()], {
    timeZone: activeDefaults().timeZone,
    ...options,
  }).format(date);
}

export function formatDateTime(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(INTL_LOCALE[activeLocale()], {
    timeZone: activeDefaults().timeZone,
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  }).format(date);
}

/** Plain counts/quantities/percentages — Western digits in Arabic, per above. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(INTL_LOCALE[activeLocale()], options).format(value);
}

/** The currency code in effect, for column headers like "Revenue (SAR)". */
export function activeCurrency(): string {
  return activeDefaults().currency;
}
