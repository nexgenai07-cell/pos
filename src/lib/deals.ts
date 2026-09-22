import { WEEKDAY_LABELS, todayWeekday, type Weekday } from "@/lib/weekday";

/**
 * Limited-time special pricing. A deal is a set of per-day time windows —
 * different days can have different start/end times — plus the price that
 * applies while any one of them is active. Hand-mirrored into
 * burger_web/lib/deals.ts and restaurant-mobile/src/lib/deals.ts.
 */
export interface DealWindow {
  day: Weekday;
  /** 24h "HH:MM", inclusive. */
  startTime: string;
  /** 24h "HH:MM", exclusive. */
  endTime: string;
}

export interface Deal {
  price: number;
  windows: DealWindow[];
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isWindowActive(window: DealWindow, date: Date = new Date()): boolean {
  if (todayWeekday(date) !== window.day) return false;
  const minutes = minutesOfDay(date);
  return minutes >= parseTime(window.startTime) && minutes < parseTime(window.endTime);
}

/** The deal price right now, or undefined when no window is currently active. */
export function activeDealPrice(deal: Deal | undefined, date: Date = new Date()): number | undefined {
  if (!deal || deal.windows.length === 0) return undefined;
  return deal.windows.some((window) => isWindowActive(window, date)) ? deal.price : undefined;
}

export function formatTime12h(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Human summary for admin lists, e.g. "Mon–Fri 11:00 AM–2:00 PM". */
export function describeDeal(deal: Deal | undefined): string {
  if (!deal || deal.windows.length === 0) return "";
  return deal.windows
    .map((window) => `${WEEKDAY_LABELS[window.day]} ${formatTime12h(window.startTime)}–${formatTime12h(window.endTime)}`)
    .join(", ");
}
