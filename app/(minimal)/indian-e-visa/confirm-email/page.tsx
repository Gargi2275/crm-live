"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Email confirmation OTP step was removed from the e-Visa flow.
 * This route redirects to payment (or registration if no case).
 */
export default function ConfirmEmailRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseNumber = (searchParams.get("case") || "").trim();

  useEffect(() => {
    if (caseNumber) {
      router.replace(`/indian-e-visa/payment?case=${encodeURIComponent(caseNumber)}`);
    } else {
      router.replace("/indian-e-visa");
    }
  }, [caseNumber, router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center gap-2 text-[#627d98]">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-medium">Continuing to payment…</span>
    </div>
  );
}
