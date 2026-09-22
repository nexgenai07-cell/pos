import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Receipt } from "lucide-react";
import type { Order, PaymentMethod, Table } from "@/types";
import { getTableById, closeTable } from "@/lib/api/tables";
import { attachCustomer, getOpenOrderForTable, getOrderTotal, recordPayment, closeOrder } from "@/lib/api/orders";
import { findOrCreateCustomerByPhone } from "@/lib/api/customers";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const CENTS_TOLERANCE = 0.01;

export default function PaymentPage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [amount, setAmount] = useState("0");
  const [tip, setTip] = useState("0");
  const [phone, setPhone] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    getTableById(tableId).then((value) => setTable(value ?? null));
    getOpenOrderForTable(tableId).then((value) => {
      setOrder(value ?? null);
      if (value) setAmount(remainingBalance(value).toFixed(2));
      setLoaded(true);
    });
  }, [tableId]);

  function remainingBalance(current: Order): number {
    const total = getOrderTotal(current);
    const paid = current.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return Math.max(0, total - paid);
  }

  if (!loaded) return <AdminShell><PageHeader eyebrow="Point of sale" title="Payment" /></AdminShell>;

  if (!order) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Point of sale" title="Payment" />
        <EmptyState icon={Receipt} title="No open order" description="This table doesn't have an order to charge for right now." />
      </AdminShell>
    );
  }

  const total = getOrderTotal(order);
  const paidSoFar = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = remainingBalance(order);
  const chargeAmount = Math.min(Number(amount) || 0, remaining);
  const tipAmount = Number(tip) || 0;

  async function handleConfirmPayment() {
    if (!order || chargeAmount <= 0) return;

    if (phone.trim()) {
      const customer = await findOrCreateCustomerByPhone(phone.trim());
      await attachCustomer(order.id, customer.id);
    }

    const updated = await recordPayment(order.id, { amount: chargeAmount, method, tip: tipAmount });
    const stillOwed = remainingBalance(updated);

    if (stillOwed <= CENTS_TOLERANCE) {
      await closeOrder(order.id);
      await closeTable(tableId);
      setIsDone(true);
      return;
    }

    // Split bill: more is owed — reset the form for the next payment.
    setOrder({ ...updated });
    setAmount(stillOwed.toFixed(2));
    setTip("0");
  }

  if (isDone) {
    return (
      <AdminShell>
        <Card className="mx-auto max-w-md border-status-ready/30 bg-status-ready/5 text-center" padding="lg">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-status-ready" strokeWidth={1.75} />
          <p className="text-lg font-semibold text-status-ready">Payment recorded</p>
          <p className="mt-1 text-sm text-ink-soft">{table?.label} is back to empty.</p>
          <Button onClick={() => navigate("/pos")} className="mt-5">
            Back to table map
          </Button>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell fitScreen>
      <PageHeader eyebrow="Point of sale" title={`Payment — ${table?.label ?? "Table"}`} />

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_420px] lg:overflow-hidden">
        <section className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pe-1">
          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Order items</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 text-sm text-ink-soft">
                <span>
                  {item.quantity}× {item.nameSnapshot}
                </span>
                <span className="tabular-nums">${(item.priceSnapshot * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-ink">
              <span>Subtotal</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>
          </Card>

          {order.payments.length > 0 && (
            <Card className="border-accent/30 bg-accent-soft">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Split in progress</p>
              <div className="space-y-1 text-sm text-ink">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <span className="capitalize">
                      {payment.method}
                      {payment.tip ? ` + $${payment.tip.toFixed(2)} tip` : ""}
                    </span>
                    <span className="tabular-nums">${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-accent/20 pt-2 text-sm font-semibold text-ink">
                <span>Remaining</span>
                <span className="tabular-nums">${remaining.toFixed(2)}</span>
              </div>
            </Card>
          )}
        </section>

        <aside className="lg:min-h-0">
          <Card padding="none" className="flex h-fit flex-col lg:h-full">
            <h2 className="flex-none border-b border-border p-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Charge
            </h2>

            <div className="space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <FormField label={`Amount to charge${order.payments.length > 0 ? " (split)" : ""}`} htmlFor="amount">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  max={remaining}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                {chargeAmount < remaining && (
                  <p className="mt-1 text-xs text-ink-soft">${(remaining - chargeAmount).toFixed(2)} will remain owed after this payment.</p>
                )}
              </FormField>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Method</p>
                <div className="flex gap-2">
                  {METHODS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMethod(option.value)}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                        method === option.value ? "border-accent bg-accent text-white" : "border-border text-ink-soft hover:border-accent"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Tip" htmlFor="tip">
                <Input id="tip" type="number" min="0" step="0.5" value={tip} onChange={(event) => setTip(event.target.value)} />
              </FormField>

              <FormField label="Phone (optional)" htmlFor="phone" hint="For repeat-customer tracking">
                <Input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </FormField>
            </div>

            <div className="flex-none border-t border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-soft">{paidSoFar > 0 ? "Charging now" : "Total charged"}</span>
                <span className="text-xl font-semibold text-ink tabular-nums">${(chargeAmount + tipAmount).toFixed(2)}</span>
              </div>
              <Button onClick={handleConfirmPayment} disabled={chargeAmount <= 0} className="mt-4 w-full">
                {chargeAmount < remaining ? "Charge & split remainder" : "Confirm payment"}
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}
