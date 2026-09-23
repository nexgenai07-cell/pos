import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StaffRole } from "@/types";
import { getStaffById, updateStaff } from "@/lib/api/staff";
import { roleLabel } from "@/lib/i18n/labels";
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
  const { t } = useTranslation("staff");
  const { t: tCommon } = useTranslation("common");

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
    showToast(t("edit.toastUpdated"), "success");
    navigate(`/admin/staff/${staffId}`);
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("edit.title")}
        actions={<BackLink to={`/admin/staff/${staffId}`} label={t("edit.backToStaffMember")} />}
      />
      {loaded && (
        <Card className="max-w-md" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={t("form.name")} htmlFor="name" required>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </FormField>
            <FormField label={t("form.role")} htmlFor="role">
              <Select id="role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel(tCommon, option)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={t("form.pin")}
              htmlFor="pin"
              required
              error={pinInvalid ? t("form.pinError") : undefined}
              hint={pinInvalid ? undefined : t("form.pinHint")}
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
                {tCommon("actions.saveChanges")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(`/admin/staff/${staffId}`)} disabled={saving}>
                {tCommon("actions.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
