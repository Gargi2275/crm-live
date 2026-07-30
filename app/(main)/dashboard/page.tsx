"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Copy, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";

type DashboardApplication = {
  id: number;
  reference_number: string;
  file_number?: string | null;
  case_type?: string;
  service: number;
  service_name: string;
  service_type?: string;
  application_status: string;
  application_date: string;
  submission_date: string | null;
  approval_date: string | null;
  completion_date: string | null;
  notes: string;
  customer_name?: string | null;
  created_at: string;
  updated_at: string;
  audit_fee_paid?: boolean;
  audit_payment_status?: string | null;
  full_payment_status?: string | null;
  quote_status?: string | null;
};

function canDeleteDraftApplication(app: DashboardApplication): boolean {
  if (String(app.application_status || "").toLowerCase() !== "draft") return false;
  if (app.audit_fee_paid) return false;
  if (String(app.audit_payment_status || "").toLowerCase() === "paid") return false;
  if (String(app.full_payment_status || "").toLowerCase() === "paid") return false;
  if (String(app.quote_status || "").toUpperCase() === "PAID") return false;
  return true;
}

function clearLocalAuditDraft(reference: string) {
  if (typeof window === "undefined") return;
  const keys = [
    `flyoci:oci-audit-draft-v2:${reference}`,
    `flyoci:oci-audit-draft-v2:active`,
    "flyoci:oci-audit-draft-v1",
  ];
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }
}

type StatusFilter = "all" | "action" | "progress" | "done" | "closed";
type ServiceFilter = "all" | "oci" | "evisa" | "passport" | "apostille" | "other";
type SortKey = "newest" | "oldest" | "status";

function extractGovernmentReference(notes: string | null | undefined): string {
  const raw = String(notes || "").trim();
  if (!raw) return "";
  const submittedMatch = raw.match(/Govt\s*ref\s*:\s*([^\n]+)/i);
  if (submittedMatch?.[1]) return submittedMatch[1].trim();
  const decisionMatch = raw.match(/Decision\s*ref\s*:\s*([^\n]+)/i);
  if (decisionMatch?.[1]) return decisionMatch[1].trim();
  return "";
}

function extractApplicantFromNotes(notes: string | null | undefined): string {
  const raw = String(notes || "").trim();
  if (!raw) return "";
  const match = raw.match(/Applicant:\s*([^|]+)/i);
  return match?.[1]?.trim() || "";
}

function resolveApplicantName(app: DashboardApplication): string {
  const fromNotes = extractApplicantFromNotes(app.notes);
  if (fromNotes) return fromNotes;
  const fromApi = String(app.customer_name || "").trim();
  if (fromApi && !fromApi.includes("@")) return fromApi;
  if (fromApi) return fromApi.split("@")[0] || fromApi;
  return "Applicant";
}

function applicantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}


