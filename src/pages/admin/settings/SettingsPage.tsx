import { useEffect, useState } from "react";
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

const TIMEZONES = ["America/Chicago", "America/New_York", "America/Los_Angeles", "America/Denver"];

export default function SettingsPage() {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const { showToast } = useToast();

  useEffect(() => {
    getBranch().then((value) => {
      setBranch(value);
      setName(value.name);
      setAddress(value.address);
      setTimezone(value.timezone);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const updated = await updateBranch({ name, address, timezone });
    setBranch(updated);
    showToast("Settings saved", "success");
  }

  return (
    <AdminShell>
      <PageHeader eyebrow="Settings" title="Restaurant profile" />

      <Card className="max-w-md" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="branch-name">
            <Input id="branch-name" value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Address" htmlFor="branch-address">
            <Input id="branch-address" value={address} onChange={(event) => setAddress(event.target.value)} />
          </FormField>
          <FormField label="Timezone" htmlFor="branch-timezone">
            <Select id="branch-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-1">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>

      {branch && (
        <p className="mt-4 max-w-md text-xs text-ink-soft">
          Branch ID <code className="rounded bg-surface px-1.5 py-0.5">{branch.id}</code> — every table, order, product, and staff
          record in this system is already scoped to it, so adding a second location later is a data change, not a rebuild.
        </p>
      )}
    </AdminShell>
  );
}
