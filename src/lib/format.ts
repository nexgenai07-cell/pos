import { currentIntlLocale } from "@/lib/i18n/config";
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

/** Digits/direction policy lives in INTL_TAGS — see lib/i18n/types.ts. */
function activeDefaults(): { currency: string; timeZone: string } {
  const branch = getActiveBranch();
  return { currency: branch.currency, timeZone: branch.timezone };
}

export function formatCurrency(value: number, currency?: string): string {
  return new Intl.NumberFormat(currentIntlLocale(), {
    style: "currency",
    currency: currency ?? activeDefaults().currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Pass `timeZone` to override the branch's zone; everything else is Intl options. */
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    timeZone: activeDefaults().timeZone,
    ...options,
  }).format(date);
}

export function formatDateTime(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    timeZone: activeDefaults().timeZone,
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  }).format(date);
}

/** Plain counts/quantities/percentages — Western digits in Arabic, per above. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(currentIntlLocale(), options).format(value);
}

/** "HH:MM" (24h, as stored by <input type="time">) rendered in the active locale. */
export function formatTime(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  const [hours, minutes] = value.split(":").map(Number);
  // A fixed date — only the time is rendered. Built from local components, so a
  // timeZone must NOT be passed here or it would shift the wall-clock value.
  const date = new Date(2000, 0, 1, hours || 0, minutes || 0);
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

/** The currency code in effect, for column headers like "Revenue (SAR)". */
export function activeCurrency(): string {
  return activeDefaults().currency;
}
