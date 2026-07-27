"use client";

import { useEffect, useState } from "react";
import { fetchPublicPricing, getAssessmentFeeGbp } from "@/lib/public-pricing";

/** Loads early/initial assessment fee from public pricing. Null = not offered. */
export function useAssessmentFee() {
  const [fee, setFee] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicPricing()
      .then(({ services }) => {
        if (cancelled) return;
        setFee(getAssessmentFeeGbp(services));
      })
      .catch(() => {
        if (!cancelled) setFee(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    fee,
    ready,
    hasFee: fee != null && fee > 0,
    label: fee != null && fee > 0 ? `£${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(2)}` : null,
  };
}
