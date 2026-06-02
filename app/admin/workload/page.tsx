"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Shuffle, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  adminDirectAssignTask,
  assignAdminTask,
  autoAssignAdminTasks,
  getAdminDashboardOverview,
  listAdminTasks,
  patchAdminApplication,
  type AdminDashboardOverview,
  type AdminTaskItem,
} from "@/lib/admin-auth";

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

  const staffMembers = dashboardData?.staff_members ?? [];
  const pendingTaskStatuses = useMemo(() => new Set(["new", "in_progress", "blocked"]), []);

  const assignableStaff = useMemo(
    () =>
      staffMembers.filter((staff) => {
        const role = String(staff.role || "").toLowerCase();
        if (staff.id === adminUser?.id) return false;
        if (role === "admin") return false;
        return true;
      }),
    [staffMembers, adminUser?.id],
  );

  const workloadByStaff = useMemo(() => {
    const counts: Record<number, { assigned: number; pending: number; completed: number; loadStatus: string }> = {};

    for (const task of taskItems) {
      if (!task.assigned_staff) continue;
      const staffId = task.assigned_staff;
      if (!counts[staffId]) {
        counts[staffId] = { assigned: 0, pending: 0, completed: 0, loadStatus: "Active" };
      }
      counts[staffId].assigned += 1;
      if (pendingTaskStatuses.has(String(task.status || "").toLowerCase())) {
        counts[staffId].pending += 1;
      }
      if (String(task.status || "").toLowerCase() === "completed") {
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
  }, [pendingTaskStatuses, taskItems]);

  const taskOwnershipRows = useMemo(() => {
    const byStaff = new Map<number, AdminTaskItem[]>();
    const unassigned: AdminTaskItem[] = [];

    for (const task of taskItems) {
      if (!task.assigned_staff) {
        unassigned.push(task);
        continue;
      }
      const existing = byStaff.get(task.assigned_staff) ?? [];
      existing.push(task);
      byStaff.set(task.assigned_staff, existing);
    }

    const staffRows = staffMembers
      .filter((staff) => staff.id !== adminUser?.id)
      .map((staff) => {
        const tasks = byStaff.get(staff.id) ?? [];
        return {
          id: `staff-${staff.id}`,
          name: staff.name,
          role: staff.role,
          initials: staff.initials,
          tasks,
        };
      })
      .filter((row) => row.tasks.length > 0)
      .sort((a, b) => b.tasks.length - a.tasks.length);

    if (unassigned.length > 0) {
      staffRows.push({
        id: "unassigned",
        name: "Unassigned Queue",
        role: "queue",
        initials: "UQ",
        tasks: unassigned,
      });
    }

    return staffRows;
  }, [taskItems, staffMembers, adminUser?.id]);

  const getTaskCreatedAt = (task: AdminTaskItem) => {
    const raw = (task as AdminTaskItem & { createdAt?: string | null }).created_at ?? (task as any).createdAt ?? null;
    return raw;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const formatDateOnly = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString();
  };

  const formatTimeOnly = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleTimeString();
  };

  const loadDashboard = async () => {
    if (!canManageTasks) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [payload, taskPayload] = await Promise.all([getAdminDashboardOverview(), listAdminTasks({ limit: 500 })]);
      setDashboardData(payload);
      setTaskItems(taskPayload);

      const staffByName = new Map(payload.staff_members.map((staff) => [staff.name, staff.id]));
      setTaskSelections(
        Object.fromEntries(
          taskPayload.map((task) => [
            task.id,
            task.assigned_staff
              ? String(task.assigned_staff)
              : task.assigned_staff_name
              ? String(staffByName.get(task.assigned_staff_name) ?? "")
              : "",
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

      if (task.application) {
        await patchAdminApplication(task.application, {
          assigned_staff: Number(selectedStaffId),
        });
      }

      setTaskItems((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
      setTaskSelections((prev) => ({
        ...prev,
        [task.id]: updatedTask.assigned_staff ? String(updatedTask.assigned_staff) : String(selectedStaffId),
      }));
      toast.success(`Task ${updatedTask.id} assigned successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign task.");
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleAutoAssignTasks = async () => {
    setTaskActionLoading("auto");
    try {
      const result = await autoAssignAdminTasks();
      setTaskSelections({});
      await loadDashboard();
      toast.success(`Auto-assigned ${result.assigned_count ?? 0} tasks.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to auto-assign tasks.");
    } finally {
      setTaskActionLoading(null);
    }
  };

  if (!canManageTasks) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Workload</h1>
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
          <p className="text-sm text-[#627D98]">
            You do not have access to this module. Workload management is available for admin and operations manager
            roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Workload</h1>
        <p className="text-sm text-[#627D98] mt-1">Monitor staff load and assign queued work from one place.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-6 text-[#627D98] text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-heading font-semibold text-[#102A43]">Task Assignment Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => void loadDashboard()}
                  className="inline-flex items-center gap-2 bg-[#009877] text-white px-4 py-2 rounded-[10px] text-sm font-heading font-semibold hover:bg-[#007B61] disabled:opacity-60"
                  disabled={taskActionLoading === "auto"}
                >
                  <RefreshCw className="w-4 h-4" />
                  REFRESH
                </button>
                <button
                  onClick={() => void handleAutoAssignTasks()}
                  disabled={taskActionLoading === "auto"}
                  className="inline-flex items-center gap-2 bg-[#33A1FD] text-white px-4 py-2 rounded-[10px] text-sm font-heading font-semibold hover:bg-[#0B69B7] disabled:opacity-60"
                >
                  {taskActionLoading === "auto" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                  {taskActionLoading === "auto" ? "Assigning..." : "AUTO ASSIGN"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-[#D9E1EA]">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Created Date</th>
                    <th className="px-3 py-2 text-left font-medium">Created Time</th>
                    <th className="px-3 py-2 text-left font-medium">Application</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-left font-medium">Task</th>
                    <th className="px-3 py-2 text-left font-medium">Priority</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Current Assignee</th>
                    <th className="px-3 py-2 text-left font-medium">Deadline Date</th>
                    <th className="px-3 py-2 text-left font-medium">Deadline Time</th>
                    <th className="px-3 py-2 text-left font-medium">Assign / Reassign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] bg-white">
                  {taskItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-[#627D98]">
                        No tasks available.
                      </td>
                    </tr>
                  ) : (
                    taskItems.map((task) => {
                      const isBusy = taskActionLoading === task.id;
                      const selectedStaffId = taskSelections[task.id] ?? task.assigned_staff ?? "";
                      const isClosedOut = task.status === "completed" || task.status === "cancelled";
                      const createdAt = getTaskCreatedAt(task);
                      return (
                        <tr key={task.id} className="align-top">
                          <td className="px-3 py-2 text-[#486581]">{formatDateOnly(createdAt)}</td>
                          <td className="px-3 py-2 text-[#486581]">{formatTimeOnly(createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-[#102A43]">{task.application_reference || `Task #${task.id}`}</td>
                          <td className="px-3 py-2 text-[#486581]">{task.customer_name || "Customer"}</td>
                          <td className="px-3 py-2 capitalize text-[#486581]">{task.task_type.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 uppercase text-[#9C4F17]">{task.priority}</td>
                          <td className="px-3 py-2">
                            <span className="uppercase text-[11px] rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-2 py-0.5 text-[#486581]">
                              {task.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-[#102A43]">{task.assigned_staff_name || "Unassigned"}</div>
                            {task.assigned_staff_role ? (
                              <div className="text-[11px] text-[#627D98] mt-0.5">{task.assigned_staff_role}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-[#486581]">{formatDateOnly(task.deadline)}</td>
                          <td className="px-3 py-2 text-[#486581]">{formatTimeOnly(task.deadline)}</td>
                          <td className="px-3 py-2">
                            {isClosedOut ? (
                              <span className="text-xs text-[#627D98]">Closed task</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedStaffId}
                                  onChange={(event) => handleTaskSelectionChange(task.id, event.target.value)}
                                  className="min-w-[180px] rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs text-[#102A43] outline-none focus:border-[#33A1FD]"
                                >
                                  <option value="">Select staff</option>
                                  {assignableStaff.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                      {staff.name} - {staff.role}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => void handleAssignTask(task)}
                                  disabled={isBusy || assignableStaff.length === 0}
                                  className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                                >
                                  {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCog className="w-3.5 h-3.5" />}
                                  {isBusy ? "Saving" : "Assign"}
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

          <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">Who Is Doing What (Summary Table)</h2>
            <div className="overflow-x-auto rounded-[10px] border border-[#D9E1EA]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#F8FAFC] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Staff</th>
                    <th className="px-3 py-2 text-left font-medium">Role</th>
                    <th className="px-3 py-2 text-left font-medium">Assigned</th>
                    <th className="px-3 py-2 text-left font-medium">Pending</th>
                    <th className="px-3 py-2 text-left font-medium">Completed</th>
                    <th className="px-3 py-2 text-left font-medium">Load Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] bg-white">
                  {staffMembers
                    .filter((item) => item.id !== adminUser?.id)
                    .map((item) => {
                      const summary = workloadByStaff[item.id] || {
                        assigned: 0,
                        pending: 0,
                        completed: 0,
                        loadStatus: item.loadStatus,
                      };
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-[#102A43] font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-[#486581] capitalize">{item.role.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-[#0B69B7] font-medium">{summary.assigned}</td>
                          <td className="px-3 py-2 text-[#9C4F17] font-medium">{summary.pending}</td>
                          <td className="px-3 py-2 text-[#006F57] font-medium">{summary.completed}</td>
                          <td className="px-3 py-2 text-[#486581]">{summary.loadStatus}</td>
                        </tr>
                      );
                    })}
                  {staffMembers.filter((item) => item.id !== adminUser?.id).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[#627D98]">
                        No staff rows available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-[#627D98]">
              Unassigned queue count:{" "}
              <span className="font-medium text-[#102A43]">{taskOwnershipRows.find((row) => row.id === "unassigned")?.tasks.length ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
