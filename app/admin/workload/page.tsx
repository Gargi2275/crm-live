"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Shuffle, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  StaffWorkloadSlideOver,
  type StaffWorkloadSummary,
} from "@/components/console/workload/StaffWorkloadSlideOver";
import {
  adminDirectAssignTask,
  assignAdminTask,
  autoAssignAdminTasks,
  getAdminDashboardOverview,
  getAdminInternalMessagesFeed,
  getTaskEffectiveStatus,
  isAdminStaffRole,
  isTaskClosedOut,
  isTaskCompleted,
  isTaskPending,
  listAdminTasks,
  staffIdsMatch,
  type AdminDashboardOverview,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm bg-white";

type KpiFilterKey = "all" | "assigned" | "pending" | "completed" | "unassigned";
type WorkloadTab = "overview" | "notes";

const TASK_TYPE_LABELS: Record<string, string> = {
  audit: "Audit",
  document_review: "Document Review",
  form_filling: "Form Filling",
  form_review: "Form Review",
  submission: "Submission",
  delivery_follow_up: "Delivery Follow-up",
  other: "Other",
};

function formatTaskTypeLabel(taskType: string) {
  const key = String(taskType || "").toLowerCase();
  return TASK_TYPE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminWorkloadPage() {
  const { adminUser } = useAdminAuth();
  const userRole = adminUser?.role;
  const isFounderView = userRole === "admin";
  const isOpsView = userRole === "ops_manager";
  const canManageTasks = isFounderView || isOpsView;

  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [taskItems, setTaskItems] = useState<AdminTaskItem[]>([]);
  const [taskSelections, setTaskSelections] = useState<Record<number, string>>({});
  const [taskActionLoading, setTaskActionLoading] = useState<number | "auto" | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffWorkloadSummary | null>(null);
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const [activeTab, setActiveTab] = useState<WorkloadTab>("overview");
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loadFilter, setLoadFilter] = useState("all");
  const [staffIdFilter, setStaffIdFilter] = useState("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState("all");

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
        if (isFounderView && staffIdsMatch(staff.id, adminUser?.id)) return false;
        return true;
      })
      .map((staff) => {
        const live = workloadByStaff[staff.id];
        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          assigned: live?.assigned ?? staff.assigned,
          pending: live?.pending ?? staff.pending,
          completed: live?.completed ?? staff.completed,
          loadStatus: live?.loadStatus ?? staff.loadStatus,
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
    staffSearch.trim() !== "" ||
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

    if (effectiveKpi === "pending") rows = rows.filter((row) => row.pending > 0);
    else if (effectiveKpi === "assigned") rows = rows.filter((row) => row.assigned > 0);
    else if (effectiveKpi === "completed") rows = rows.filter((row) => row.completed > 0);
    else if (effectiveKpi === "unassigned") rows = [];

    if (staffSearch.trim()) {
      const query = staffSearch.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          String(row.role || "").toLowerCase().includes(query),
      );
    }

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

    return rows;
  }, [effectiveKpi, loadFilter, roleFilter, staffIdFilter, staffKpiRows, staffSearch, taskTypeFilter, taskItems]);

  const filteredTasks = useMemo(() => {
    let tasks = [...taskItems];

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
      (roleFilter !== "all" || loadFilter !== "all" || staffSearch.trim() || taskTypeFilter !== "all")
    ) {
      const staffIds = new Set(filteredStaffRows.map((row) => row.id));
      tasks = tasks.filter(
        (task) => isTaskUnassigned(task) || staffIds.has(Number(task.assigned_staff)),
      );
    }

    if (staffSearch.trim()) {
      const query = staffSearch.trim().toLowerCase();
      tasks = tasks.filter(
        (task) =>
          String(task.assigned_staff_name || "").toLowerCase().includes(query) ||
          String(task.application_reference || "").toLowerCase().includes(query) ||
          String(task.customer_name || "").toLowerCase().includes(query),
      );
    }

    return tasks;
  }, [
    filteredStaffRows,
    hasFilters,
    effectiveKpi,
    loadFilter,
    roleFilter,
    staffIdFilter,
    staffSearch,
    taskItems,
    taskTypeFilter,
  ]);

  const showStaffTable = effectiveKpi !== "unassigned" && staffIdFilter !== "unassigned";

  const clearFilters = () => {
    setKpiFilter(null);
    setRoleFilter("all");
    setLoadFilter("all");
    setStaffIdFilter("all");
    setTaskTypeFilter("all");
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
    if (!canManageTasks) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workload.");
    } finally {
      setLoading(false);
    }
  };

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

    setTaskActionLoading(task.id);
    try {
      const updatedTask = isFounderView
        ? await adminDirectAssignTask(task.id, Number(selectedStaffId))
        : await assignAdminTask(task.id, Number(selectedStaffId));

      setTaskItems((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
      setTaskSelections((prev) => ({ ...prev, [task.id]: String(selectedStaffId) }));
      toast.success("Task assigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign task.");
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleAutoAssignTasks = async () => {
    if (autoAssignStaffCount === 0) {
      toast.error(
        isOpsView
          ? "No eligible staff for auto-assign. You need active case processors, reviewers, support agents, or other ops managers (not you or admins)."
          : "No active staff available for auto-assign.",
      );
      return;
    }
    if (autoAssignEligibleCount === 0) {
      toast.error("No unassigned pending tasks in the queue.");
      return;
    }
    setTaskActionLoading("auto");
    try {
      const result = await autoAssignAdminTasks();
      await loadDashboard();
      const count = result.assigned_count ?? 0;
      if (count > 0) toast.success(result.message || `Auto-assigned ${count} task(s).`);
      else toast.error(result.message || "No tasks were assigned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to auto-assign.");
    } finally {
      setTaskActionLoading(null);
    }
  };

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
          syncKey: `${staffSearch}|${roleFilter}|${loadFilter}|${staffIdFilter}|${taskTypeFilter}|${kpiFilter}|${loading}|${taskActionLoading}|${autoAssignEligibleCount}|${staffKpiRows.length}`,
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
              <button
                type="button"
                onClick={() => void handleAutoAssignTasks()}
                disabled={taskActionLoading === "auto"}
                title={
                  autoAssignEligibleCount === 0
                    ? "No unassigned pending tasks"
                    : autoAssignStaffCount === 0
                      ? "No eligible staff to receive tasks"
                      : `Distribute ${autoAssignEligibleCount} task(s) across ${autoAssignStaffCount} staff`
                }
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#33A1FD] px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-[#0B69B7] disabled:opacity-60"
              >
                {taskActionLoading === "auto" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                Auto assign{autoAssignEligibleCount > 0 ? ` (${autoAssignEligibleCount})` : ""}
              </button>
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
            </>
          ),
        }
      : { title: "Workload", icon: UserCog },
  );

  if (!canManageTasks) {
    return (
      <div className="space-y-4 font-body">
        <p className="text-sm text-[#627D98]">Available for admin and operations manager only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-body">
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
          onClick={() => setActiveTab("overview")}
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
          onClick={() => setActiveTab("notes")}
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
      ) : activeTab === "notes" ? (
        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4">
          {internalMessages.length === 0 ? (
            <p className="text-sm text-[#627D98]">No internal notes yet.</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto space-y-2">
              {internalMessages.map((message) => (
                <div key={message.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-sm font-semibold text-[#102A43]">
                    {message.application_reference}
                    {message.customer_name ? ` · ${message.customer_name}` : ""}
                  </p>
                  <p className="text-xs text-[#486581] mt-0.5">
                    {message.sender_name} → {message.recipient_name} ·{" "}
                    {message.created_at ? new Date(message.created_at).toLocaleString() : ""}
                  </p>
                  <p className="text-sm text-[#334E68] mt-1 whitespace-pre-wrap">{message.message_text}</p>
                </div>
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
                New tasks appear here unassigned. Use the dropdown + Assign, or Auto assign — nothing is assigned automatically on creation.
                {isOpsView ? (
                  <span className="block mt-0.5">
                    Auto assign is available for ops managers — it distributes to case staff and other ops managers (not you or admins).
                    {autoAssignStaffCount === 0 ? " Add eligible team staff to use auto-assign." : null}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Created</th>
                    <th className="px-3 py-2 text-left font-medium">Application</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-left font-medium">Task</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Assignee</th>
                    <th className="px-3 py-2 text-left font-medium">Deadline</th>
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
                      const displayStatus = getTaskEffectiveStatus(task);
                      const createdAt = getTaskCreatedAt(task);
                      return (
                        <tr key={task.id} className="align-top hover:bg-[#FAFBFC]">
                          <td className="px-3 py-2 text-[#486581] whitespace-nowrap">
                            {formatDateOnly(createdAt)}
                            <br />
                            <span className="text-[11px]">{formatTimeOnly(createdAt)}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-[#102A43]">{task.application_reference || `#${task.id}`}</td>
                          <td className="px-3 py-2 text-[#486581]">{task.customer_name || "—"}</td>
                          <td className="px-3 py-2 capitalize text-[#486581]">{task.task_type.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2">
                            <span className="uppercase text-[10px] rounded-full border border-[#D9E1EA] bg-[#F5F7FA] px-2 py-0.5">
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#102A43]">
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
                          <td className="px-3 py-2 text-[#486581] whitespace-nowrap">{formatDateOnly(task.deadline)}</td>
                          <td className="px-3 py-2">
                            {isClosedOut ? (
                              <span className="text-xs text-[#627D98]">Closed</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={selectedStaffId}
                                  onChange={(e) => handleTaskSelectionChange(task.id, e.target.value)}
                                  className="min-w-[140px] rounded-[8px] border border-[#D9E1EA] px-2 py-1 text-xs bg-white"
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
                                  {isBusy ? "…" : "Assign"}
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
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-[#F8FAFC] text-[#486581] sticky top-0">
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
