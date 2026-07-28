"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy passport quote checkout — retired.
 * Passport now uses the early-assessment journey + catalog full payment.
 */
export default function PassportRenewalPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = String(
    searchParams.get("reference") || searchParams.get("reference_number") || "",
  ).trim();

  useEffect(() => {
    if (reference) {
      router.replace(
        `/dashboard/document-audit?reference=${encodeURIComponent(reference)}&resume=1`,
      );
      return;
    }
    router.replace("/dashboard/document-audit?start=1&service=passport_renewal");
  }, [reference, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-slate-600">
      Redirecting to your application…
    </div>
  );
}
