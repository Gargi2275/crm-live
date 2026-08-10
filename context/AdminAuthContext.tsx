"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AdminStaffUser,
  clearAdminSession,
  getAdminTokens,
  getStoredAdminUser,
  loginAdmin,
  normalizeAdminStaffUser,
} from "@/lib/admin-auth";

/** Staff (non-admin) idle auto-logout. Admin is exempt. Session only — no data wipe. */
export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const STAFF_IDLE_ACTIVITY_KEY = "flyoci_admin_last_activity_at";
const STAFF_IDLE_CHECK_MS = 30 * 1000;

interface AdminAuthContextType {
  adminUser: AdminStaffUser | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  login: (username: string, password: string, captchaToken: string) => Promise<AdminStaffUser>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function touchStaffActivity() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STAFF_IDLE_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function readStaffActivityAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = sessionStorage.getItem(STAFF_IDLE_ACTIVITY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

function isNonAdminStaff(user: AdminStaffUser | null): boolean {
  if (!user) return false;
  return String(user.role || "").trim().toLowerCase() !== "admin";
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminStaffUser | null>(null);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const idleLoggedOutRef = useRef(false);
  const logoutRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const { access } = getAdminTokens();
    const storedUser = getStoredAdminUser();
    if (access && storedUser) {
      setAdminUser(normalizeAdminStaffUser(storedUser));
      touchStaffActivity();
    }
    setIsBootstrapped(true);
  }, []);

  const logout = () => {
    clearAdminSession();
    try {
      sessionStorage.removeItem(STAFF_IDLE_ACTIVITY_KEY);
    } catch {
      // ignore
    }
    setAdminUser(null);
  };

  logoutRef.current = logout;

  // Staff-only idle watchdog (admin exempt). Clears session tokens only.
  useEffect(() => {
    if (!isBootstrapped || !adminUser || !isNonAdminStaff(adminUser)) {
      idleLoggedOutRef.current = false;
      return;
    }
    if (pathname === "/admin/login" || pathname === "/admin/reset-password") {
      return;
    }

    idleLoggedOutRef.current = false;
    touchStaffActivity();

    const logoutForIdle = () => {
      if (idleLoggedOutRef.current) return;
      idleLoggedOutRef.current = true;
      logoutRef.current();
      toast.error("Logged out due to 30 minutes of inactivity. Your data is safe — sign in again.");
      router.replace("/admin/login?reason=idle");
    };

    const onActivity = () => touchStaffActivity();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "visibilitychange",
    ];
    for (const eventName of events) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const timer = window.setInterval(() => {
      const idleFor = Date.now() - readStaffActivityAt();
      if (idleFor >= STAFF_IDLE_TIMEOUT_MS) {
        logoutForIdle();
      }
    }, STAFF_IDLE_CHECK_MS);

    return () => {
      window.clearInterval(timer);
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, [adminUser, isBootstrapped, pathname, router]);

  const login = async (
    username: string,
    password: string,
    captchaToken: string,
  ): Promise<AdminStaffUser> => {
    const user = await loginAdmin(username, password, captchaToken);
    const normalized = normalizeAdminStaffUser(user);
    idleLoggedOutRef.current = false;
    touchStaffActivity();
    setAdminUser(normalized);
    return normalized;
  };

  const value = useMemo(
    () => ({
      adminUser,
      isAuthenticated: Boolean(adminUser),
      isBootstrapped,
      login,
      logout,
    }),
    [adminUser, isBootstrapped],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
