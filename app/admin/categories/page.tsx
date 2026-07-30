"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";

/** Legacy route — Services & Categories are combined at /admin/services. */
export default function AdminCategoriesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/services?tab=categories");
  }, [router]);

  return (
    <section className="bg-bg-page">
      <PageLoader title="Opening categories…" subtitle="Services & Categories are on one page now." fill={false} />
    </section>
  );
}
