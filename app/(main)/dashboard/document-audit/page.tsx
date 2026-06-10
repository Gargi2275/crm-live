"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DocumentAuditJourney } from "@/components/dashboard/DocumentAuditJourney";
import { CheckCircle2, ChevronDown, Circle, Clock3 } from "lucide-react";

export default function DashboardDocumentAuditPage() {
  const [stepsOpen, setStepsOpen] = useState(false);
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const resumeReference = (searchParams.get("reference") || "").trim().toUpperCase() || undefined;
  const startFresh = ["1", "true", "yes"].includes((searchParams.get("start") || "").trim().toLowerCase());
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
        <div className="relative z-10 rounded-2xl border border-[#d7e5fb] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(30,74,135,0.06)] sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b5e93]">
                Dashboard / Document Audit
              </p>
              <h1 className="mt-0.5 text-lg font-heading font-bold text-primary sm:text-xl">
                Smart Questionnaire and Application
              </h1>
            </div>

            <div
              className="relative shrink-0"
              onMouseEnter={() => setStepsOpen(true)}
              onMouseLeave={() => setStepsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setStepsOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#cfe2ff] bg-[#eef6ff] px-3 py-2 text-left transition-colors hover:bg-[#e3f0ff]"
                aria-expanded={stepsOpen}
                aria-label="View audit steps"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2b5e93]">Progress</p>
                  <p className="text-base font-bold leading-none text-primary">{progressPercent}%</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-[#2b5e93] transition-transform ${stepsOpen ? "rotate-180" : ""}`} />
              </button>

              {stepsOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-[#d9e8ff] bg-white p-3 shadow-[0_16px_40px_rgba(30,74,135,0.14)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b5e93]">Audit Steps</p>
                  <ul className="mt-2 space-y-1.5">
                    {auditSteps.map((step) => (
                      <li key={step.label} className="flex items-center justify-between rounded-lg border border-[#e4edff] bg-[#fbfdff] px-2.5 py-2">
                        <span className="text-xs font-medium text-slate-700">{step.label}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                          {step.status === "done" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#1c69dd]" />
                              <span className="text-[#1c69dd]">Done</span>
                            </>
                          ) : step.status === "active" ? (
                            <>
                              <Clock3 className="h-3.5 w-3.5 text-[#2b5e93]" />
                              <span className="text-[#2b5e93]">Active</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-500">Pending</span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Progress saved for {user?.email || "your account"}
            </p>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#2b5e93] hover:text-primary hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <DocumentAuditJourney
          userEmail={user?.email}
          resumeReference={resumeReference}
          startFresh={startFresh}
          focusQuote={focusQuote}
        />
      </div>
    </section>
  );
}
