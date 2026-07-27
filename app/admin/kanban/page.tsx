"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanBoard, type KanbanQuickFilter, type KanbanViewMode } from "@/components/console/kanban/KanbanBoard";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  AlertTriangle,
  CheckCircle2,
  KanbanSquare,
  RefreshCw,
  ShieldAlert,
  TimerReset,
  CheckCircle,
  XCircle,
  Clock3,
  FileWarning,
} from "lucide-react";
import { listAdminApplications, type AdminApplication } from "@/lib/admin-auth";
import { KANBAN_COLUMNS, type KanbanStage } from "@/lib/kanban";
import toast from "react-hot-toast";

const STAGE_LABELS: Record<KanbanStage, string> = Object.fromEntries(KANBAN_COLUMNS.map((column) => [column.id, column.title])) as Record<KanbanStage, string>;

const LIVE_STAGES: KanbanStage[] = ["PASSPORT_QUOTE_PENDING", "DOCUMENTS_REQUIRED", "PAYMENT_PENDING", "REVIEW_PENDING"];

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const normalizeStage = (stage?: string): KanbanStage => {
  const normalized = (stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  return (KANBAN_COLUMNS.find((column) => column.id === normalized)?.id || "NEW_LEAD") as KanbanStage;
};

const getAgeDays = (createdAt?: string) => {
  if (!createdAt) return 0;
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
};

const isClosedStage = (stage: KanbanStage) => stage === "SUBMITTED" || stage === "DELIVERED";

const simplifyNote = (value?: string) => {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > 140 ? `${clean.slice(0, 140)}...` : clean;
};

const toServiceBucket = (application: AdminApplication): string => {
  const serviceType = String(application.service_type || "").toLowerCase();
  const caseType = String(application.case_type || "").toLowerCase();
  if (caseType.includes("apostille") || serviceType.includes("apostille")) return "Apostille";
  if (serviceType.includes("passport")) return "Passport Renewal";
  if (serviceType.includes("evisa") || serviceType.includes("e-visa") || serviceType.includes("e visa") || serviceType.includes("visa")) return "E-Visa";
  return "OCI";
};

export default function OperationsKanbanPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuickFilter, setActiveQuickFilter] = useState<KanbanQuickFilter | null>(null);
  const [activeStatsTab, setActiveStatsTab] = useState<"evisa" | "health" | "volume" | null>(null);
  const [serviceFilter, setServiceFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [ageingFilter, setAgeingFilter] = useState("Any");
  const [viewMode, setViewMode] = useState<KanbanViewMode>("pipeline");

  const toggleQuickFilter = (key: KanbanQuickFilter) => {
    setActiveQuickFilter((prev) => (prev === key ? null : key));
  };

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const payload = await listAdminApplications();
      setApplications(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load live applications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  const liveStats = useMemo(() => {
    const stageCounts = applications.reduce(
      (acc, application) => {
        const stage = normalizeStage(application.stage || application.current_stage);
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      },
      {} as Record<KanbanStage, number>,
    );

    const openCases = applications.filter((application) => !isClosedStage(normalizeStage(application.stage || application.current_stage))).length;
    const documentsRequested = applications.filter((application) => {
      const stage = normalizeStage(application.stage || application.current_stage);
      return stage === "DOCUMENTS_REQUIRED" || stage === "DOCUMENT_UPLOAD_PENDING";
    }).length;
    const atRiskCases = applications.filter((application) => getAgeDays(application.created_at) >= 3 && !isClosedStage(normalizeStage(application.stage || application.current_stage))).length;
    const breachedCases = applications.filter((application) => getAgeDays(application.created_at) >= 7 && !isClosedStage(normalizeStage(application.stage || application.current_stage))).length;
    const escalations = applications.filter((application) => {
      const stage = normalizeStage(application.stage || application.current_stage);
      return stage === "REVIEW_PENDING" || stage === "DOCUMENTS_REQUIRED" || getAgeDays(application.created_at) >= 7;
    }).length;

    const stageRows = KANBAN_COLUMNS.map((column) => {
      const stageCases = applications.filter((application) => normalizeStage(application.stage || application.current_stage) === column.id);
      const averageAge = stageCases.length ? stageCases.reduce((sum, application) => sum + getAgeDays(application.created_at), 0) / stageCases.length : 0;
      const risk = averageAge >= 7 ? "High" : averageAge >= 3 ? "Medium" : "Low";

      return {
        stage: column.id,
        count: stageCases.length,
        avgAge: `${averageAge.toFixed(1)}d`,
        risk,
      };
    });

    const liveNotes = applications
      .filter((application) => (application.notes || "").trim())
      .slice()
      .sort((left, right) => new Date(right.updated_at || right.created_at).getTime() - new Date(left.updated_at || left.created_at).getTime())
      .slice(0, 3);

    return {
      stageCounts,
      openCases,
      documentsRequested,
      atRiskCases,
      breachedCases,
      escalations,
      stageRows,
      liveNotes,
    };
  }, [applications]);

  const evisaStats = useMemo(() => {
    const evisaApps = applications.filter((application) => {
      const serviceHint = String(application.service_type || application.service_name || "").toLowerCase();
      return serviceHint.includes("evisa") || serviceHint.includes("e-visa") || serviceHint.includes("e visa");
    });

    const reuploadPendingReview = evisaApps.filter((application) => {
      const appStatus = String(application.application_status || "").toLowerCase();
      return appStatus === "reuploaded_pending_review";
    }).length;

    const actionRequired = evisaApps.filter((application) => {
      const appStatus = String(application.application_status || "").toLowerCase();
      const stage = String(application.current_stage || "").toLowerCase();
      return appStatus === "correction_requested" || (stage === "correction_requested" && appStatus !== "reuploaded_pending_review");
    }).length;

    const approved = evisaApps.filter((application) => {
      const appStatus = String(application.application_status || "").toLowerCase();
      const stage = String(application.current_stage || "").toLowerCase();
      return appStatus === "approved" || stage === "decision_received" || stage === "closed";
    }).length;

    const rejected = evisaApps.filter((application) => {
      const appStatus = String(application.application_status || "").toLowerCase();
      const auditResult = String(application.audit_result || "").toLowerCase();
      return appStatus === "rejected" || auditResult === "red";
    }).length;

    const pending = Math.max(evisaApps.length - approved - rejected - actionRequired - reuploadPendingReview, 0);

    return {
      total: evisaApps.length,
      pending,
      approved,
      rejected,
      actionRequired,
      reuploadPendingReview,
    };
  }, [applications]);

  const serviceOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(applications.map((application) => toServiceBucket(application))))];
  }, [applications]);

  const staffOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        applications
          .map((application) => (application.assigned_staff ? String(application.assigned_staff) : ""))
          .filter(Boolean)
      )
    );
    return ["All", ...values, "Unassigned"];
  }, [applications]);

  const activeFilterCount =
    (serviceFilter !== "All" ? 1 : 0) +
    (staffFilter !== "All" ? 1 : 0) +
    (ageingFilter !== "Any" ? 1 : 0);

  const clearFilters = () => {
    setServiceFilter("All");
    setStaffFilter("All");
    setAgeingFilter("Any");
  };

  useSetAdminPageChrome({
    title: "Pipeline",
    subtitle: isLoading ? "Loading…" : `${applications.length} cases`,
    icon: KanbanSquare,
    activeFilterCount,
    onClearFilters: clearFilters,
    meta: isLoading ? "Loading…" : `${applications.length} cases`,
    syncKey: `${serviceFilter}|${staffFilter}|${ageingFilter}|${isLoading}|${applications.length}|${viewMode}|${activeStatsTab}|${activeQuickFilter}`,
    actions: (
      <button
        type="button"
        onClick={() => void loadApplications()}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    ),
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Service Type</span>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className={filterFieldClass}
          >
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Assigned Staff</span>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className={filterFieldClass}
          >
            {staffOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Ageing</span>
          <select
            value={ageingFilter}
            onChange={(e) => setAgeingFilter(e.target.value)}
            className={filterFieldClass}
          >
            {["Any", "3d+", "5d+", "7d+"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </>
    ),
  });

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-3 font-body max-w-[1500px] mx-auto">
      <div className="bg-white rounded-[10px] border-[0.5px] border-[#D9E1EA] px-3 py-2.5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-0.5">
            <button
              type="button"
              onClick={() => setActiveStatsTab((prev) => (prev === "evisa" ? null : "evisa"))}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${activeStatsTab === "evisa" ? "bg-white text-[#102A43] shadow-sm" : "text-[#627D98] hover:text-[#334E68]"}`}
            >
              EVisa
            </button>
            <button
              type="button"
              onClick={() => setActiveStatsTab((prev) => (prev === "health" ? null : "health"))}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${activeStatsTab === "health" ? "bg-white text-[#102A43] shadow-sm" : "text-[#627D98] hover:text-[#334E68]"}`}
            >
              SLA
            </button>
            <button
              type="button"
              onClick={() => setActiveStatsTab((prev) => (prev === "volume" ? null : "volume"))}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${activeStatsTab === "volume" ? "bg-white text-[#102A43] shadow-sm" : "text-[#627D98] hover:text-[#334E68]"}`}
            >
              Volume
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-[#D9E1EA] bg-white p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("pipeline")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${viewMode === "pipeline" ? "bg-[#102A43] text-white" : "text-[#486581] hover:bg-[#F5F7FA]"}`}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${viewMode === "list" ? "bg-[#102A43] text-white" : "text-[#486581] hover:bg-[#F5F7FA]"}`}
            >
              List
            </button>
          </div>
        </div>

        {activeStatsTab === "evisa" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button onClick={() => toggleQuickFilter("evisa_total")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_total" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Total</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#009877]" />{evisaStats.total}</p>
            </button>
            <button onClick={() => toggleQuickFilter("evisa_pending")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_pending" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Pending</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-[#B87333]" />{evisaStats.pending}</p>
            </button>
            <button onClick={() => toggleQuickFilter("evisa_approved")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_approved" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Approved</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#009877]" />{evisaStats.approved}</p>
            </button>
            <button onClick={() => toggleQuickFilter("evisa_rejected")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_rejected" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Rejected</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-[#B42318]" />{evisaStats.rejected}</p>
            </button>
            <button onClick={() => toggleQuickFilter("evisa_action_required")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_action_required" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Action required</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><FileWarning className="w-3.5 h-3.5 text-[#B45309]" />{evisaStats.actionRequired}</p>
            </button>
            <button onClick={() => toggleQuickFilter("evisa_reupload_pending_review")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "evisa_reupload_pending_review" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Reupload review</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-[#0B69B7]" />{evisaStats.reuploadPendingReview}</p>
            </button>
          </div>
        )}

        {activeStatsTab === "health" && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            <button onClick={() => toggleQuickFilter("sla_health")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "sla_health" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">SLA health</p>
              <p className="text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${liveStats.breachedCases === 0 ? "text-[#009877]" : "text-[#B42318]"}`} /> {liveStats.breachedCases === 0 ? "Stable" : "Attention"}</p>
            </button>
            <button onClick={() => toggleQuickFilter("sla_at_risk")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "sla_at_risk" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">At risk</p>
              <p className="text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><TimerReset className="w-3.5 h-3.5 text-[#B87333]" /> {liveStats.atRiskCases}</p>
            </button>
            <button onClick={() => toggleQuickFilter("sla_breached")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "sla_breached" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Breached</p>
              <p className="text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#B42318]" /> {liveStats.breachedCases}</p>
            </button>
            <button onClick={() => toggleQuickFilter("escalations")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "escalations" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Escalations</p>
              <p className="text-sm font-heading font-semibold text-[#102A43] inline-flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-[#33A1FD]" /> {liveStats.escalations}</p>
            </button>
          </div>
        )}

        {activeStatsTab === "volume" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button onClick={() => toggleQuickFilter("open_cases")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "open_cases" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Open cases</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43]">{liveStats.openCases}</p>
            </button>
            <button onClick={() => toggleQuickFilter("documents_requested")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "documents_requested" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Docs requested</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43]">{liveStats.documentsRequested}</p>
            </button>
            <button onClick={() => toggleQuickFilter("live_stages")} className={`rounded-[8px] border p-2 text-left ${activeQuickFilter === "live_stages" ? "border-[#0B69B7] bg-[#EFF7FF]" : "border-[#D9E1EA]"}`}>
              <p className="text-[10px] text-[#627D98]">Live stages</p>
              <p className="mt-0.5 text-sm font-heading font-semibold text-[#102A43]">{Object.values(liveStats.stageCounts).filter((count) => count > 0).length}</p>
            </button>
          </div>
        )}
      </div>

      {activeQuickFilter && (
        <div className="flex items-center justify-between rounded-[8px] border border-[#B7D7F7] bg-[#EFF7FF] px-3 py-1.5">
          <p className="text-xs font-medium text-[#0B69B7]">Filter: {activeQuickFilter.replaceAll("_", " ")}</p>
          <button onClick={() => setActiveQuickFilter(null)} className="rounded border border-[#B7D7F7] bg-white px-2 py-0.5 text-xs font-semibold text-[#0B69B7]">
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-[10px] border-[0.5px] border-[#D9E1EA] p-3">
        <KanbanBoard
          quickFilter={activeQuickFilter}
          serviceFilter={serviceFilter}
          staffFilter={staffFilter}
          ageingFilter={ageingFilter}
          viewMode={viewMode}
        />
      </div>

      <details className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] group">
        <summary className="list-none cursor-pointer px-3 py-2.5 text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          SLA monitoring
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-3 pb-3 text-sm">
          {LIVE_STAGES.map((stage) => {
            const row = liveStats.stageRows.find((item) => item.stage === stage);
            const count = row?.count ?? 0;
            const progress = liveStats.openCases > 0 ? Math.min(100, Math.round((count / liveStats.openCases) * 100)) : 0;

            return (
              <div key={stage} className="bg-[#F8FAFC] border-[0.5px] border-[#D9E1EA] rounded-[8px] p-2.5 text-[#334E68]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-heading font-medium text-xs">{STAGE_LABELS[stage]}</span>
                  <span className={count >= 5 ? "text-[#B42318] font-semibold text-xs" : count >= 2 ? "text-[#9C4F17] font-semibold text-xs" : "text-[#006F57] font-semibold text-xs"}>
                    {count >= 5 ? "At risk" : count >= 2 ? "Monitor" : "Healthy"}
                  </span>
                </div>
                <p className="text-[11px] text-[#627D98] mb-1.5">{count} live cases</p>
                <div className="h-1.5 rounded-full bg-[#F5F7FA]"><div className="h-1.5 rounded-full bg-[#009877]" style={{ width: `${progress}%` }} /></div>
              </div>
            );
          })}
        </div>
      </details>

      <details className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] group">
        <summary className="list-none cursor-pointer px-3 py-2.5 text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Recent case notes
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <div className="px-3 pb-3 space-y-2">
          {liveStats.liveNotes.length > 0 ? (
            liveStats.liveNotes.map((application) => (
              <div key={application.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2">
                <p className="text-xs font-semibold text-[#102A43]">{application.reference_number}</p>
                <p className="mt-1 text-sm text-[#334E68]">{simplifyNote(application.notes)}</p>
                <p className="mt-1 text-[11px] text-[#627D98]">
                  {application.updated_at ? new Date(application.updated_at).toLocaleString() : new Date(application.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#627D98]">No live case notes are available yet.</p>
          )}
        </div>
      </details>

      <details className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] overflow-hidden group">
        <summary className="list-none cursor-pointer px-3 py-2.5 text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between border-b border-transparent group-open:border-[#E5EAF0]">
          Pipeline table
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Reference</th>
                <th className="px-3 py-2 text-left text-xs">Customer</th>
                <th className="px-3 py-2 text-left text-xs">Stage</th>
                <th className="px-3 py-2 text-left text-xs">Docs</th>
                <th className="px-3 py-2 text-left text-xs">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-3 py-2 text-xs">{application.reference_number}</td>
                  <td className="px-3 py-2 text-xs">{application.customer_name || `Customer ${application.id}`}</td>
                  <td className="px-3 py-2 text-xs">{normalizeStage(application.stage || application.current_stage)}</td>
                  <td className="px-3 py-2 text-xs">{application.document_count ?? 0}</td>
                  <td className="px-3 py-2 text-xs">{getAgeDays(application.created_at)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
