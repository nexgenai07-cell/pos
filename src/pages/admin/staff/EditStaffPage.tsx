import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { StaffRole } from "@/types";
import { getStaffById, updateStaff } from "@/lib/api/staff";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BackLink from "@/components/ui/BackLink";

const ROLES: StaffRole[] = ["cashier", "kitchen", "manager", "owner"];

export default function EditStaffPage() {
  const { staffId = "" } = useParams();
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getStaffById(staffId).then((staff) => {
      if (staff) {
        setName(staff.name);
        setRole(staff.role);
        setPin(staff.pin);
      }
      setLoaded(true);
    });
  }, [staffId]);

  const pinInvalid = pin.length > 0 && pin.trim().length < 4;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || pin.trim().length < 4) return;
    setSaving(true);
    await updateStaff(staffId, { name: name.trim(), role, pin: pin.trim() });
    showToast("Staff member updated", "success");
    navigate(`/admin/staff/${staffId}`);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Staff"
        title="Edit staff member"
        actions={<BackLink to={`/admin/staff/${staffId}`} label="Back to staff member" />}
      />
      {loaded && (
        <Card className="max-w-md" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Name" htmlFor="name" required>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </FormField>
            <FormField label="Role" htmlFor="role">
              <Select id="role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="PIN"
              htmlFor="pin"
              required
              error={pinInvalid ? "PIN must be at least 4 digits" : undefined}
              hint={pinInvalid ? undefined : "4 digits, used for POS login"}
            >
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                invalid={pinInvalid}
                className="tracking-[0.3em]"
              />
            </FormField>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(`/admin/staff/${staffId}`)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
