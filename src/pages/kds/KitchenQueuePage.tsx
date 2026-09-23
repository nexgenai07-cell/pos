import { useCallback, useEffect, useState } from "react";
import { ChefHat, CheckCircle2, RefreshCw } from "lucide-react";
import type { Order, OrderItem, Table } from "@/types";
import { getKitchenTickets, updateItemStatus } from "@/lib/api/orders";
import { getTables } from "@/lib/api/tables";
import { on } from "@/lib/eventBus";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "react-i18next";

function ticketAge(openedAt: string): { minutes: number; tone: "good" | "warn" | "danger" } {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(openedAt).getTime()) / 60_000));
  const tone = minutes < 10 ? "good" : minutes < 20 ? "warn" : "danger";
  return { minutes, tone };
}

export default function KitchenQueuePage() {
  const [tickets, setTickets] = useState<Order[] | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const { showToast } = useToast();
  const { t } = useTranslation("kds");

  const refresh = useCallback(() => {
    getKitchenTickets().then(setTickets);
  }, []);

  useEffect(() => {
    refresh();
    getTables().then(setTables);
    // Live: a POS send-to-kitchen or item update anywhere (this tab or
    // another device on the same origin) refreshes the queue instantly —
    // see docs/architecture-plan.md §08.
    return on("order:updated", refresh);
  }, [refresh]);

  async function handleBump(orderId: string, itemId: string, nextStatus: "preparing" | "ready") {
    await updateItemStatus(orderId, itemId, nextStatus);
    refresh();
    showToast(nextStatus === "preparing" ? t("toast.started") : t("toast.ready"), "success");
  }

  function tableLabel(order: Order) {
    return tables.find((table) => table.id === order.tableId)?.label ?? t("tableFallback");
  }

  return (
    <AdminShell fitScreen>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        actions={
          <Button variant="secondary" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            {t("refresh")}
          </Button>
        }
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-1">
        {tickets === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState icon={ChefHat} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((order) => {
              const age = ticketAge(order.openedAt);
              const active = order.items.filter((item) => item.status === "fired" || item.status === "preparing");
              const done = order.items.filter((item) => item.status === "ready" || item.status === "served");
              const notSent = order.items.filter((item) => item.status === "pending");
              const voided = order.items.filter((item) => item.status === "voided");

              return (
                <Card key={order.id} padding="none">
                  <div className="flex items-center justify-between border-b border-border p-3.5">
                    <span className="text-sm font-semibold text-ink">{tableLabel(order)}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusPill label={t("ageMinutes", { minutes: age.minutes })} tone={age.tone} />
                      <span className="text-xs text-ink-soft">#{order.id.slice(-6)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3.5">
                    {active.length > 0 && (
                      <div className="space-y-2">
                        {active.map((item) => (
                          <div
                            key={item.id}
                            className={`rounded-lg border-s-4 bg-surface py-2 ps-3 pe-2 ${
                              item.status === "fired" ? "border-s-status-warn" : "border-s-accent"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-ink">
                                {item.quantity}× {item.nameSnapshot}
                              </span>
                              {item.status === "fired" ? (
                                <Button variant="secondary" onClick={() => handleBump(order.id, item.id, "preparing")}>
                                  {t("start")}
                                </Button>
                              ) : (
                                <Button onClick={() => handleBump(order.id, item.id, "ready")}>{t("ready")}</Button>
                              )}
                            </div>
                            {item.notes && <p className="mt-1 text-xs italic text-ink-soft">{t("note", { note: item.notes })}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {done.length > 0 && <ItemGroup label={t("group.readyServed")} items={done} muted="good" />}
                    {notSent.length > 0 && <ItemGroup label={t("group.notSent")} items={notSent} muted="neutral" />}
                    {voided.length > 0 && <ItemGroup label={t("group.voided")} items={voided} muted="danger" strike />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function ItemGroup({
  label,
  items,
  muted,
  strike = false,
}: {
  label: string;
  items: OrderItem[];
  muted: "good" | "neutral" | "danger";
  strike?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-1.5 text-xs text-ink-soft">
            {muted === "good" && <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-status-ready" strokeWidth={2} />}
            <div className={strike ? "line-through" : ""}>
              <span>
                {item.quantity}× {item.nameSnapshot}
              </span>
              {item.notes && <span className="ms-1 italic">— {item.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
