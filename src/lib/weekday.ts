/**
 * Day-of-week menu scheduling. Hand-mirrored into burger_web and
 * restaurant-mobile's lib/weekday.ts — same discipline as the Product type
 * itself (no shared package; see docs/architecture-plan.md §05).
 */
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

export function todayWeekday(date: Date = new Date()): Weekday {
  return WEEKDAYS[date.getDay()];
}

/** No days set (undefined or empty) means "every day" — the common case. */
export function isAvailableToday(days: Weekday[] | undefined, date: Date = new Date()): boolean {
  if (!days || days.length === 0) return true;
  return days.includes(todayWeekday(date));
}

/** Short human summary for a table/list column, e.g. "Daily", "Fri, Sat, Sun". */
export function describeDays(days: Weekday[] | undefined): string {
  if (!days || days.length === 0 || days.length === 7) return "Daily";
  return [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)).map((day) => WEEKDAY_LABELS[day]).join(", ");
}
