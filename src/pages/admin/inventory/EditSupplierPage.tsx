import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
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
    showToast(t("supplierForm.toastUpdated"), "success");
    navigate("/admin/inventory/suppliers");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("editSupplierPage.eyebrow")}
        title={t("editSupplierPage.title")}
        actions={<BackLink to="/admin/inventory/suppliers" label={t("supplierForm.backToSuppliers")} />}
      />
      {loaded && (
        <Card className="max-w-md" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={t("supplierForm.nameLabel")} htmlFor="supplier-name" required>
              <Input id="supplier-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </FormField>
            <FormField label={t("supplierForm.contactLabel")} htmlFor="supplier-contact" hint={t("supplierForm.contactHint")}>
              <Input
                id="supplier-contact"
                value={contactInfo}
                onChange={(event) => setContactInfo(event.target.value)}
                placeholder={t("supplierForm.contactPlaceholder")}
              />
            </FormField>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" loading={saving}>
                {tCommon("actions.saveChanges")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/suppliers")} disabled={saving}>
                {tCommon("actions.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
