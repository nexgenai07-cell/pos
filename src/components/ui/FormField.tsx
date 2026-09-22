import type { ReactNode } from "react";

export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
        {required && <span className="ms-0.5 text-status-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-status-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
