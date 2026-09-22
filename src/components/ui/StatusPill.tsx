type Tone = "neutral" | "accent" | "warn" | "good" | "danger" | "info";
type Size = "sm" | "md";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-soft ring-border-strong/70",
  accent: "bg-accent-soft text-accent-strong ring-accent/25",
  warn: "bg-status-warn/15 text-status-warn ring-status-warn/25",
  good: "bg-status-ready/15 text-status-ready ring-status-ready/25",
  danger: "bg-status-danger/15 text-status-danger ring-status-danger/25",
  info: "bg-status-info/15 text-status-info ring-status-info/25",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
};

export default function StatusPill({
  label,
  tone = "neutral",
  size = "md",
}: { label: string; tone?: Tone; size?: Size }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
    >
      {label}
    </span>
  );
}
