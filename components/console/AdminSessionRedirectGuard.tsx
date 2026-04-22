"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const ADMIN_ACCESS_KEY = "flyoci_admin_access_token";

export function AdminSessionRedirectGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasAdminSession = Boolean(localStorage.getItem(ADMIN_ACCESS_KEY));
    // Only auto-redirect to /admin if user is on the /admin/login page
    if (hasAdminSession && pathname === "/admin/login") {
      router.replace("/admin");
    }
  }, [router, pathname]);

  return null;
}