"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DocumentAuditJourney } from "@/components/dashboard/DocumentAuditJourney";

export default function DashboardDocumentAuditPage() {
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const resumeReference = (searchParams.get("reference") || "").trim().toUpperCase() || undefined;
  const startFresh = ["1", "true", "yes"].includes((searchParams.get("start") || "").trim().toLowerCase());
  const focusQuote = ["1", "true", "yes"].includes((searchParams.get("focusQuote") || "").trim().toLowerCase());
  // Hub pages may pass country/city; ignored here but preserved in login redirect via searchParams.
  const serviceType = (searchParams.get("service") || "").trim() || undefined;

  if (loading) {
    return (
      <section className="min-h-[70vh] bg-[#F4F6F9] px-4 pb-16 pt-28 sm:px-6">
        <div className="mx-auto max-w-[1240px] text-sm text-[#627D98]">Loading application…</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    const returnQuery = searchParams.toString();
    const returnPath = `/dashboard/document-audit${returnQuery ? `?${returnQuery}` : ""}`;
    const loginHref = `/auth/login?next=${encodeURIComponent(returnPath)}`;
    return (
      <section className="min-h-[70vh] bg-[#F4F6F9] px-4 pb-16 pt-28 sm:px-6">
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
    <section className="min-h-[70vh] bg-[#F4F6F9] pt-24">
      <DocumentAuditJourney
        userEmail={user?.email}
        resumeReference={resumeReference}
        startFresh={startFresh}
        focusQuote={focusQuote}
        serviceType={serviceType}
      />
    </section>
  );
}
