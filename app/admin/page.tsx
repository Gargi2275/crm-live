"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/console/StatCard";
import {
  Users,
  Briefcase,
  IndianRupee,
  Clock,
  SearchCheck,
  Banknote,
  AlertTriangle,
  ShieldCheck,
  Workflow,
  TrendingUp,
  Target,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminDashboardOverview,
  getStaffPerformanceBadge,
  hasFlyOciConsoleAccess,
  isStaffOwnRevenueDashboard,
  listAdminApplications,
  listAdminTasks,
  patchAdminTask,
  patchAdminApplication,
  staffIdsMatch,
  type AdminApplication,
  type AdminDashboardOverview,
  type AdminTaskItem,
  type StaffRevenueKpi,
} from "@/lib/admin-auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ConsoleDashboard() {
  const router = useRouter();
  const { adminUser, isBootstrapped } = useAdminAuth();
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [taskItems, setTaskItems] = useState<AdminTaskItem[]>([]);
  const [staffBadge, setStaffBadge] = useState<string | null>(null);
  const userRole = adminUser?.role;
  const roleLabelMap: Record<string, string> = {
    admin: "Admin",
    ops_manager: "Operations Manager",
    case_processor: "Case Processor",
    reviewer: "Reviewer",
    support_agent: "Support Agent",
  };
  const roleLabel = userRole ? roleLabelMap[userRole] || userRole : "Staff";
  const isFounderView = userRole === "admin";
  const isOpsView = userRole === "ops_manager";
  const isStaffConsoleRole =
    userRole === "case_processor" || userRole === "reviewer" || userRole === "support_agent";
  const isOwnRevenueDashboard = isStaffOwnRevenueDashboard(dashboardData, userRole);
  const accessScope = adminUser?.access_scope ?? "all";
  const chartColors = ["#009877", "#33A1FD", "#B87333", "#DCE7F3"];
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const loadRequestIdRef = useRef(0);

  const loadDashboard = useCallback(async (options?: { background?: boolean }) => {
    const requestId = ++loadRequestIdRef.current;
    if (!options?.background) {
      setLoading(true);
    }

    try {
      const shouldLoadTasks = isFounderView || isOpsView;
      const [payload, appPayload, taskPayload] = await Promise.all([
        getAdminDashboardOverview(),
        isStaffConsoleRole ? Promise.resolve([] as AdminApplication[]) : listAdminApplications(),
        shouldLoadTasks
          ? listAdminTasks({ limit: 500 })
          : isStaffConsoleRole && adminUser?.id
            ? listAdminTasks({ limit: 100, assignedStaffId: adminUser.id })
            : Promise.resolve([] as AdminTaskItem[]),
      ]);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setDashboardData(payload);
      setApplications(appPayload);
      if (shouldLoadTasks || isStaffConsoleRole) {
        setTaskItems(taskPayload);
      }
      if (isStaffConsoleRole) {
        try {
          const badgePayload = await getStaffPerformanceBadge();
          if (requestId === loadRequestIdRef.current) {
            setStaffBadge(badgePayload.badge);
          }
        } catch {
          if (requestId === loadRequestIdRef.current) {
            setStaffBadge(null);
          }
        }
      }
    } catch (error) {
      if (requestId === loadRequestIdRef.current) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard overview.");
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [adminUser?.id, isFounderView, isOpsView, isStaffConsoleRole]);

  useEffect(() => {
    if (!isBootstrapped || !adminUser) {
      return;
    }

    if (!hasFlyOciConsoleAccess(accessScope)) {
      router.replace("/admin/easyfly");
      return;
    }

    setAuthReady(true);
    void loadDashboard();

    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [isBootstrapped, adminUser?.id, adminUser?.role, accessScope, loadDashboard]);

  const kpiSnapshot = {
    total_leads: dashboardData?.kpi_snapshot?.total_leads ?? 0,
    todays_leads: dashboardData?.kpi_snapshot?.todays_leads ?? 0,
    converted: dashboardData?.kpi_snapshot?.converted ?? 0,
    conversion: dashboardData?.kpi_snapshot?.conversion ?? "0%",
    revenue_today: dashboardData?.kpi_snapshot?.revenue_today ?? 0,
    order_revenue_today: dashboardData?.kpi_snapshot?.order_revenue_today ?? 0,
    audit_revenue_today: dashboardData?.kpi_snapshot?.audit_revenue_today ?? 0,
    full_payment_revenue_today: dashboardData?.kpi_snapshot?.full_payment_revenue_today ?? 0,
    pending_payments: dashboardData?.kpi_snapshot?.pending_payments ?? 0,
    avg_ticket_size: dashboardData?.kpi_snapshot?.avg_ticket_size ?? 0,
  };
  const dailyRevenue = dashboardData?.daily_revenue ?? [];
  const monthlyRevenue = dashboardData?.monthly_revenue ?? [];
  const serviceRevenueBreakdown = dashboardData?.service_revenue_breakdown ?? [];
  const accessLogs = dashboardData?.access_logs ?? [];
  const pipelineOverview = dashboardData?.pipeline_overview ?? [];
  const failedLogins = dashboardData?.failed_logins ?? 0;

  const pendingTaskStatuses = useMemo(() => new Set(["new", "in_progress", "blocked"]), []);

  const formatTaskDeadline = (deadline?: string | null) => {
    if (!deadline) {
      return "No deadline";
    }

    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return "No deadline";
    }

    return parsed.toLocaleString();
  };

 

  const healthMetrics = useMemo(
    () => [
      ["Total Leads Generated", dashboardData?.health_metrics?.total_leads ?? 0],
      ["Leads Converted", dashboardData?.health_metrics?.leads_converted ?? 0],
      ["Conversion %", dashboardData?.health_metrics?.conversion ?? "0%"],
      ["Revenue per Service Type", dashboardData?.health_metrics?.revenue_per_service ?? "N/A"],
      ["Pending Payments", `₹${(dashboardData?.health_metrics?.pending_payments ?? 0).toLocaleString("en-IN")}`],
      ["Refunds/Disputes", `₹${(dashboardData?.health_metrics?.refunds_disputes ?? 0).toLocaleString("en-IN")}`],
      ["Audits Requested", dashboardData?.health_metrics?.audits_requested ?? 0],
      ["Audit Success Ratio", dashboardData?.health_metrics?.audit_success_ratio ?? "0%"],
      ["Avg Processing Time", dashboardData?.health_metrics?.avg_processing_time ?? "0h"],
      ["Customer Satisfaction Rating", dashboardData?.health_metrics?.customer_satisfaction ?? "0 / 5"],
    ],
    [dashboardData],
  );

  const insightIconMap = useMemo(() => ({ TrendingUp, Target, Workflow }), []);

  const revenueInsights = useMemo(
    () =>
      (dashboardData?.revenue_insights ?? []).map((item) => ({
        ...item,
        icon: insightIconMap[item.icon as keyof typeof insightIconMap] ?? Workflow,
      })),
    [dashboardData, insightIconMap],
  );

 const staffWorklist = useMemo(() => {
  return taskItems.map((task) => {
    const app = applications.find((a) => a.reference_number === task.application_reference);
    return {
      id: task.id,
      applicationId: task.application,  // ← confirmed field name from API
      reference: task.application_reference,
      notes: app?.notes || "",
      title: `${task.task_type.replace(/_/g, " ")} - ${task.customer_name || "Customer"}`,
      subtitle: `Status: ${task.status} • Priority: ${task.priority} • ${task.application_reference}`,
    };
  });
}, [taskItems, applications]);

  const appendTimestampedNote = (base: string, note: string) => {
    const now = new Date().toLocaleString();
    const current = (base || "").trim();
    return current ? `${current}\n[${now}] ${note}` : `[${now}] ${note}`;
  };

const handleOpenCase = (taskId: number) => {
  const task = taskItems.find((t) => t.id === taskId);
  if (!task?.application) {
    toast.error("Application not found for this task.");
    return;
  }
  // task.application is confirmed as the application ID from the API
  router.push(`/admin/my-cases?applicationId=${encodeURIComponent(String(task.application))}`);
};


const handleMarkProgress = async (task: { id: number; applicationId: number; reference: string; notes: string }) => {
  try {
    await patchAdminTask(task.id, { status: "in_progress" });
    await patchAdminApplication(task.applicationId, {
      notes: appendTimestampedNote(task.notes, `Progress updated by staff for ${task.reference}`),
    });
    await loadDashboard({ background: true });
    toast.success(`Progress updated for ${task.reference}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to update progress.");
  }
};

const handleEscalate = async (task: { id: number; applicationId: number; reference: string; notes: string }) => {
  try {
    await patchAdminTask(task.id, { status: "blocked" });
    await patchAdminApplication(task.applicationId, {
      stage: "DOCUMENTS_REQUIRED",
      correction_cause: "staff_error",
      notes: appendTimestampedNote(task.notes, `Escalated by staff for review: ${task.reference}`),
    });
    await loadDashboard({ background: true });
    toast.success(`Escalation recorded for ${task.reference}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to escalate case.");
  }
};

const handleMarkComplete = async (task: { id: number; applicationId: number; reference: string; notes: string }) => {
  try {
    await patchAdminTask(task.id, { status: "completed" });
    await patchAdminApplication(task.applicationId, {
      notes: appendTimestampedNote(task.notes, `Task completed by staff for ${task.reference}`),
    });
    await loadDashboard({ background: true });
    toast.success(`Task marked complete for ${task.reference}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to mark task complete.");
  }
};

 
  const accountabilityFeed = useMemo(() => {
    return [...applications]
      .sort((left, right) => {
        const leftTs = new Date(left.updated_at || left.created_at).getTime();
        const rightTs = new Date(right.updated_at || right.created_at).getTime();
        return rightTs - leftTs;
      })
      .slice(0, 3)
      .map((app) => {
        const status = String(app.application_status || "").replace(/_/g, " ");
        const updatedTime = new Date(app.updated_at || app.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return {
          id: app.id,
          text: `${status.charAt(0).toUpperCase()}${status.slice(1)} | ${app.reference_number} | ${updatedTime}`,
        };
      });
  }, [applications]);

  const staffTaskSummary = useMemo(() => {
    const myTasks = taskItems.filter((task) => staffIdsMatch(task.assigned_staff, adminUser?.id));
    const pending = myTasks.filter((task) =>
      pendingTaskStatuses.has(String(task.status || "").toLowerCase()),
    );
    const completed = myTasks.filter(
      (task) => String(task.status || "").toLowerCase() === "completed",
    );

    const completionTs = (task: AdminTaskItem) => {
      const raw = task.completed_at || task.updated_at || task.created_at;
      if (!raw) return 0;
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    const recentCompletions = [...completed]
      .sort((a, b) => completionTs(b) - completionTs(a))
      .slice(0, 5);

    return {
      assigned: myTasks.length,
      pending: pending.length,
      completed: completed.length,
      recentCompletions,
    };
  }, [adminUser?.id, pendingTaskStatuses, taskItems]);

  const renderStaffTaskCard = (task: AdminTaskItem, showActions = true) => {
    const status = String(task.status || "").toLowerCase();
    const isCompleted = status === "completed";
    const isCancelled = status === "cancelled";
    const isClosedOut = isCompleted || isCancelled;
    const priority = String(task.priority || "").toLowerCase();
    const nextActionMap: Record<string, string> = {
      audit: "Start review",
      document_review: "Review documents",
      form_filling: "Continue form filling",
      submission: "Submit application",
      delivery_follow_up: "Send delivery follow-up",
      other: "Open task",
    };
    const nextAction = status === "blocked"
      ? "Resolve blocker"
      : nextActionMap[String(task.task_type || "").toLowerCase()] || "Open task";
    const blocker = isClosedOut
      ? "None"
      : status === "blocked"
        ? "Waiting on correction or escalation"
        : priority === "urgent"
          ? "SLA pressure"
          : priority === "high"
            ? "High priority"
            : "None";
    const customerWaiting = !isClosedOut && (status === "blocked" || status === "new" || ["audit", "document_review", "form_filling", "submission"].includes(String(task.task_type || "").toLowerCase()));
    const actionNote = `${task.application_reference} • ${task.task_type.replace(/_/g, " ")} • staff worklist action`;

    return (
      <div
        key={task.id}
        className={`rounded-[12px] border p-3 ${
          isCompleted
            ? "border-[#009877]/30 bg-[#F0FBF8]"
            : isCancelled
              ? "border-[#D9E1EA] bg-[#F5F7FA] opacity-60"
              : "border-[#D9E1EA] bg-[#F8FAFC]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-heading font-semibold text-[#102A43]">{task.application_reference}</p>
            <p className="text-xs text-[#627D98] capitalize">{task.task_type.replace(/_/g, " ")} • {task.customer_name || "Customer"}</p>
            <p className="text-xs text-[#627D98] mt-1">Due: {formatTaskDeadline(task.deadline)}</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#486581]">
              <p><span className="text-[#627D98]">Next action:</span> {nextAction}</p>
              <p><span className="text-[#627D98]">Owner:</span> {task.assigned_staff_name || "Unassigned"}</p>
              <p><span className="text-[#627D98]">Blocker:</span> {blocker}</p>
              <p><span className="text-[#627D98]">Customer waiting:</span> {customerWaiting ? "Yes" : "No"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span
              className={`rounded-full px-2.5 py-1 ${
                isCompleted
                  ? "bg-[#009877]/20 text-[#006F57] font-semibold"
                  : status === "blocked"
                    ? "bg-[#DC2626]/12 text-[#B42318]"
                    : status === "in_progress"
                      ? "bg-[#33A1FD]/12 text-[#0B69B7]"
                      : "bg-[#009877]/12 text-[#006F57]"
              }`}
            >
              {isCompleted ? "✓ Completed" : task.status}
            </span>
            <span className="rounded-full bg-[#B87333]/12 px-2.5 py-1 text-[#9C4F17]">{task.priority}</span>
            <span className="rounded-full bg-[#33A1FD]/12 px-2.5 py-1 text-[#0B69B7]">{task.assigned_staff_name || "Unassigned"}</span>
          </div>
        </div>

        {isClosedOut ? (
          <div className="mt-3 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs text-[#627D98]">
            {isCompleted ? "This task has been completed. No further action needed." : "This task has been cancelled."}
          </div>
        ) : showActions ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="text-xs bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/35 px-2 py-1 rounded-full" onClick={() => handleOpenCase(task.id)}>Open Case</button>
            <button className="text-xs bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 px-2 py-1 rounded-full" onClick={() => void handleMarkProgress({ id: task.id, applicationId: task.application, reference: task.application_reference, notes: actionNote })}>Mark Progress</button>
            <button className="text-xs bg-[#B87333]/12 text-[#9C4F17] border-[0.5px] border-[#B87333]/35 px-2 py-1 rounded-full" onClick={() => void handleEscalate({ id: task.id, applicationId: task.application, reference: task.application_reference, notes: actionNote })}>Escalate</button>
            <button className="text-xs bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 px-2 py-1 rounded-full" onClick={() => void handleMarkComplete({ id: task.id, applicationId: task.application, reference: task.application_reference, notes: actionNote })}>Mark Complete</button>
          </div>
        ) : null}
      </div>
    );
  };

  if (!isBootstrapped || !authReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#627D98] text-sm">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#009877]" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (isOwnRevenueDashboard) {
    const staffRevenue: StaffRevenueKpi = dashboardData?.my_revenue?.kpi_snapshot ?? {
      revenue_today: 0,
      revenue_30d: 0,
      revenue_total: 0,
      order_revenue: 0,
      audit_revenue: 0,
      full_revenue: 0,
      paid_cases_total: 0,
      paid_cases_30d: 0,
    };
    const myAssignedTasks = taskItems.filter((task) => staffIdsMatch(task.assigned_staff, adminUser?.id));
    const recentCases = [...myAssignedTasks]
      .filter((task) => pendingTaskStatuses.has(String(task.status || "").toLowerCase()))
      .sort((a, b) => {
        const left = new Date(a.deadline || a.updated_at || a.created_at || 0).getTime();
        const right = new Date(b.deadline || b.updated_at || b.created_at || 0).getTime();
        return left - right;
      })
      .slice(0, 8);

    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1300px] mx-auto space-y-6 font-body">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">My Dashboard</h1>
          <p className="text-[#486581] text-sm mt-1">{roleLabel} · your cases and revenue only</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Pending</p>
            <p className="mt-1 text-2xl font-heading font-semibold text-[#9C4F17]">{staffTaskSummary.pending}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Assigned</p>
            <p className="mt-1 text-2xl font-heading font-semibold text-[#102A43]">{staffTaskSummary.assigned}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Completed</p>
            <p className="mt-1 text-2xl font-heading font-semibold text-[#006F57]">{staffTaskSummary.completed}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Revenue today</p>
            <p className="mt-1 text-xl font-heading font-semibold text-[#B87333]">₹{Number(staffRevenue.revenue_today || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Revenue (30d)</p>
            <p className="mt-1 text-xl font-heading font-semibold text-[#102A43]">₹{Number(staffRevenue.revenue_30d || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
            <p className="text-xs text-[#627D98]">Revenue (all time)</p>
            <p className="mt-1 text-xl font-heading font-semibold text-[#102A43]">₹{Number(staffRevenue.revenue_total || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] bg-[#F8FCFF] p-4">
            <p className="text-xs text-[#627D98]">Performance</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{staffBadge || "—"}</p>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0B69B7]" />
              Recent cases
            </h2>
            <Link href="/admin/my-cases" className="text-sm font-semibold text-[#0B69B7] hover:underline">
              View all my cases
            </Link>
          </div>
          {recentCases.length === 0 ? (
            <p className="text-sm text-[#627D98]">No pending cases assigned to you.</p>
          ) : (
            <div className="space-y-3">
              {recentCases.map((task) => renderStaffTaskCard(task, true))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#006F57]" />
              Recently completed
            </h2>
            <Link href="/admin/my-cases" className="text-sm font-semibold text-[#0B69B7] hover:underline">
              View all completed
            </Link>
          </div>
          {staffTaskSummary.recentCompletions.length === 0 ? (
            <p className="text-sm text-[#627D98]">No completed tasks yet. Tasks auto-complete when you submit audit or advance the case.</p>
          ) : (
            <div className="space-y-3">
              {staffTaskSummary.recentCompletions.map((task) => renderStaffTaskCard(task, false))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[12px] border border-[#D9E1EA] p-5">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-1">My revenue (last 7 days)</h2>
            <p className="text-xs text-[#627D98] mb-4">{dashboardData?.staff_revenue_summary?.attribution_note || "Revenue from your assigned cases only."}</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="day" tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", color: "#102A43", borderRadius: "12px" }} />
                  <Bar dataKey="actual" fill="#009877" radius={[6, 6, 0, 0]} name="My revenue" />
                  <Line type="monotone" dataKey="expected" stroke="#33A1FD" strokeWidth={2} name="3-day avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-5">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">My revenue split</h2>
            {serviceRevenueBreakdown.length === 0 ? (
              <p className="text-sm text-[#627D98]">No attributed revenue yet.</p>
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={serviceRevenueBreakdown} dataKey="value" nameKey="name" outerRadius={85}>
                        {serviceRevenueBreakdown.map((_, index) => (
                          <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", color: "#102A43", borderRadius: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2 text-xs text-[#486581]">
                  <p>Order: ₹{Number(staffRevenue.order_revenue || 0).toLocaleString("en-IN")}</p>
                  <p>Audit: ₹{Number(staffRevenue.audit_revenue || 0).toLocaleString("en-IN")}</p>
                  <p>Full payment: ₹{Number(staffRevenue.full_revenue || 0).toLocaleString("en-IN")}</p>
                  <p>Paid cases (30d): {staffRevenue.paid_cases_30d ?? 0}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1500px] mx-auto space-y-6 font-body">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">FlyOCI Console</h1>
          <p className="text-[#486581] text-sm mt-1">{roleLabel} dashboard overview</p>
        </div>
      </div>

      {!isOwnRevenueDashboard && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7 gap-4 mb-6">
        <StatCard 
          title="Total Leads" 
          value={kpiSnapshot.total_leads}
          trend="Last 30 days"
          isPositive={true} 
          icon={Users}
          colorClass="text-[#009877]"
          bgClass="bg-[#009877]/10"
        />
        <StatCard 
          title="Today's Leads" 
          value={kpiSnapshot.todays_leads}
          trend="Live"
          isPositive={true} 
          icon={Briefcase}
          colorClass="text-[#33A1FD]"
          bgClass="bg-[#33A1FD]/10"
        />
        <StatCard 
          title="Leads Converted"
          value={kpiSnapshot.converted}
          trend={kpiSnapshot.conversion}
          isPositive={true} 
          icon={SearchCheck}
          colorClass="text-[#009877]"
          bgClass="bg-[#009877]/10"
        />
        <StatCard 
          title="Total Revenue ₹" 
          value={`₹${kpiSnapshot.revenue_today.toLocaleString("en-IN")}`}
          trend="Today"
          isPositive={true}
          icon={IndianRupee}
          colorClass="text-[#B87333]"
          bgClass="bg-[#B87333]/10"
        />
        <StatCard 
          title="Audit Revenue ₹"
          value={`₹${(kpiSnapshot.audit_revenue_today ?? 0).toLocaleString("en-IN")}`}
          trend="Today"
          isPositive={true}
          icon={ShieldCheck}
          colorClass="text-[#0F766E]"
          bgClass="bg-[#0F766E]/10"
        />
        <StatCard 
          title="Avg. Ticket Size" 
          value={`₹${kpiSnapshot.avg_ticket_size.toLocaleString("en-IN")}`}
          trend="Rolling"
          isPositive={true} 
          icon={Banknote}
          colorClass="text-[#33A1FD]"
          bgClass="bg-[#33A1FD]/10"
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${kpiSnapshot.pending_payments.toLocaleString("en-IN")}`}
          trend="Attention"
          isPositive={false}
          icon={Clock}
          colorClass="text-[#DC2626]"
          bgClass="bg-[#DC2626]/10"
        />
      </div>}

{isOpsView && (
  <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h2 className="text-lg font-heading font-semibold text-[#102A43]">
        My Assigned Tasks
      </h2>
      <Link href="/admin/my-cases" className="text-sm font-semibold text-[#0B69B7] hover:underline">
        My cases (active & completed)
      </Link>
    </div>
    <div className="space-y-3">
      {taskItems.filter((t) => staffIdsMatch(t.assigned_staff, adminUser?.id) && pendingTaskStatuses.has(String(t.status || "").toLowerCase())).length === 0 ? (
        <p className="text-sm text-[#627D98]">No pending tasks assigned to you. Check My Active Cases for completed work.</p>
      ) : (
        taskItems
          .filter((t) => staffIdsMatch(t.assigned_staff, adminUser?.id) && pendingTaskStatuses.has(String(t.status || "").toLowerCase()))
          .map((task) => (
            <div key={task.id} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[#102A43] text-sm font-medium">{task.application_reference}</p>
                <p className="text-xs text-[#627D98] capitalize">
                  {task.task_type.replace(/_/g, " ")} • {task.customer_name}
                </p>
                <p className="text-xs text-[#627D98]">Due: {formatTaskDeadline(task.deadline)}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className="rounded-full bg-[#009877]/12 px-2.5 py-1 text-[11px] text-[#006F57]">{task.status}</span>
                <span className="rounded-full bg-[#B87333]/12 px-2.5 py-1 text-[11px] text-[#9C4F17]">{task.priority}</span>
                <button
                  className="text-xs bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/35 px-2 py-1 rounded-full"
                  onClick={() => handleOpenCase(task.id)}
                >
                  Open Case
                </button>
              </div>
            </div>
          ))
      )}
    </div>
  </div>
)}

      {!isFounderView && !isOpsView && !isOwnRevenueDashboard && (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
          <p className="text-sm text-[#486581]">
            Read-only mode active for this role. Strategic reports remain restricted to Admin / CEO and Operations Manager.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
          <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">Revenue Dashboard</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                <XAxis dataKey="day" tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", color: "#102A43", borderRadius: "12px" }} />
                <Bar dataKey="expected" fill="#33A1FD" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="actual" stroke="#B87333" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-heading font-semibold text-[#102A43]">Revenue Split</h2>
            <span className="bg-[#33A1FD]/12 text-[#0B69B7] text-xs font-heading font-semibold px-2 py-0.5 rounded-full">Live</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceRevenueBreakdown} dataKey="value" nameKey="name" outerRadius={90}>
                  {serviceRevenueBreakdown.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", color: "#102A43", borderRadius: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
        <div className="p-5 border-b border-[0.5px] border-[#D9E1EA] flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">Business Health Metrics</h2>
          <div className="flex gap-2">
            {(["Daily", "Weekly", "Monthly"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`text-xs px-3 py-1 rounded-full font-heading ${period === item ? "bg-[#009877] text-white" : "bg-[#F5F7FA] text-[#486581]"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {healthMetrics.map(([label, value]) => (
            <div key={label} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 flex justify-between">
              <span className="text-[#486581] text-sm">{label}</span>
              <span className="text-[#102A43] font-heading font-semibold text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {isFounderView && (
        <div className="rounded-[14px] border border-[#D9E1EA] bg-[#F8FCFF] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-heading font-semibold text-[#102A43]">Work Pipeline Overview</h2>
            <div className="flex flex-wrap gap-2.5">
              <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#EAF5FF] text-[#2B5E93] border border-[#CFE4F8]">Service Type</span>
              <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#EAF5FF] text-[#2B5E93] border border-[#CFE4F8]">Country</span>
              <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#EAF5FF] text-[#2B5E93] border border-[#CFE4F8]">Staff</span>
              <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#ECFAF5] text-[#1F6A4A] border border-[#CDEBDD]">Ageing 3+/5+/7+ days</span>
            </div>
          </div>

          <div className="mb-3 text-xs text-[#627D98]">Scroll horizontally to review all pipeline stages</div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max snap-x snap-mandatory">
            {pipelineOverview.map((item, idx) => (
              <div
                key={item.stage}
                className="min-w-[220px] max-w-[220px] snap-start rounded-[12px] border border-[#CFE4F8] bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(40,98,160,0.10)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-[11px] text-[#6E8BAA]">Stage {idx + 1}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.breached > 0 ? "bg-[#FFF1F0] text-[#B42318] border-[#F2C7C3]" : "bg-[#ECFAF5] text-[#1F6A4A] border-[#CDEBDD]"}`}>
                    {item.breached > 0 ? `${item.breached} breach` : "Healthy"}
                  </span>
                </div>
                <p className="text-[18px] font-heading font-semibold text-[#102A43] leading-tight">{item.stage}</p>

                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[#486581] flex items-center justify-between"><span>Open Cases</span><span className="font-semibold text-[#102A43]">{item.openCases}</span></p>
                  <p className="text-xs text-[#486581] flex items-center justify-between"><span>Average Age</span><span className="font-semibold text-[#102A43]">{item.avgAge}</span></p>
                  <p className="text-xs text-[#486581] flex items-center justify-between"><span>SLA Breach</span><span className="font-semibold text-[#102A43]">{item.breached}</span></p>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {isFounderView && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {revenueInsights.map((item) => (
            <div key={item.label} className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
              <p className="text-xs text-[#627D98]">{item.label}</p>
              <p className="text-lg font-heading font-semibold text-[#102A43] mt-1 inline-flex items-center gap-2">
                <item.icon className="w-4 h-4 text-[#009877]" />
                {item.value}
              </p>
              <p className="text-xs text-[#8A9BB0] mt-1">{item.note}</p>
            </div>
          ))}
        </div>
      )}

      {isFounderView && (
        <div className="space-y-2">
          <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
            <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
              Founder insight: conversion bottlenecks
              <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <p className="mt-2 text-sm text-[#486581]">The largest drop is between audit completion and payment. Priority action: automate payment nudges within first 30 minutes.</p>
          </details>
          <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
            <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
              Founder insight: staffing strategy
              <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <p className="mt-2 text-sm text-[#486581]">Reassign high-complexity audits to top-accuracy staff to reduce repeat corrections and overall cycle time.</p>
          </details>
        </div>
      )}

      {isFounderView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/team-performance"
            className="lg:col-span-2 bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5 hover:border-[#009877]/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-heading font-semibold text-[#102A43] group-hover:text-[#006F57]">
                  Team Performance
                </h2>
                <p className="text-sm text-[#627D98] mt-1">
                  Full team grid — accuracy, revenue, cases generated, assigned, completed, and pending.
                  Filter by today, last 7 days, last 30 days, or all time.
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[#009877]">Open →</span>
            </div>
          </Link>

          <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
            <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">Security & Compliance</h2>
            <div className="space-y-3">
              <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 flex items-center justify-between">
                <span className="text-[#486581] text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#B42318]" /> Failed logins</span>
                <span className="text-[#B42318] font-heading font-semibold">{failedLogins}</span>
              </div>
              <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
                <p className="text-[#486581] text-sm mb-2">Recent data access log</p>
                {accessLogs.map((log) => (
                  <p key={`${log.staff}-${log.time}`} className="text-xs text-[#627D98]">
                    {log.staff} | {log.file} | {log.time}
                  </p>
                ))}
              </div>
              <div className="bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 text-sm px-3 py-2 rounded-[12px] inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> All Documents Encrypted
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isOwnRevenueDashboard && (
      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
        <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">Monthly Revenue Trend</h2>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
              <XAxis dataKey="month" tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#486581", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", color: "#102A43", borderRadius: "12px" }} />
              <Line type="monotone" dataKey="revenue" stroke="#009877" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
}
