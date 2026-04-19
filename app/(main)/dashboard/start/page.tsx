"use client";

import Link from "next/link";
import { Globe2, Sparkles } from "lucide-react";

export default function StartApplicationPage() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center bg-bg-page px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-6 items-center">
        <h1 className="text-2xl font-heading font-bold text-primary mb-2">Select application type</h1>
        <Link href="/indian-e-visa" className="w-full inline-flex flex-col items-center justify-center rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-4 py-6 text-center shadow-sm hover:bg-[#DDEEFF] transition-colors mb-2">
          <Globe2 className="h-8 w-8 text-[#0B69B7] mb-2" />
          <span className="font-semibold text-[#0B69B7]">eVisa</span>
          <span className="mt-1 text-xs text-[#486581]">Indian eVisa</span>
        </Link>
        <Link href="/dashboard/document-audit" className="w-full inline-flex flex-col items-center justify-center rounded-xl border border-[#CFE4F8] bg-[#EAF5FF] px-4 py-6 text-center shadow-sm hover:bg-[#DDEEFF] transition-colors">
          <Sparkles className="h-8 w-8 text-[#0B69B7] mb-2" />
          <span className="font-semibold text-[#0B69B7]">OCI</span>
          <span className="mt-1 text-xs text-[#486581]">OCI Card</span>
        </Link>
      </div>
    </section>
  );
}
