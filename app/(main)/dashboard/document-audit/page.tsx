"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DocumentAuditJourney } from "@/components/dashboard/DocumentAuditJourney";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

export default function DashboardDocumentAuditPage() {
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const resumeReference = (searchParams.get("reference") || "").trim().toUpperCase() || undefined;
  const focusQuote = ["1", "true", "yes"].includes((searchParams.get("focusQuote") || "").trim().toLowerCase());
  const isResuming = Boolean(resumeReference);
  const progressPercent = isResuming ? 62 : 18;
  const auditSteps = [
    { label: "Service selection", status: "done" as const },
    { label: "Questionnaire", status: isResuming ? ("done" as const) : ("active" as const) },
    { label: "Checklist review", status: isResuming ? ("active" as const) : ("pending" as const) },
    { label: "Document uploads", status: "pending" as const },
    { label: "Application submission", status: "pending" as const },
  ];

  if (loading) {
    return (
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
        <div className="max-w-5xl mx-auto">Loading document audit...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-heading font-bold text-primary mb-2">Please log in</h1>
          <p className="text-textMuted mb-4">Your session is not active. Log in to continue your audit journey.</p>
          <Link href="/auth/login?next=%2Fdashboard%2Fdocument-audit" className="inline-flex items-center rounded-lg bg-primary text-white px-4 py-2.5 font-semibold">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_68%)] min-h-[70vh] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-14 -right-16 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#eaf3ff] blur-3xl opacity-90" />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-[#d7e5fb] bg-white p-6 sm:p-7 shadow-[0_18px_48px_rgba(30,74,135,0.08)] relative z-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="inline-flex items-center rounded-full border border-[#cfe2ff] bg-[#eef6ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b5e93]">
                Dashboard / Document Audit
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-heading font-bold text-primary">Smart Questionnaire and Application</h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                Complete your audit journey with guided steps. Progress is saved for {user?.email || "your account"}.
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2b5e93]">Journey Progress</p>
                <div className="mt-2 h-2.5 w-full rounded-full bg-[#e8f1ff] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2f8cff_0%,#1c69dd_100%)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">{progressPercent}% complete {isResuming ? "(resumed)" : "(started)"}</p>
              </div>

              <div className="mt-5">
                <Link href="/dashboard" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Back to Dashboard
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d9e8ff] bg-[#fbfdff] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2b5e93]">Audit Steps</p>
              <ul className="mt-3 space-y-2.5">
                {auditSteps.map((step) => (
                  <li key={step.label} className="flex items-center justify-between rounded-xl border border-[#e4edff] bg-white px-3 py-2.5">
                    <span className="text-sm font-medium text-slate-700">{step.label}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      {step.status === "done" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-[#1c69dd]" />
                          <span className="text-[#1c69dd]">Done</span>
                        </>
                      ) : step.status === "active" ? (
                        <>
                          <Clock3 className="h-4 w-4 text-[#2b5e93]" />
                          <span className="text-[#2b5e93]">Active</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-500">Pending</span>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <DocumentAuditJourney
          userEmail={user?.email}
          resumeReference={resumeReference}
          focusQuote={focusQuote}
        />
      </div>
    </section>
  );
}
