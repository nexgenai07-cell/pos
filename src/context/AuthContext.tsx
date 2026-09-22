import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Staff } from "@/types";
import { loginWithPin } from "@/lib/api/staff";
import { landingPathFor } from "@/lib/rbac";

const STORAGE_KEY = "smoke-and-char-admin-staff";

interface AuthContextValue {
  staff: Staff | null;
  login: (staffId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  /** Where a staff member lands right after login, by role. */
  landingPath: (staff: Staff) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Staff) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (staff) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [staff]);

  async function login(staffId: string, pin: string) {
    const matched = await loginWithPin(staffId, pin);
    if (!matched) return false;
    setStaff(matched);
    return true;
  }

  function logout() {
    setStaff(null);
  }

  function landingPath(member: Staff) {
    return landingPathFor(member.role);
  }

  return (
    <AuthContext.Provider value={{ staff, login, logout, landingPath }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
