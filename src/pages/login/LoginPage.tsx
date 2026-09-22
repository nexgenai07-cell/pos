import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import type { Staff } from "@/types";
import { getStaffList } from "@/lib/api/staff";
import { getBranch } from "@/lib/api/branch";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function LoginPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [branchName, setBranchName] = useState("");
  const { login, landingPath, staff } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getStaffList().then((list) => {
      setStaffList(list);
      setSelectedId(list[0]?.id ?? "");
    });
    getBranch().then((branch) => setBranchName(branch.name));
  }, []);

  useEffect(() => {
    if (staff) navigate(landingPath(staff), { replace: true });
  }, [staff, landingPath, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const ok = await login(selectedId, pin);
    if (!ok) setError("Incorrect PIN for that name.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <Card className="w-full max-w-sm" padding="lg">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ember-gradient shadow-warm">
            <Flame className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-ember-gradient text-xs font-bold uppercase tracking-[0.14em]">Smoke &amp; Char</p>
            {branchName && <p className="text-[11px] text-ink-soft/80">{branchName}</p>}
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Staff sign in</h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormField label="Name" htmlFor="staff-select">
            <Select id="staff-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {staffList.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} — {member.role}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="PIN" htmlFor="pin-input" error={error || undefined}>
            <Input
              id="pin-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
              invalid={Boolean(error)}
              className="tracking-[0.3em]"
            />
          </FormField>

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
