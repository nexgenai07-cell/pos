import { useEffect } from "react";
import type { Order } from "@/types";
import { getOrderById, importBridgeOrder } from "@/lib/api/orders";
import { ensureOccupied } from "@/lib/api/tables";
import { findOrCreateCustomerByPhone } from "@/lib/api/customers";

const POLL_MS = 4000;

/**
 * DEV-ONLY DEMO HACK — not real architecture.
 *
 * restaurant-website has no way to reach restaurant-admin (two independent
 * projects, no shared backend — §05/§08). To make a local demo *look*
 * connected, the website's checkout action writes each QR order into this
 * project's own public/qr-bridge.json on disk; this hook just polls that
 * file (same-origin, so no CORS) and folds in anything new.
 *
 * Delete this file and its counterpart (restaurant-website's lib/devBridge.ts)
 * once a real backend exists — this is scaffolding for a demo, not a pattern
 * to build on.
 */
export function useQrBridgeSync(): void {
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/qr-bridge.json", { cache: "no-store" });
        if (!response.ok) return;
        const bridgeOrders = (await response.json()) as (Order & { customerPhone?: string })[];

        for (const bridgeOrder of bridgeOrders) {
          if (cancelled) return;
          const { customerPhone, ...order } = bridgeOrder;
          if (await getOrderById(order.id)) continue;

          let customerId = order.customerId;
          if (customerPhone) {
            const customer = await findOrCreateCustomerByPhone(customerPhone, order.branchId);
            customerId = customer.id;
          }

          await importBridgeOrder({ ...order, customerId });
          if (order.tableId) await ensureOccupied(order.tableId);
        }
      } catch {
        // Website dev server / file not there yet — fine, just try again next tick.
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
}
