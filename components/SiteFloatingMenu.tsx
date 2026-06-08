"use client";

import { FloatingQuickMenu } from "@/components/home/FloatingQuickMenu";
import { usePathname } from "next/navigation";

/** Hide on auth flows and admin — show on all public marketing pages */
const HIDDEN_PREFIXES = ["/auth", "/admin"];

export function SiteFloatingMenu() {
  const pathname = usePathname() ?? "";

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return <FloatingQuickMenu />;
}
