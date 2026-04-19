"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { ArrowRight, Globe2, HelpCircle, Search, Sparkles, TimerReset } from "lucide-react";
type DashboardApplication = {
  id: number;
  reference_number: string;
  service: number;
  service_name: string;
  service_type?: string;
  application_status: string;
  application_date: string;
  submission_date: string | null;
  approval_date: string | null;
  completion_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  email_confirmed?: boolean;
  payment_confirmed?: boolean;
  consent_captured?: boolean;
};

type ActionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: "blue" | "green" | "amber" | "slate";
  icon: React.ReactNode;
};

const toneStyles: Record<ActionCardProps["tone"], { chip: string; icon: string; button: string }> = {
  blue: {
    chip: "border-[#CFE4F8] bg-[#EAF5FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  green: {
    chip: "border-[#CFE4F8] bg-[#F2F8FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  amber: {
    chip: "border-[#CFE4F8] bg-[#F2F8FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  slate: {
    chip: "border-[#CFE4F8] bg-white text-[#2B5E93]",
    icon: "bg-[#F2F8FF] text-[#0B69B7]",
    button: "bg-white text-[#0B69B7] border border-[#CFE4F8] hover:bg-[#F2F8FF]",
  },
};

function extractGovernmentReference(notes: string | null | undefined): string {
  const raw = String(notes || "").trim();
  if (!raw) return "";

  const submittedMatch = raw.match(/Govt\s*ref\s*:\s*([^\n]+)/i);
  if (submittedMatch?.[1]) {
    return submittedMatch[1].trim();
  }

  const decisionMatch = raw.match(/Decision\s*ref\s*:\s*([^\n]+)/i);
  if (decisionMatch?.[1]) {
    return decisionMatch[1].trim();
  }

  return "";
}

function ActionCard({ eyebrow, title, description, href, cta, tone, icon }: ActionCardProps) {
  const styles = toneStyles[tone];

  return (
    <article className="group rounded-[24px] border border-[#DCE7F8] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(30,74,135,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.chip}`}>
          {eyebrow}
        </span>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}>
          {icon}
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-heading font-semibold tracking-tight text-[#102A43]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#486581]">{description}</p>
      <Link
        href={href}
        className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${styles.button}`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string>("");
  const hasExistingApplications = applications.length > 0;

  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    setAppsLoading(true);
    setAppsError("");
    authenticatedFetch(`${API_BASE_URL}/applications/`, { method: "GET" })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((json as { message?: string }).message || "Failed to load applications.");
        }
        setApplications(((json as { data?: DashboardApplication[] }).data || []) as DashboardApplication[]);
      })
      .catch((error) => setAppsError(error instanceof Error ? error.message : "Failed to load applications."))
      .finally(() => setAppsLoading(false));
  }, [isAuthenticated, user?.email]);

  if (loading) {
    return (
      <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">Loading dashboard...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-heading font-bold text-primary">Please log in</h1>
          <p className="mb-4 text-textMuted">Your session is not active. Log in to access your dashboard.</p>
          <Link href="/auth/login" className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 font-semibold text-white">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 1st div: Welcome + 3 steps */}
        <div className="relative overflow-hidden rounded-[30px] border border-[#d7e5fb] bg-white px-6 py-7 shadow-[0_18px_48px_rgba(30,74,135,0.08)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-[#EAF5FF] to-transparent opacity-90" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE4F8] bg-[#EAF5FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2B5E93]">
                <Sparkles className="h-3.5 w-3.5" />
                FlyOCI Dashboard
              </div>
              <h1 className="mt-4 text-3xl font-heading font-semibold tracking-tight text-[#102A43] sm:text-4xl">
                Welcome{user?.first_name ? `, ${user.first_name}` : ""}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#486581] sm:text-base">
                Pick the path you need. The dashboard is now a simple starting point that helps you begin quickly and continue without confusion.
              </p>
            </div>
          </div>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">1. Choose service</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Select OCI, passport, or eVisa from the service page.</p>
            </div>
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">2. Fill the form</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Answer a short guided flow and upload documents.</p>
            </div>
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">3. Track progress</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Return anytime to check status and next steps.</p>
            </div>
          </div>
        </div>

        {/* 2nd div: Applications List */}
        <div className="text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-heading font-semibold">Your Applications</h2>
            {!appsLoading ? (
              <Link
                href="/dashboard/start"
                className="inline-flex items-center justify-center rounded-full bg-[#0B69B7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#095A9D]"
              >
                {hasExistingApplications ? "+ Add application" : "Start application"}
              </Link>
            ) : null}
          </div>
          {appsLoading && <p className="text-sm text-textMuted">Loading applications...</p>}
          {appsError && <p className="text-sm text-red-600 mb-3">{appsError}</p>}
          {!appsLoading && applications.length === 0 && !appsError && (
            <p className="text-sm text-textMuted">No saved applications yet.</p>
          )}
          {applications.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app) => (
                <div
                  key={app.reference_number}
                  className="text-left rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-lg transition"
                >
                  {(() => {
                    const governmentReference = extractGovernmentReference(app.notes);
                    const decisionDate = app.approval_date || app.completion_date;
                    return (
                      <>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                    <div className="flex-1">
                      <p className="font-semibold text-primary text-base mb-1">{app.reference_number}</p>
                      <p className="text-sm text-slate-600">{app.service_name || "e-Visa Service"}</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
                      {app.application_status.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-5 text-sm text-slate-600">
                    {app.application_date && (
                      <p>Applied: <span className="font-medium text-slate-700">{new Date(app.application_date).toLocaleString()}</span></p>
                    )}
                    {app.submission_date && (
                      <p>Submitted: <span className="font-medium text-slate-700">{new Date(app.submission_date).toLocaleString()}</span></p>
                    )}
                    {app.approval_date && (
                      <p className="text-emerald-700">Approved: <span className="font-medium">{new Date(app.approval_date).toLocaleString()}</span></p>
                    )}
                    {decisionDate && !app.approval_date && (
                      <p className="text-emerald-700">Decision: <span className="font-medium">{new Date(decisionDate).toLocaleString()}</span></p>
                    )}
                    {governmentReference && (
                      <p>Government ref: <span className="font-medium text-slate-700">{governmentReference}</span></p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={app.service_type && app.service_type.toLowerCase().startsWith("evisa")
                        ? `/indian-e-visa?case=${encodeURIComponent(app.reference_number)}&view=details`
                        : `/dashboard/document-audit?reference=${encodeURIComponent(app.reference_number)}&resume=1`}
                      className="inline-flex items-center rounded-lg border border-slate-300 text-slate-700 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      View Application
                    </Link>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        
      </div>
    </section>
  );
}