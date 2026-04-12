"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ACCESS_KEY = "flyoci_admin_access_token";

export function AdminSessionRedirectGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasAdminSession = Boolean(localStorage.getItem(ADMIN_ACCESS_KEY));
    if (hasAdminSession) {
      router.replace("/admin");
    }
  }, [router]);

  return null;
}
