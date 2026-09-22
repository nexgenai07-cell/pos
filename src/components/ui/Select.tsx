import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full appearance-none rounded-lg border border-border bg-surface-raised px-3 py-2 pe-9 text-sm text-ink transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-soft ${className}`}
        {...props}
      >
        {children}
      </select>
      {/* Logical inset/padding so the chevron sits on the trailing side in both
          LTR and RTL — otherwise it overlaps Arabic text. */}
      <ChevronDown
        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        strokeWidth={2}
      />
    </div>
  );
});

export default Select;
