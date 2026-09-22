import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", invalid = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-soft ${
        invalid ? "border-status-danger focus:border-status-danger focus:ring-status-danger/20" : "border-border hover:border-border-strong"
      } ${className}`}
      {...props}
    />
  );
});

export default Input;
