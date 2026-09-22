import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupplierById, updateSupplier } from "@/lib/api/suppliers";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import BackLink from "@/components/ui/BackLink";

export default function EditSupplierPage() {
  const { supplierId = "" } = useParams();
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getSupplierById(supplierId).then((supplier) => {
      if (supplier) {
        setName(supplier.name);
        setContactInfo(supplier.contactInfo);
      }
      setLoaded(true);
    });
  }, [supplierId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await updateSupplier(supplierId, { name: name.trim(), contactInfo: contactInfo.trim() });
    showToast("Supplier updated", "success");
    navigate("/admin/inventory/suppliers");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Inventory · Suppliers"
        title="Edit supplier"
        actions={<BackLink to="/admin/inventory/suppliers" label="Back to suppliers" />}
      />
      {loaded && (
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
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/suppliers")} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
