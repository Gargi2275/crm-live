"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { getAdminMyPermissions } from "@/lib/admin-auth";
import { canAccessAdminRoute } from "@/lib/admin-console-nav";

/**
 * Resolve whether the current staff user can access a console route
 * based on Roles & Permissions modules (admins always allowed).
 */
export function useAdminModuleAccess(href: string) {
  const { adminUser } = useAdminAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const role = adminUser?.role;
    if ((role || "").toLowerCase() === "admin") {
      setCanAccess(true);
      setAccessReady(true);
      return;
    }
    if (!adminUser?.id) {
      setCanAccess(false);
      setAccessReady(true);
      return;
    }
    setAccessReady(false);
    void getAdminMyPermissions()
      .then((data) => {
        if (cancelled) return;
        setCanAccess(canAccessAdminRoute(href, data.permissions, role));
      })
      .catch(() => {
        if (!cancelled) setCanAccess(false);
      })
      .finally(() => {
        if (!cancelled) setAccessReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [adminUser?.id, adminUser?.role, href]);

  return { canAccess, accessReady, adminUser };
}
