"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy apostille free pre-check — retired.
 * Apostille now uses the same early-assessment journey as OCI / passport.
 */
export default function ApostillePreCheckPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/document-audit?start=1&service=apostille");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-slate-600">
      Redirecting to your application…
    </div>
  );
}
