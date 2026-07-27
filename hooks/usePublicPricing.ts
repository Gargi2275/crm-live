"use client";

import { useEffect, useState } from "react";
import {
  buildCategories,
  fetchPublicPricing,
  getAssessmentFeeGbp,
  type CatalogService,
  type PricingCategory,
} from "@/lib/public-pricing";

type UsePublicPricingState = {
  services: CatalogService[];
  categories: PricingCategory[];
  loading: boolean;
  fromFallback: boolean;
  /** Early assessment fee when offered; null when not configured in backend. */
  assessmentFee: number | null;
  /** @deprecated use assessmentFee */
  auditFee: number;
};

/**
 * Shared public pricing hook. Uses module-level session cache so multiple
 * components (home, pricing, services listing) share one network request.
 */
export function usePublicPricing(): UsePublicPricingState {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchPublicPricing().then((result) => {
      if (cancelled) return;
      setServices(result.services);
      setFromFallback(result.fromFallback);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const assessmentFee = getAssessmentFeeGbp(services);

  return {
    services,
    categories: buildCategories(services),
    loading,
    fromFallback,
    assessmentFee,
    auditFee: assessmentFee ?? 0,
  };
}
