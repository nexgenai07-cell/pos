import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t("actions.searchPlaceholder")}
        className="w-full rounded-lg border border-border bg-surface-raised py-2 ps-9 pe-8 text-sm text-ink placeholder:text-ink-soft/60 transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("actions.clearSearch")}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
