import i18n, { currentLocale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";

/**
 * Small helpers shared by every admin filter panel.
 * No React, so they're reusable from the dashboard, list pages and reports alike.
 *
 * Sorting and the range summary are locale-aware: Arabic collation differs from
 * English, and "Last 7 days" needs Arabic plural forms. Both read the active
 * locale instead of assuming the browser default.
 *
 * Note: these helpers resolve translations internally rather than taking a `t`
 * argument (unlike the enum->label maps in lib/i18n/labels.ts), because callers
 * embed their output inside larger strings.
 */

export function matchesSearch(value: string | null | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (value ?? "").toLowerCase().includes(q);
}

/** `from`/`to` are inclusive ISO date strings (`YYYY-MM-DD`); empty means unbounded. */
export function inDateRange(value: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  const iso = value.slice(0, 10);
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

/** Local-time `YYYY-MM-DD` for today, offset by `daysAgo`. */
export function isoDateOffset(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  const locale = currentLocale();
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b, locale)
  );
}

/** Counts how many filter values are "active" — drives the badge on the filter button. */
export function countActiveFilters(filters: Record<string, string | boolean | number | null | undefined>): number {
  return Object.values(filters).filter((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value);
    return typeof value === "string" ? value.trim().length > 0 : false;
  }).length;
}

export type SortDirection = "asc" | "desc";

export function sortBy<T>(rows: T[], accessor: (row: T) => string | number, direction: SortDirection = "asc"): T[] {
  const locale = currentLocale();
  const sorted = [...rows].sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv), locale, { numeric: true });
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export interface RangeFilterValue {
  /** `days` preset, used unless a custom from/to is set. */
  days: number;
  from: string;
  to: string;
}

export const RANGE_PRESETS = [7, 14, 30, 90] as const;

/** Human summary of the active window, for the filter chips. */
export function rangeLabel(value: RangeFilterValue): string {
  if (value.from || value.to) {
    // En-dash, not "→": arrow glyphs are not bidi-mirrored, so an arrow
    // separator would still point rightwards in Arabic and read backwards.
    return i18n.t("range.custom", {
      from: value.from ? formatDate(value.from) : "…",
      to: value.to ? formatDate(value.to) : "…",
    });
  }
  return i18n.t("range.lastDays", { count: value.days });
}

/** Resolves a range filter into concrete inclusive ISO bounds. */
export function resolveRange(value: RangeFilterValue): { from: string; to: string } {
  if (value.from || value.to) {
    return { from: value.from, to: value.to };
  }
  return { from: isoDateOffset(value.days - 1), to: "" };
}