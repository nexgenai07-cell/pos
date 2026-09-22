import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/useLocale";
import { useTranslation } from "react-i18next";

export interface DataTableColumn<T> {
  /** Unique column id. Also used to remember which column is sorted. */
  key: string;
  header: string;
  /** Value getter used for sorting and, when no `render` is given, default display. */
  accessor?: (row: T) => string | number | null | undefined;
  /** Custom cell content — use for StatusPill, thumbnails, actions, etc. */
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  /** Extra classes for both header and body cells, e.g. to control column width. */
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** `null` renders the loading skeleton. */
  data: T[] | null;
  keyField: (row: T) => string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  zebra?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onRowClick?: (row: T) => void;
  isRowSelected?: (row: T) => boolean;
  skeletonRows?: number;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

function alignClass(align?: "left" | "right" | "center") {
  // Logical edges, not physical: "right" means trailing, so price/quantity
  // columns stay trailing-aligned when the direction flips to RTL.
  return align === "right" ? "text-end" : align === "center" ? "text-center" : "text-start";
}

export function DataTableThumbnail({ src, alt, size = 36 }: { src: string; alt: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-inset ring-border"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
    </div>
  );
}

export default function DataTable<T>({
  columns,
  data,
  keyField,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  zebra = false,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  onRowClick,
  isRowSelected,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  // Locale-aware collation: Arabic sort order differs from English, and the
  // memo re-runs when the user switches language.
  const { locale } = useLocale();
  const { t } = useTranslation("common");

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (!sort) return data;
    const column = columns.find((entry) => entry.key === sort.key);
    if (!column?.accessor) return data;

    const sorted = [...data].sort((a, b) => {
      const av = column.accessor!(a);
      const bv = column.accessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), locale, { numeric: true });
    });
    return sort.direction === "desc" ? sorted.reverse() : sorted;
  }, [data, sort, columns, locale]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(sortedData.length, safePage * pageSize);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable || !column.accessor) return;
    setSort((current) => {
      if (!current || current.key !== column.key) return { key: column.key, direction: "asc" };
      if (current.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
    setPage(1);
  }

  function handlePageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent-soft text-start text-xs font-semibold uppercase tracking-wide text-accent-strong">
            <tr className="border-b-2 border-accent/20">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={`px-4 py-3 ${alignClass(column.align)} ${column.className ?? ""} ${
                      column.sortable ? "cursor-pointer select-none" : ""
                    }`}
                    onClick={() => toggleSort(column)}
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${
                        column.align === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {column.header}
                      {column.sortable &&
                        (isSorted ? (
                          sort!.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                          ) : (
                            <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-accent-strong/40" strokeWidth={2} />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data === null ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              pageItems.map((row, index) => {
                const rowKey = keyField(row);
                const selected = isRowSelected?.(row) ?? false;
                return (
                  <tr
                    key={rowKey}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                      selected ? "bg-accent-soft" : zebra && index % 2 === 1 ? "bg-surface-sunken/50 hover:bg-accent-soft/40" : "hover:bg-accent-soft/40"
                    }`}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={`px-4 py-3 ${alignClass(column.align)} ${column.className ?? ""}`}>
                        {column.render ? column.render(row) : (column.accessor?.(row) ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data !== null && data.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}

      {data !== null && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-ink-soft">
          <div className="flex items-center gap-2">
            <span>{t("table.rowsPerPage")}</span>
            <Select
              value={pageSize}
              onChange={(event) => handlePageSizeChange(Number(event.target.value))}
              className="w-auto py-1! pe-7! text-xs"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
            <span>
              {t("table.showing", { start, end, total: sortedData.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
              {t("actions.prev")}
            </Button>
            <span className="px-1 font-medium text-ink">
              {safePage} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}>
              {t("actions.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
