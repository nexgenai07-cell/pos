import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSupplier } from "@/lib/api/suppliers";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import BackLink from "@/components/ui/BackLink";

export default function NewSupplierPage() {
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await createSupplier({ name: name.trim(), contactInfo: contactInfo.trim() });
    showToast("Supplier created", "success");
    navigate("/admin/inventory/suppliers");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Inventory · Suppliers"
        title="New supplier"
        description="Add a vendor to start creating purchase orders."
        actions={<BackLink to="/admin/inventory/suppliers" label="Back to suppliers" />}
      />
      <Card className="max-w-md" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="supplier-name" required>
            <Input id="supplier-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>
          <FormField label="Contact info" htmlFor="supplier-contact" hint="Email, phone, or both">
            <Input
              id="supplier-contact"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              placeholder="email · phone"
            />
          </FormField>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving}>
              Save supplier
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/suppliers")} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
