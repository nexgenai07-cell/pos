import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StaffRole } from "@/types";
import { createStaff } from "@/lib/api/staff";
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

export default function NewStaffPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const pinInvalid = pin.length > 0 && pin.trim().length < 4;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || pin.trim().length < 4) return;
    setSaving(true);
    await createStaff({ name: name.trim(), role, pin: pin.trim() });
    showToast("Staff member added", "success");
    navigate("/admin/staff");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Staff"
        title="New staff member"
        description="Create a login for a new team member."
        actions={<BackLink to="/admin/staff" label="Back to team" />}
      />
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
              Save staff member
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/staff")} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