function DashboardAtmosphere() {
  const particles = [
    { left: "8%", top: "18%", size: 6, delay: "0s", dur: "14s" },
    { left: "18%", top: "62%", size: 4, delay: "1.2s", dur: "16s" },
    { left: "32%", top: "28%", size: 5, delay: "2.4s", dur: "12s" },
    { left: "48%", top: "72%", size: 3, delay: "0.6s", dur: "18s" },
    { left: "62%", top: "22%", size: 7, delay: "3s", dur: "15s" },
    { left: "74%", top: "48%", size: 4, delay: "1.8s", dur: "13s" },
    { left: "86%", top: "34%", size: 5, delay: "2.1s", dur: "17s" },
    { left: "12%", top: "84%", size: 3, delay: "4s", dur: "14s" },
    { left: "55%", top: "12%", size: 4, delay: "0.9s", dur: "19s" },
    { left: "92%", top: "68%", size: 6, delay: "2.7s", dur: "11s" },
    { left: "40%", top: "50%", size: 3, delay: "3.5s", dur: "16s" },
    { left: "78%", top: "82%", size: 5, delay: "1.5s", dur: "15s" },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#F7FBFF]" />
      <div className="absolute -left-[10%] -top-[20%] h-[55%] w-[50%] rounded-full bg-[#33A1FD]/18 blur-[90px]" />
      <div className="absolute -right-[8%] top-[5%] h-[45%] w-[42%] rounded-full bg-[#0B69B7]/12 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[40%] w-[50%] rounded-full bg-[#33A1FD]/10 blur-[110px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(51,161,253,0.10),_transparent_55%)]" />
      {particles.map((particle, i) => (
        <span
          key={i}
          className="dashboard-particle absolute rounded-full bg-[#33A1FD]/50 shadow-[0_0_12px_rgba(51,161,253,0.4)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDuration: particle.dur,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

const isApostilleDashboardApp = (app?: DashboardApplication | null) => {
  const st = String(app?.service_type || "").toLowerCase();
  const ct = String(app?.case_type || "").toLowerCase();
  return st.includes("apostille") || ct === "apostille";
};

function serviceCategory(app: DashboardApplication): Exclude<ServiceFilter, "all"> {
  const st = String(app.service_type || "").toLowerCase();
  const name = String(app.service_name || "").toLowerCase();
  if (st.includes("apostille") || name.includes("apostille") || isApostilleDashboardApp(app)) return "apostille";
  if (st.startsWith("evisa") || name.includes("e-visa") || name.includes("evisa")) return "evisa";
  if (st.includes("passport") || name.includes("passport")) return "passport";
  if (st.includes("oci") || name.includes("oci")) return "oci";
  return "other";
}

function statusBucket(status: string): Exclude<StatusFilter, "all"> {
  const key = status.toLowerCase();
  if (key.includes("reject") || key.includes("closed") || key.includes("cancel")) return "closed";
  if (
    key.includes("correction") ||
    key.includes("upload") ||
    key.includes("payment_pending") ||
    key.includes("quoted") ||
    key.includes("action")
  ) {
    return "action";
  }
  if (
    key.includes("paid") ||
    key.includes("approved") ||
    key.includes("complete") ||
    key.includes("delivered") ||
    key.includes("decision")
  ) {
    return "done";
  }
  return "progress";
}

function formatShortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusTone(status: string) {
  const key = status.toLowerCase();
  if (key.includes("paid") || key.includes("approved") || key.includes("complete")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (key.includes("pending") || key.includes("review") || key.includes("upload") || key.includes("correction")) {
    return "bg-amber-50 text-amber-800 border-amber-100";
  }
  if (key.includes("reject") || key.includes("closed")) {
    return "bg-rose-50 text-rose-700 border-rose-100";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function labelStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "action", label: "Needs action" },
  { id: "progress", label: "In progress" },
  { id: "done", label: "Completed" },
  { id: "closed", label: "Closed" },
];

const SERVICE_FILTERS: Array<{ id: ServiceFilter; label: string }> = [
  { id: "all", label: "All services" },
  { id: "oci", label: "OCI" },
  { id: "evisa", label: "e-Visa" },
  { id: "passport", label: "Passport" },
  { id: "apostille", label: "Apostille" },
  { id: "other", label: "Other" },
];

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [deleteTarget, setDeleteTarget] = useState<DashboardApplication | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasExistingApplications = applications.length > 0;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.email) {
      setAppsLoading(false);
      setApplications([]);
      return;
    }
    let cancelled = false;
    setAppsLoading(true);
    setAppsError("");
    authenticatedFetch(`${API_BASE_URL}/applications/`, { method: "GET" })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((json as { message?: string }).message || "Failed to load applications.");
        }
        if (!cancelled) {
          setApplications(((json as { data?: DashboardApplication[] }).data || []) as DashboardApplication[]);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAppsError(error instanceof Error ? error.message : "Failed to load applications.");
        }
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user?.email]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: applications.length,
      action: 0,
      progress: 0,
      done: 0,
      closed: 0,
    };
    for (const app of applications) {
      counts[statusBucket(app.application_status)] += 1;
    }
    return counts;
  }, [applications]);

  const availableServices = useMemo(() => {
    const present = new Set(applications.map(serviceCategory));
    return SERVICE_FILTERS.filter((item) => item.id === "all" || present.has(item.id));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = applications.filter((app) => {
      if (statusFilter !== "all" && statusBucket(app.application_status) !== statusFilter) return false;
      if (serviceFilter !== "all" && serviceCategory(app) !== serviceFilter) return false;
      if (!q) return true;
      const haystack = [
        app.reference_number,
        app.file_number,
        app.service_name,
        app.service_type,
        app.application_status,
        app.customer_name,
        extractApplicantFromNotes(app.notes),
        extractGovernmentReference(app.notes),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === "status") {
        return String(a.application_status).localeCompare(String(b.application_status));
      }
      const aTime = new Date(a.updated_at || a.application_date || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.application_date || b.created_at).getTime();
      return sortKey === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [applications, search, statusFilter, serviceFilter, sortKey]);

  const filtersActive =
    Boolean(search.trim()) || statusFilter !== "all" || serviceFilter !== "all" || sortKey !== "newest";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setServiceFilter("all");
    setSortKey("newest");
  };

  const copyReference = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Reference copied");
    } catch {
      toast.error("Could not copy reference");
    }
  };

  const deleteApplication = async (app: DashboardApplication) => {
    const ref = String(app.reference_number || "").trim();
    if (!ref || !canDeleteDraftApplication(app)) return;

    setDeleting(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/applications/${encodeURIComponent(ref)}/`,
        { method: "DELETE" },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (json as { message?: string }).message || "Failed to delete application.",
        );
      }
      setApplications((prev) => prev.filter((item) => item.reference_number !== ref));
      clearLocalAuditDraft(ref);
      setDeleteTarget(null);
      toast.success("Application deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete application.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || (isAuthenticated && appsLoading)) {
    return (
      <section className="relative min-h-[50vh] overflow-hidden pt-24">
        <DashboardAtmosphere />
        <div className="relative">
          <PageLoader title="Loading dashboard…" subtitle="Fetching your applications." />
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="relative min-h-[60vh] overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <DashboardAtmosphere />
        <div className="relative mx-auto max-w-xl rounded-2xl border border-[#D9E2EC] bg-white/90 p-6 shadow-sm backdrop-blur-sm">
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
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden pt-20">
      <DashboardAtmosphere />

      <div className="relative mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-heading font-semibold tracking-tight text-[#102A43] sm:text-2xl">
              Welcome{user?.first_name ? `, ${user.first_name}` : ""}
            </h1>
            <p className="mt-0.5 text-sm text-[#627D98]">
              {hasExistingApplications
                ? `${applications.length} application${applications.length === 1 ? "" : "s"}`
                : "Start a new application when you’re ready"}
              {statusCounts.action > 0 ? ` · ${statusCounts.action} need action` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/track"
              className="inline-flex items-center justify-center rounded-lg border border-[#D9E2EC] bg-white/90 px-3.5 py-2 text-sm font-semibold text-[#0B69B7] shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              Track application
            </Link>
            <Link
              href="/dashboard/document-audit?start=1"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B69B7] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#095A9D]"
            >
              <Plus className="h-4 w-4" />
              {hasExistingApplications ? "Add application" : "Start application"}
            </Link>
          </div>
        </div>

        {hasExistingApplications ? (
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-[0_8px_24px_rgba(11,105,183,0.06)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <label className="relative min-w-[160px] flex-1 basis-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#829AB1]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-[#D9E2EC] bg-white py-1.5 pl-8 pr-2.5 text-sm text-[#102A43] outline-none placeholder:text-[#9AA8BC] focus:border-[#33A1FD]/50 focus:ring-2 focus:ring-[#33A1FD]/15"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="shrink-0 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] outline-none focus:border-[#33A1FD]/50"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((item) => {
                const count = statusCounts[item.id];
                if (item.id !== "all" && count === 0) return null;
                return (
                  <option key={item.id} value={item.id}>
                    {item.label} ({count})
                  </option>
                );
              })}
            </select>

            {availableServices.length > 2 ? (
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as ServiceFilter)}
                className="shrink-0 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] outline-none focus:border-[#33A1FD]/50"
                aria-label="Filter by service"
              >
                {availableServices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}

            <label className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-sm text-[#486581]">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-sm font-semibold text-[#102A43] outline-none"
                aria-label="Sort applications"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="status">By status</option>
              </select>
            </label>

            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#627D98] hover:text-[#102A43]"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>
        ) : null}

        {appsError ? <p className="text-sm text-red-600">{appsError}</p> : null}

        {!appsLoading && applications.length === 0 && !appsError ? (
          <div className="rounded-xl border border-dashed border-[#B7D7F7] bg-white/80 px-4 py-12 text-center backdrop-blur-sm">
            <p className="text-sm text-[#486581]">No applications yet.</p>
            <Link
              href="/dashboard/document-audit?start=1"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0B69B7] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Start your first application
            </Link>
          </div>
        ) : null}

        {!appsLoading && applications.length > 0 && filteredApplications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#B7D7F7] bg-white/80 px-4 py-10 text-center backdrop-blur-sm">
            <p className="text-sm text-[#486581]">No applications match your filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-semibold text-[#0B69B7]"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {filteredApplications.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApplications.map((app) => {
              const apostille = isApostilleDashboardApp(app);
              const displayRef =
                apostille && (app.file_number || "").trim()
                  ? String(app.file_number).trim()
                  : app.reference_number;
              const governmentReference = extractGovernmentReference(app.notes);
              const applied = formatShortDate(app.application_date || app.created_at);
              const updated = formatShortDate(app.updated_at);
              const href =
                app.service_type && app.service_type.toLowerCase().startsWith("evisa")
                  ? `/indian-e-visa?case=${encodeURIComponent(app.reference_number)}&view=details`
                  : `/dashboard/document-audit?reference=${encodeURIComponent(app.reference_number)}&resume=1`;
              const needsAction = statusBucket(app.application_status) === "action";
              const applicantName = resolveApplicantName(app);
              const initials = applicantInitials(applicantName);

              return (
                <article
                  key={app.id}
                  className={`flex flex-col rounded-xl border bg-white/95 p-4 shadow-[0_10px_28px_rgba(11,105,183,0.07)] backdrop-blur-sm transition hover:border-[#33A1FD]/45 hover:shadow-[0_14px_32px_rgba(11,105,183,0.12)] ${
                    needsAction ? "border-amber-300" : "border-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          needsAction
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[#E8F3FC] text-[#0B69B7]"
                        }`}
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#102A43]">{applicantName}</p>
                        <p className="truncate text-[11px] text-[#829AB1]">{app.service_name || "Service"}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusTone(
                        app.application_status,
                      )}`}
                    >
                      {labelStatus(app.application_status)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1 rounded-lg border border-[#E8EEF5] bg-[#F8FAFC] px-2.5 py-1.5">
                    <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#486581]">
                      {displayRef}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyReference(displayRef)}
                      className="rounded p-0.5 text-[#829AB1] hover:text-primary"
                      aria-label="Copy reference"
                      title="Copy reference"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-0.5 text-xs text-[#627D98]">
                    {applied ? <p>Applied {applied}</p> : null}
                    {updated && updated !== applied ? <p>Updated {updated}</p> : null}
                    {governmentReference ? <p className="truncate">Gov: {governmentReference}</p> : null}
                    {needsAction ? <p className="font-semibold text-amber-700">Action needed</p> : null}
                  </div>

                  <div className="mt-auto pt-3">
                    <div className="flex gap-2">
                      <Link
                        href={href}
                        className="inline-flex min-w-0 flex-1 items-center justify-center rounded-lg bg-[#0B69B7] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#095A9D]"
                      >
                        {needsAction ? "Continue" : "View"}
                      </Link>
                      {canDeleteDraftApplication(app) ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(app)}
                          disabled={deleting && deleteTarget?.reference_number === app.reference_number}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          aria-label={`Delete draft ${app.reference_number}`}
                          title="Delete draft"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}

            <Link
              href="/dashboard/document-audit?start=1"
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#33A1FD]/45 bg-white/70 p-4 text-center backdrop-blur-sm transition hover:border-[#0B69B7] hover:bg-white/90"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F3FC] text-[#0B69B7]">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-[#102A43]">Add application</span>
              <span className="text-xs text-[#829AB1]">Start a new case</span>
            </Link>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete draft application?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.reference_number}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void deleteApplication(deleteTarget);
        }}
      />
    </section>
  );
}
