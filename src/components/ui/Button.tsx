import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ember-gradient text-white shadow-warm hover:brightness-[1.07] active:brightness-95 disabled:shadow-none",
  secondary: "border border-border bg-surface-raised text-ink hover:border-accent hover:bg-accent-soft/50 hover:text-accent-strong",
  ghost: "text-ink-soft hover:bg-accent-soft/60 hover:text-accent-strong",
  danger: "border border-status-danger/30 bg-status-danger/10 text-status-danger hover:border-status-danger hover:bg-status-danger hover:text-white",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />}
      {!loading && icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
