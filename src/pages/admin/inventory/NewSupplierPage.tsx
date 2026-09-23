import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
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
    showToast(t("supplierForm.toastCreated"), "success");
    navigate("/admin/inventory/suppliers");
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("newSupplierPage.eyebrow")}
        title={t("newSupplierPage.title")}
        description={t("newSupplierPage.description")}
        actions={<BackLink to="/admin/inventory/suppliers" label={t("supplierForm.backToSuppliers")} />}
      />
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
              {t("supplierForm.saveSupplier")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/inventory/suppliers")} disabled={saving}>
              {tCommon("actions.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
