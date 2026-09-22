import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

export function ChartWrapper({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function BarRow({ label, value, max, valueLabel }: { label: string; value: number; max: number; valueLabel: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="w-24 flex-none truncate text-xs text-ink-soft">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-surface-sunken">
        <div className="h-3 rounded-full bg-ember-gradient" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 flex-none text-end text-xs tabular-nums text-ink">{valueLabel}</span>
    </div>
  );
}
