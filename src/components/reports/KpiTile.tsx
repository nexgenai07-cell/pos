import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "@/components/ui/Card";

export default function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  deltaLabel = "vs previous period",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  /** Percentage change vs the previous equal-length window. Positive = good. */
  delta?: number | null;
  deltaLabel?: string;
  /** Ember-tinted tile, used for the headline metric on the dashboard. */
  highlight?: boolean;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = hasDelta && delta >= 0;
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card padding="md" className={`card-hover relative overflow-hidden ${highlight ? "border-accent/30 bg-accent-soft/40" : ""}`}>
      {highlight && <span className="absolute inset-x-0 top-0 h-1 bg-ember-gradient" />}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        {Icon && (
          <div
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
              highlight ? "bg-ember-gradient text-white shadow-warm" : "bg-accent-soft text-accent"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        )}
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink">{value}</p>
      {hasDelta && (
        <span
          className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${
            positive ? "text-status-ready" : "text-status-danger"
          }`}
        >
          <DeltaIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {positive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      )}
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
      {hasDelta && !sub && <p className="mt-0.5 text-xs text-ink-soft">{deltaLabel}</p>}
    </Card>
  );
}
