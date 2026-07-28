"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Start application opens the order form directly — service options live there. */
export default function StartApplicationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/document-audit?start=1");
  }, [router]);

  return (
    <section className="min-h-[60vh] bg-[#F4F6F9] px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto w-full max-w-[640px] text-sm text-[#627D98]">Opening start application…</div>
    </section>
  );
}
