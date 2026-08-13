"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Shuffle, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { SlideOverPanel } from "@/components/console/kanban/SlideOverPanel";
import { useAdminCaseSlideOver } from "@/components/console/kanban/useAdminCaseSlideOver";
import {
  StaffWorkloadSlideOver,
  type StaffWorkloadSummary,
} from "@/components/console/workload/StaffWorkloadSlideOver";
import { WorkloadCalendarTab } from "@/components/console/workload/WorkloadCalendarTab";
import {
  adminDirectAssignTask,
  assignAdminTask,
  autoAssignAdminTasks,
  decideTaskReassignRequest,
  getAdminDashboardOverview,
  getAdminInternalMessagesFeed,
  getTaskEffectiveStatus,
  isAdminStaffRole,
  isTaskClosedOut,
  isTaskCompleted,
  isTaskPending,
  formatTaskStatusLabel,
  taskStatusBadgeClass,
  listAdminTasks,
  listOwnStaffLeave,
  listTaskReassignRequests,
  peerReassignAdminTask,
  staffIdsMatch,
  type AdminDashboardOverview,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
  type TaskReassignRequestItem,
} from "@/lib/admin-auth";
import { compareExpressFirst, taskIsExpress } from "@/lib/kanban";
import { ExpressBadge } from "@/components/console/ExpressBadge";

const filterFieldClass =
  "mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm bg-white";

type KpiFilterKey = "all" | "assigned" | "pending" | "completed" | "unassigned";
type WorkloadTab = "overview" | "calendar" | "notes" | "reassigns";
type TaskSortKey = "created" | "deadline" | "application" | "customer" | "task" | "status" | "assignee";
type SortDir = "asc" | "desc";
/** Staff My Cases: open work by default; closed/cancelled via filter. */
type MyTasksStatusFilter = "open" | "completed" | "cancelled" | "all";

const TASK_TYPE_LABELS: Record<string, string> = {
  audit: "Assessment",
  document_review: "Document Review",
  form_filling: "Form Filling",
  form_review: "Form Review",
  submission: "Submission",
  delivery_follow_up: "Delivery Follow-up",
  other: "Other",
};

