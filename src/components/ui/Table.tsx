import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function TableContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-accent-soft text-left text-xs font-semibold uppercase tracking-wide text-accent-strong">
      <tr className="border-b-2 border-accent/20">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-4 py-3 ${alignClass} ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Tr({
  children,
  className = "",
  onClick,
  selected = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors last:border-none ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "bg-accent-soft" : "hover:bg-accent-soft/40"} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return (
    <td className={`px-4 py-3 ${alignClass} ${className}`} {...props}>
      {children}
    </td>
  );
}
