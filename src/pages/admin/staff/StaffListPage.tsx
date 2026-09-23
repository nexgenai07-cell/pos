import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Users } from "lucide-react";
import type { Staff, StaffRole } from "@/types";
import { deleteStaff, getStaffList } from "@/lib/api/staff";
import { useAuth } from "@/context/AuthContext";
import { countActiveFilters, matchesSearch } from "@/lib/filters";
import { errorMessage } from "@/lib/errors";
import { roleLabel, roleSummaryLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Card from "@/components/ui/Card";
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

const ROLES: StaffRole[] = ["owner", "manager", "cashier", "kitchen"];
type RoleFilter = StaffRole | "all";
type SortKey = "name" | "role";

export default function StaffListPage() {
  const [staffList, setStaffList] = useState<Staff[] | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { staff: currentStaff } = useAuth();
  const { showToast } = useToast();
  const { open, toggle } = useFilterPanelState("staff-filters");
  const { t } = useTranslation("staff");
  const { t: tCommon } = useTranslation("common");

  const refresh = useCallback(() => {
    getStaffList().then(setStaffList);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(member: Staff) {
    if (!window.confirm(t("confirmDelete", { name: member.name }))) return;
    setDeletingId(member.id);
    try {
      await deleteStaff(member.id);
      refresh();
      showToast(t("toastRemoved"), "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = countActiveFilters({
    role: roleFilter !== "all" ? roleFilter : "",
    sort: sortKey !== "name" ? sortKey : "",
  });

  const chips: FilterChip[] = [];
  if (roleFilter !== "all") chips.push({ key: "role", label: t("list.chipRole", { role: roleLabel(tCommon, roleFilter) }) });
  if (sortKey !== "name") chips.push({ key: "sort", label: t("list.chipSortedByRole") });

  function removeChip(key: string) {
    if (key === "role") setRoleFilter("all");
    if (key === "sort") setSortKey("name");
  }

  function resetFilters() {
    setRoleFilter("all");
    setSortKey("name");
  }

  const filtered = useMemo(() => {
    if (!staffList) return null;
    const list = staffList.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      return matchesRole && matchesSearch(member.name, search);
    });

    return [...list].sort((a, b) =>
      sortKey === "role" ? a.role.localeCompare(b.role) : a.name.localeCompare(b.name)
    );
  }, [staffList, search, roleFilter, sortKey]);

  const columns: DataTableColumn<Staff>[] = [
    {
      key: "name",
      header: t("list.colName"),
      sortable: true,
      accessor: (member) => member.name,
      render: (member) => <span className="font-medium text-ink">{member.name}</span>,
    },
    {
      key: "role",
      header: t("list.colRole"),
      sortable: true,
      accessor: (member) => member.role,
      render: (member) => <StatusPill label={roleLabel(tCommon, member.role)} tone="accent" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (member) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/staff/${member.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
            {t("list.view")}
          </Link>
          <Link to={`/admin/staff/${member.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              {tCommon("actions.edit")}
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(member)}
            loading={deletingId === member.id}
            disabled={member.id === currentStaff?.id}
            title={member.id === currentStaff?.id ? t("cantRemoveSelf") : undefined}
          >
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
        eyebrow={t("eyebrow")}
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={t("list.searchPlaceholder")} className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Link to="/admin/staff/new">
              <Button>{t("list.newStaffMember")}</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4" padding="md">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("list.roleAccessTitle")}</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role} className="flex items-start gap-2">
              <StatusPill label={roleLabel(tCommon, role)} tone="accent" />
              <dd className="text-xs text-ink-soft">{roleSummaryLabel(tCommon, role)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <FilterPanel open={open} title={t("list.filterTitle")} onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label={t("list.roleLabel")} htmlFor="staff-role">
            <Select id="staff-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
              <option value="all">{t("list.allRoles")}</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(tCommon, role)}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label={t("list.sortBy")} htmlFor="staff-sort">
            <Select id="staff-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">{t("list.sortName")}</option>
              <option value="role">{t("list.sortRole")}</option>
            </Select>
          </FilterField>

          <FilterField label={t("list.showing")} className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {t("list.summary", { shown: filtered?.length ?? 0, total: staffList?.length ?? 0 })}
            </p>
          </FilterField>
        </div>
        <FilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filtered}
        keyField={(member) => member.id}
        emptyIcon={Users}
        emptyTitle={search || activeCount > 0 ? t("list.emptyFilteredTitle") : t("list.emptyTitle")}
        emptyDescription={
          search || activeCount > 0 ? t("list.emptyFilteredDescription") : t("list.emptyDescription")
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/staff/new">
              <Button size="sm">{t("list.newStaffMember")}</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
