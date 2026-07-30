"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";

/** Legacy route — Roles & Permissions are combined at /admin/roles. */
export default function AdminPermissionsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/roles?tab=permissions");
  }, [router]);

  return (
    <section className="bg-bg-page">
      <PageLoader title="Opening permissions…" subtitle="Roles & Permissions are on one page now." fill={false} />
    </section>
  );
}
