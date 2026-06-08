"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AdminStaffUser,
  clearAdminSession,
  getAdminTokens,
  getStoredAdminUser,
  loginAdmin,
  normalizeAdminStaffUser,
} from "@/lib/admin-auth";

interface AdminAuthContextType {
  adminUser: AdminStaffUser | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  login: (username: string, password: string) => Promise<AdminStaffUser>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminStaffUser | null>(null);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    const { access } = getAdminTokens();
    const storedUser = getStoredAdminUser();
    if (access && storedUser) {
      setAdminUser(normalizeAdminStaffUser(storedUser));
    }
    setIsBootstrapped(true);
  }, []);

  const login = async (username: string, password: string): Promise<AdminStaffUser> => {
    const user = await loginAdmin(username, password);
    const normalized = normalizeAdminStaffUser(user);
    setAdminUser(normalized);
    return normalized;
  };

  const logout = () => {
    clearAdminSession();
    setAdminUser(null);
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
