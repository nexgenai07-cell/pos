import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Percent, Trash2 } from "lucide-react";
import { getDeals, removeProductDeal, type DealRow } from "@/lib/api/products";
import { activeDealPrice } from "@/lib/deals";
import { describeDealLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";
import { on } from "@/lib/eventBus";
import { matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import DataTable, { DataTableThumbnail, type DataTableColumn } from "@/components/ui/DataTable";

export default function DealsPage() {
  const [deals, setDeals] = useState<DealRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t } = useTranslation("common");

  const refresh = useCallback(() => {
    getDeals().then(setDeals);
  }, []);

  useEffect(() => {
    refresh();
    return on("product:updated", refresh);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!deals) return null;
    return deals.filter((deal) => matchesSearch(`${deal.name} ${deal.categoryName}`, search));
  }, [deals, search]);

  async function handleRemove(deal: DealRow) {
    if (!window.confirm(`Remove the deal on "${deal.name}"? It goes back to its regular price.`)) return;
    setDeletingId(deal.id);
    try {
      await removeProductDeal(deal.id);
      refresh();
      showToast("Deal removed", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const columns: DataTableColumn<DealRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <DataTableThumbnail src={row.image} alt={row.name} />
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.name}</p>
            <p className="text-xs text-ink-soft">{row.categoryName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "regularPrice",
      header: "Regular price",
      sortable: true,
      align: "right",
      accessor: (row) => row.price,
      render: (row) => <span className="tabular-nums text-ink-soft line-through">{formatCurrency(row.price)}</span>,
    },
    {
      key: "dealPrice",
      header: "Deal price",
      sortable: true,
      align: "right",
      accessor: (row) => row.deal.price,
      render: (row) => <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.deal.price)}</span>,
    },
    {
      key: "schedule",
      header: "Schedule",
      accessor: (row) => describeDealLabel(t, row.deal),
      render: (row) => <span className="text-xs text-ink-soft">{describeDealLabel(t, row.deal)}</span>,
    },
    {
      key: "active",
      header: "Right now",
      accessor: (row) => (activeDealPrice(row.deal) !== undefined ? 1 : 0),
      render: (row) => (
        <StatusPill
          label={activeDealPrice(row.deal) !== undefined ? "Active" : "Not active"}
          tone={activeDealPrice(row.deal) !== undefined ? "good" : "neutral"}
          size="sm"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/menu/deals/${row.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleRemove(row)}
            loading={deletingId === row.id}
            title="Remove this deal"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Menu · Deals"
        title="Deals"
        description="Limited-time special prices, active only during specific day+time windows. Everything else keeps its regular price."
        actions={
          <>
            <Link to="/admin/menu" className="text-sm font-medium text-accent hover:text-accent-hover">
              ← Back to menu
            </Link>
            <SearchInput value={search} onChange={setSearch} placeholder="Search deals…" className="w-52" />
            <Link to="/admin/menu/deals/new">
              <Button>New deal</Button>
            </Link>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(row) => row.id}
        emptyIcon={Percent}
        emptyTitle={search ? "No deals match" : "No deals yet"}
        emptyDescription={
          search ? "Try a different search." : "Set up a limited-time special price for a menu item to see it here."
        }
        emptyAction={
          !search && (
            <Link to="/admin/menu/deals/new">
              <Button size="sm">New deal</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
