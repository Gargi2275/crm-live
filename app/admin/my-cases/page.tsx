"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw, ClipboardList, KanbanSquare, UserCog } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { SlideOverPanel } from "@/components/console/kanban/SlideOverPanel";
import { useAdminCaseSlideOver } from "@/components/console/kanban/useAdminCaseSlideOver";
import { KanbanView } from "@/components/console/kanban/KanbanView";
import { WorkloadView } from "@/components/console/workload/WorkloadView";
import { subscribeOpenAdminCase } from "@/lib/admin-open-case";
import {
  getAdminInternalMessagesFeed,
  hasMyActiveCasesAccess,
  listAdminTasks,
  formatTaskStatusLabel,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-sm text-[#102A43] bg-white";

const PENDING_STATUSES = new Set(["new", "in_progress", "blocked"]);

type KpiFilterKey = "all" | "assigned" | "pending" | "completed";
type CasesPageTab = "cases" | "pipeline" | "workload";

const CASES_PAGE_TABS: Array<{ id: CasesPageTab; label: string; icon: typeof ClipboardList }> = [
  { id: "cases", label: "My cases", icon: ClipboardList },
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { id: "workload", label: "Workload", icon: UserCog },
];

function taskTimestamp(task: AdminTaskItem, field: "completed" | "updated" | "created"): number {
  const raw =
    field === "completed"
      ? task.completed_at
      : field === "updated"
        ? task.updated_at
        : task.created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function taskStatus(task: AdminTaskItem) {
  return String(task.status || "").toLowerCase();
}

function MyActiveCasesContent() {
  const searchParams = useSearchParams();
  const { adminUser } = useAdminAuth();
  const {
    selectedCase,
    selectedCaseDetails,
    selectedCaseDocuments,
    detailsLoading,
    detailsError,
    documentsLoading,
    documentsError,
    openCaseByApplicationId,
    closeCase,
    handleStageResolved,
    isOpen,
  } = useAdminCaseSlideOver();
  const isStaff = hasMyActiveCasesAccess(adminUser?.role);
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const [pageTab, setPageTab] = useState<CasesPageTab>("cases");
  const openedFromUrlRef = useRef(false);

  const effectiveKpi = kpiFilter === "all" ? null : kpiFilter;

  const hasFilters =
    effectiveKpi !== null ||
    dateFrom !== "" ||
    dateTo !== "" ||
    priorityFilter !== "all" ||
    taskTypeFilter !== "all" ||
    searchQuery.trim() !== "";

  const activeFilterCount =
    (effectiveKpi !== null ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (taskTypeFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPriorityFilter("all");
    setTaskTypeFilter("all");
    setKpiFilter(null);
  };

  const load = async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    try {
      const [payload, messageFeed] = await Promise.all([
        listAdminTasks({ limit: 500, assignedStaffId: adminUser.id }),
        getAdminInternalMessagesFeed(30),
      ]);
      setTasks(payload);
      setInternalMessages(messageFeed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser]);

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => PENDING_STATUSES.has(taskStatus(t))).length;
    const completed = tasks.filter((t) => taskStatus(t) === "completed").length;
    return { assigned: tasks.length, pending, completed, total: tasks.length };
  }, [tasks]);

  const taskTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const task of tasks) {
      if (task.task_type) types.add(String(task.task_type).toLowerCase());
    }
    return Array.from(types).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (effectiveKpi === "pending") {
      list = list.filter((t) => PENDING_STATUSES.has(taskStatus(t)));
    } else if (effectiveKpi === "completed") {
      list = list.filter((t) => taskStatus(t) === "completed");
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => String(t.priority || "").toLowerCase() === priorityFilter);
    }

    if (taskTypeFilter !== "all") {
      list = list.filter((t) => String(t.task_type || "").toLowerCase() === taskTypeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.application_reference || "").toLowerCase().includes(query) ||
          String(t.customer_name || "").toLowerCase().includes(query) ||
          String(t.task_type || "").toLowerCase().includes(query),
      );
    }

    if (dateFrom || dateTo) {
      const fromMs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
      const toMs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
      const useCompletedDate = effectiveKpi === "completed";
      list = list.filter((t) => {
        const ts =
          taskTimestamp(t, useCompletedDate ? "completed" : "updated") || taskTimestamp(t, "created");
        if (!ts) return false;
        if (fromMs != null && ts < fromMs) return false;
        if (toMs != null && ts > toMs) return false;
        return true;
      });
    }

    const deadlineMs = (t: AdminTaskItem) => {
      if (!t.deadline) return Number.POSITIVE_INFINITY;
      const d = new Date(t.deadline).getTime();
      return Number.isNaN(d) ? Number.POSITIVE_INFINITY : d;
    };

    const isPendingSort = effectiveKpi === "pending" || effectiveKpi === null;
    if (isPendingSort) {
      list.sort((a, b) => {
        const pendingA = PENDING_STATUSES.has(taskStatus(a)) ? 0 : 1;
        const pendingB = PENDING_STATUSES.has(taskStatus(b)) ? 0 : 1;
        if (pendingA !== pendingB) return pendingA - pendingB;
        return deadlineMs(a) - deadlineMs(b);
      });
    } else {
      list.sort((a, b) => {
        const bt = taskTimestamp(b, "completed") || taskTimestamp(b, "updated");
        const at = taskTimestamp(a, "completed") || taskTimestamp(a, "updated");
        return bt - at;
      });
    }

    return list;
  }, [tasks, effectiveKpi, dateFrom, dateTo, priorityFilter, taskTypeFilter, searchQuery]);

  const openCase = (task: AdminTaskItem) => {
    if (!task.application) {
      toast.error("Application not found for this task.");
      return;
    }
    void openCaseByApplicationId(task.application, {
      reference: task.application_reference,
      customer: task.customer_name,
    });
  };

  useEffect(() => {
    if (openedFromUrlRef.current) return;
    const applicationId = Number(searchParams.get("applicationId") || 0);
    if (!applicationId || !isStaff) return;
    openedFromUrlRef.current = true;
    setPageTab("cases");
    void openCaseByApplicationId(applicationId);
  }, [searchParams, isStaff, openCaseByApplicationId]);

  useEffect(() => {
    if (!isStaff) return;
    return subscribeOpenAdminCase((detail) => {
      setPageTab("cases");
      void openCaseByApplicationId(detail.applicationId, {
        reference: detail.reference,
        customer: detail.customer,
      });
    });
  }, [isStaff, openCaseByApplicationId]);

  const handleStageResolvedWithReload = async (nextStage: Parameters<typeof handleStageResolved>[0]) => {
    await handleStageResolved(nextStage);
    await load();
  };

  const kpiButtons: { key: KpiFilterKey; label: string; value: number }[] = [
    { key: "all", label: "All", value: counts.total },
    { key: "assigned", label: "Assigned", value: counts.assigned },
    { key: "pending", label: "Pending", value: counts.pending },
    { key: "completed", label: "Done", value: counts.completed },
  ];

  useSetAdminPageChrome(
    isStaff
      ? {
          title: "My Active Cases",
          subtitle:
            pageTab === "pipeline"
              ? "Pipeline opens here — no redirect"
              : pageTab === "workload"
                ? "Workload opens here — no redirect"
                : "Work your queue in the drawer",
          icon: ClipboardList,
          search:
            pageTab === "cases"
              ? {
                  value: searchQuery,
                  onChange: setSearchQuery,
                  placeholder: "Search ref or customer…",
                }
              : undefined,
          activeFilterCount: pageTab === "cases" ? activeFilterCount : 0,
          onClearFilters: pageTab === "cases" ? resetFilters : undefined,
          meta:
            pageTab === "cases"
              ? loading
                ? "Loading…"
                : `${filteredTasks.length} task(s)`
              : CASES_PAGE_TABS.find((t) => t.id === pageTab)?.label,
          syncKey: `${pageTab}|${searchQuery}|${dateFrom}|${dateTo}|${priorityFilter}|${taskTypeFilter}|${kpiFilter}|${loading}|${filteredTasks.length}|${taskTypeOptions.join(",")}`,
          actions:
            pageTab === "cases" ? (
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            ) : undefined,
          filtersContent:
            pageTab === "cases" ? (
              <>
                <label className="block text-sm">
                  <span className="font-medium text-[#334E68] text-xs">From date</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={filterFieldClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#334E68] text-xs">To date</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={filterFieldClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#334E68] text-xs">Priority</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className={filterFieldClass}
                  >
                    <option value="all">All</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#334E68] text-xs">Task type</span>
                  <select
                    value={taskTypeFilter}
                    onChange={(e) => setTaskTypeFilter(e.target.value)}
                    className={filterFieldClass}
                  >
                    <option value="all">All types</option>
                    {taskTypeOptions.map((taskType) => (
                      <option key={taskType} value={taskType}>
                        {taskType.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : undefined,
        }
      : { title: "My Active Cases", icon: ClipboardList },
  );

  if (!isStaff) {
    return (
      <div className="space-y-4 font-body">
        <p className="text-sm text-[#627D98]">This page is for operations managers and case staff with assigned tasks.</p>
        <Link href="/admin" className="text-sm font-semibold text-[#0B69B7] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative space-y-3 font-body min-h-[60vh]">
      <SlideOverPanel
        isOpen={isOpen}
        onClose={closeCase}
        caseData={selectedCase}
        details={selectedCaseDetails}
        documents={selectedCaseDocuments}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        documentsLoading={documentsLoading}
        documentsError={documentsError}
        onStageResolved={handleStageResolvedWithReload}
      />

      <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
        {CASES_PAGE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pageTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPageTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[#009877] text-white shadow-sm"
                  : "text-[#486581] hover:bg-[#F5F7FA] hover:text-[#102A43]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
        <p className="ml-auto hidden px-2 text-[11px] text-[#829AB1] sm:block">
          Tabs open here — no page redirect
        </p>
      </div>

      {pageTab === "pipeline" ? <KanbanView embedded /> : null}
      {pageTab === "workload" ? <WorkloadView embedded /> : null}

      {pageTab === "cases" ? (
        <>
      <details className="bg-white rounded-[10px] border border-[#D9E1EA] group">
        <summary className="list-none cursor-pointer px-3 py-2 text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Internal team notes
          <span className="text-xs font-normal text-[#627D98]">
            {internalMessages.length} · expand
          </span>
        </summary>
        <div className="px-3 pb-3">
          {internalMessages.length === 0 ? (
            <p className="text-sm text-[#627D98]">No notes addressed to you yet.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {internalMessages.map((message) => (
                <div key={message.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-sm font-semibold text-[#102A43]">
                    {message.application_reference}
                    {message.customer_name ? ` · ${message.customer_name}` : ""}
                  </p>
                  <p className="text-xs text-[#486581]">
                    {message.sender_name} → {message.recipient_name} ·{" "}
                    {message.created_at ? formatDateTime(message.created_at) : "—"}
                  </p>
                  <p className="text-sm text-[#334E68] mt-1 whitespace-pre-wrap">{message.message_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpiButtons.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => {
              setKpiFilter((current) => {
                if (kpi.key === "all") return current === "all" || current === null ? null : "all";
                return current === kpi.key ? null : kpi.key;
              });
            }}
            className={`rounded-[8px] border px-3 py-2 text-left transition-colors ${
              (kpi.key === "all" && (kpiFilter === null || kpiFilter === "all")) || kpiFilter === kpi.key
                ? "border-[#009877] bg-[#009877]/10 ring-1 ring-[#009877]/25"
                : "border-[#D9E1EA] bg-white hover:border-[#33A1FD]/40"
            }`}
          >
            <p className="text-[11px] text-[#627D98]">{kpi.label}</p>
            <p className="text-lg font-heading font-semibold text-[#102A43] leading-tight">{kpi.value}</p>
          </button>
        ))}
      </div>

      <div className="rounded-[10px] border border-[#D9E1EA] bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5EAF0] flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#102A43]">
            {loading ? "Loading…" : `${filteredTasks.length} task(s)`}
          </p>
          {hasFilters && !loading ? (
            <p className="text-xs text-[#627D98]">Filtered view</p>
          ) : null}
        </div>
        {loading ? (
          <p className="px-3 py-4 text-sm text-[#627D98]">Loading your cases…</p>
        ) : filteredTasks.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[#627D98]">No tasks match your filters.</p>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {filteredTasks.map((task) => {
              const status = taskStatus(task);
              const isCompleted = status === "completed";
              const isCancelled = status === "cancelled";
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openCase(task)}
                  className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-[#F8FCFF] ${
                    isCompleted
                      ? "bg-[#F0FBF8]/60"
                      : isCancelled
                        ? "bg-[#F5F7FA] opacity-75"
                        : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-heading font-semibold text-[#102A43]">
                        {task.application_reference || `Task #${task.id}`}
                        <span className="ml-2 font-normal text-xs text-[#627D98] capitalize">
                          {task.task_type.replace(/_/g, " ")} · {task.customer_name || "Customer"}
                        </span>
                      </p>
                      <p className="text-xs text-[#627D98] mt-0.5">
                        Deadline: {formatDateTime(task.deadline)}
                        {isCompleted && task.completed_at ? (
                          <span className="ml-2">· Completed: {formatDateTime(task.completed_at)}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-2 py-0.5 text-[#486581]">
                        {formatTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-full bg-[#B87333]/12 px-2 py-0.5 uppercase text-[#9C4F17]">
                        {task.priority}
                      </span>
                      <span className="rounded-full border border-[#33A1FD]/35 bg-[#33A1FD]/12 px-2.5 py-0.5 font-semibold text-[#0B69B7]">
                        Open
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
        </>
      ) : null}
    </div>
  );
}

export default function MyActiveCasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#627D98] font-body">
          Loading your cases…
        </div>
      }
    >
      <MyActiveCasesContent />
    </Suspense>
  );
}
