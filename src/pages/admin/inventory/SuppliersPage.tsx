import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Mail, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Supplier } from "@/types";
import { deleteSupplier, getSuppliers } from "@/lib/api/suppliers";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
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

type ContactFilter = "all" | "yes" | "no";
type SortKey = "name" | "contact";

const SORT_KEY_LABEL_KEY = {
  name: "suppliersPage.sortName",
  contact: "suppliersPage.sortContactInfo",
} as const satisfies Record<SortKey, string>;

export default function SuppliersPage() {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { open, toggle } = useFilterPanelState("supplier-filters");

  const refresh = useCallback(() => {
    getSuppliers().then(setSuppliers);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(supplier: Supplier) {
    if (!window.confirm(t("suppliersPage.confirmDelete", { name: supplier.name }))) return;
    setDeletingId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      refresh();
      showToast(t("suppliersPage.toastDeleted"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = countActiveFilters({
    contact: contactFilter !== "all" ? contactFilter : "",
    sort: sortKey !== "name" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (contactFilter !== "all") {
    chips.push({
      key: "contact",
      label: t("suppliersPage.chipContact", {
        state: contactFilter === "yes" ? t("suppliersPage.chipContactOnFile") : t("suppliersPage.chipContactMissing"),
      }),
    });
  }
  if (sortKey !== "name")
    chips.push({ key: "sort", label: t("suppliersPage.chipSortedBy", { sort: t(SORT_KEY_LABEL_KEY[sortKey]) }) });

  function removeChip(key: string) {
    if (key === "contact") setContactFilter("all");
    if (key === "sort") setSortKey("name");
  }

  function resetFilters() {
    setContactFilter("all");
    setSortKey("name");
  }

  const filtered = useMemo(() => {
    if (!suppliers) return null;
    const list = suppliers.filter((supplier) => {
      if (!matchesSearch(`${supplier.name} ${supplier.contactInfo}`, search)) return false;
      if (contactFilter === "yes" && !supplier.contactInfo) return false;
      if (contactFilter === "no" && supplier.contactInfo) return false;
      return true;
    });

    return [...list].sort((a, b) =>
      sortKey === "contact" ? a.contactInfo.localeCompare(b.contactInfo) : a.name.localeCompare(b.name)
    );
  }, [suppliers, search, contactFilter, sortKey]);

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: t("suppliersPage.colName"),
      sortable: true,
      accessor: (supplier) => supplier.name,
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft">
            <Building2 className="h-4 w-4 text-accent" strokeWidth={2} />
          </div>
          <span className="font-medium text-ink">{supplier.name}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: t("suppliersPage.colContact"),
      sortable: true,
      accessor: (supplier) => supplier.contactInfo,
      render: (supplier) =>
        supplier.contactInfo ? (
          <span className="flex items-center gap-1.5 text-ink-soft">
            <Mail className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
            {supplier.contactInfo}
          </span>
        ) : (
          <span className="text-ink-soft/60">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (supplier) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/inventory/suppliers/${supplier.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.edit")}
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(supplier)} loading={deletingId === supplier.id}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {tCommon("actions.delete")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("suppliersPage.eyebrow")}
        title={t("suppliersPage.title")}
        description={t("suppliersPage.description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("suppliersPage.searchPlaceholder")} className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Link to="/admin/inventory/suppliers/new">
              <Button>{t("suppliersPage.newSupplier")}</Button>
            </Link>
          </>
        }
      />

      <FilterPanel open={open} title={t("suppliersPage.filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("suppliersPage.contactInfoLabel")} htmlFor="supplier-contact-filter">
            <Select
              id="supplier-contact-filter"
              value={contactFilter}
              onChange={(event) => setContactFilter(event.target.value as ContactFilter)}
            >
              <option value="all">{t("suppliersPage.anyContact")}</option>
              <option value="yes">{t("suppliersPage.hasContactDetails")}</option>
              <option value="no">{t("suppliersPage.missingContactDetails")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("suppliersPage.sortByLabel")} htmlFor="supplier-sort">
            <Select id="supplier-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">{t("suppliersPage.sortName")}</option>
              <option value="contact">{t("suppliersPage.sortContactInfo")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("suppliersPage.showingLabel")} className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("suppliersPage.showingSummary", { shown: filtered?.length ?? 0, total: suppliers?.length ?? 0 })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(supplier) => supplier.id}
        emptyIcon={Building2}
        emptyTitle={search || activeCount > 0 ? t("suppliersPage.emptyFilteredTitle") : t("suppliersPage.emptyTitle")}
        emptyDescription={
          search || activeCount > 0 ? t("suppliersPage.emptyFilteredDescription") : t("suppliersPage.emptyDescription")
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/inventory/suppliers/new">
              <Button size="sm">{t("suppliersPage.emptyActionNew")}</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
