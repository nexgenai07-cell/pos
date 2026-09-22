import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/**
 * Chart colours read straight off the theme tokens in index.css, so the
 * whole palette (ember/herb/amber/chili/water) moves together whenever
 * the theme changes — no duplicated hex values to chase down.
 */
const COLORS = {
  accent: "var(--color-accent)",
  good: "var(--color-status-ready)",
  warn: "var(--color-status-warn)",
  danger: "var(--color-status-danger)",
  info: "var(--color-status-info)",
  accent2: "var(--color-accent-2)",
};

const PIE_COLORS = [COLORS.accent, COLORS.accent2, COLORS.good, COLORS.info, COLORS.warn, COLORS.danger];

const AXIS_TICK = { fontSize: 11, fill: "var(--color-ink-soft)" };

const TOOLTIP_PROPS = {
  contentStyle: {
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "var(--shadow-md)",
    color: "var(--color-ink)",
  },
  labelStyle: { color: "var(--color-ink)", fontWeight: 600 },
};

export interface ChartDatum {
  label: string;
  value: number;
}

export function SimpleLineChart({ data, valueFormatter }: { data: ChartDatum[]; valueFormatter?: (value: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ember-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-accent-strong)" />
            <stop offset="55%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="#ff9a5c" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="url(#ember-line)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: COLORS.accent }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  valueFormatter,
  color,
  horizontalBars = false,
}: {
  data: ChartDatum[];
  valueFormatter?: (value: number) => string;
  /** Optional explicit fill — omit to use the ember gradient. */
  color?: string;
  /** true = bars extend left→right with categories on the Y axis (better for long labels). */
  horizontalBars?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={horizontalBars ? Math.max(180, data.length * 30) : 220}>
      <BarChart data={data} layout={horizontalBars ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ember-bar" x1="0" y1="0" x2={horizontalBars ? 1 : 0} y2={horizontalBars ? 0 : 1}>
            <stop offset="0%" stopColor="#ff9a5c" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" horizontal={!horizontalBars} vertical={horizontalBars} />
        {horizontalBars ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={96} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
          </>
        )}
        <Tooltip
          {...TOOLTIP_PROPS}
          cursor={{ fill: "var(--color-accent-soft)", opacity: 0.5 }}
          formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
        />
        <Bar dataKey="value" fill={color ?? "url(#ember-bar)"} radius={horizontalBars ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimplePieChart({ data, valueFormatter }: { data: ChartDatum[]; valueFormatter?: (value: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="var(--color-surface-raised)" strokeWidth={2}>
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
