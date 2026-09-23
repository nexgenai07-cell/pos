import type { TFunction } from "i18next";
import type {
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  Product,
  PurchaseStatus,
  StaffRole,
  StockMovementReason,
  TableStatus,
} from "@/types";
import { WEEKDAYS, type Weekday } from "@/lib/weekday";
import type { Deal } from "@/lib/deals";
import { formatTime } from "@/lib/format";

/**
 * The app models statuses, roles and badges as string unions, so their values
 * can't be handed to a typed t() directly. Spelling every union member -> key
 * pairing out once here keeps dynamic lookups honest at compile time and gives
 * one place to see the whole UI vocabulary. See docs/architecture-plan.md §12
 * ("status as color + shape, not just text").
 *
 * Components should call these helpers instead of hand-building `status.${x}`
 * strings, so a new union member is a compile error rather than a blank label.
 */

const ORDER_STATUS_KEY = {
  open: "status.open",
  sent: "status.sent",
  preparing: "status.preparing",
  ready: "status.ready",
  served: "status.served",
  closed: "status.closed",
  cancelled: "status.cancelled",
} as const satisfies Record<OrderStatus, string>;

const ORDER_ITEM_STATUS_KEY = {
  pending: "status.pending",
  fired: "status.fired",
  preparing: "status.preparing",
  ready: "status.ready",
  served: "status.served",
  voided: "status.voided",
} as const satisfies Record<OrderItemStatus, string>;

/** "needs-bill" is the one union value that isn't already a valid key segment. */
const TABLE_STATUS_KEY = {
  empty: "status.empty",
  occupied: "status.occupied",
  "needs-bill": "status.needsBill",
} as const satisfies Record<TableStatus, string>;

const PURCHASE_STATUS_KEY = {
  draft: "status.draft",
  ordered: "status.ordered",
  received: "status.received",
} as const satisfies Record<PurchaseStatus, string>;

const MOVEMENT_REASON_KEY = {
  sale: "status.sale",
  purchase: "status.purchase",
  waste: "status.waste",
  adjustment: "status.adjustment",
} as const satisfies Record<StockMovementReason, string>;

const ROLE_KEY = {
  owner: "role.owner",
  manager: "role.manager",
  cashier: "role.cashier",
  kitchen: "role.kitchen",
} as const satisfies Record<StaffRole, string>;

const BADGE_KEY = {
  New: "badge.new",
  Popular: "badge.popular",
  Deal: "badge.deal",
} as const satisfies Record<NonNullable<Product["badge"]>, string>;

const PAYMENT_METHOD_KEY = {
  cash: "paymentMethod.cash",
  card: "paymentMethod.card",
  other: "paymentMethod.other",
} as const satisfies Record<PaymentMethod, string>;

const WEEKDAY_KEY = {
  sun: "weekday.sun",
  mon: "weekday.mon",
  tue: "weekday.tue",
  wed: "weekday.wed",
  thu: "weekday.thu",
  fri: "weekday.fri",
  sat: "weekday.sat",
} as const satisfies Record<Weekday, string>;

export function orderStatusLabel(t: TFunction<"common">, status: OrderStatus): string {
  return t(ORDER_STATUS_KEY[status]);
}

export function orderItemStatusLabel(t: TFunction<"common">, status: OrderItemStatus): string {
  return t(ORDER_ITEM_STATUS_KEY[status]);
}

export function tableStatusLabel(t: TFunction<"common">, status: TableStatus): string {
  return t(TABLE_STATUS_KEY[status]);
}

export function purchaseStatusLabel(t: TFunction<"common">, status: PurchaseStatus): string {
  return t(PURCHASE_STATUS_KEY[status]);
}

export function movementReasonLabel(t: TFunction<"common">, reason: StockMovementReason): string {
  return t(MOVEMENT_REASON_KEY[reason]);
}

export function roleLabel(t: TFunction<"common">, role: StaffRole): string {
  return t(ROLE_KEY[role]);
}

export function badgeLabel(t: TFunction<"common">, badge: NonNullable<Product["badge"]>): string {
  return t(BADGE_KEY[badge]);
}

export function paymentMethodLabel(t: TFunction<"common">, method: PaymentMethod): string {
  return t(PAYMENT_METHOD_KEY[method]);
}

export function weekdayLabel(t: TFunction<"common">, day: Weekday): string {
  return t(WEEKDAY_KEY[day]);
}

const ROLE_SUMMARY_KEY = {
  owner: "roleSummary.owner",
  manager: "roleSummary.manager",
  cashier: "roleSummary.cashier",
  kitchen: "roleSummary.kitchen",
} as const satisfies Record<StaffRole, string>;

/** The per-role permission blurb shown on the staff page — see common:roleSummary. */
export function roleSummaryLabel(t: TFunction<"common">, role: StaffRole): string {
  return t(ROLE_SUMMARY_KEY[role]);
}

/**
 * "Daily" / "Fri, Sat, Sun" for UI. Locale-aware twin of weekday.ts's
 * describeDays(), which keeps its English output for CSV export (localized
 * exports arrive with the Phase 5 BOM fix).
 */
export function describeDaysLabel(t: TFunction<"common">, days: Weekday[] | undefined): string {
  if (!days || days.length === 0 || days.length === 7) return t("time.daily");
  return [...days]
    .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
    .map((day) => weekdayLabel(t, day))
    .join(", ");
}

/** "Fri 11:00 AM–2:00 PM" for UI — twin of deals.ts's describeDeal() (CSV keeps English). */
export function describeDealLabel(t: TFunction<"common">, deal: Deal | undefined): string {
  if (!deal || deal.windows.length === 0) return "";
  return deal.windows
    .map((window) => `${weekdayLabel(t, window.day)} ${formatTime(window.startTime)}–${formatTime(window.endTime)}`)
    .join(", ");
}

