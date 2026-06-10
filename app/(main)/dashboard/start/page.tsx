"use client";

import Link from "next/link";
import { FileCheck2, Globe2, Sparkles } from "lucide-react";

export default function StartApplicationPage() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center bg-bg-page px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-heading font-bold text-primary">Select application type</h1>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Link
            href="/indian-e-visa"
            className="inline-flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-2 py-5 text-center shadow-sm transition-colors hover:bg-[#DDEEFF] sm:min-h-[160px] sm:px-4 sm:py-6"
          >
            <Globe2 className="mb-2 h-7 w-7 text-[#0B69B7] sm:h-8 sm:w-8" />
            <span className="text-sm font-semibold text-[#0B69B7] sm:text-base">eVisa</span>
            <span className="mt-1 text-[10px] leading-snug text-[#486581] sm:text-xs">Indian eVisa</span>
          </Link>
          <Link
            href="/dashboard/document-audit?start=1"
            className="inline-flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-2 py-5 text-center shadow-sm transition-colors hover:bg-[#DDEEFF] sm:min-h-[160px] sm:px-4 sm:py-6"
          >
            <Sparkles className="mb-2 h-7 w-7 text-[#0B69B7] sm:h-8 sm:w-8" />
            <span className="text-sm font-semibold text-[#0B69B7] sm:text-base">OCI</span>
            <span className="mt-1 text-[10px] leading-snug text-[#486581] sm:text-xs">OCI Card</span>
          </Link>
          <Link
            href="/apostille-pre-check"
            className="inline-flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-2 py-5 text-center shadow-sm transition-colors hover:bg-[#DDEEFF] sm:min-h-[160px] sm:px-4 sm:py-6"
          >
            <FileCheck2 className="mb-2 h-7 w-7 text-[#0B69B7] sm:h-8 sm:w-8" />
            <span className="text-sm font-semibold text-[#0B69B7] sm:text-base">Apostille</span>
            <span className="mt-1 text-[10px] leading-snug text-[#486581] sm:text-xs">Document Apostille</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
