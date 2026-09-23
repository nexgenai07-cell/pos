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
  const { t } = useTranslation("common");

  const refresh = useCallback(() => {
    getStaffList().then(setStaffList);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(member: Staff) {
    if (!window.confirm(`Remove "${member.name}" from staff? This can't be undone.`)) return;
    setDeletingId(member.id);
    try {
      await deleteStaff(member.id);
      refresh();
      showToast("Staff member removed", "success");
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
  if (roleFilter !== "all") chips.push({ key: "role", label: `Role: ${roleFilter}` });
  if (sortKey !== "name") chips.push({ key: "sort", label: `Sorted by ${sortKey}` });

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
      header: "Name",
      sortable: true,
      accessor: (member) => member.name,
      render: (member) => <span className="font-medium text-ink">{member.name}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      accessor: (member) => member.role,
      render: (member) => <StatusPill label={member.role} tone="accent" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (member) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link to={`/admin/staff/${member.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
            View
          </Link>
          <Link to={`/admin/staff/${member.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(member)}
            loading={deletingId === member.id}
            disabled={member.id === currentStaff?.id}
            title={member.id === currentStaff?.id ? "You can't remove your own account" : undefined}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Staff"
        title="Team"
        description="Everyone with an account on this branch."
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name…" className="w-52" />
            <FilterToggleButton open={open} onToggle={toggle} activeCount={activeCount} />
            <Link to="/admin/staff/new">
              <Button>New staff member</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4" padding="md">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">What each role can access</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div key={role} className="flex items-start gap-2">
              <StatusPill label={roleLabel(t, role)} tone="accent" />
              <dd className="text-xs text-ink-soft">{roleSummaryLabel(t, role)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <FilterPanel open={open} title="Filter team" onReset={activeCount > 0 ? resetFilters : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Role" htmlFor="staff-role">
            <Select id="staff-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Sort by" htmlFor="staff-sort">
            <Select id="staff-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">Name</option>
              <option value="role">Role</option>
            </Select>
          </FilterField>

          <FilterField label="Showing" className="sm:col-span-2">
            <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink-soft">
              {filtered?.length ?? 0} of {staffList?.length ?? 0} team members shown
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
        emptyTitle={search || activeCount > 0 ? "No staff match" : "No staff yet"}
        emptyDescription={
          search || activeCount > 0 ? "Try a different search or clear the filters." : "Add your first team member to get started."
        }
        emptyAction={
          activeCount === 0 &&
          !search && (
            <Link to="/admin/staff/new">
              <Button size="sm">New staff member</Button>
            </Link>
          )
        }
      />
    </AdminShell>
  );
}
