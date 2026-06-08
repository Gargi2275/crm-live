"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw, Filter, ClipboardList, X } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { SlideOverPanel } from "@/components/console/kanban/SlideOverPanel";
import { useAdminCaseSlideOver } from "@/components/console/kanban/useAdminCaseSlideOver";
import {
  getAdminInternalMessagesFeed,
  hasMyActiveCasesAccess,
  listAdminTasks,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";

const PENDING_STATUSES = new Set(["new", "in_progress", "blocked"]);

type KpiFilterKey = "all" | "assigned" | "pending" | "completed";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const openedFromUrlRef = useRef(false);

  const effectiveKpi = kpiFilter === "all" ? null : kpiFilter;

  const hasFilters =
    effectiveKpi !== null ||
    dateFrom !== "" ||
    dateTo !== "" ||
    priorityFilter !== "all" ||
    taskTypeFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPriorityFilter("all");
    setTaskTypeFilter("all");
    setSearchQuery("");
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
    void openCaseByApplicationId(applicationId);
  }, [searchParams, isStaff, openCaseByApplicationId]);

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

  if (!isStaff) {
    return (
      <div className="space-y-4 font-body">
        <h1 className="text-2xl font-heading font-semibold text-[#102A43]">My Active Cases</h1>
        <p className="text-sm text-[#627D98]">This page is for operations managers and case staff with assigned tasks.</p>
        <Link href="/admin" className="text-sm font-semibold text-[#0B69B7] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 font-body min-h-[60vh]">
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
      <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4">
        <h2 className="text-base font-heading font-semibold text-[#102A43] mb-2">Internal Team Notes</h2>
        {internalMessages.length === 0 ? (
          <p className="text-sm text-[#627D98]">No notes addressed to you yet.</p>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-2">
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

      <div className="space-y-2">
        <div>
          <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#0B69B7]" />
            My Active Cases
          </h1>
          <p className="mt-1 text-sm text-[#627D98]">
            All your assigned tasks in one list. Click a KPI to filter, or refine with search and filters below.
          </p>
        </div>

        {/* Toolbar row — search + Filters toggle + Refresh on one line */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref or customer…"
            className="min-w-[160px] flex-1 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] placeholder:text-[#8A9BB0]"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-semibold transition-colors ${
              filtersOpen || hasFilters
                ? "border-[#0B69B7] bg-[#EFF7FF] text-[#0B69B7]"
                : "border-[#D9E1EA] bg-white text-[#102A43] hover:bg-[#F5F7FA]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters ? <span className="rounded-full bg-[#0B69B7] px-1.5 text-[10px] text-white">on</span> : null}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#102A43]">Filters</p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#486581] hover:text-[#102A43]"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block text-sm">
                <span className="font-medium text-[#334E68]">From date</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-[#102A43]"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#334E68]">To date</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-[#102A43]"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#334E68]">Priority</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-[#102A43] bg-white"
                >
                  <option value="all">All</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#334E68]">Task type</span>
                <select
                  value={taskTypeFilter}
                  onChange={(e) => setTaskTypeFilter(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-[#102A43] bg-white"
                >
                  <option value="all">All types</option>
                  {taskTypeOptions.map((taskType) => (
                    <option key={taskType} value={taskType}>
                      {taskType.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-3">
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
              className={`rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                (kpi.key === "all" && (kpiFilter === null || kpiFilter === "all")) || kpiFilter === kpi.key
                  ? "border-[#009877] bg-[#009877]/10 ring-1 ring-[#009877]/25"
                  : "border-[#D9E1EA] bg-[#F8FAFC] hover:border-[#33A1FD]/40"
              }`}
            >
              <p className="text-[11px] text-[#627D98]">{kpi.label}</p>
              <p className="text-xl font-heading font-semibold text-[#102A43] leading-tight">{kpi.value}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
        <p className="text-sm font-semibold text-[#102A43] mb-1">
          {loading ? "Loading…" : `${filteredTasks.length} task(s)`}
        </p>
        {hasFilters && !loading ? (
          <p className="text-xs text-[#627D98] mb-3">Filtered view — click a KPI again or clear filters to reset.</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-[#627D98]">Loading your cases…</p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-sm text-[#627D98]">No tasks match your filters.</p>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const status = taskStatus(task);
              const isCompleted = status === "completed";
              const isCancelled = status === "cancelled";
              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCase(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCase(task);
                    }
                  }}
                  className={`rounded-[12px] border p-4 cursor-pointer transition-colors hover:border-[#33A1FD]/50 ${
                    isCompleted
                      ? "border-[#009877]/30 bg-[#F0FBF8]"
                      : isCancelled
                        ? "border-[#D9E1EA] bg-[#F5F7FA] opacity-75"
                        : "border-[#D9E1EA] bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-heading font-semibold text-[#102A43]">
                        {task.application_reference || `Task #${task.id}`}
                      </p>
                      <p className="text-xs text-[#627D98] capitalize mt-0.5">
                        {task.task_type.replace(/_/g, " ")} · {task.customer_name || "Customer"}
                      </p>
                      <p className="text-xs text-[#627D98] mt-1">
                        Deadline: {formatDateTime(task.deadline)}
                        {isCompleted && task.completed_at ? (
                          <span className="ml-2">· Completed: {formatDateTime(task.completed_at)}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-2.5 py-1 uppercase text-[#486581]">
                        {task.status}
                      </span>
                      <span className="rounded-full bg-[#B87333]/12 px-2.5 py-1 uppercase text-[#9C4F17]">
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCase(task);
                      }}
                      className="text-xs rounded-full border border-[#33A1FD]/35 bg-[#33A1FD]/12 px-3 py-1.5 font-semibold text-[#0B69B7]"
                    >
                      Open case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
