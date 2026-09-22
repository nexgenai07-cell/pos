import { useState, type ReactNode } from "react";
import { Filter, RotateCcw, Search, X } from "lucide-react";
/**
 * Expandable filter UI — deliberately NOT a modal. The panel renders in
 * normal document flow directly below the page header and animates open
 * with a grid-row transition (see `.filter-panel` in index.css), so it
 * works for any content height and never steals focus or covers the table.
 */

/** Remembers whether a page's filter panel is open, per browser. */
export function useFilterPanelState(storageKey: string, initiallyOpen = false) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(`smoke-and-char-${storageKey}`);
      return stored === null ? initiallyOpen : stored === "1";
    } catch {
      return initiallyOpen;
    }
  });

  function persist(next: boolean) {
    try {
      localStorage.setItem(`smoke-and-char-${storageKey}`, next ? "1" : "0");
    } catch {
      // localStorage unavailable — the panel just won't remember its state.
    }
  }

  return {
    open,
    setOpen: (next: boolean) => {
      setOpen(next);
      persist(next);
    },
    toggle: () =>
      setOpen((current) => {
        persist(!current);
        return !current;
      }),
  };
}

export function FilterToggleButton({
  open,
  onToggle,
  activeCount = 0,
  label = "Filters",
}: {
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="filter-panel"
      title={open ? "Hide filters" : "Show filters"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        open || activeCount > 0
          ? "border-accent/40 bg-accent-soft text-accent-strong"
          : "border-border bg-surface-raised text-ink-soft hover:border-accent hover:text-accent-strong"
      }`}
    >
      <Filter className="h-4 w-4" strokeWidth={2} />
      {label}
      {activeCount > 0 && (
        <span className="ms-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-gradient px-1.5 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}

export function FilterPanel({
  open,
  title = "Filters",
  onReset,
  children,
  className = "",
}: {
  open: boolean;
  title?: string;
  /** When provided, a "Reset" button appears in the panel header. */
  onReset?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`filter-panel ${className}`} data-open={open} aria-hidden={!open} inert={!open}>
      <div>
        <div id="filter-panel" className="rounded-xl border border-border bg-surface-raised/85 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <Filter className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
              {title}
            </p>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft transition-colors hover:text-accent-strong"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2.5} />
                Reset
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** One labelled control inside a FilterPanel — same visual language as FormField. */
export function FilterField({
  label,
  htmlFor,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Free-text filter that lives inside the panel (pairs with the header SearchInput). */
export function FilterTextInput({
  value,
  onChange,
  placeholder = "Type to filter…",
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" strokeWidth={2} />
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface-raised py-2 ps-9 pe-8 text-sm text-ink placeholder:text-ink-soft/60 transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export interface FilterChip {
  key: string;
  label: string;
}

/** Removable chips summarising what's currently filtered. */
export function FilterChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong ring-1 ring-inset ring-accent/20"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove ${chip.label} filter`}
            className="text-accent-strong/70 transition-colors hover:text-accent-strong"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ms-1 text-xs font-semibold text-ink-soft transition-colors hover:text-status-danger"
      >
        Clear all
      </button>
    </div>
  );
}
