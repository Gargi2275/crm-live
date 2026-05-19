"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubmittedContent() {
  const searchParams = useSearchParams();
  const file = searchParams.get("file") || "";

  return (
    <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#dce8fa] bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-heading font-bold text-primary">Pre-check received</h1>
        <p className="mt-3 text-sm text-slate-600">Save your FlyOCI file number — you will need it with your email to track this case.</p>
        <p className="mt-6 rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-4 py-3 font-mono text-lg font-semibold text-[#0B69B7]">{file || "—"}</p>
        <Link
          href="/track-apostille"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#0B69B7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#095A9D]"
        >
          Track application
        </Link>
        <p className="mt-6 text-xs text-slate-500">A confirmation email has been sent when mail is configured.</p>
      </div>
    </section>
  );
}

export default function ApostillePreCheckSubmittedPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] pt-28 text-center text-slate-600">Loading…</div>}>
      <SubmittedContent />
    </Suspense>
  );
}
