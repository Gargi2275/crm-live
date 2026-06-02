"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

export function PageVisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return; // user-side visits only

    const queryString = searchParams?.toString() || "";
    const current = queryString ? `${pathname}?${queryString}` : pathname;
    if (lastSentRef.current === current) return;
    lastSentRef.current = current;

    const payload = { page: current };
    fetch(`${API_BASE_URL}/activity/page-visit/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // best-effort logging only
    });
  }, [pathname, searchParams]);

  return null;
}

