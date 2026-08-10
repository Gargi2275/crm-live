"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DocumentAuditJourney } from "@/components/dashboard/DocumentAuditJourney";
import { PageLoader } from "@/components/ui/PageLoader";
import { setStoredPricingCountrySlug } from "@/lib/service-country-pricing";

export const dynamic = "force-dynamic";

function DocumentAuditContent() {
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const resumeReference = (searchParams.get("reference") || "").trim().toUpperCase() || undefined;
  const startFresh = ["1", "true", "yes"].includes((searchParams.get("start") || "").trim().toLowerCase());
  const serviceType = (searchParams.get("service") || "").trim() || undefined;
  const pricingCountry = (searchParams.get("country") || "").trim().toLowerCase();

  useEffect(() => {
    if (pricingCountry) setStoredPricingCountrySlug(pricingCountry);
  }, [pricingCountry]);

  if (loading) {
    return (
      <section className="bg-[#F4F6F9] pt-24">
        <PageLoader
          title="Loading application…"
          subtitle="Preparing your guided checklist and payment steps."
        />
      </section>
    );
  }

  if (!isAuthenticated) {
    const returnQuery = searchParams.toString();
    const returnPath = `/dashboard/document-audit${returnQuery ? `?${returnQuery}` : ""}`;
    const loginHref = `/auth/login?next=${encodeURIComponent(returnPath)}`;
    return (
      <section className="min-h-[60vh] bg-[#F4F6F9] px-4 pb-12 pt-28 sm:px-6">
        <div className="mx-auto max-w-xl rounded-xl border border-[#E1E7EF] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-[#0F1F3D]">Please log in</h1>
          <p className="mt-2 text-sm text-[#627D98]">
            {serviceType
              ? "Log in to continue the service you selected."
              : "Log in to continue your application."}
          </p>
          <Link
            href={loginHref}
            className="mt-4 inline-flex items-center rounded-lg bg-[#1A56DB] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F4F6F9] pt-24 pb-8">
      <DocumentAuditJourney
        userEmail={user?.email}
        resumeReference={resumeReference}
        startFresh={startFresh}
        serviceType={serviceType}
      />
    </section>
  );
}

export default function DashboardDocumentAuditPage() {
  return (
    <Suspense
      fallback={
        <section className="bg-[#F4F6F9] pt-24">
          <PageLoader
            title="Loading application…"
            subtitle="Getting your document checklist ready."
          />
        </section>
      }
    >
      <DocumentAuditContent />
    </Suspense>
  );
}
