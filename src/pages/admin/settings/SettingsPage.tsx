import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Branch } from "@/types";
import { getBranch, updateBranch } from "@/lib/api/branch";
import { useToast } from "@/components/ui/Toast";
import AdminShell from "@/components/ui/AdminShell";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

/** IANA zones, Gulf-first since the branch operates on Asia/Riyadh. */
const TIMEZONES = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

/** Gulf currencies first, then common reporting currencies. Drives lib/format.ts. */
const CURRENCIES = ["SAR", "AED", "QAR", "KWD", "BHD", "OMR", "EGP", "USD", "EUR", "GBP"];

export default function SettingsPage() {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [currency, setCurrency] = useState("SAR");
  const { showToast } = useToast();
  const { t } = useTranslation("settings");

  useEffect(() => {
    getBranch().then((value) => {
      setBranch(value);
      setName(value.name);
      setAddress(value.address);
      setTimezone(value.timezone);
      setCurrency(value.currency);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const updated = await updateBranch({ name, address, timezone, currency });
    setBranch(updated);
    showToast(t("saved"), "success");
  }

  return (
    <AdminShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />

      <Card className="max-w-md" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t("name")} htmlFor="branch-name">
            <Input id="branch-name" value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label={t("address")} htmlFor="branch-address">
            <Input id="branch-address" value={address} onChange={(event) => setAddress(event.target.value)} />
          </FormField>
          <FormField label={t("timezone")} htmlFor="branch-timezone">
            <Select id="branch-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("currency")} htmlFor="branch-currency">
            <Select id="branch-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </FormField>

          <p className="text-[11px] text-ink-muted">{t("appliesNote")}</p>

          <div className="pt-1">
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      </Card>

      {branch && (
        <p className="mt-4 max-w-md text-xs text-ink-soft">
          {t("branchIdNote")} <code className="rounded bg-surface px-1.5 py-0.5">{branch.id}</code>
        </p>
      )}
    </AdminShell>
  );
}
