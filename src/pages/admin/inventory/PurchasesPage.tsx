import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Truck } from "lucide-react";
import type { Purchase, PurchaseStatus, Supplier } from "@/types";
import { deletePurchase, getPurchases, receivePurchase } from "@/lib/api/purchases";
import { getSuppliers } from "@/lib/api/suppliers";
import { on } from "@/lib/eventBus";
import { formatDate } from "@/lib/format";
import { countActiveFilters, inDateRange, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import {
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToggleButton,
  useFilterPanelState,
  type FilterChip,
} from "@/components/ui/FilterPanel";

const STATUS_TONE = { draft: "neutral", ordered: "accent", received: "good" } as const;

type StatusFilter = PurchaseStatus | "all";
type SortKey = "ordered" | "supplier" | "status";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ordered");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { open, toggle } = useFilterPanelState("purchase-filters");

  const refresh = useCallback(() => {
    getPurchases().then((list) => setPurchases([...list].reverse()));
  }, []);

  useEffect(() => {
    refresh();
    getSuppliers().then(setSuppliers);
    return on("inventory:updated", refresh);
  }, [refresh]);

  function supplierName(id: string) {
    return suppliers.find((supplier) => supplier.id === id)?.name ?? "Supplier";
  }

  async function handleReceive(id: string) {
    setReceivingId(id);
    try {
      await receivePurchase(id);
      refresh();
      showToast("Purchase order received", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setReceivingId(null);
    }
  }

  async function handleDelete(purchase: Purchase) {
    if (!window.confirm(`Delete this purchase order from ${supplierName(purchase.supplierId)}?`)) return;
    setDeletingId(purchase.id);
    try {
      await deletePurchase(purchase.id);
      refresh();
      showToast("Purchase order deleted", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = countActiveFilters({
    supplier: supplierFilter !== "all" ? supplierFilter : "",
    status: statusFilter !== "all" ? statusFilter : "",
    dateFrom,
    dateTo,
    sort: sortKey !== "ordered" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (supplierFilter !== "all") {
    chips.push({ key: "supplier", label: `Supplier: ${supplierName(supplierFilter)}` });
  }
  if (statusFilter !== "all") chips.push({ key: "status", label: `Status: ${statusFilter}` });
  if (dateFrom) chips.push({ key: "dateFrom", label: `From ${dateFrom}` });
  if (dateTo) chips.push({ key: "dateTo", label: `To ${dateTo}` });
  if (sortKey !== "ordered") chips.push({ key: "sort", label: `Sorted by ${sortKey}` });

  function removeChip(key: string) {
    if (key === "supplier") setSupplierFilter("all");
    if (key === "status") setStatusFilter("all");
    if (key === "dateFrom") setDateFrom("");
    if (key === "dateTo") setDateTo("");
    if (key === "sort") setSortKey("ordered");
  }

  function resetFilters() {
    setSupplierFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("ordered");
  }

  const filtered = useMemo(() => {
    if (!purchases) return null;
    const list = purchases.filter((purchase) => {
      if (!matchesSearch(`${supplierName(purchase.supplierId)} ${purchase.id}`, search)) return false;
      if (supplierFilter !== "all" && purchase.supplierId !== supplierFilter) return false;
      if (statusFilter !== "all" && purchase.status !== statusFilter) return false;
      if (!inDateRange(purchase.orderedAt, dateFrom, dateTo)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortKey === "supplier") return supplierName(a.supplierId).localeCompare(supplierName(b.supplierId));
      if (sortKey === "status") return a.status.localeCompare(b.status);
      return b.orderedAt.localeCompare(a.orderedAt);
    });
  }, [purchases, search, supplierFilter, statusFilter, dateFrom, dateTo, sortKey, suppliers]);

  const columns: DataTableColumn<Purchase>[] = [
    {
      key: "supplier",
      header: "Supplier",
      sortable: true,
      accessor: (purchase) => supplierName(purchase.supplierId),
      render: (purchase) => <span className="font-medium text-ink">{supplierName(purchase.supplierId)}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      sortable: true,
      accessor: (purchase) => purchase.items.length,
      render: (purchase) => <span className="text-ink-soft">{purchase.items.length} line items</span>,
    },
    {
      key: "ordered",
      header: "Ordered",
      sortable: true,
      accessor: (purchase) => purchase.orderedAt,
      render: (purchase) => <span className="text-ink-soft">{formatDate(purchase.orderedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (purchase) => purchase.status,
      render: (purchase) => <StatusPill label={purchase.status} tone={STATUS_TONE[purchase.status]} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (purchase) => (
        <div className="flex items-center justify-end gap-1.5">
          {purchase.status === "ordered" && (
            <Button variant="secondary" size="sm" onClick={() => handleReceive(purchase.id)} loading={receivingId === purchase.id}>
              Receive
            </Button>
          )}
          {purchase.status !== "received" && (
            <>
              <Link to={`/admin/inventory/purchases/${purchase.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Edit
                </Button>
              </Link>
              <Button variant="danger" size="sm" onClick={() => handleDelete(purchase)} loading={deletingId === purchase.id}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Inventory"
        title="Purchases"
        description="Track ingredient orders from suppliers, from draft to received."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search supplier or PO #…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Link to="/admin/inventory/purchases/new">
              <Button>New purchase order</Button>
            </Link>
          </>
        }
      />

      <FilterPanel open={open} title="Filter purchase orders" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField label="Supplier" htmlFor="po-supplier">
            <Select id="po-supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="all">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Status" htmlFor="po-status">
            <Select id="po-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="all">Any status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
            </Select>
          </FilterField>

          <FilterField label="Ordered from" htmlFor="po-from">
            <Input id="po-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </FilterField>

          <FilterField label="Ordered to" htmlFor="po-to">
            <Input id="po-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </FilterField>

          <FilterField label="Sort by" htmlFor="po-sort">
            <Select id="po-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="ordered">Newest first</option>
              <option value="supplier">Supplier</option>
              <option value="status">Status</option>
            </Select>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(purchase) => purchase.id}
        emptyIcon={Truck}
        emptyTitle={search || activeCount > 0 ? "No purchase orders match" : "No purchase orders yet"}
        emptyDescription={
          search || activeCount > 0
            ? "Try a different search, widen the dates, or clear the filters."
            : "Create a purchase order to restock ingredients."
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/inventory/purchases/new">
              <Button size="sm">New purchase order</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
