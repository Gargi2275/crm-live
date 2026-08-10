"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  KanbanSquare,
  PauseCircle,
  RefreshCw,
  Sparkles,
  UserCog,
} from "lucide-react";
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
  listOwnStaffLeave,
  peerReassignAdminTask,
  staffIdsMatch,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";
import { WorkloadCalendarTab } from "@/components/console/workload/WorkloadCalendarTab";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-sm text-[#102A43] bg-white";

const PENDING_STATUSES = new Set(["new", "in_progress", "blocked"]);

type KpiFilterKey = "overdue" | "today" | "soon" | "waiting" | "pending" | "completed";
type CasesPageTab = "cases" | "pipeline" | "workload";
type UrgencyKey = "overdue" | "today" | "soon" | "later" | "waiting" | "done";

const CASES_PAGE_TABS: Array<{ id: CasesPageTab; label: string; icon: typeof ClipboardList }> = [
  { id: "cases", label: "My cases", icon: ClipboardList },
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { id: "workload", label: "Workload", icon: UserCog },
];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

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

function formatShortDate(value?: string | null) {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No deadline";
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function taskStatus(task: AdminTaskItem) {
  return String(task.status || "").toLowerCase();
}

function isPendingTask(task: AdminTaskItem) {
  return PENDING_STATUSES.has(taskStatus(task));
}

function formatTaskAction(task: AdminTaskItem) {
  const raw = String(task.task_type || "").trim();
  if (!raw) return "Review case";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

type DeadlineInfo = {
  ms: number;
  daysFromToday: number | null;
  label: string;
  shortLabel: string;
  tone: string;
  urgency: Exclude<UrgencyKey, "waiting" | "done"> | "none";
};

function getDeadlineInfo(deadline?: string | null): DeadlineInfo {
  if (!deadline) {
    return {
      ms: Number.POSITIVE_INFINITY,
      daysFromToday: null,
      label: "No deadline set",
      shortLabel: "No deadline",
      tone: "border-[#D9E1EA] bg-[#F5F7FA] text-[#627D98]",
      urgency: "none",
    };
  }
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return {
      ms: Number.POSITIVE_INFINITY,
      daysFromToday: null,
      label: "No deadline set",
      shortLabel: "No deadline",
      tone: "border-[#D9E1EA] bg-[#F5F7FA] text-[#627D98]",
      urgency: "none",
    };
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDeadline = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const daysFromToday = Math.round((startDeadline - startToday) / 86400000);

  if (daysFromToday < 0) {
    const days = Math.abs(daysFromToday);
    return {
      ms: parsed.getTime(),
      daysFromToday,
      label: days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`,
      shortLabel: days === 1 ? "1d overdue" : `${days}d overdue`,
      tone: "border-[#F1A7A0] bg-[#FDECEC] text-[#B42318]",
      urgency: "overdue",
    };
  }
  if (daysFromToday === 0) {
    return {
      ms: parsed.getTime(),
      daysFromToday,
      label: "Due today",
      shortLabel: "Due today",
      tone: "border-[#F4D89A] bg-[#FFF8E8] text-[#8D5E12]",
      urgency: "today",
    };
  }
  if (daysFromToday <= 3) {
    return {
      ms: parsed.getTime(),
      daysFromToday,
      label: daysFromToday === 1 ? "Due tomorrow" : `Due in ${daysFromToday} days`,
      shortLabel: daysFromToday === 1 ? "Tomorrow" : `${daysFromToday}d left`,
      tone: "border-[#FCD34D]/70 bg-[#FEF9C3]/70 text-[#854D0E]",
      urgency: "soon",
    };
  }
  return {
    ms: parsed.getTime(),
    daysFromToday,
    label: `Due ${formatShortDate(deadline)}`,
    shortLabel: formatShortDate(deadline),
    tone: "border-[#D9E1EA] bg-white text-[#486581]",
    urgency: "later",
  };
}

function getQueueBucket(task: AdminTaskItem): UrgencyKey {
  const status = taskStatus(task);
  if (status === "completed" || status === "cancelled") return "done";
  if (status === "blocked") return "waiting";
  const deadline = getDeadlineInfo(task.deadline);
  if (deadline.urgency === "overdue") return "overdue";
  if (deadline.urgency === "today") return "today";
  if (deadline.urgency === "soon") return "soon";
  return "later";
}

function sortQueue(a: AdminTaskItem, b: AdminTaskItem) {
  const bucketOrder: Record<UrgencyKey, number> = {
    overdue: 0,
    today: 1,
    soon: 2,
    later: 3,
    waiting: 4,
    done: 5,
  };
  const ba = getQueueBucket(a);
  const bb = getQueueBucket(b);
  if (bucketOrder[ba] !== bucketOrder[bb]) return bucketOrder[ba] - bucketOrder[bb];

  const pa = PRIORITY_RANK[String(a.priority || "").toLowerCase()] ?? 9;
  const pb = PRIORITY_RANK[String(b.priority || "").toLowerCase()] ?? 9;
  if (pa !== pb) return pa - pb;

  return getDeadlineInfo(a.deadline).ms - getDeadlineInfo(b.deadline).ms;
}

const SECTION_META: Record<
  UrgencyKey,
  { title: string; icon: typeof AlertTriangle }
> = {
  overdue: {
    title: "Overdue",
    icon: AlertTriangle,
  },
  today: {
    title: "Due today",
    icon: CalendarClock,
  },
  soon: {
    title: "Due soon",
    icon: Clock3,
  },
  later: {
    title: "Upcoming",
    icon: Sparkles,
  },
  waiting: {
    title: "Waiting",
    icon: PauseCircle,
  },
  done: {
    title: "Done",
    icon: CheckCircle2,
  },
};

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
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const [pageTab, setPageTab] = useState<CasesPageTab>("cases");
  const [peerColleagues, setPeerColleagues] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [onLeaveToday, setOnLeaveToday] = useState(false);
  const [taskSelections, setTaskSelections] = useState<Record<number, string>>({});
  const [reassignLoadingId, setReassignLoadingId] = useState<number | null>(null);
  const [showLeaveCalendar, setShowLeaveCalendar] = useState(false);
  const openedFromUrlRef = useRef(false);

  const hasFilters =
    kpiFilter !== "pending" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    priorityFilter !== "all" ||
    taskTypeFilter !== "all" ||
    searchQuery.trim() !== "";

  const activeFilterCount =
    (kpiFilter !== "pending" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (taskTypeFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPriorityFilter("all");
    setTaskTypeFilter("all");
    setKpiFilter("pending");
    setSearchQuery("");
  };

  const load = async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    try {
      const now = new Date();
      const [payload, messageFeed, ownLeave] = await Promise.all([
        listAdminTasks({ limit: 500, assignedStaffId: adminUser.id }),
        getAdminInternalMessagesFeed(30),
        listOwnStaffLeave({ month: now.getMonth() + 1, year: now.getFullYear() }).catch(() => null),
      ]);
      // Strict isolation: only tasks currently assigned to this staffer.
      const ownTasks = payload.filter((task) => staffIdsMatch(task.assigned_staff, adminUser.id));
      setTasks(ownTasks);
      setInternalMessages(messageFeed);
      setPeerColleagues(ownLeave?.colleagues || []);
      setOnLeaveToday(Boolean(ownLeave?.on_leave_today));
      setTaskSelections(
        Object.fromEntries(ownTasks.map((task) => [task.id, ""])),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your cases.");
    } finally {
      setLoading(false);
    }
  };

  const handlePeerReassign = async (task: AdminTaskItem) => {
    const selectedStaffId = taskSelections[task.id];
    if (!selectedStaffId) {
      toast.error("Select a colleague first.");
      return;
    }
    try {
      setReassignLoadingId(task.id);
      const result = await peerReassignAdminTask(task.id, Number(selectedStaffId));
      if ("pending_approval" in result && result.pending_approval) {
        toast.success(result.message || "Reassign sent for admin approval (you are on leave).");
        return;
      }
      // Task left this staffer's queue — drop it from My Cases.
      setTasks((current) => current.filter((row) => row.id !== task.id));
      setTaskSelections((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      toast.success("Task reassigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reassign task.");
    } finally {
      setReassignLoadingId(null);
    }
  };

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser]);

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let soon = 0;
    let waiting = 0;
    let pending = 0;
    let completed = 0;
    for (const task of tasks) {
      const bucket = getQueueBucket(task);
      if (bucket === "done") {
        if (taskStatus(task) === "completed") completed += 1;
        continue;
      }
      pending += 1;
      if (bucket === "overdue") overdue += 1;
      else if (bucket === "today") today += 1;
      else if (bucket === "soon") soon += 1;
      else if (bucket === "waiting") waiting += 1;
    }
    return { overdue, today, soon, waiting, pending, completed };
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

    if (kpiFilter === "pending") {
      list = list.filter((t) => isPendingTask(t));
    } else if (kpiFilter === "completed") {
      list = list.filter((t) => taskStatus(t) === "completed");
    } else if (kpiFilter === "overdue") {
      list = list.filter((t) => getQueueBucket(t) === "overdue");
    } else if (kpiFilter === "today") {
      list = list.filter((t) => getQueueBucket(t) === "today");
    } else if (kpiFilter === "soon") {
      list = list.filter((t) => getQueueBucket(t) === "soon");
    } else if (kpiFilter === "waiting") {
      list = list.filter((t) => getQueueBucket(t) === "waiting");
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
          String(t.service_name || "").toLowerCase().includes(query) ||
          String(t.task_type || "").toLowerCase().includes(query),
      );
    }

    if (dateFrom || dateTo) {
      const fromMs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
      const toMs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
      const useCompletedDate = kpiFilter === "completed";
      list = list.filter((t) => {
        const ts =
          taskTimestamp(t, useCompletedDate ? "completed" : "updated") || taskTimestamp(t, "created");
        if (!ts) return false;
        if (fromMs != null && ts < fromMs) return false;
        if (toMs != null && ts > toMs) return false;
        return true;
      });
    }

    list.sort(sortQueue);
    return list;
  }, [tasks, kpiFilter, dateFrom, dateTo, priorityFilter, taskTypeFilter, searchQuery]);

  const groupedTasks = useMemo(() => {
    const groups: Record<UrgencyKey, AdminTaskItem[]> = {
      overdue: [],
      today: [],
      soon: [],
      later: [],
      waiting: [],
      done: [],
    };
    for (const task of filteredTasks) {
      groups[getQueueBucket(task)].push(task);
    }
    return groups;
  }, [filteredTasks]);

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

  const kpiButtons: Array<{
    key: KpiFilterKey;
    label: string;
    value: number;
    tone: string;
    activeTone: string;
  }> = [
    {
      key: "overdue",
      label: "Overdue",
      value: counts.overdue,
      tone: "text-[#B42318]",
      activeTone: "border-[#B42318] bg-[#FDECEC] ring-[#B42318]/20",
    },
    {
      key: "today",
      label: "Due today",
      value: counts.today,
      tone: "text-[#8D5E12]",
      activeTone: "border-[#D97706] bg-[#FFF8E8] ring-[#D97706]/20",
    },
    {
      key: "soon",
      label: "Due soon",
      value: counts.soon,
      tone: "text-[#854D0E]",
      activeTone: "border-[#CA8A04] bg-[#FEF9C3]/60 ring-[#CA8A04]/20",
    },
    {
      key: "waiting",
      label: "Waiting",
      value: counts.waiting,
      tone: "text-[#486581]",
      activeTone: "border-[#627D98] bg-[#F5F7FA] ring-[#627D98]/20",
    },
    {
      key: "pending",
      label: "Open queue",
      value: counts.pending,
      tone: "text-[#0B69B7]",
      activeTone: "border-[#0B69B7] bg-[#EEF4FF] ring-[#0B69B7]/20",
    },
    {
      key: "completed",
      label: "Done",
      value: counts.completed,
      tone: "text-[#006F57]",
      activeTone: "border-[#009877] bg-[#009877]/10 ring-[#009877]/20",
    },
  ];

  useSetAdminPageChrome(
    isStaff
      ? {
          title: "My Active Cases",
          subtitle:
            pageTab === "pipeline"
              ? "Pipeline"
              : pageTab === "workload"
                ? "Workload"
                : "Your assigned cases",
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
                : counts.overdue > 0
                  ? `${counts.overdue} overdue · ${filteredTasks.length} shown`
                  : `${filteredTasks.length} in queue`
              : CASES_PAGE_TABS.find((t) => t.id === pageTab)?.label,
          syncKey: `${pageTab}|${searchQuery}|${dateFrom}|${dateTo}|${priorityFilter}|${taskTypeFilter}|${kpiFilter}|${loading}|${filteredTasks.length}|${taskTypeOptions.join(",")}|${counts.overdue}`,
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

  const sectionOrder: UrgencyKey[] =
    kpiFilter === "completed"
      ? ["done"]
      : kpiFilter === "overdue"
        ? ["overdue"]
        : kpiFilter === "today"
          ? ["today"]
          : kpiFilter === "soon"
            ? ["soon"]
            : kpiFilter === "waiting"
              ? ["waiting"]
              : ["overdue", "today", "soon", "later", "waiting"];

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

      <div className="flex flex-wrap items-center gap-1 rounded-[12px] border border-[#D9E1EA] bg-white p-1 shadow-[0_4px_14px_rgba(16,42,67,0.04)]">
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
      </div>

      {pageTab === "pipeline" ? <KanbanView embedded /> : null}
      {pageTab === "workload" ? <WorkloadView embedded /> : null}

      {pageTab === "cases" ? (
        <>
          {/* Compact due tabs so Overdue / Today / Soon are always visible */}
          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            {kpiButtons.map((kpi) => {
              const active = kpiFilter === kpi.key;
              return (
                <button
                  key={kpi.key}
                  type="button"
                  onClick={() => setKpiFilter(kpi.key)}
                  className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? `ring-1 ${kpi.activeTone}`
                      : "text-[#486581] hover:bg-[#F5F7FA]"
                  }`}
                >
                  <span className={active ? kpi.tone : "text-[#627D98]"}>{kpi.label}</span>
                  <span className={`tabular-nums ${active ? kpi.tone : "text-[#829AB1]"}`}>{kpi.value}</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white">
            <button
              type="button"
              onClick={() => {
                setShowLeaveCalendar((open) => {
                  const next = !open;
                  if (open && !next) void load();
                  return next;
                });
              }}
              className="flex w-full items-center justify-between gap-2 border-b border-[#EEF2F6] px-3 py-2 text-left"
            >
              <span className="inline-flex items-center gap-2 text-xs font-medium text-[#486581]">
                <CalendarDays className="h-3.5 w-3.5" />
                Leave calendar
              </span>
              <span className="text-[11px] text-[#829AB1]">{showLeaveCalendar ? "Hide" : "Show"}</span>
            </button>
            {showLeaveCalendar ? (
              <div className="border-b border-[#EEF2F6] px-3 pb-3 pt-2">
                <WorkloadCalendarTab canManageOthers={false} selfStaffId={adminUser?.id} />
              </div>
            ) : null}

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-[#627D98]">Loading…</div>
            ) : filteredTasks.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-[#102A43]">No cases here</p>
                <p className="mt-1 text-sm text-[#627D98]">
                  {hasFilters ? "Clear filters to see more." : "You’re all caught up."}
                </p>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 inline-flex rounded-lg border border-[#D9E1EA] px-3 py-1.5 text-sm font-semibold text-[#0B69B7]"
                  >
                    Reset filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-[1] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627D98]">
                    <tr className="border-b border-[#E5EAF0]">
                      <th className="px-3 py-2 font-semibold">Due</th>
                      <th className="px-3 py-2 font-semibold">Case</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Service</th>
                      <th className="px-3 py-2 font-semibold">Task</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionOrder.map((sectionKey) => {
                      const rows = groupedTasks[sectionKey];
                      if (!rows.length) return null;
                      const meta = SECTION_META[sectionKey];
                      const Icon = meta.icon;
                      const sectionTone =
                        sectionKey === "overdue"
                          ? "bg-[#FEF3F2] text-[#B42318]"
                          : sectionKey === "today"
                            ? "bg-[#FFF8E8] text-[#8D5E12]"
                            : sectionKey === "soon"
                              ? "bg-[#FEF9C3]/70 text-[#854D0E]"
                              : sectionKey === "done"
                                ? "bg-[#E6F7F2] text-[#006F57]"
                                : "bg-[#F5F7FA] text-[#486581]";
                      return (
                        <Fragment key={sectionKey}>
                          <tr className={`border-y border-[#E5EAF0] ${sectionTone}`}>
                            <td colSpan={7} className="px-3 py-1.5">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <Icon className="h-3.5 w-3.5" />
                                {meta.title}
                                <span className="rounded-full bg-white/70 px-1.5 py-0.5 tabular-nums">
                                  {rows.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setKpiFilter(
                                      sectionKey === "later"
                                        ? "pending"
                                        : sectionKey === "done"
                                          ? "completed"
                                          : (sectionKey as KpiFilterKey),
                                    )
                                  }
                                  className="ml-auto text-[11px] font-semibold underline-offset-2 hover:underline"
                                >
                                  Show only
                                </button>
                              </div>
                            </td>
                          </tr>
                          {rows.map((task) => {
                            const status = taskStatus(task);
                            const deadline = getDeadlineInfo(task.deadline);
                            const isDone = status === "completed" || status === "cancelled";
                            const isBusy = reassignLoadingId === task.id;
                            const selectedStaffId = taskSelections[task.id] || "";
                            return (
                              <tr
                                key={task.id}
                                className={`border-b border-[#EEF2F6] hover:bg-[#F8FAFC] ${
                                  isDone ? "opacity-70" : ""
                                }`}
                              >
                                <td className="whitespace-nowrap px-3 py-1.5">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${deadline.tone}`}
                                  >
                                    {deadline.shortLabel}
                                  </span>
                                </td>
                                <td className="max-w-[140px] truncate px-3 py-1.5 font-medium text-[#0B69B7]">
                                  <button
                                    type="button"
                                    onClick={() => openCase(task)}
                                    className="truncate hover:underline"
                                    title={task.application_reference || `Task #${task.id}`}
                                  >
                                    {task.application_reference || `Task #${task.id}`}
                                  </button>
                                </td>
                                <td
                                  className="max-w-[140px] truncate px-3 py-1.5 text-[#102A43]"
                                  title={task.customer_name || ""}
                                >
                                  {task.customer_name || "—"}
                                </td>
                                <td
                                  className="max-w-[160px] truncate px-3 py-1.5 text-[#486581]"
                                  title={task.service_name || ""}
                                >
                                  {task.service_name || "—"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[#102A43]">
                                  {formatTaskAction(task)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-1.5 capitalize text-[#627D98]">
                                  {task.priority || "medium"}
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {!isDone && onLeaveToday ? (
                                      <>
                                        <select
                                          value={selectedStaffId}
                                          onChange={(e) =>
                                            setTaskSelections((prev) => ({
                                              ...prev,
                                              [task.id]: e.target.value,
                                            }))
                                          }
                                          className="max-w-[110px] rounded-[6px] border border-[#D9E1EA] px-1.5 py-1 text-[11px]"
                                        >
                                          <option value="">Colleague…</option>
                                          {peerColleagues.map((staff) => (
                                            <option key={staff.id} value={staff.id}>
                                              {staff.name}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          disabled={isBusy || !selectedStaffId}
                                          onClick={() => void handlePeerReassign(task)}
                                          className="rounded-[6px] bg-[#009877] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                                        >
                                          {isBusy ? "…" : "Reassign"}
                                        </button>
                                      </>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => openCase(task)}
                                      className="inline-flex items-center gap-0.5 rounded-[6px] border border-[#D9E1EA] px-2 py-1 text-[11px] font-semibold text-[#0B69B7] hover:bg-white"
                                    >
                                      Open
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {internalMessages.length > 0 ? (
            <details className="rounded-[12px] border border-[#D9E1EA] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-[#486581]">
                <span>
                  Team notes <span className="text-[#829AB1]">({internalMessages.length})</span>
                </span>
                <span className="font-normal text-[#829AB1]">Expand</span>
              </summary>
              <div className="max-h-36 space-y-1.5 overflow-y-auto border-t border-[#EEF2F6] px-3 py-2">
                {internalMessages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-[#EEF2F6] bg-[#F8FAFC] px-2.5 py-1.5">
                    <p className="text-xs font-semibold text-[#102A43]">
                      {message.application_reference}
                      {message.customer_name ? ` · ${message.customer_name}` : ""}
                    </p>
                    <p className="text-[11px] text-[#627D98]">
                      {message.sender_name} → {message.recipient_name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#334E68]">{message.message_text}</p>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
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
