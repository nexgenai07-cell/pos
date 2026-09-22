import type { ReactNode } from "react";

type Padding = "none" | "sm" | "md" | "lg";

const PADDING_CLASSES: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: Padding;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface-raised shadow-sm ${PADDING_CLASSES[padding]} ${className}`}>
      {children}
    </div>
  );
}
