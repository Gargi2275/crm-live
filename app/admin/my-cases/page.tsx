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
  ChevronDown,
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
  getTaskEffectiveStatus,
  hasMyActiveCasesAccess,
  listAdminTasks,
  listOwnStaffLeave,
  peerReassignAdminTask,
  staffIdsMatch,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";
import { WorkloadCalendarTab } from "@/components/console/workload/WorkloadCalendarTab";
import { ExpressBadge } from "@/components/console/ExpressBadge";
import { compareExpressFirst, taskIsExpress } from "@/lib/kanban";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-sm text-[#102A43] bg-white";

const PENDING_STATUSES = new Set(["new", "in_progress", "blocked"]);

type KpiFilterKey = "all" | "overdue" | "today" | "soon" | "waiting" | "pending" | "completed" | "express";
type ServiceFilterKey = "all" | "express" | string;
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
  return getTaskEffectiveStatus(task);
}

function isPendingTask(task: AdminTaskItem) {
  return PENDING_STATUSES.has(taskStatus(task));
}

function caseKey(task: AdminTaskItem): string {
  if (task.application != null && task.application !== "") return `id:${task.application}`;
  const ref = String(task.application_reference || "").trim();
  if (ref) return `ref:${ref}`;
  return `task:${task.id}`;
}

/** Rank open work so actionable staff tasks beat "waiting for customer". */
function openTaskRank(task: AdminTaskItem): number {
  const type = String(task.task_type || "").toLowerCase();
  const status = taskStatus(task);
  if (status === "blocked") return 50;
  if (type === "document_review" || type === "audit") return 0;
  if (type === "form_filling") return 1;
  if (type === "form_review") return 2;
  if (type === "submission") return 3;
  if (type === "delivery_follow_up") return 4;
  if (type === "other") return 40;
  return 10;
}

/**
 * One row per case: prefer the active open task; only show a completed task
 * when the case has no open work left (prevents Waiting + Done duplicates).
 */
function pickPrimaryTaskForCase(caseTasks: AdminTaskItem[]): AdminTaskItem {
  const open = caseTasks.filter((task) => isPendingTask(task));
  if (open.length) {
    return [...open].sort((a, b) => {
      const rankDiff = openTaskRank(a) - openTaskRank(b);
      if (rankDiff !== 0) return rankDiff;
      return sortQueue(a, b);
    })[0];
  }
  return [...caseTasks].sort(
    (a, b) =>
      taskTimestamp(b, "completed") - taskTimestamp(a, "completed") ||
      taskTimestamp(b, "updated") - taskTimestamp(a, "updated") ||
      b.id - a.id,
  )[0];
}

function dedupeTasksByCase(list: AdminTaskItem[]): AdminTaskItem[] {
  const groups = new Map<string, AdminTaskItem[]>();
  for (const task of list) {
    const key = caseKey(task);
    const bucket = groups.get(key);
    if (bucket) bucket.push(task);
    else groups.set(key, [task]);
  }
  const primary = Array.from(groups.values()).map(pickPrimaryTaskForCase);
  primary.sort(sortQueue);
  return primary;
}

