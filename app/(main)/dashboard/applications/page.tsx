"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { eVisaApi } from "@/lib/api-client";

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

const APPS_CACHE_KEY_PREFIX = "dashboard_apps_cache:";

export default function DashboardApplicationsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string>("");
  const [openingReference, setOpeningReference] = useState<string | null>(null);
  const appsCacheKey = user?.email ? `${APPS_CACHE_KEY_PREFIX}${user.email}` : APPS_CACHE_KEY_PREFIX;

  const statusLabel = (value: string) =>
    value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const statusTone = (value: string) => {
    switch ((value || "").toLowerCase()) {
      case "approved":
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "under_review":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "submitted":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const loadCachedApps = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(appsCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DashboardApplication[];
      if (Array.isArray(parsed)) {
        setApplications(parsed);
      }
    } catch {
      localStorage.removeItem(appsCacheKey);
    }
  };

  const saveCachedApps = (items: DashboardApplication[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(appsCacheKey, JSON.stringify(items));
  };

  const fetchApplications = async () => {
    setAppsLoading(true);
    setAppsError("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/applications/`, { method: "GET" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((json as { message?: string }).message || "Failed to load applications.");
      }

      let list = ((json as { data?: DashboardApplication[] }).data || []) as DashboardApplication[];
      list = await Promise.all(
        list.map(async (app) => {
          const normalizedServiceType = String(app.service_type || "").toLowerCase();
          const isEVisa = normalizedServiceType.startsWith("evisa");
          if (!isEVisa) {
            return app;
          }

          try {
            const resumeRes = await eVisaApi.getResume(app.reference_number).catch(() => null);
            if (resumeRes?.data.application_data) {
              return {
                ...app,
                email_confirmed: resumeRes.data.application_data.email_confirmed,
                payment_confirmed: resumeRes.data.application_data.payment_confirmed,
                consent_captured: resumeRes.data.application_data.consent_captured,
              };
            }
          } catch {
            // Keep original app if resume fetch fails.
          }
          return app;
        })
      );

      setApplications(list);
      saveCachedApps(list);
    } catch (error) {
      setAppsError(error instanceof Error ? error.message : "Failed to load applications.");
    } finally {
      setAppsLoading(false);
    }
  };

  const openApplication = async (referenceNumber: string) => {
    const selected = applications.find((item) => item.reference_number === referenceNumber);
    const normalizedServiceType = String(selected?.service_type || "").toLowerCase();
    const isEVisa = normalizedServiceType.startsWith("evisa");

    if (!isEVisa) {
      router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`);
      return;
    }

    setOpeningReference(referenceNumber);
    try {
      const resume = await eVisaApi.getResume(referenceNumber);
      router.push(resume.data.resume_url || `/indian-e-visa?case=${encodeURIComponent(referenceNumber)}&resume=1`);
    } catch {
      router.push(`/indian-e-visa?case=${encodeURIComponent(referenceNumber)}&resume=1`);
    } finally {
      setOpeningReference(null);
    }
  };

  const openApplicationDetails = (referenceNumber: string) => {
    const selected = applications.find((item) => item.reference_number === referenceNumber);
    const normalizedServiceType = String(selected?.service_type || "").toLowerCase();
    const isEVisa = normalizedServiceType.startsWith("evisa");
    if (isEVisa) {
      router.push(`/indian-e-visa?case=${encodeURIComponent(referenceNumber)}&view=details`);
      return;
    }
    router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`);
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    setApplications([]);
    loadCachedApps();
    fetchApplications();
  }, [isAuthenticated, user?.email, appsCacheKey]);

  if (loading) {
    return (
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
        <div className="max-w-5xl mx-auto">Loading applications...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-heading font-bold text-primary mb-2">Please log in</h1>
          <p className="text-textMuted mb-4">Your session is not active. Log in to view your applications.</p>
          <Link href="/auth/login?next=%2Fdashboard%2Fapplications" className="inline-flex items-center rounded-lg bg-primary text-white px-4 py-2.5 font-semibold">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-[#d7e5fb] bg-white p-6 sm:p-7 shadow-[0_18px_48px_rgba(30,74,135,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Dashboard / Applications</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-primary">My Applications</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">All your saved applications are listed in this dedicated page.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to Dashboard
            </Link>
            <button
              onClick={fetchApplications}
              className="inline-flex items-center rounded-xl border border-slate-300 text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#dce7f8] rounded-3xl p-6 sm:p-7 shadow-[0_14px_40px_rgba(30,74,135,0.08)]">
          {appsLoading && applications.length === 0 && (
            <p className="text-sm text-textMuted">Loading applications...</p>
          )}

          {appsError && (
            <p className="text-sm text-red-600 mb-3">{appsError}</p>
          )}

          {!appsLoading && applications.length === 0 && !appsError && (
            <p className="text-sm text-textMuted">No saved applications yet.</p>
          )}

          {applications.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {applications.map((app) => {
                const isOpeningThis = openingReference === app.reference_number;
                const paymentStatus = app.payment_confirmed ? "Confirmed" : "Pending";
                const emailStatus = app.email_confirmed ? "Confirmed" : "Pending";
                const paymentColor = app.payment_confirmed ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200";
                const emailColor = app.email_confirmed ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200";
                const governmentReference = extractGovernmentReference(app.notes);
                const decisionDate = app.approval_date || app.completion_date;

                return (
                  <div
                    key={app.reference_number}
                    className={`text-left rounded-2xl border p-5 sm:p-6 transition ${
                      "border-slate-200 bg-[#fcfdff] hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(24,62,115,0.10)]"
                    } ${isOpeningThis ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                      <div className="flex-1">
                        <p className="font-semibold text-primary text-base mb-1">{app.reference_number}</p>
                        <p className="text-sm text-slate-600">{app.service_name || "e-Visa Service"}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusTone(app.application_status)}`}>
                        {statusLabel(app.application_status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
                      <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${paymentColor}`}>
                        Payment: {paymentStatus}
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${emailColor}`}>
                        Email: {emailStatus}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-5 text-sm text-slate-600">
                      {app.application_date && (
                        <p>Applied: <span className="font-medium text-slate-700">{formatDate(app.application_date)}</span></p>
                      )}
                      {app.submission_date && (
                        <p>Submitted: <span className="font-medium text-slate-700">{formatDate(app.submission_date)}</span></p>
                      )}
                      {app.approval_date && (
                        <p className="text-emerald-700">Approved: <span className="font-medium">{formatDate(app.approval_date)}</span></p>
                      )}
                      {decisionDate && !app.approval_date && (
                        <p className="text-emerald-700">Decision: <span className="font-medium">{formatDate(decisionDate)}</span></p>
                      )}
                      {governmentReference && (
                        <p>Government ref: <span className="font-medium text-slate-700">{governmentReference}</span></p>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openApplication(app.reference_number)}
                        className="inline-flex items-center rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
                      >
                        {isOpeningThis ? "Opening..." : "Continue"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openApplicationDetails(app.reference_number)}
                        className="inline-flex items-center rounded-lg border border-slate-300 text-slate-700 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
