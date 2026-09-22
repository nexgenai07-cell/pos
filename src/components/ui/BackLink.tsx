import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
      <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2} />
      {label}
    </Link>
  );
}