function formatTaskTypeLabel(task: AdminTaskItem | string) {
  if (typeof task === "string") {
    const key = String(task || "").toLowerCase();
    return TASK_TYPE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const kanban = String(task.application_kanban_stage || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const description = String(task.description || "").toLowerCase();
  const key = String(task.task_type || "").toLowerCase();
  if (kanban === "DOCUMENT_UPLOAD_PENDING" || description.includes("[auto_task:payment-await-docs:")) {
    return "Document Upload Pending";
  }
  if (kanban === "FORM_FILLING" && key === "form_filling") return "Form Filling";
  if (kanban === "REVIEW_PENDING" || key === "document_review") return "Document Review";
  return TASK_TYPE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function taskCreatedTs(task: AdminTaskItem): number {
  const raw =
    (task as AdminTaskItem & { createdAt?: string | null }).created_at ??
    (task as { createdAt?: string }).createdAt ??
    null;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function taskDeadlineTs(task: AdminTaskItem): number {
  if (!task.deadline) return Number.POSITIVE_INFINITY;
  const ts = new Date(task.deadline).getTime();
  return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: TaskSortKey;
  activeKey: TaskSortKey;
  dir: SortDir;
  onSort: (key: TaskSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded px-0.5 py-0.5 transition hover:text-[#102A43] ${
          active ? "text-[#006F57]" : "text-[#486581]"
        }`}
        title={active ? `Sorted ${dir === "desc" ? "descending" : "ascending"} — click to toggle` : `Sort by ${label}`}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}

function resolveWorkloadTab(
  raw: string | null | undefined,
  opts: { isFounderView: boolean; canManageTasks: boolean },
): WorkloadTab {
  const tab = String(raw || "").trim().toLowerCase();
  if (tab === "reassigns" && opts.isFounderView) return "reassigns";
  if (tab === "calendar" || tab === "notes" || tab === "overview") return tab;
  return opts.canManageTasks ? "overview" : "calendar";
}

export function WorkloadView({
  embedded = false,
  focusTab = null,
  externalSearch,
}: {
  embedded?: boolean;
  /** When opened from dashboard (no URL ?tab=), force Overview/Reassigns/etc. */
  focusTab?: string | null;
  /** When embedded (e.g. My Cases → Workload), use the host page search. */
  externalSearch?: string;
}) {
  const { adminUser } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userRole = String(adminUser?.role || "").trim().toLowerCase();
  const isFounderView = userRole === "admin";
  const isOpsView = userRole === "ops_manager";
  const canManageTasks = isFounderView || isOpsView;
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
    isOpen: isCasePanelOpen,
  } = useAdminCaseSlideOver();

  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [taskItems, setTaskItems] = useState<AdminTaskItem[]>([]);
  const [taskSelections, setTaskSelections] = useState<Record<number, string>>({});
  const [taskActionLoading, setTaskActionLoading] = useState<number | "auto" | null>(null);
  const silentAutoAssignKeyRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffWorkloadSummary | null>(null);
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const initialTabParam = String(focusTab || searchParams.get("tab") || "").trim().toLowerCase();
  const [activeTab, setActiveTab] = useState<WorkloadTab>(() =>
    resolveWorkloadTab(initialTabParam, { isFounderView, canManageTasks }),
  );

  const goToWorkloadTab = (tab: WorkloadTab) => {
    setActiveTab(tab);
    if (embedded) return;
    const current = String(searchParams.get("tab") || "").trim().toLowerCase();
    if (current === tab) return;
    router.replace(`/admin/workload?tab=${tab}`, { scroll: false });
  };

  const openCaseFromTask = (task: AdminTaskItem) => {
    if (!task.application) {
      toast.error("Application not found for this task.");
      return;
    }
    void openCaseByApplicationId(task.application, {
      reference: task.application_reference,
      customer: task.customer_name,
    });
  };

  const openCaseFromApplicationId = (
    applicationId: number | null | undefined,
    preview?: { reference?: string; customer?: string },
  ) => {
    const id = Number(applicationId || 0);
    if (!id) {
      toast.error("Application not found.");
      return;
    }
    void openCaseByApplicationId(id, preview);
  };
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const activeStaffSearch = externalSearch ?? staffSearch;
  const [roleFilter, setRoleFilter] = useState("all");
  const [loadFilter, setLoadFilter] = useState("all");
  const [staffIdFilter, setStaffIdFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");
  /** Default: newest tasks first (managers: created; staff My Cases: Case column) */
  const [taskSortKey, setTaskSortKey] = useState<TaskSortKey>(canManageTasks ? "created" : "application");
  const [taskSortDir, setTaskSortDir] = useState<SortDir>("desc");
  const [myTasksStatusFilter, setMyTasksStatusFilter] = useState<MyTasksStatusFilter>("open");
  const [peerColleagues, setPeerColleagues] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [onLeaveToday, setOnLeaveToday] = useState(false);
  const [pendingReassigns, setPendingReassigns] = useState<TaskReassignRequestItem[]>([]);
  const [reassignBusyId, setReassignBusyId] = useState<number | null>(null);

  const handleTaskSort = (key: TaskSortKey) => {
    if (taskSortKey === key) {
      setTaskSortDir((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setTaskSortKey(key);
    // Newest / latest first when opening Case, Created, or Deadline
    setTaskSortDir(key === "created" || key === "deadline" || key === "application" ? "desc" : "asc");
  };

  const compareTasks = (a: AdminTaskItem, b: AdminTaskItem, key: TaskSortKey, dir: SortDir) => {
    const expressCmp = compareExpressFirst(a, b);
    if (expressCmp !== 0) return expressCmp;
    const dirMul = dir === "asc" ? 1 : -1;
    let cmp = 0;
    switch (key) {
      case "created":
        cmp = taskCreatedTs(a) - taskCreatedTs(b);
        break;
      case "deadline": {
        const ad = taskDeadlineTs(a);
        const bd = taskDeadlineTs(b);
        if (ad === bd) cmp = 0;
        else if (!Number.isFinite(ad)) cmp = 1;
        else if (!Number.isFinite(bd)) cmp = -1;
        else cmp = ad - bd;
        break;
      }
      case "application":
        cmp = String(a.application_reference || "").localeCompare(String(b.application_reference || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "customer":
        cmp = String(a.customer_name || "").localeCompare(String(b.customer_name || ""), undefined, {
          sensitivity: "base",
        });
        break;
      case "task":
        cmp = String(a.task_type || "").localeCompare(String(b.task_type || ""), undefined, { sensitivity: "base" });
        break;
      case "status":
        cmp = getTaskEffectiveStatus(a).localeCompare(getTaskEffectiveStatus(b), undefined, { sensitivity: "base" });
        break;
      case "assignee":
        cmp = String(a.assigned_staff_name || "").localeCompare(String(b.assigned_staff_name || ""), undefined, {
          sensitivity: "base",
        });
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp * dirMul;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  };

  const staffMembers = dashboardData?.staff_members ?? [];
  const isTaskUnassigned = (task: AdminTaskItem) => {
    const assignee = task.assigned_staff;
    if (assignee == null) return true;
    const assigneeId = Number(assignee);
    return !Number.isFinite(assigneeId) || assigneeId <= 0;
  };

  const autoAssignEligibleCount = useMemo(
    () =>
      taskItems.filter((task) => isTaskUnassigned(task) && isTaskPending(task)).length,
    [taskItems],
  );

  const assignableStaff = useMemo(
    () =>
      staffMembers.filter((staff) => {
        const roleKey = String(staff.role_key || staff.role || "");
        if (staffIdsMatch(staff.id, adminUser?.id)) return false;
        if (isAdminStaffRole(roleKey)) return false;
        if (String((staff as { access_scope?: string }).access_scope || "all") === "easyfly_only") return false;
        return true;
      }),
    [staffMembers, adminUser?.id],
  );

  const autoAssignStaffCount = assignableStaff.length;

  const staffOptionsForTask = (task: AdminTaskItem) => {
    const base = [...assignableStaff];
    if (isTaskUnassigned(task)) return base;

    const assigneeId = Number(task.assigned_staff);
    if (!Number.isFinite(assigneeId) || assigneeId <= 0) return base;
    if (base.some((staff) => staffIdsMatch(staff.id, assigneeId))) return base;

    const fromDashboard = staffMembers.find((staff) => staffIdsMatch(staff.id, assigneeId));
    if (fromDashboard) return [fromDashboard, ...base];

    const selfAssigned = staffIdsMatch(assigneeId, adminUser?.id);
    const label = selfAssigned
      ? `${adminUser?.full_name || adminUser?.username || "You"} (you)`
      : task.assigned_staff_name || `Staff #${assigneeId}`;

    return [
      {
        id: assigneeId,
        name: label,
        role: String(task.assigned_staff_role || adminUser?.role || ""),
        initials: "",
        assigned: 0,
        completed: 0,
        pending: 0,
        avgTime: "",
        slaBreach: 0,
        accuracy: 0,
        auditsPassed: 0,
        auditsFailed: 0,
        loadStatus: "Active",
      },
      ...base,
    ];
  };

  const taskSelectionValue = (task: AdminTaskItem) => {
    const selected = taskSelections[task.id];
    if (selected) return selected;
    if (isTaskUnassigned(task)) return "";
    return String(Number(task.assigned_staff));
  };

  const assigneeLabel = (task: AdminTaskItem) => {
    if (isTaskUnassigned(task)) return "Unassigned";
    if (staffIdsMatch(task.assigned_staff, adminUser?.id)) {
      return adminUser?.full_name || adminUser?.username || "You";
    }
    return task.assigned_staff_name || "Unassigned";
  };

  const workloadByStaff = useMemo(() => {
    const counts: Record<number, { assigned: number; pending: number; completed: number; loadStatus: string }> = {};

    for (const task of taskItems) {
      if (isTaskUnassigned(task)) continue;
      const staffId = Number(task.assigned_staff);
      if (!Number.isFinite(staffId)) continue;
      if (!counts[staffId]) {
        counts[staffId] = { assigned: 0, pending: 0, completed: 0, loadStatus: "Active" };
      }
      counts[staffId].assigned += 1;
      if (isTaskPending(task)) {
        counts[staffId].pending += 1;
      }
      if (isTaskCompleted(task)) {
        counts[staffId].completed += 1;
      }
    }

    for (const [staffId, summary] of Object.entries(counts)) {
      if (summary.pending >= 8) summary.loadStatus = "Overloaded";
      else if (summary.pending >= 3) summary.loadStatus = "Busy";
      else summary.loadStatus = "Active";
      counts[Number(staffId)] = summary;
    }

    return counts;
  }, [taskItems]);

  const teamKpis = useMemo(() => {
    let assigned = 0;
    let pending = 0;
    let completed = 0;
    let unassignedPending = 0;

    for (const task of taskItems) {
      const isPending = isTaskPending(task);
      const isCompleted = isTaskCompleted(task);

      if (!isTaskUnassigned(task)) {
        assigned += 1;
        if (isPending) pending += 1;
        if (isCompleted) completed += 1;
      } else if (isPending) {
        unassignedPending += 1;
      }
    }

    return {
      assigned,
      pending,
      completed,
      unassignedPending,
      totalTasks: taskItems.length,
      activeStaff: staffMembers.filter((s) => {
        const roleKey = String(s.role_key || s.role || "");
        if (isAdminStaffRole(roleKey)) return false;
        if (String((s as { access_scope?: string }).access_scope || "all") === "easyfly_only") return false;
        if (isFounderView && staffIdsMatch(s.id, adminUser?.id)) return false;
        return true;
      }).length,
    };
  }, [adminUser?.id, staffMembers, taskItems]);

  const staffKpiRows = useMemo(() => {
    const rows = staffMembers
      .filter((staff) => {
        const roleKey = String(staff.role_key || staff.role || "");
        if (isAdminStaffRole(roleKey)) return false;
        if (String((staff as { access_scope?: string }).access_scope || "all") === "easyfly_only") return false;
        if (isFounderView && staffIdsMatch(staff.id, adminUser?.id)) return false;
        return true;
      })
      .map((staff) => {
        const live = workloadByStaff[staff.id];
        // Prefer API leave status so Workload matches Team Performance / calendar.
        const leaveStatus =
          staff.blocks_auto_assign_today || String(staff.loadStatus || "").toLowerCase() === "on leave"
            ? "On leave"
            : null;
        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          assigned: live?.assigned ?? staff.assigned,
          pending: live?.pending ?? staff.pending,
          completed: live?.completed ?? staff.completed,
          loadStatus: leaveStatus || live?.loadStatus || staff.loadStatus,
          slaBreach: staff.slaBreach,
        };
      });

    if (isOpsView && adminUser?.id) {
      const hasSelfRow = rows.some((row) => staffIdsMatch(row.id, adminUser.id));
      const selfLive = workloadByStaff[adminUser.id];
      if (!hasSelfRow && selfLive && selfLive.assigned > 0) {
        rows.unshift({
          id: adminUser.id,
          name: adminUser.full_name || adminUser.username || "You",
          role: "Operations Manager",
          assigned: selfLive.assigned,
          pending: selfLive.pending,
          completed: selfLive.completed,
          loadStatus: selfLive.loadStatus,
          slaBreach: 0,
        });
      }
    }

    return rows.sort((a, b) => b.pending - a.pending || b.assigned - a.assigned);
  }, [adminUser, isFounderView, isOpsView, staffMembers, workloadByStaff]);

  const effectiveKpi = kpiFilter === "all" ? null : kpiFilter;

  const hasFilters =
    effectiveKpi !== null ||
    activeStaffSearch.trim() !== "" ||
    roleFilter !== "all" ||
    loadFilter !== "all" ||
    staffIdFilter !== "all" ||
    taskTypeFilter !== "all";

  const taskTypeOptions = useMemo(() => {
    const types = new Set(Object.keys(TASK_TYPE_LABELS));
    for (const task of taskItems) {
      if (task.task_type) types.add(String(task.task_type).toLowerCase());
    }
    return Array.from(types).sort();
  }, [taskItems]);

  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    for (const staff of staffKpiRows) {
      roles.add(String(staff.role || "").toLowerCase());
    }
    return Array.from(roles).sort();
  }, [staffKpiRows]);

  const filteredStaffRows = useMemo(() => {
    let rows = [...staffKpiRows];
    const query = activeStaffSearch.trim().toLowerCase();

    if (!query) {
      if (effectiveKpi === "pending") rows = rows.filter((row) => row.pending > 0);
      else if (effectiveKpi === "assigned") rows = rows.filter((row) => row.assigned > 0);
      else if (effectiveKpi === "completed") rows = rows.filter((row) => row.completed > 0);
      else if (effectiveKpi === "unassigned") rows = [];

      if (roleFilter !== "all") {
        rows = rows.filter((row) => String(row.role || "").toLowerCase().includes(roleFilter));
      }

      if (loadFilter === "overloaded" || loadFilter === "busy" || loadFilter === "active") {
        rows = rows.filter((row) => String(row.loadStatus || "").toLowerCase() === loadFilter);
      } else if (loadFilter === "overdue") {
        rows = rows.filter((row) => row.slaBreach > 0);
      }

      if (staffIdFilter !== "all" && staffIdFilter !== "unassigned") {
        rows = rows.filter((row) => String(row.id) === staffIdFilter);
      }

      if (taskTypeFilter !== "all") {
        rows = rows.filter((row) =>
          taskItems.some(
            (task) =>
              staffIdsMatch(task.assigned_staff, row.id) &&
              String(task.task_type || "").toLowerCase() === taskTypeFilter,
          ),
        );
      }
    } else {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          String(row.role || "").toLowerCase().includes(query),
      );
    }

    return rows;
  }, [effectiveKpi, loadFilter, roleFilter, staffIdFilter, staffKpiRows, activeStaffSearch, taskTypeFilter, taskItems]);

  const filteredTasks = useMemo(() => {
    let tasks = [...taskItems];
    const query = activeStaffSearch.trim().toLowerCase();

    if (query) {
      tasks = tasks.filter(
        (task) =>
          String(task.assigned_staff_name || "").toLowerCase().includes(query) ||
          String(task.application_reference || "").toLowerCase().includes(query) ||
          String(task.customer_name || "").toLowerCase().includes(query),
      );
      tasks.sort((a, b) => compareTasks(a, b, taskSortKey, taskSortDir));
      return tasks;
    }

    if (effectiveKpi === "assigned") tasks = tasks.filter((task) => Boolean(task.assigned_staff));
    else if (effectiveKpi === "pending") {
      tasks = tasks.filter((task) => isTaskPending(task));
    } else if (effectiveKpi === "completed") {
      tasks = tasks.filter((task) => isTaskCompleted(task));
    } else if (effectiveKpi === "unassigned") {
      tasks = tasks.filter((task) => isTaskUnassigned(task) && isTaskPending(task));
    }

    if (taskTypeFilter !== "all") {
      tasks = tasks.filter((task) => String(task.task_type || "").toLowerCase() === taskTypeFilter);
    }

    if (staffIdFilter === "unassigned") {
      tasks = tasks.filter((task) => isTaskUnassigned(task));
    } else if (staffIdFilter !== "all") {
      tasks = tasks.filter((task) => String(task.assigned_staff) === staffIdFilter);
    } else if (
      hasFilters &&
      effectiveKpi !== "unassigned" &&
      staffIdFilter === "all" &&
      (roleFilter !== "all" || loadFilter !== "all" || taskTypeFilter !== "all")
    ) {
      const staffIds = new Set(filteredStaffRows.map((row) => row.id));
      tasks = tasks.filter(
        (task) => isTaskUnassigned(task) || staffIds.has(Number(task.assigned_staff)),
      );
    }

    tasks.sort((a, b) => compareTasks(a, b, taskSortKey, taskSortDir));

    return tasks;
  }, [
    filteredStaffRows,
    hasFilters,
    effectiveKpi,
    loadFilter,
    roleFilter,
    staffIdFilter,
    activeStaffSearch,
    taskItems,
    taskTypeFilter,
    taskSortDir,
    taskSortKey,
  ]);

  const myOpenTaskCount = useMemo(() => {
    const selfId = adminUser?.id;
    return taskItems.filter(
      (task) => staffIdsMatch(task.assigned_staff, selfId) && isTaskPending(task),
    ).length;
  }, [taskItems, adminUser?.id]);

  const myTasks = useMemo(() => {
    const selfId = adminUser?.id;
    // Strict isolation: only tasks currently assigned to this staffer.
    let tasks = taskItems.filter((task) => staffIdsMatch(task.assigned_staff, selfId));
    const query = activeStaffSearch.trim().toLowerCase();

    if (query) {
      tasks = tasks.filter(
        (task) =>
          String(task.application_reference || "").toLowerCase().includes(query) ||
          String(task.customer_name || "").toLowerCase().includes(query) ||
          String(task.assigned_staff_name || "").toLowerCase().includes(query) ||
          String(task.task_type || "").toLowerCase().includes(query),
      );
    } else if (myTasksStatusFilter === "open") {
      tasks = tasks.filter((task) => isTaskPending(task));
    } else if (myTasksStatusFilter === "completed") {
      tasks = tasks.filter((task) => isTaskCompleted(task));
    } else if (myTasksStatusFilter === "cancelled") {
      tasks = tasks.filter((task) => getTaskEffectiveStatus(task) === "cancelled");
    }

    tasks.sort((a, b) => compareTasks(a, b, taskSortKey, taskSortDir));
    return tasks;
  }, [taskItems, adminUser?.id, myTasksStatusFilter, taskSortKey, taskSortDir, activeStaffSearch]);

  const showStaffTable = effectiveKpi !== "unassigned" && staffIdFilter !== "unassigned";

  const clearFilters = () => {
    setKpiFilter(null);
    setRoleFilter("all");
    setLoadFilter("all");
    setStaffIdFilter("all");
    setTaskTypeFilter("all");
    setTaskSortKey("created");
    setTaskSortDir("desc");
  };

  const panelFilterCount =
    (effectiveKpi !== null ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (loadFilter !== "all" ? 1 : 0) +
    (staffIdFilter !== "all" ? 1 : 0) +
    (taskTypeFilter !== "all" ? 1 : 0);

  const getStaffTasks = (staffId: number) => {
    return taskItems
      .filter((t) => staffIdsMatch(t.assigned_staff, staffId))
      .filter((t) => {
        if (!hasFilters) return true;
        return filteredTasks.some((ft) => ft.id === t.id);
      })
      .sort((a, b) => {
        const pendingA = isTaskPending(a) ? 0 : 1;
        const pendingB = isTaskPending(b) ? 0 : 1;
        if (pendingA !== pendingB) return pendingA - pendingB;
        const expressCmp = compareExpressFirst(a, b);
        if (expressCmp !== 0) return expressCmp;
        const ad = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
  };

  const selectedStaffAllTasks = useMemo(
    () =>
      selectedStaff
        ? taskItems.filter((t) => staffIdsMatch(t.assigned_staff, selectedStaff.id)).sort((a, b) => {
            const pendingA = isTaskPending(a) ? 0 : 1;
            const pendingB = isTaskPending(b) ? 0 : 1;
            if (pendingA !== pendingB) return pendingA - pendingB;
            const expressCmp = compareExpressFirst(a, b);
            if (expressCmp !== 0) return expressCmp;
            const ad = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
            const bd = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
            return ad - bd;
          })
        : [],
    [selectedStaff, taskItems],
  );

  const selectedStaffTasks = useMemo(
    () => (selectedStaff ? getStaffTasks(selectedStaff.id) : []),
    [selectedStaff, taskItems, hasFilters, filteredTasks],
  );

  const selectedStaffNotes = useMemo(() => {
    if (!selectedStaff) return [];
    return internalMessages.filter(
      (note) =>
        note.recipient_id === selectedStaff.id ||
        String(note.recipient_name || "").toLowerCase() === selectedStaff.name.toLowerCase(),
    );
  }, [internalMessages, selectedStaff]);

  const loadStatusStyles = (status: string) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "on leave") return "bg-[#FEE2E2] text-[#9B1C1C] border-[#F8B4B4]";
    if (normalized === "overloaded") return "bg-[#FEE4E2] text-[#B42318] border-[#FECDCA]";
    if (normalized === "busy") return "bg-[#FFF4E5] text-[#9C4F17] border-[#F9DBAF]";
    return "bg-[#E6F7F2] text-[#006F57] border-[#B7EBD8]";
  };

  const getTaskCreatedAt = (task: AdminTaskItem) => {
    return (task as AdminTaskItem & { createdAt?: string | null }).created_at ?? (task as { createdAt?: string }).createdAt ?? null;
  };

  const formatDateOnly = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  const formatTimeOnly = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleTimeString();
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      if (!canManageTasks) {
        const selfId = Number(adminUser?.id || 0);
        const now = new Date();
        const [taskPayload, ownLeave] = await Promise.all([
          selfId ? listAdminTasks({ limit: 200, assignedStaffId: selfId }) : Promise.resolve([]),
          listOwnStaffLeave({ month: now.getMonth() + 1, year: now.getFullYear() }).catch(() => null),
        ]);
        // Keep only tasks still assigned to this staffer (drops peer-reassigned rows).
        const ownTasks = taskPayload.filter((task) => staffIdsMatch(task.assigned_staff, selfId));
        setDashboardData(null);
        setTaskItems(ownTasks);
        setInternalMessages([]);
        setPeerColleagues(ownLeave?.colleagues || []);
        setOnLeaveToday(Boolean(ownLeave?.on_leave_today));
        setTaskSelections(
          Object.fromEntries(
            ownTasks.map((task) => [
              task.id,
              isTaskUnassigned(task) ? "" : String(Number(task.assigned_staff)),
            ]),
          ),
        );
        return;
      }

      const [payload, taskPayload, messageFeed] = await Promise.all([
        getAdminDashboardOverview(),
        listAdminTasks({ limit: 500 }),
        getAdminInternalMessagesFeed(40),
      ]);
      setDashboardData(payload);
      setTaskItems(taskPayload);
      setInternalMessages(messageFeed);
      setTaskSelections(
        Object.fromEntries(
          taskPayload.map((task) => [
            task.id,
            isTaskUnassigned(task) ? "" : String(Number(task.assigned_staff)),
          ]),
        ),
      );
      if (isFounderView) {
        void loadPendingReassigns();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workload.");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingReassigns = async () => {
    if (!isFounderView) {
      setPendingReassigns([]);
      return;
    }
    try {
      const rows = await listTaskReassignRequests("pending");
      setPendingReassigns(rows);
    } catch {
      setPendingReassigns([]);
    }
  };

  const handleDecideReassign = async (requestId: number, decision: "approve" | "reject") => {
    setReassignBusyId(requestId);
    try {
      await decideTaskReassignRequest(requestId, decision);
      toast.success(decision === "approve" ? "Reassign approved." : "Reassign rejected.");
      await Promise.all([loadPendingReassigns(), loadDashboard()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update request.");
    } finally {
      setReassignBusyId(null);
    }
  };

  useEffect(() => {
    const fromFocus = String(focusTab || "").trim().toLowerCase();
    const fromUrl = String(searchParams.get("tab") || "").trim().toLowerCase();
    const next = resolveWorkloadTab(fromFocus || fromUrl, { isFounderView, canManageTasks });
    if (fromFocus || fromUrl) {
      setActiveTab(next);
    }
  }, [focusTab, searchParams, isFounderView, canManageTasks]);

  useEffect(() => {
    if (activeTab === "reassigns" && isFounderView) {
      void loadPendingReassigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isFounderView]);

  useEffect(() => {
    if (adminUser) void loadDashboard();
  }, [adminUser]);

  const handleTaskSelectionChange = (taskId: number, value: string) => {
    setTaskSelections((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleAssignTask = async (task: AdminTaskItem) => {
    const selectedStaffId = taskSelections[task.id];
    if (!selectedStaffId) {
      toast.error("Select a staff member first.");
      return;
    }
    const assignedToSelf = staffIdsMatch(task.assigned_staff, adminUser?.id);
    try {
      setTaskActionLoading(task.id);
      if (assignedToSelf) {
        const result = await peerReassignAdminTask(task.id, Number(selectedStaffId));
        if ("pending_approval" in result && result.pending_approval) {
          toast.success(result.message || "Reassign sent for admin approval.");
          return;
        }
        const updated = result as AdminTaskItem;
        // After peer reassign, task leaves this staffer's queue — drop it from My Cases.
        if (!canManageTasks) {
          setTaskItems((current) => current.filter((row) => row.id !== task.id));
          setTaskSelections((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        } else {
          setTaskItems((current) => current.map((row) => (row.id === updated.id ? updated : row)));
          setTaskSelections((prev) => ({ ...prev, [updated.id]: String(Number(updated.assigned_staff) || "") }));
        }
        toast.success("Task reassigned.");
        return;
      }
      let updated: AdminTaskItem;
      if (isFounderView) {
        updated = await adminDirectAssignTask(task.id, Number(selectedStaffId));
      } else if (canManageTasks) {
        const result = await assignAdminTask(task.id, Number(selectedStaffId));
        if ("pending_approval" in result && result.pending_approval) {
          toast.success(result.message || "Assign sent for admin approval.");
          return;
        }
        updated = result as AdminTaskItem;
      } else {
        throw new Error("You can only reassign tasks assigned to you.");
      }
      setTaskItems((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setTaskSelections((prev) => ({ ...prev, [updated.id]: String(Number(updated.assigned_staff) || "") }));
      toast.success("Task assigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign task.");
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleAutoAssignTasks = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (autoAssignStaffCount === 0) {
      if (!silent) {
        toast.error(
          isOpsView
            ? "No eligible staff for auto-assign. You need active case processors, reviewers, support agents, or other ops managers (not you or admins)."
            : "No active staff available for auto-assign.",
        );
      }
      return;
    }
    if (autoAssignEligibleCount === 0) {
      if (!silent) toast.error("No unassigned pending tasks in the queue.");
      return;
    }
    setTaskActionLoading("auto");
    try {
      const result = await autoAssignAdminTasks();
      await loadDashboard();
      const count = result.assigned_count ?? 0;
      if (!silent) {
        if (count > 0) toast.success(result.message || `Auto-assigned ${count} task(s).`);
        else toast.error(result.message || "No tasks were assigned.");
      }
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "Failed to auto-assign.");
    } finally {
      setTaskActionLoading(null);
    }
  };

  useEffect(() => {
    if (!adminUser || !canManageTasks) return;
    if (autoAssignEligibleCount <= 0 || autoAssignStaffCount <= 0) return;
    const key = `${autoAssignEligibleCount}:${autoAssignStaffCount}`;
    if (silentAutoAssignKeyRef.current === key) return;
    silentAutoAssignKeyRef.current = key;
    // Continuous auto-assign: no button click required.
    void handleAutoAssignTasks({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser, canManageTasks, autoAssignEligibleCount, autoAssignStaffCount]);

  const kpiButtons = [
    { key: "all" as const, label: "All", value: teamKpis.totalTasks },
    { key: "assigned" as const, label: "Assigned", value: teamKpis.assigned },
    { key: "pending" as const, label: "Pending", value: teamKpis.pending },
    { key: "completed" as const, label: "Done", value: teamKpis.completed },
    { key: "unassigned" as const, label: "Unassigned", value: teamKpis.unassignedPending },
  ];

  useSetAdminPageChrome(
    canManageTasks
      ? {
          title: "Workload",
          subtitle: "Staff load, assignment & queue",
          icon: UserCog,
          search: {
            value: staffSearch,
            onChange: setStaffSearch,
            placeholder: "Search staff or case ref…",
          },
          activeFilterCount: panelFilterCount,
          onClearFilters: clearFilters,
          syncKey: `${staffSearch}|${roleFilter}|${loadFilter}|${staffIdFilter}|${taskTypeFilter}|${kpiFilter}|${taskSortKey}|${taskSortDir}|${loading}|${taskActionLoading}|${autoAssignEligibleCount}|${staffKpiRows.length}`,
          actions: (
            <>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading || taskActionLoading === "auto"}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <span
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1.5 text-sm font-semibold text-[#166534]"
                title="New and unassigned tasks are assigned automatically via routing rules or least-loaded staff."
              >
                {taskActionLoading === "auto" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
                Auto-assign on
                {autoAssignEligibleCount > 0 ? ` · ${autoAssignEligibleCount} pending` : ""}
              </span>
            </>
          ),
          filtersContent: (
            <>
              <label className="block text-sm">
                <span className="text-xs text-[#627D98]">Staff</span>
                <select
                  value={staffIdFilter}
                  onChange={(e) => setStaffIdFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">All staff</option>
                  <option value="unassigned">Unassigned only</option>
                  {staffKpiRows.map((staff) => (
                    <option key={staff.id} value={String(staff.id)}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-[#627D98]">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">All roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-[#627D98]">Load</span>
                <select
                  value={loadFilter}
                  onChange={(e) => setLoadFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">Any</option>
                  <option value="active">Active</option>
                  <option value="busy">Busy</option>
                  <option value="overloaded">Overloaded</option>
                  <option value="overdue">Overdue tasks</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-[#627D98]">Task type</span>
                <select
                  value={taskTypeFilter}
                  onChange={(e) => setTaskTypeFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">All task types</option>
                  {taskTypeOptions.map((taskType) => (
                    <option key={taskType} value={taskType}>
                      {formatTaskTypeLabel(taskType)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-[#627D98]">Sort</span>
                <select
                  value={`${taskSortKey}:${taskSortDir}`}
                  onChange={(e) => {
                    const [key, dir] = e.target.value.split(":") as [TaskSortKey, SortDir];
                    setTaskSortKey(key);
                    setTaskSortDir(dir);
                  }}
                  className={filterFieldClass}
                >
                  <option value="created:desc">Newest first</option>
                  <option value="created:asc">Oldest first</option>
                  <option value="deadline:asc">Deadline soonest</option>
                  <option value="deadline:desc">Deadline latest</option>
                  <option value="application:asc">Application A–Z</option>
                  <option value="application:desc">Application Z–A</option>
                  <option value="status:asc">Status A–Z</option>
                  <option value="assignee:asc">Assignee A–Z</option>
                </select>
              </label>
            </>
          ),
        }
      : { title: "Workload", icon: UserCog },
    { enabled: !embedded },
  );

  if (!canManageTasks) {
    return (
      <div className="relative min-h-[60vh] space-y-3 font-body">
        <SlideOverPanel
          isOpen={isCasePanelOpen}
          onClose={closeCase}
          caseData={selectedCase}
          details={selectedCaseDetails}
          documents={selectedCaseDocuments}
          detailsLoading={detailsLoading}
          detailsError={detailsError}
          documentsLoading={documentsLoading}
          documentsError={documentsError}
          onStageResolved={handleStageResolved}
        />
        <div className="flex gap-1 border-b border-[#D9E1EA]">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === "calendar" || activeTab === "overview"
                ? "border-[#009877] text-[#006F57]"
                : "border-transparent text-[#627D98] hover:text-[#102A43]"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("notes");
              void loadDashboard();
            }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === "notes"
                ? "border-[#009877] text-[#006F57]"
                : "border-transparent text-[#627D98] hover:text-[#102A43]"
            }`}
          >
            My tasks ({myOpenTaskCount})
          </button>
        </div>

        {loading ? (
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-8 text-center text-sm text-[#627D98]">
            Loading…
          </div>
        ) : activeTab === "notes" ? (
          <div className="overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5EAF0] px-4 py-3">
              <div>
                <h2 className="text-sm font-heading font-semibold text-[#102A43]">My tasks</h2>
                <p className="text-[11px] text-[#627D98]">
                  {onLeaveToday
                    ? "You are on leave today — you can reassign open tasks to an available teammate."
                    : "Open work only by default. Reassign appears only when you are marked on leave today."}
                </p>
              </div>
              <label className="text-[11px] font-medium text-[#486581]">
                Show
                <select
                  value={myTasksStatusFilter}
                  onChange={(e) => setMyTasksStatusFilter(e.target.value as MyTasksStatusFilter)}
                  className="ml-2 rounded-[8px] border border-[#D9E1EA] bg-white px-2 py-1.5 text-xs text-[#102A43]"
                >
                  <option value="open">Open (present)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581]">
                  <tr>
                    <SortableTh
                      label="Case"
                      sortKey="application"
                      activeKey={taskSortKey}
                      dir={taskSortDir}
                      onSort={handleTaskSort}
                    />
                    <SortableTh
                      label="Task"
                      sortKey="task"
                      activeKey={taskSortKey}
                      dir={taskSortDir}
                      onSort={handleTaskSort}
                    />
                    <SortableTh
                      label="Status"
                      sortKey="status"
                      activeKey={taskSortKey}
                      dir={taskSortDir}
                      onSort={handleTaskSort}
                    />
                    {onLeaveToday ? (
                      <th className="px-3 py-2 text-left font-medium">Reassign to</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {myTasks.length === 0 ? (
                    <tr>
                      <td colSpan={onLeaveToday ? 4 : 3} className="px-3 py-6 text-center text-[#627D98]">
                        {myTasksStatusFilter === "open"
                          ? "No open tasks assigned to you."
                          : "No tasks match this filter."}
                      </td>
                    </tr>
                  ) : (
                    myTasks.map((task) => {
                      const isBusy = taskActionLoading === task.id;
                      const selectedStaffId = taskSelections[task.id] || "";
                      return (
                        <tr
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openCaseFromTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openCaseFromTask(task);
                            }
                          }}
                          className={`hover:bg-[#EFF7FF] cursor-pointer ${taskIsExpress(task) ? "bg-[#FFF7ED]" : ""}`}
                        >
                          <td className="px-3 py-2 font-medium text-[#0B69B7]">
                            <span className="inline-flex items-center gap-1.5">
                              {taskIsExpress(task) ? <ExpressBadge compact /> : null}
                              {task.application_reference || `#${task.id}`}
                            </span>
                          </td>
                          <td className="px-3 py-2 capitalize text-[#486581]">
                            {formatTaskTypeLabel(task)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${taskStatusBadgeClass(getTaskEffectiveStatus(task))}`}
                            >
                              {formatTaskStatusLabel(getTaskEffectiveStatus(task))}
                            </span>
                          </td>
                          {onLeaveToday ? (
                            <td
                              className="px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {isTaskClosedOut(task) ? (
                                <span className="text-xs text-[#627D98]">Closed</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={selectedStaffId}
                                    onChange={(e) => handleTaskSelectionChange(task.id, e.target.value)}
                                    className="rounded-[8px] border border-[#D9E1EA] px-2 py-1 text-xs"
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
                                    onClick={() => void handleAssignTask(task)}
                                    className="rounded-[8px] bg-[#009877] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                  >
                                    {isBusy ? "…" : "Reassign"}
                                  </button>
                                </div>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {onLeaveToday && !peerColleagues.length ? (
              <p className="border-t border-[#E5EAF0] px-4 py-2 text-[11px] text-[#829AB1]">
                No colleagues available to reassign to right now.
              </p>
            ) : null}
          </div>
        ) : (
          <WorkloadCalendarTab canManageOthers={false} selfStaffId={adminUser?.id} />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] space-y-3 font-body">
      <SlideOverPanel
        isOpen={isCasePanelOpen}
        onClose={closeCase}
        caseData={selectedCase}
        details={selectedCaseDetails}
        documents={selectedCaseDocuments}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        documentsLoading={documentsLoading}
        documentsError={documentsError}
        onStageResolved={handleStageResolved}
      />
      <StaffWorkloadSlideOver
        isOpen={Boolean(selectedStaff)}
        onClose={() => setSelectedStaff(null)}
        staff={selectedStaff}
        tasks={selectedStaffTasks}
        allTasks={selectedStaffAllTasks}
        internalNotes={selectedStaffNotes}
      />

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {kpiButtons.map((kpi) => (
            <button
              key={kpi.key}
              type="button"
              onClick={() => {
                setKpiFilter((current) => {
                  if (kpi.key === "all") return current === "all" ? null : "all";
                  return current === kpi.key ? null : kpi.key;
                });
              }}
              className={`rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                (kpi.key === "all" && kpiFilter === null) || kpiFilter === kpi.key
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

      <div className="flex gap-1 border-b border-[#D9E1EA]">
        <button
          type="button"
          onClick={() => goToWorkloadTab("overview")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "overview"
              ? "border-[#009877] text-[#006F57]"
              : "border-transparent text-[#627D98] hover:text-[#102A43]"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => goToWorkloadTab("calendar")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "calendar"
              ? "border-[#009877] text-[#006F57]"
              : "border-transparent text-[#627D98] hover:text-[#102A43]"
          }`}
        >
          Calendar
        </button>
        {isFounderView ? (
          <button
            type="button"
            onClick={() => goToWorkloadTab("reassigns")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === "reassigns"
                ? "border-[#009877] text-[#006F57]"
                : "border-transparent text-[#627D98] hover:text-[#102A43]"
            }`}
          >
            Reassigns
            {pendingReassigns.length > 0 || Number(dashboardData?.pending_reassign_count || 0) > 0
              ? ` (${pendingReassigns.length || dashboardData?.pending_reassign_count || 0})`
              : ""}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => goToWorkloadTab("notes")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "notes"
              ? "border-[#009877] text-[#006F57]"
              : "border-transparent text-[#627D98] hover:text-[#102A43]"
          }`}
        >
          Internal notes ({internalMessages.length})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-8 text-center text-sm text-[#627D98]">Loading…</div>
      ) : activeTab === "reassigns" && isFounderView ? (
        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-heading font-semibold text-[#102A43]">Pending staff reassigns</h2>
              <p className="text-[11px] text-[#627D98]">
                Approve or reject staff reassign requests. Alerts and notifications also appear in the bell.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPendingReassigns()}
              className="rounded-[8px] border border-[#D9E1EA] px-2.5 py-1 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              Refresh
            </button>
          </div>
          {pendingReassigns.length === 0 ? (
            <p className="text-sm text-[#486581]">No pending requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Case</th>
                    <th className="px-3 py-2 text-left font-medium">From</th>
                    <th className="px-3 py-2 text-left font-medium">To</th>
                    <th className="px-3 py-2 text-left font-medium">Task</th>
                    <th className="px-3 py-2 text-left font-medium">Requested by</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {pendingReassigns.map((row) => {
                    const busy = reassignBusyId === row.id;
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-medium text-[#102A43]">
                          <button
                            type="button"
                            onClick={() => {
                              const linked = taskItems.find((t) => t.id === row.task_id);
                              if (linked?.application) {
                                openCaseFromTask(linked);
                                return;
                              }
                              toast.error("Open the case from Pipeline or My Cases if this task is missing.");
                            }}
                            className="text-left font-medium text-[#0B69B7] hover:underline"
                          >
                            {row.application_reference || `Task #${row.task_id}`}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-[#486581]">{row.from_staff_name}</td>
                        <td className="px-3 py-2 text-[#486581]">{row.to_staff_name}</td>
                        <td className="px-3 py-2 capitalize text-[#486581]">
                          {(row.task_type || "").replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2 text-[#486581]">{row.requested_by_name}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDecideReassign(row.id, "approve")}
                              className="rounded-[8px] bg-[#009877] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {busy ? "…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDecideReassign(row.id, "reject")}
                              className="rounded-[8px] border border-[#D9E1EA] px-2.5 py-1 text-xs font-semibold text-[#102A43] disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "calendar" ? (
        <WorkloadCalendarTab canManageOthers selfStaffId={adminUser?.id} />
      ) : activeTab === "notes" ? (
        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4">
          {internalMessages.length === 0 ? (
            <p className="text-sm text-[#627D98]">No internal notes yet.</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto space-y-2">
              {internalMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() =>
                    openCaseFromApplicationId(message.application_id, {
                      reference: message.application_reference,
                      customer: message.customer_name,
                    })
                  }
                  className="w-full rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2.5 text-left transition hover:border-[#33A1FD]/50 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-[#0B69B7]">
                    {message.application_reference}
                    {message.customer_name ? ` · ${message.customer_name}` : ""}
                  </p>
                  <p className="text-xs text-[#486581] mt-0.5">
                    {message.sender_name} → {message.recipient_name} ·{" "}
                    {message.created_at ? new Date(message.created_at).toLocaleString() : ""}
                  </p>
                  <p className="text-sm text-[#334E68] mt-1 whitespace-pre-wrap">{message.message_text}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {hasFilters ? (
            <p className="text-xs text-[#627D98]">
              Showing {filteredStaffRows.length} staff · {filteredTasks.length} tasks
            </p>
          ) : null}

          <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5EAF0]">
              <h2 className="text-sm font-heading font-semibold text-[#102A43]">Tasks</h2>
              <p className="text-[11px] text-[#627D98]">
                Newest first by default. Click a column header to sort, or use Sort in filters.
                Tasks are auto-assigned as they appear (routing rules first, then least-loaded staff).
                Case processors, reviewers, and support agents only see cases assigned to them —
                never another staff member&apos;s cases in Pipeline, Workload, or My Cases.
                {isOpsView ? (
                  <span className="block mt-0.5">
                    Ops/admin can still see the full board for oversight and manual reassignment.
                    {autoAssignStaffCount === 0 ? " Add eligible team staff so auto-assign can place work." : null}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="max-h-[min(55vh,520px)] overflow-auto">
              <table className="w-full min-w-[720px] md:min-w-[1100px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581] sticky top-0 z-10">
                  <tr>
                    <SortableTh label="Created" sortKey="created" activeKey={taskSortKey} dir={taskSortDir} onSort={handleTaskSort} />
                    <SortableTh label="Application" sortKey="application" activeKey={taskSortKey} dir={taskSortDir} onSort={handleTaskSort} />
                    <SortableTh label="Customer" sortKey="customer" activeKey={taskSortKey} dir={taskSortDir} onSort={handleTaskSort} />
                    <th className="hidden md:table-cell px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleTaskSort("task")}
                        className={`inline-flex items-center gap-1 ${taskSortKey === "task" ? "text-[#006F57]" : ""}`}
                      >
                        Task
                        {taskSortKey === "task" ? (
                          taskSortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                    <SortableTh label="Status" sortKey="status" activeKey={taskSortKey} dir={taskSortDir} onSort={handleTaskSort} />
                    <th className="hidden lg:table-cell px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleTaskSort("assignee")}
                        className={`inline-flex items-center gap-1 ${taskSortKey === "assignee" ? "text-[#006F57]" : ""}`}
                      >
                        Assignee
                        {taskSortKey === "assignee" ? (
                          taskSortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleTaskSort("deadline")}
                        className={`inline-flex items-center gap-1 ${taskSortKey === "deadline" ? "text-[#006F57]" : ""}`}
                      >
                        Deadline
                        {taskSortKey === "deadline" ? (
                          taskSortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-[#627D98]">
                        No tasks match filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const isBusy = taskActionLoading === task.id;
                      const selectedStaffId = taskSelectionValue(task);
                      const assignedToSelf = staffIdsMatch(task.assigned_staff, adminUser?.id);
                      const isClosedOut = isTaskClosedOut(task);
                      const effectiveStatus = getTaskEffectiveStatus(task);
                      const displayStatus = formatTaskStatusLabel(effectiveStatus);
                      const createdAt = getTaskCreatedAt(task);
                      return (
                        <tr
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openCaseFromTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openCaseFromTask(task);
                            }
                          }}
                          className={`align-top hover:bg-[#EFF7FF] cursor-pointer ${
                            taskIsExpress(task) ? "bg-[#FFF7ED]" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-[#486581] whitespace-nowrap">
                            {formatDateOnly(createdAt)}
                            <br />
                            <span className="text-[11px]">{formatTimeOnly(createdAt)}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-[#0B69B7]">
                            <span className="inline-flex items-center gap-1.5">
                              {taskIsExpress(task) ? <ExpressBadge compact /> : null}
                              {task.application_reference || `#${task.id}`}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#486581]">{task.customer_name || "—"}</td>
                          <td className="hidden md:table-cell px-3 py-2 capitalize text-[#486581]">{task.task_type.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${taskStatusBadgeClass(effectiveStatus)}`}
                            >
                              {displayStatus}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-3 py-2 text-[#102A43]">
                            {assignedToSelf ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-semibold text-[#006F57]">You</span>
                                <span className="text-[10px] rounded-full bg-[#009877]/12 text-[#006F57] px-2 py-0.5">
                                  assigned
                                </span>
                              </span>
                            ) : (
                              assigneeLabel(task)
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 text-[#486581] whitespace-nowrap">{formatDateOnly(task.deadline)}</td>
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            {isClosedOut ? (
                              <span className="text-xs text-[#627D98]">Closed</span>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                                <select
                                  value={selectedStaffId}
                                  onChange={(e) => handleTaskSelectionChange(task.id, e.target.value)}
                                  className="w-full min-w-0 sm:min-w-[120px] sm:max-w-[160px] rounded-[8px] border border-[#D9E1EA] px-2 py-1 text-xs bg-white"
                                >
                                  <option value="">Staff…</option>
                                  {staffOptionsForTask(task).map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                      {staffIdsMatch(staff.id, adminUser?.id) ? `${staff.name} (you)` : staff.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void handleAssignTask(task)}
                                  disabled={isBusy}
                                  className="rounded-[8px] bg-[#009877] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                                >
                                  {isBusy ? "…" : assignedToSelf ? "Reassign" : "Assign"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showStaffTable ? (
            <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-[#102A43]">Staff summary</h2>
                  <p className="text-[11px] text-[#627D98]">Click staff → then click a task for details</p>
                </div>
                <span className="text-xs text-[#627D98]">{teamKpis.activeStaff} staff</span>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full min-w-[520px] md:min-w-[600px] text-sm">
                  <thead className="bg-[#F8FAFC] text-[#486581] sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Staff</th>
                      <th className="px-3 py-2 text-left font-medium">Role</th>
                      <th className="px-3 py-2 text-center font-medium">Assigned</th>
                      <th className="px-3 py-2 text-center font-medium">Pending</th>
                      <th className="px-3 py-2 text-center font-medium">Done</th>
                      <th className="px-3 py-2 text-left font-medium">Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {filteredStaffRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-[#627D98]">
                          No staff match filters.
                        </td>
                      </tr>
                    ) : (
                      filteredStaffRows.map((item) => (
                        <tr
                          key={item.id}
                          className={`cursor-pointer hover:bg-[#F8FAFC] transition-colors ${
                            selectedStaff?.id === item.id ? "bg-[#EFF7FF]" : ""
                          }`}
                          onClick={() => setSelectedStaff(item)}
                        >
                          <td className="px-3 py-2 font-medium text-[#102A43]">
                            {item.name}
                            {item.slaBreach > 0 ? (
                              <span className="ml-1 text-[10px] text-[#B42318]">({item.slaBreach} overdue)</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-[#486581] capitalize">{String(item.role).replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-center font-semibold text-[#0B69B7]">{item.assigned}</td>
                          <td className="px-3 py-2 text-center font-semibold text-[#9C4F17]">{item.pending}</td>
                          <td className="px-3 py-2 text-center font-semibold text-[#006F57]">{item.completed}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${loadStatusStyles(item.loadStatus)}`}>
                              {item.loadStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
