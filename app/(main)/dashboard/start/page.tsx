"use client";

import Link from "next/link";
import { FileCheck2, Globe2, Sparkles } from "lucide-react";
import { ProgressStepper } from "@/components/ProgressStepper";

const OPTIONS = [
  {
    href: "/indian-e-visa",
    icon: Globe2,
    title: "Indian e-Visa",
    description: "1-Year or 5-Year tourist e-Visa",
  },
  {
    href: "/dashboard/document-audit?start=1&service=new_oci",
    icon: Sparkles,
    title: "OCI / Passport",
    description: "New OCI, renewal, update, or passport",
  },
  {
    href: "/apostille-pre-check",
    icon: FileCheck2,
    title: "Apostille",
    description: "Free document pre-check first",
  },
] as const;

export default function StartApplicationPage() {
  return (
    <section className="min-h-[60vh] bg-[#F4F6F9] px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto w-full max-w-[640px]">
        <div className="mb-4 max-w-md">
          <ProgressStepper currentStep={0} />
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-[22px] font-semibold text-[#0F1F3D]">Start your order</h1>
          <p className="mt-1 text-[13px] text-[#627D98]">Choose a service to continue.</p>
          <div className="mt-4 space-y-2">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Link
                  key={option.href}
                  href={option.href}
                  className="flex items-center gap-3 rounded-lg border border-[#E1E7EF] bg-white px-3 py-3 transition hover:border-[#1A56DB] hover:bg-[#EFF6FF]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1A56DB]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[#102A43]">{option.title}</span>
                    <span className="block text-[12px] text-[#829AB1]">{option.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
