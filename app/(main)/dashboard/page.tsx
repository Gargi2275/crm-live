"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Copy, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { PageLoader } from "@/components/ui/PageLoader";

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
  created_at: string;
  updated_at: string;
};

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

  if (loading || (isAuthenticated && appsLoading)) {
    return (
      <section className="bg-bg-page pt-24">
        <PageLoader title="Loading dashboard…" subtitle="Fetching your applications." />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="min-h-[60vh] bg-bg-page px-4 pb-12 pt-28 sm:px-6 lg:px-8">
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
    <section className="bg-bg-page px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Minimal header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold tracking-tight text-[#102A43] sm:text-[1.65rem]">
              Welcome{user?.first_name ? `, ${user.first_name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-[#627D98]">
              {hasExistingApplications
                ? `${applications.length} application${applications.length === 1 ? "" : "s"}`
                : "Start a new application when you’re ready"}
              {statusCounts.action > 0 ? ` · ${statusCounts.action} need action` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/track"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#dce7f8] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B69B7] transition hover:bg-[#f8fbff]"
            >
              Track application
            </Link>
            <Link
              href="/dashboard/document-audit?start=1"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#0B69B7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#095A9D]"
            >
              {hasExistingApplications ? "+ Add application" : "Start application"}
            </Link>
          </div>
        </div>

        {/* Applications */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-heading font-semibold text-[#102A43]">Your Applications</h2>
            {hasExistingApplications ? (
              <p className="text-xs text-[#627D98]">
                Showing {filteredApplications.length} of {applications.length}
              </p>
            ) : null}
          </div>

          {hasExistingApplications ? (
            <div className="mb-4 space-y-3 rounded-2xl border border-[#e8f0f8] bg-white p-3.5 sm:p-4">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829AB1]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reference, service, or gov ref…"
                    className="w-full rounded-xl border border-[#dce7f8] bg-[#f8fbff] py-2.5 pl-9 pr-3 text-sm text-[#102A43] outline-none transition placeholder:text-[#9AA8BC] focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-[#dce7f8] bg-[#f8fbff] px-3 py-2 text-sm text-[#486581]">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="bg-transparent text-sm font-semibold text-[#102A43] outline-none"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="status">By status</option>
                    </select>
                  </label>
                  {filtersActive ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7f8] bg-white px-3 py-2 text-sm font-semibold text-[#627D98] hover:text-[#102A43]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((item) => {
                  const count = statusCounts[item.id];
                  if (item.id !== "all" && count === 0) return null;
                  const active = statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-primary bg-[#ecf6ff] text-primary"
                          : "border-[#e8f0f8] bg-[#f8fbff] text-[#486581] hover:border-primary/30"
                      }`}
                    >
                      {item.label}
                      <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              {availableServices.length > 2 ? (
                <div className="flex flex-wrap gap-2">
                  {availableServices.map((item) => {
                    const active = serviceFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setServiceFilter(item.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-[#0B69B7] bg-[#0B69B7] text-white"
                            : "border-[#e8f0f8] bg-white text-[#486581] hover:border-primary/30"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {appsError ? <p className="mb-3 text-sm text-red-600">{appsError}</p> : null}

          {!appsLoading && applications.length === 0 && !appsError ? (
            <div className="rounded-2xl border border-dashed border-[#dce7f8] bg-white px-4 py-10 text-center">
              <p className="text-sm text-[#486581]">No applications yet.</p>
              <Link
                href="/dashboard/document-audit?start=1"
                className="mt-3 inline-flex rounded-lg bg-[#0B69B7] px-4 py-2 text-sm font-semibold text-white"
              >
                Start your first application
              </Link>
            </div>
          ) : null}

          {!appsLoading && applications.length > 0 && filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dce7f8] bg-white px-4 py-8 text-center">
              <p className="text-sm text-[#486581]">No applications match your filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 inline-flex rounded-lg border border-[#dce7f8] px-4 py-2 text-sm font-semibold text-[#0B69B7]"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {filteredApplications.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                return (
                  <article
                    key={app.id}
                    className={`flex flex-col rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(18,84,150,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(18,84,150,0.1)] ${
                      needsAction ? "border-amber-200" : "border-[#dce7f8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[15px] font-semibold text-primary">{displayRef}</p>
                          <button
                            type="button"
                            onClick={() => void copyReference(displayRef)}
                            className="rounded p-1 text-[#829AB1] transition hover:bg-[#f3f7fc] hover:text-primary"
                            aria-label="Copy reference"
                            title="Copy reference"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(
                          app.application_status,
                        )}`}
                      >
                        {labelStatus(app.application_status)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-[#102A43]">
                      {app.service_name || "Service"}
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-[#627D98]">
                      {applied ? <p>Applied {applied}</p> : null}
                      {updated && updated !== applied ? <p>Updated {updated}</p> : null}
                      {governmentReference ? (
                        <p className="truncate">Gov ref: {governmentReference}</p>
                      ) : null}
                      {apostille ? (
                        <p className="truncate text-xs">Internal: {app.reference_number}</p>
                      ) : null}
                      {needsAction ? (
                        <p className="text-xs font-semibold text-amber-700">Action needed on this case</p>
                      ) : null}
                    </div>

                    <div className="mt-auto pt-5">
                      <Link
                        href={href}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-[#dce7f8] bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#0B69B7] transition hover:border-primary/35 hover:bg-white"
                      >
                        {needsAction ? "Continue application" : "View application"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
