import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clock, Pencil, Trash2 } from "lucide-react";
import type { Shift, Staff } from "@/types";
import { clockIn, clockOut, deleteStaff, getActiveShift, getShiftsForStaff, getStaffById } from "@/lib/api/staff";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import Button from "@/components/ui/Button";
import BackLink from "@/components/ui/BackLink";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

function formatDuration(clockInAt: string, clockOutAt?: string): string {
  const end = clockOutAt ? new Date(clockOutAt).getTime() : Date.now();
  const minutes = Math.round((end - new Date(clockInAt).getTime()) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export default function StaffDetailPage() {
  const { staffId = "" } = useParams();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | undefined>(undefined);
  const [clocking, setClocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { staff: currentStaff } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    getShiftsForStaff(staffId).then(setShifts);
    getActiveShift(staffId).then(setActiveShift);
  }, [staffId]);

  useEffect(() => {
    getStaffById(staffId).then((value) => setStaff(value ?? null));
    refresh();
  }, [staffId, refresh]);

  async function handleClockIn() {
    setClocking(true);
    await clockIn(staffId);
    refresh();
    setClocking(false);
    showToast("Clocked in", "success");
  }

  async function handleClockOut() {
    setClocking(true);
    await clockOut(staffId);
    refresh();
    setClocking(false);
    showToast("Clocked out", "success");
  }

  async function handleDelete() {
    if (!staff) return;
    if (!window.confirm(`Remove "${staff.name}" from staff? This can't be undone.`)) return;
    setDeleting(true);
    await deleteStaff(staffId);
    showToast("Staff member removed", "success");
    navigate("/admin/staff");
  }

  const columns: DataTableColumn<Shift>[] = [
    {
      key: "clockIn",
      header: "Clocked in",
      sortable: true,
      accessor: (shift) => shift.clockIn,
      render: (shift) => <span className="text-ink">{formatDateTime(shift.clockIn)}</span>,
    },
    {
      key: "clockOut",
      header: "Clocked out",
      sortable: true,
      accessor: (shift) => shift.clockOut ?? "",
      render: (shift) => <span className="text-ink-soft">{shift.clockOut ? formatDateTime(shift.clockOut) : "—"}</span>,
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      render: (shift) => <span className="tabular-nums text-ink">{formatDuration(shift.clockIn, shift.clockOut)}</span>,
    },
  ];

  const isSelf = staff?.id === currentStaff?.id;

  return (
    <AdminShell>
      <PageHeader eyebrow="Staff" title={staff ? staff.name : "Staff member"} actions={<BackLink to="/admin/staff" label="Back to team" />} />

      {staff && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusPill label={staff.role} tone="accent" />
          {activeShift ? (
            <>
              <StatusPill label="On shift" tone="good" />
              <Button variant="secondary" size="sm" onClick={handleClockOut} loading={clocking}>
                Clock out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleClockIn} loading={clocking}>
              Clock in
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Link to={`/admin/staff/${staffId}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              disabled={isSelf}
              title={isSelf ? "You can't remove your own account" : undefined}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Delete
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={shifts}
        keyField={(shift) => shift.id}
        emptyIcon={Clock}
        emptyTitle="No shifts logged yet"
        emptyDescription="Clock in to start tracking hours."
      />
    </AdminShell>
  );
}
