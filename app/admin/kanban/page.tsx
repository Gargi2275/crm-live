"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanBoard } from "@/components/console/kanban/KanbanBoard";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, TimerReset, CheckCircle, XCircle, Clock3, FileWarning } from "lucide-react";
import { listAdminApplications, type AdminApplication } from "@/lib/admin-auth";
import { KANBAN_COLUMNS, type KanbanStage } from "@/lib/kanban";
import toast from "react-hot-toast";

const STAGE_LABELS: Record<KanbanStage, string> = Object.fromEntries(KANBAN_COLUMNS.map((column) => [column.id, column.title])) as Record<KanbanStage, string>;

const LIVE_STAGES: KanbanStage[] = ["PASSPORT_QUOTE_PENDING", "DOCUMENTS_REQUIRED", "PAYMENT_PENDING", "REVIEW_PENDING"];

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

export default function OperationsKanbanPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4 font-body max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2 shrink-0">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Operations Kanban Pipeline</h1>
          <p className="text-[#486581] text-sm mt-1">Drag and drop live applications across all processing stages</p>
          <p className="text-xs text-[#627D98] mt-1">{isLoading ? "Loading live data..." : `${applications.length} applications loaded from the API`}</p>
        </div>
        <button onClick={() => void loadApplications()} className="inline-flex items-center gap-2 bg-[#009877] hover:bg-[#007B61] text-white px-4 py-2 rounded-[10px] font-heading font-semibold shadow-sm">
          <RotateCcw className="w-4 h-4" />
          REFRESH DATA
        </button>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-heading font-semibold text-[#102A43]">EVisa Dashboard</h2>
            <p className="text-xs text-[#627D98]">Live EVisa application summary</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/30">Dynamic API data</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Total Applications</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#009877]" />{evisaStats.total}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Pending</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><Clock3 className="w-4 h-4 text-[#B87333]" />{evisaStats.pending}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Approved</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#009877]" />{evisaStats.approved}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Rejected</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><XCircle className="w-4 h-4 text-[#B42318]" />{evisaStats.rejected}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Action Required</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><FileWarning className="w-4 h-4 text-[#B45309]" />{evisaStats.actionRequired}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3">
            <p className="text-xs text-[#627D98]">Reupload Pending Review</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><Clock3 className="w-4 h-4 text-[#0B69B7]" />{evisaStats.reuploadPendingReview}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">SLA Health</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${liveStats.breachedCases === 0 ? "text-[#009877]" : "text-[#B42318]"}`} /> {liveStats.breachedCases === 0 ? "Stable" : "Needs attention"}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">At Risk Cases</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><TimerReset className="w-4 h-4 text-[#B87333]" /> {liveStats.atRiskCases}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">Breached Cases</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#B42318]" /> {liveStats.breachedCases}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">Escalations</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#33A1FD]" /> {liveStats.escalations} open</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Open cases</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{liveStats.openCases}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Documents requested</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{liveStats.documentsRequested}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Live stages with cases</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{Object.values(liveStats.stageCounts).filter((count) => count > 0).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4 shadow-sm">
        <KanbanBoard />
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#102A43] font-heading font-semibold">SLA Monitoring Panel</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/30">Live</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {LIVE_STAGES.map((stage) => {
            const row = liveStats.stageRows.find((item) => item.stage === stage);
            const count = row?.count ?? 0;
            const progress = liveStats.openCases > 0 ? Math.min(100, Math.round((count / liveStats.openCases) * 100)) : 0;

            return (
              <div key={stage} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 text-[#334E68]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-medium">{STAGE_LABELS[stage]}</span>
                  <span className={count >= 5 ? "text-[#B42318] font-semibold" : count >= 2 ? "text-[#9C4F17] font-semibold" : "text-[#006F57] font-semibold"}>
                    {count >= 5 ? "At risk" : count >= 2 ? "Monitor" : "Healthy"}
                  </span>
                </div>
                <p className="text-xs text-[#627D98] mb-2">{count} live cases in this stage</p>
                <div className="h-1.5 rounded-full bg-[#F5F7FA]"><div className="h-1.5 rounded-full bg-[#009877]" style={{ width: `${progress}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#102A43] font-heading font-semibold">Recent case notes</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35">From live applications</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
          <div className="rounded-[12px] border border-[#D9E1EA] p-3 space-y-2 bg-[#F8FAFC]">
            {liveStats.liveNotes.length > 0 ? (
              liveStats.liveNotes.map((application) => (
                <p key={application.id} className="text-sm text-[#102A43]">
                  <span className="font-semibold">{application.reference_number}</span> {application.notes}
                </p>
              ))
            ) : (
              <p className="text-sm text-[#627D98]">No live case notes are available yet.</p>
            )}
            <div className="pt-2 border-t border-[#D9E1EA] flex flex-wrap gap-2">
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">Open case drawer</button>
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">Review docs</button>
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">Refresh queue</button>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] p-3 bg-white">
            <p className="text-xs text-[#627D98] mb-2">Queue signals</p>
            <ul className="space-y-1.5 text-xs text-[#486581]">
              <li>Open cases: {liveStats.openCases}</li>
              <li>Documents requested: {liveStats.documentsRequested}</li>
              <li>Breached cases: {liveStats.breachedCases}</li>
              <li>Escalations: {liveStats.escalations}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h3 className="text-sm font-heading font-semibold text-[#102A43]">Pipeline operations table</h3>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Reference</th>
                <th className="px-4 py-2.5 text-left">Customer</th>
                <th className="px-4 py-2.5 text-left">Stage</th>
                <th className="px-4 py-2.5 text-left">Document count</th>
                <th className="px-4 py-2.5 text-left">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-4 py-2.5">{application.reference_number}</td>
                  <td className="px-4 py-2.5">{application.customer_name || `Customer ${application.id}`}</td>
                  <td className="px-4 py-2.5">{normalizeStage(application.stage || application.current_stage)}</td>
                  <td className="px-4 py-2.5">{application.document_count ?? 0}</td>
                  <td className="px-4 py-2.5">{getAgeDays(application.created_at)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Live operations insight
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">{liveStats.breachedCases > 0 ? `${liveStats.breachedCases} cases are over the live SLA threshold and should be escalated before the next review cycle.` : `No live SLA breaches are currently recorded. Monitor ${liveStats.documentsRequested} document-driven cases and keep the review queue moving.`}</p>
      </details>
    </div>
  );
}
