import type enCommon from "../../../public/locales/en/common.json";
import type enNav from "../../../public/locales/en/nav.json";
import type enAuth from "../../../public/locales/en/auth.json";
import type enErrors from "../../../public/locales/en/errors.json";
import type enSettings from "../../../public/locales/en/settings.json";
import type enKds from "../../../public/locales/en/kds.json";
import type enPos from "../../../public/locales/en/pos.json";
import type enTables from "../../../public/locales/en/tables.json";
import type enMenu from "../../../public/locales/en/menu.json";
import type enReports from "../../../public/locales/en/reports.json";
import type enDashboard from "../../../public/locales/en/dashboard.json";
import type enInventory from "../../../public/locales/en/inventory.json";
import type enStaff from "../../../public/locales/en/staff.json";

/**
 * Locale plumbing shared by config.ts, useLocale.ts and labels.ts.
 *
 * The English JSON is imported **type-only** on purpose: it costs nothing at
 * runtime (erased at compile time), so translations still load over HTTP via
 * i18next-http-backend — they are never bundled twice.
 */

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Arabic is currently the only RTL locale — add here if that changes. */
const RTL_LOCALES: ReadonlySet<string> = new Set<string>(["ar"]);

export type Direction = "ltr" | "rtl";

export function directionFor(locale: Locale): Direction {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

/** Narrows an arbitrary i18next language string (e.g. "ar-SA") to a Locale we support. */
export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Locale -> BCP-47 tag for Intl. Arabic is pinned to Western digits via the
 * -u-nu-latn Unicode extension: Intl's default for "ar" is Arabic-Indic
 * numerals (٨٫٩٩), which regional POS software doesn't use and which slow
 * cashiers down on a keypad. Used by lib/format.ts.
 */
export const INTL_TAGS: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-u-nu-latn",
};

export const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "errors",
  "settings",
  "kds",
  "pos",
  "tables",
  "menu",
  "reports",
  "dashboard",
  "inventory",
  "staff",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * Compile-time checking of translation keys against the English dictionaries.
 * If this ever fights the union-driven keys this app is full of (statuses,
 * roles, badges, weekdays), deleting this block is the whole rollback.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof enCommon;
      nav: typeof enNav;
      auth: typeof enAuth;
      errors: typeof enErrors;
      settings: typeof enSettings;
      kds: typeof enKds;
      pos: typeof enPos;
      tables: typeof enTables;
      menu: typeof enMenu;
      reports: typeof enReports;
      dashboard: typeof enDashboard;
      inventory: typeof enInventory;
      staff: typeof enStaff;
    };
  }
}