/** Pipeline / slide-over case stage — what the case is in. */
function formatCaseStatus(task: AdminTaskItem): string {
  const kanban = String(task.application_kanban_stage || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const stage = String(task.application_stage || "").trim().toLowerCase();
  const status = String(task.application_status || "").trim().toLowerCase();
  const description = String(task.description || "").toLowerCase();
  const taskType = String(task.task_type || "").trim().toLowerCase();

  if (kanban === "DELIVERED" || stage === "closed" || stage === "decision_received" || status === "completed") {
    return "Delivered";
  }
  if (kanban === "SUBMITTED" || stage === "submitted" || status === "submitted") return "Submitted";
  if (kanban === "READY_FOR_SUBMISSION") return "Ready for submission";
  if (kanban === "REVIEW_PENDING") return "Review pending";
  if (
    kanban === "DOCUMENT_UPLOAD_PENDING" ||
    description.includes("[auto_task:payment-await-docs:") ||
    (stage === "paid" && taskType !== "document_review" && taskType !== "form_filling")
  ) {
    return "Document upload pending";
  }
  if (kanban === "FORM_FILLING") return "Form filling";
  if (kanban === "PAYMENT_PENDING") return "Payment pending";
  if (taskType === "document_review") return "Review pending";
  if (taskType === "form_filling") return "Form filling";
  if (kanban) return kanban.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  if (stage) return stage.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  return "In progress";
}

/** What this staff member should do on the case right now. */
function formatYourAction(task: AdminTaskItem): string {
  const status = taskStatus(task);
  const taskType = String(task.task_type || "").trim().toLowerCase();
  const description = String(task.description || "").toLowerCase();
  const kanban = String(task.application_kanban_stage || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";

  if (description.includes("[auto_task:payment-await-docs:") || (taskType === "other" && kanban === "DOCUMENT_UPLOAD_PENDING")) {
    return "Wait for customer upload";
  }
  if (status === "blocked") return "Waiting / on hold";
  if (taskType === "document_review" || taskType === "audit") return "Review documents";
  if (taskType === "form_filling") return "Fill application form";
  if (taskType === "form_review") return "Review completed form";
  if (taskType === "submission") return "Submit application";
  if (taskType === "delivery_follow_up") return "Follow up delivery";
  if (taskType) return taskType.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  return "Open case";
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
  const expressCmp = compareExpressFirst(a, b);
  if (expressCmp !== 0) return expressCmp;

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
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterKey>("all");
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
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const openedFromUrlRef = useRef(false);

  const hasFilters =
    kpiFilter !== "all" ||
    serviceFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    priorityFilter !== "all" ||
    taskTypeFilter !== "all" ||
    searchQuery.trim() !== "";

  const activeFilterCount =
    (kpiFilter !== "all" ? 1 : 0) +
    (serviceFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (taskTypeFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPriorityFilter("all");
    setTaskTypeFilter("all");
    setServiceFilter("all");
    setKpiFilter("all");
  };

  const applySearch = (value: string) => {
    if (value.trim()) {
      setDateFrom("");
      setDateTo("");
      setPriorityFilter("all");
      setTaskTypeFilter("all");
    }
    setSearchQuery(value);
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

  /** One primary task per case — stops the same file appearing in Waiting and Done. */
  const caseTasks = useMemo(() => dedupeTasksByCase(tasks), [tasks]);

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let soon = 0;
    let waiting = 0;
    let pending = 0;
    let completed = 0;
    for (const task of caseTasks) {
      const bucket = getQueueBucket(task);
      if (bucket === "done") {
        if (taskStatus(task) === "completed" || taskStatus(task) === "cancelled") completed += 1;
        continue;
      }
      pending += 1;
      if (bucket === "overdue") overdue += 1;
      else if (bucket === "today") today += 1;
      else if (bucket === "soon") soon += 1;
      else if (bucket === "waiting") waiting += 1;
    }
    const express = caseTasks.filter((task) => taskIsExpress(task) && isPendingTask(task)).length;
    return { overdue, today, soon, waiting, pending, completed, express, all: caseTasks.length };
  }, [caseTasks]);

  const taskTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const task of caseTasks) {
      if (task.task_type) types.add(String(task.task_type).toLowerCase());
    }
    return Array.from(types).sort();
  }, [caseTasks]);

  const serviceFilterOptions = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const task of caseTasks) {
      const name = String(task.service_name || "").trim();
      if (!name) continue;
      countsMap.set(name, (countsMap.get(name) || 0) + 1);
    }
    return Array.from(countsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [caseTasks]);

  const filteredTasks = useMemo(() => {
    let list = [...caseTasks];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      list = list.filter(
        (t) =>
          String(t.application_reference || "").toLowerCase().includes(query) ||
          String(t.customer_name || "").toLowerCase().includes(query) ||
          String(t.service_name || "").toLowerCase().includes(query) ||
          String(t.task_type || "").toLowerCase().includes(query) ||
          formatCaseStatus(t).toLowerCase().includes(query) ||
          formatYourAction(t).toLowerCase().includes(query),
      );
      list.sort(sortQueue);
      return list;
    }

    if (kpiFilter === "pending") {
      list = list.filter((t) => isPendingTask(t));
    } else if (kpiFilter === "completed") {
      list = list.filter((t) => !isPendingTask(t));
    } else if (kpiFilter === "overdue") {
      list = list.filter((t) => getQueueBucket(t) === "overdue");
    } else if (kpiFilter === "today") {
      list = list.filter((t) => getQueueBucket(t) === "today");
    } else if (kpiFilter === "soon") {
      list = list.filter((t) => getQueueBucket(t) === "soon");
    } else if (kpiFilter === "waiting") {
      list = list.filter((t) => getQueueBucket(t) === "waiting");
    } else if (kpiFilter === "express") {
      list = list.filter((t) => taskIsExpress(t) && isPendingTask(t));
    }

    if (serviceFilter === "express") {
      list = list.filter((t) => taskIsExpress(t));
    } else if (serviceFilter !== "all") {
      list = list.filter((t) => String(t.service_name || "").trim() === serviceFilter);
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => String(t.priority || "").toLowerCase() === priorityFilter);
    }

    if (taskTypeFilter !== "all") {
      list = list.filter((t) => String(t.task_type || "").toLowerCase() === taskTypeFilter);
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
  }, [caseTasks, kpiFilter, serviceFilter, dateFrom, dateTo, priorityFilter, taskTypeFilter, searchQuery]);

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
      key: "all",
      label: "All cases",
      value: counts.all,
      tone: "text-[#102A43]",
      activeTone: "border-[#102A43] bg-[#F5F7FA] ring-[#102A43]/15",
    },
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
      key: "express",
      label: "Express",
      value: counts.express,
      tone: "text-[#C2410C]",
      activeTone: "border-[#C2410C] bg-[#FFF7ED] ring-[#C2410C]/20",
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
          search: {
                  value: searchQuery,
                  onChange: applySearch,
                  placeholder:
                    pageTab === "pipeline"
                      ? "Search reference, customer, staff…"
                      : pageTab === "workload"
                        ? "Search staff or case ref…"
                        : "Search ref or customer…",
                },
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
          syncKey: `${pageTab}|${searchQuery}|${dateFrom}|${dateTo}|${priorityFilter}|${taskTypeFilter}|${kpiFilter}|${serviceFilter}|${loading}|${filteredTasks.length}|${taskTypeOptions.join(",")}|${counts.overdue}`,
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
              : kpiFilter === "all"
                ? ["overdue", "today", "soon", "later", "waiting", "done"]
                : ["overdue", "today", "soon", "later", "waiting"];

  const serviceFilterLabel =
    serviceFilter === "all"
      ? "Services"
      : serviceFilter === "express"
        ? "Express"
        : serviceFilter;

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

      {pageTab === "pipeline" ? <KanbanView embedded externalSearch={searchQuery} /> : null}
      {pageTab === "workload" ? <WorkloadView embedded externalSearch={searchQuery} /> : null}

      {pageTab === "cases" ? (
        <>
          {/* Compact due tabs so Overdue / Today / Soon are always visible */}
          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            {kpiButtons.map((kpi) => {
              const active = !searchQuery.trim() && kpiFilter === kpi.key && serviceFilter === "all";
              return (
                <button
                  key={kpi.key}
                  type="button"
                  onClick={() => {
                    setServiceFilter("all");
                    setKpiFilter(kpi.key);
                  }}
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

            <div
              className="relative ml-auto"
              onMouseEnter={() => setServicesMenuOpen(true)}
              onMouseLeave={() => setServicesMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setServicesMenuOpen((open) => !open)}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition ${
                  serviceFilter !== "all"
                    ? "ring-1 border-[#C2410C] bg-[#FFF7ED] text-[#C2410C]"
                    : "text-[#486581] hover:bg-[#F5F7FA]"
                }`}
              >
                <span className={serviceFilter !== "all" ? "text-[#C2410C]" : "text-[#627D98]"}>
                  {serviceFilterLabel}
                </span>
                <span className={`tabular-nums ${serviceFilter !== "all" ? "text-[#C2410C]" : "text-[#829AB1]"}`}>
                  {serviceFilter === "all"
                    ? serviceFilterOptions.length
                    : serviceFilter === "express"
                      ? counts.express
                      : serviceFilterOptions.find((row) => row.name === serviceFilter)?.count || 0}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              {servicesMenuOpen ? (
                <div className="absolute right-0 top-full z-30 pt-1">
                  <div className="max-h-[320px] min-w-[240px] overflow-y-auto rounded-[10px] border border-[#D9E1EA] bg-white py-1 shadow-lg">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#829AB1]">
                      Filter by service
                    </p>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setServiceFilter("express");
                        setKpiFilter("all");
                        setServicesMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold ${
                        serviceFilter === "express"
                          ? "bg-[#FFF7ED] text-[#C2410C]"
                          : "text-[#C2410C] hover:bg-[#FFF7ED]"
                      }`}
                    >
                      <span>Express</span>
                      <span className="tabular-nums text-[#829AB1]">{counts.express}</span>
                    </button>
                    <div className="my-1 border-t border-[#EEF2F6]" />
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setServiceFilter("all");
                        setServicesMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold ${
                        serviceFilter === "all"
                          ? "bg-[#EEF4FF] text-[#0B69B7]"
                          : "text-[#486581] hover:bg-[#F5F7FA]"
                      }`}
                    >
                      <span>All services</span>
                      <span className="tabular-nums text-[#829AB1]">{counts.all}</span>
                    </button>
                    {serviceFilterOptions.map((row) => {
                      const active = serviceFilter === row.name;
                      return (
                        <button
                          key={row.name}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setServiceFilter(row.name);
                            setKpiFilter("all");
                            setServicesMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold ${
                            active
                              ? "bg-[#EEF4FF] text-[#0B69B7]"
                              : "text-[#486581] hover:bg-[#F5F7FA]"
                          }`}
                        >
                          <span className="truncate">{row.name}</span>
                          <span className="shrink-0 tabular-nums text-[#829AB1]">{row.count}</span>
                        </button>
                      );
                    })}
                    {serviceFilterOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[#829AB1]">No services in your queue yet.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
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
                    onClick={() => {
                      resetFilters();
                      setSearchQuery("");
                    }}
                    className="mt-3 inline-flex rounded-lg border border-[#D9E1EA] px-3 py-1.5 text-sm font-semibold text-[#0B69B7]"
                  >
                    Reset filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-[1] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#627D98]">
                    <tr className="border-b border-[#E5EAF0]">
                      <th className="px-3 py-2 font-semibold">Due</th>
                      <th className="px-3 py-2 font-semibold">Case</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Service</th>
                      <th className="px-3 py-2 font-semibold">Case status</th>
                      <th className="px-3 py-2 font-semibold">Your action</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold text-right">Open</th>
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
                            <td colSpan={8} className="px-3 py-1.5">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <Icon className="h-3.5 w-3.5" />
                                {meta.title}
                                <span className="rounded-full bg-white/70 px-1.5 py-0.5 tabular-nums">
                                  {rows.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServiceFilter("all");
                                    setKpiFilter(
                                      sectionKey === "later"
                                        ? "pending"
                                        : sectionKey === "done"
                                          ? "completed"
                                          : (sectionKey as KpiFilterKey),
                                    );
                                  }}
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
                            const caseStatus = formatCaseStatus(task);
                            const yourAction = formatYourAction(task);
                            return (
                              <tr
                                key={caseKey(task)}
                                className={`border-b border-[#EEF2F6] hover:bg-[#F8FAFC] ${
                                  isDone ? "opacity-70" : ""
                                } ${taskIsExpress(task) && !isDone ? "bg-[#FFF7ED]" : ""}`}
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
                                    className="inline-flex max-w-full items-center gap-1.5 truncate hover:underline"
                                    title={task.application_reference || `Task #${task.id}`}
                                  >
                                    {taskIsExpress(task) ? <ExpressBadge compact /> : null}
                                    <span className="truncate">{task.application_reference || `Task #${task.id}`}</span>
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
                                <td className="whitespace-nowrap px-3 py-1.5">
                                  <span className="inline-flex rounded-md border border-[#D9E1EA] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#334E68]">
                                    {caseStatus}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[#102A43]">
                                  {yourAction}
                                </td>
                                <td className="whitespace-nowrap px-3 py-1.5 capitalize text-[#627D98]">
                                  {taskIsExpress(task) ? (
                                    <span className="font-semibold text-[#C2410C]">Express</span>
                                  ) : (
                                    task.priority || "medium"
                                  )}
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
