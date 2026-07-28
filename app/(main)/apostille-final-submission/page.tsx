"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy demo submission page — redirects into the shared apostille journey. */
export default function ApostilleFinalSubmissionPage() {
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
