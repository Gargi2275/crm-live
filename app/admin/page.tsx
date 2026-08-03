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
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  LayoutDashboard,
  X,
  Workflow,
  Activity,
  Layers,
  Plane,
  FolderArchive,
  UserCog,
  CreditCard,
  Landmark,
  PieChart as PieChartIcon,
  Newspaper,
  Bell,
  Settings,
  Logs,
  ExternalLink,
} from "lucide-react";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { WorkloadView } from "@/components/console/workload/WorkloadView";
import { KanbanView } from "@/components/console/kanban/KanbanView";
import { canEmbedAdminHref, DashboardEmbedPanel } from "@/components/console/DashboardEmbedPanel";
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
  formatTaskStatusLabel,
  type AdminApplication,
  type AdminDashboardOverview,
  type AdminTaskItem,
  type StaffRevenueKpi,
} from "@/lib/admin-auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { SlideOverPanel } from "@/components/console/kanban/SlideOverPanel";
import { useAdminCaseSlideOver } from "@/components/console/kanban/useAdminCaseSlideOver";
import { subscribeOpenAdminCase } from "@/lib/admin-open-case";

type DashboardKpiKey =
  | "all"
  | "leads"
  | "today"
  | "converted"
  | "revenue"
  | "audit"
  | "avg_ticket"
  | "pending";

const PAID_STATUSES = new Set([
  "paid",
  "payment_received",
  "completed",
  "dispatched",
  "approved",
  "submitted",
]);

const PENDING_PAY_STATUSES = new Set([
  "payment_pending",
  "pending_quote",
  "quoted",
  "final_submission_pending",
]);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

function appCreatedAt(app: AdminApplication) {
  const raw = app.created_at || app.application_date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPaidApplication(app: AdminApplication) {
  const status = String(app.application_status || "").toLowerCase();
  return (
    Boolean(app.payment_confirmed) ||
    String(app.full_payment_status || "").toLowerCase() === "paid" ||
    PAID_STATUSES.has(status)
  );
}

function formatInr(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** What the customer still owes on this case (for Pending pay drill-down). */
function getPendingPaymentDetail(app: AdminApplication): {
  amountPence: number;
  kind: string;
} {
  const amountDue = Math.max(0, Number(app.amount_due_pence || 0));
  const auditFee = Math.max(0, Number(app.audit_fee_pence || 0));
  const auditPaid =
    Boolean(app.audit_fee_paid) ||
    ["paid", "succeeded", "complete"].includes(String(app.audit_payment_status || "").toLowerCase());
  const fullPaid = isPaidApplication(app);
  const quotePence = Math.max(
    0,
    Number(app.quote_amount_pence || 0) || Math.round(Number(app.quoted_fee || 0) * 100),
  );
  const status = String(app.application_status || "").toLowerCase();
  const quoteStatus = String(app.quote_status || "").toLowerCase();

  if (fullPaid) {
    return { amountPence: 0, kind: "Paid" };
  }
  if (amountDue > 0) {
    return { amountPence: amountDue, kind: "Service balance" };
  }
  if (!auditPaid && auditFee > 0) {
    return { amountPence: auditFee, kind: "Audit fee" };
  }
  if (
    quotePence > 0 &&
    (PENDING_PAY_STATUSES.has(status) || ["quoted", "pending_quote"].includes(quoteStatus))
  ) {
    return { amountPence: quotePence, kind: "Quoted fee" };
  }
  return { amountPence: 0, kind: "No amount set" };
}

function matchesDashboardKpi(app: AdminApplication, kpi: DashboardKpiKey) {
  const created = appCreatedAt(app);
  const status = String(app.application_status || "").toLowerCase();
  const auditStatus = String(app.audit_payment_status || "").toLowerCase();
  const pending = getPendingPaymentDetail(app);

  switch (kpi) {
    case "all":
      return true;
    case "leads":
      return Boolean(created && created >= daysAgo(30));
    case "today":
      return Boolean(created && created >= startOfToday());
    case "converted":
      return isPaidApplication(app);
    case "revenue":
      return isPaidApplication(app);
    case "audit":
      return auditStatus === "paid" || auditStatus === "succeeded" || auditStatus === "complete";
    case "avg_ticket":
      return isPaidApplication(app);
    case "pending":
      // Match money still owed: amount due, unpaid audit, or quoted unpaid
      return !isPaidApplication(app) && pending.amountPence > 0;
    default:
      return true;
  }
}

const KPI_LABELS: Record<Exclude<DashboardKpiKey, "all">, string> = {
  leads: "Total Leads",
  today: "Today's Leads",
  converted: "Converted",
  revenue: "Revenue ₹",
  audit: "Audit ₹",
  avg_ticket: "Avg ticket",
  pending: "Pending pay",
};

const KPI_DETAIL_LINKS: Record<Exclude<DashboardKpiKey, "all">, { href: string; label: string }> = {
  leads: { href: "/admin/reports?type=leads", label: "Leads report" },
  today: { href: "/admin/workload", label: "Open workload" },
  converted: { href: "/admin/reports?type=leads", label: "Conversion report" },
  revenue: { href: "/admin/reports?type=revenue", label: "Revenue report" },
  audit: { href: "/admin/reports?type=audit", label: "Audit report" },
  avg_ticket: { href: "/admin/revenue", label: "Revenue page" },
  pending: { href: "/admin/reports?type=pending_payments", label: "Pending report" },
};

type DashTab = "overview" | "cases" | "money" | "ops" | "workload" | "pipeline";

const DASH_TABS: Array<{ id: DashTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "cases", label: "Cases" },
  { id: "workload", label: "Workload" },
  { id: "pipeline", label: "Pipeline" },
  { id: "money", label: "Money" },
  { id: "ops", label: "Ops & setup" },
];

const CONSOLE_LINKS: Array<{
  group: string;
  items: Array<{ href: string; label: string; icon: typeof Workflow; hint: string }>;
}> = [
  {
    group: "Work",
    items: [
      { href: "/admin/kanban", label: "Pipeline", icon: Workflow, hint: "Kanban stages" },
      { href: "/admin/workload", label: "Workload", icon: UserCog, hint: "Staff load" },
      { href: "/admin/my-cases", label: "My cases", icon: ClipboardList, hint: "Assigned work" },
      { href: "/admin/alerts", label: "Alerts", icon: AlertTriangle, hint: "Open issues" },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/admin/billing", label: "Billing", icon: CreditCard, hint: "Payments due" },
      { href: "/admin/revenue", label: "Revenue", icon: Landmark, hint: "Collections" },
      { href: "/admin/reports", label: "Reports", icon: PieChartIcon, hint: "All reports" },
      { href: "/admin/easyfly", label: "EasyFly", icon: Plane, hint: "Bookings" },
    ],
  },
  {
    group: "Team & catalog",
    items: [
      { href: "/admin/team-performance", label: "Performance", icon: Activity, hint: "Accuracy" },
      { href: "/admin/staff", label: "Staff", icon: Briefcase, hint: "People" },
      { href: "/admin/services", label: "Services & Categories", icon: Layers, hint: "Catalog" },
      { href: "/admin/blog", label: "Blog", icon: Newspaper, hint: "Content" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/docs", label: "Documents", icon: FolderArchive, hint: "Files" },
      { href: "/admin/logs", label: "Logs", icon: Logs, hint: "Audit trail" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, hint: "Inbox" },
      { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Config" },
    ],
  },
];

export default function ConsoleDashboard() {
  const router = useRouter();
  const { adminUser, isBootstrapped } = useAdminAuth();
  const [activeKpi, setActiveKpi] = useState<DashboardKpiKey>("all");
  const [pendingServiceFilter, setPendingServiceFilter] = useState<string | null>(null);
  const [dashTab, setDashTab] = useState<DashTab>("overview");
  const [caseStatusFilter, setCaseStatusFilter] = useState<string | null>(null);
  const [staffTaskKpi, setStaffTaskKpi] = useState<"all" | "pending" | "assigned" | "completed">("all");
  const [embeddedPage, setEmbeddedPage] = useState<{ href: string; label: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);

  const openDashTab = useCallback((tab: DashTab) => {
    setActiveKpi("all");
    setPendingServiceFilter(null);
    setEmbeddedPage(null);
    setDashTab(tab);
    if (tab !== "cases") setCaseStatusFilter(null);
  }, []);

  // Workload / Pipeline tabs: prefer native in-page views (not generic embed).
  const openNativeDashTab = useCallback((tab: "workload" | "pipeline") => {
    setActiveKpi("all");
    setPendingServiceFilter(null);
    setCaseStatusFilter(null);
    setEmbeddedPage(null);
    setDashTab(tab);
  }, []);

  const openAdminInDash = useCallback((href: string, label: string) => {
    setActiveKpi("all");
    setPendingServiceFilter(null);
    setCaseStatusFilter(null);

    const path = href.split("?")[0] || href;
    const ownRevenue = isStaffOwnRevenueDashboard(dashboardData, adminUser?.role);

    // Workload / Pipeline: stay on dashboard (native tabs for admins, embed for staff home).
    if (path === "/admin/workload" || path === "/admin/kanban") {
      if (ownRevenue) {
        setEmbeddedPage({ href: path, label });
        return;
      }
      setEmbeddedPage(null);
      setDashTab(path === "/admin/workload" ? "workload" : "pipeline");
      return;
    }
    if (canEmbedAdminHref(href)) {
      setDashTab("ops");
      setEmbeddedPage({ href, label });
      return;
    }
    router.push(href);
  }, [router, dashboardData, adminUser?.role]);

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

  useEffect(() => {
    if (embeddedPage?.href?.split("?")[0] === "/admin/my-cases") return;
    return subscribeOpenAdminCase((detail) => {
      void openCaseByApplicationId(detail.applicationId, {
        reference: detail.reference,
        customer: detail.customer,
      });
    });
  }, [openCaseByApplicationId, embeddedPage?.href]);

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
  const serviceRevenueBreakdown = dashboardData?.service_revenue_breakdown ?? [];
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

 

  const healthExtras = useMemo(
    () => ({
      auditSuccess: dashboardData?.health_metrics?.audit_success_ratio ?? "0%",
      avgProcessing: dashboardData?.health_metrics?.avg_processing_time ?? "0h",
      csat: dashboardData?.health_metrics?.customer_satisfaction ?? "0 / 5",
    }),
    [dashboardData],
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
      subtitle: `Status: ${formatTaskStatusLabel(task.status)} • Priority: ${task.priority} • ${task.application_reference}`,
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
  void openCaseByApplicationId(task.application, {
    reference: task.application_reference,
    customer: task.customer_name,
  });
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

  const filteredApplications = useMemo(() => {
    if (activeKpi === "all") return [];
    const rows = applications.filter((app) => matchesDashboardKpi(app, activeKpi));
    if (activeKpi === "pending") {
      return [...rows].sort(
        (a, b) => getPendingPaymentDetail(b).amountPence - getPendingPaymentDetail(a).amountPence,
      );
    }
    return rows;
  }, [activeKpi, applications]);

  const pendingByService = useMemo(() => {
    if (activeKpi !== "pending") return [];
    const map = new Map<string, { name: string; count: number; duePence: number }>();
    for (const app of filteredApplications) {
      const name = app.service_name?.trim() || "Other";
      const pending = getPendingPaymentDetail(app);
      const row = map.get(name) || { name, count: 0, duePence: 0 };
      row.count += 1;
      row.duePence += pending.amountPence;
      map.set(name, row);
    }
    return [...map.values()].sort((a, b) => b.duePence - a.duePence);
  }, [activeKpi, filteredApplications]);

  const displayedApplications = useMemo(() => {
    if (activeKpi !== "pending" || !pendingServiceFilter) return filteredApplications;
    return filteredApplications.filter(
      (app) => (app.service_name?.trim() || "Other") === pendingServiceFilter,
    );
  }, [activeKpi, filteredApplications, pendingServiceFilter]);

  const pendingFilterTotal = useMemo(() => {
    if (activeKpi !== "pending") return 0;
    return displayedApplications.reduce((sum, app) => sum + getPendingPaymentDetail(app).amountPence, 0);
  }, [activeKpi, displayedApplications]);

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort(
          (a, b) =>
            new Date(b.created_at || b.application_date || 0).getTime() -
            new Date(a.created_at || a.application_date || 0).getTime(),
        )
        .slice(0, 8),
    [applications],
  );

  const pipelineOpenTotal = useMemo(
    () => pipelineOverview.reduce((sum, row) => sum + Number(row.openCases || 0), 0),
    [pipelineOverview],
  );

  const pipelineBreachedTotal = useMemo(
    () => pipelineOverview.reduce((sum, row) => sum + Number(row.breached || 0), 0),
    [pipelineOverview],
  );

  const alertsSummary = dashboardData?.alerts_summary;

  const serviceRevenueRows = useMemo(
    () =>
      [...serviceRevenueBreakdown]
        .map((row) => ({
          name: row.name,
          share: Number(row.value || 0),
          amount: Number(row.amount ?? row.value ?? 0),
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6),
    [serviceRevenueBreakdown],
  );

  const applicationStatusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      const key = String(app.application_status || "unknown").replace(/_/g, " ");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [applications]);

  const casesTabRows = useMemo(() => {
    const rows = caseStatusFilter
      ? applications.filter(
          (app) => String(app.application_status || "unknown").replace(/_/g, " ") === caseStatusFilter,
        )
      : applications;
    return [...rows]
      .sort(
        (a, b) =>
          new Date(b.created_at || b.application_date || 0).getTime() -
          new Date(a.created_at || a.application_date || 0).getTime(),
      )
      .slice(0, 20);
  }, [applications, caseStatusFilter]);

  const toggleKpi = (key: Exclude<DashboardKpiKey, "all">) => {
    setPendingServiceFilter(null);
    setEmbeddedPage(null);
    setActiveKpi((current) => (current === key ? "all" : key));
  };

  const togglePendingService = (serviceName: string) => {
    setPendingServiceFilter((current) => (current === serviceName ? null : serviceName));
  };

  useSetAdminPageChrome({
    title: isOwnRevenueDashboard ? "My Dashboard" : "FlyOCI Console",
    subtitle: isOwnRevenueDashboard
      ? "Your assigned cases & attributed revenue"
      : embeddedPage
        ? `Open on dashboard · ${embeddedPage.label}`
        : dashTab !== "overview"
          ? DASH_TABS.find((t) => t.id === dashTab)?.label
          : `${roleLabel} · site overview`,
    icon: LayoutDashboard,
    syncKey: `${isOwnRevenueDashboard}|${loading}|${authReady}|${isBootstrapped}|${activeKpi}|${pendingServiceFilter}|${dashTab}|${caseStatusFilter}|${embeddedPage?.href || ""}|${applications.length}`,
    meta:
      loading
        ? "Loading…"
        : activeKpi !== "all"
          ? `${displayedApplications.length} matches`
          : embeddedPage
            ? embeddedPage.label
            : dashTab !== "overview"
              ? DASH_TABS.find((t) => t.id === dashTab)?.label
              : undefined,
    actions: (
      <>
        {!isOwnRevenueDashboard ? (
          <>
            <button
              type="button"
              onClick={() => openNativeDashTab("pipeline")}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
            >
              Open pipeline
            </button>
            {(isOpsView || isStaffConsoleRole) && (
              <button
                type="button"
                onClick={() => openAdminInDash("/admin/my-cases", "My cases")}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
              >
                My cases
              </button>
            )}
            <button
              type="button"
              onClick={() => openNativeDashTab("workload")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              Workload
            </button>
            <button
              type="button"
              onClick={() => openAdminInDash("/admin/alerts", "Alerts")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              Alerts
            </button>
            <button
              type="button"
              onClick={() => openAdminInDash("/admin/reports", "Reports")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              Reports
            </button>
            <button
              type="button"
              onClick={() => openAdminInDash("/admin/billing", "Billing")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              Billing
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </>
    ),
  });

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
      ? "Follow up (waiting)"
      : nextActionMap[String(task.task_type || "").toLowerCase()] || "Open task";
    const blocker = isClosedOut
      ? "None"
      : status === "blocked"
        ? "Waiting on correction or customer"
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
                    ? "bg-[#B87333]/12 text-[#9C4F17]"
                    : status === "in_progress"
                      ? "bg-[#33A1FD]/12 text-[#0B69B7]"
                      : "bg-[#009877]/12 text-[#006F57]"
              }`}
            >
              {isCompleted ? "✓ Completed" : formatTaskStatusLabel(task.status)}
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
    const pendingCases = [...myAssignedTasks]
      .filter((task) => pendingTaskStatuses.has(String(task.status || "").toLowerCase()))
      .sort((a, b) => {
        const left = new Date(a.deadline || a.updated_at || a.created_at || 0).getTime();
        const right = new Date(b.deadline || b.updated_at || b.created_at || 0).getTime();
        return left - right;
      })
      .slice(0, 8);
    const completedCases = staffTaskSummary.recentCompletions;
    const shownCases =
      staffTaskKpi === "completed"
        ? completedCases
        : staffTaskKpi === "assigned"
          ? myAssignedTasks.slice(0, 8)
          : pendingCases;

    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1300px] mx-auto space-y-4 font-body">
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
          onStageResolved={handleStageResolved}
        />
        {embeddedPage ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
              <button
                type="button"
                onClick={() => setEmbeddedPage(null)}
                className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
              >
                My dashboard
              </button>
              <button
                type="button"
                onClick={() => openAdminInDash("/admin/my-cases", "My cases")}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                  embeddedPage.href.startsWith("/admin/my-cases")
                    ? "bg-[#009877] text-white shadow-sm"
                    : "text-[#486581] hover:bg-[#F5F7FA]"
                }`}
              >
                My cases
              </button>
              <button
                type="button"
                onClick={() => openAdminInDash("/admin/kanban", "Pipeline")}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                  embeddedPage.href.startsWith("/admin/kanban")
                    ? "bg-[#009877] text-white shadow-sm"
                    : "text-[#486581] hover:bg-[#F5F7FA]"
                }`}
              >
                Pipeline
              </button>
              <p className="ml-auto hidden px-2 text-[11px] text-[#829AB1] sm:block">
                Tabs open here — no page redirect
              </p>
            </div>
            <DashboardEmbedPanel href={embeddedPage.href} />
          </div>
        ) : null}
        {!embeddedPage ? (
        <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[#486581] text-sm">{roleLabel} · your cases and revenue only</p>
          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            <button
              type="button"
              className="rounded-[8px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            >
              My dashboard
            </button>
            <button
              type="button"
              onClick={() => openAdminInDash("/admin/my-cases", "My cases")}
              className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
            >
              My cases
            </button>
            <button
              type="button"
              onClick={() => openAdminInDash("/admin/kanban", "Pipeline")}
              className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
            >
              Pipeline
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          <button type="button" onClick={() => setStaffTaskKpi((c) => (c === "pending" ? "all" : "pending"))} className={`rounded-[10px] border bg-white px-3 py-2.5 text-left ${staffTaskKpi === "pending" ? "border-[#009877] ring-1 ring-[#009877]/25" : "border-[#D9E1EA]"}`}>
            <p className="text-[11px] text-[#627D98]">Pending</p>
            <p className="mt-0.5 text-xl font-heading font-semibold text-[#9C4F17]">{staffTaskSummary.pending}</p>
          </button>
          <button type="button" onClick={() => setStaffTaskKpi((c) => (c === "assigned" ? "all" : "assigned"))} className={`rounded-[10px] border bg-white px-3 py-2.5 text-left ${staffTaskKpi === "assigned" ? "border-[#009877] ring-1 ring-[#009877]/25" : "border-[#D9E1EA]"}`}>
            <p className="text-[11px] text-[#627D98]">Assigned</p>
            <p className="mt-0.5 text-xl font-heading font-semibold text-[#102A43]">{staffTaskSummary.assigned}</p>
          </button>
          <button type="button" onClick={() => setStaffTaskKpi((c) => (c === "completed" ? "all" : "completed"))} className={`rounded-[10px] border bg-white px-3 py-2.5 text-left ${staffTaskKpi === "completed" ? "border-[#009877] ring-1 ring-[#009877]/25" : "border-[#D9E1EA]"}`}>
            <p className="text-[11px] text-[#627D98]">Completed</p>
            <p className="mt-0.5 text-xl font-heading font-semibold text-[#006F57]">{staffTaskSummary.completed}</p>
          </button>
          <div className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5">
            <p className="text-[11px] text-[#627D98]">Revenue today</p>
            <p className="mt-0.5 text-lg font-heading font-semibold text-[#B87333]">₹{Number(staffRevenue.revenue_today || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5">
            <p className="text-[11px] text-[#627D98]">Revenue (30d)</p>
            <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">₹{Number(staffRevenue.revenue_30d || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5">
            <p className="text-[11px] text-[#627D98]">Revenue (all time)</p>
            <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">₹{Number(staffRevenue.revenue_total || 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] bg-[#F8FCFF] px-3 py-2.5">
            <p className="text-[11px] text-[#627D98]">Performance</p>
            <p className="mt-0.5 text-base font-heading font-semibold text-[#102A43]">{staffBadge || "—"}</p>
          </div>
        </div>

        <div className="bg-white rounded-[10px] border border-[#D9E1EA] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-heading font-semibold text-[#102A43] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0B69B7]" />
              {staffTaskKpi === "completed" ? "Recently completed" : staffTaskKpi === "assigned" ? "Assigned cases" : "Recent cases"}
            </h2>
            <button type="button" onClick={() => openAdminInDash("/admin/my-cases", "My cases")} className="text-sm font-semibold text-[#0B69B7] hover:underline">
              View all my cases
            </button>
          </div>
          {shownCases.length === 0 ? (
            <p className="text-sm text-[#627D98]">No cases for this KPI filter.</p>
          ) : (
            <div className="space-y-2">
              {shownCases.map((task) => renderStaffTaskCard(task, staffTaskKpi !== "completed"))}
            </div>
          )}
        </div>

        {staffTaskKpi !== "completed" ? (
        <div className="bg-white rounded-[10px] border border-[#D9E1EA] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-heading font-semibold text-[#102A43] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#006F57]" />
              Recently completed
            </h2>
            <button type="button" onClick={() => openAdminInDash("/admin/my-cases", "My cases")} className="text-sm font-semibold text-[#0B69B7] hover:underline">
              View all completed
            </button>
          </div>
          {staffTaskSummary.recentCompletions.length === 0 ? (
            <p className="text-sm text-[#627D98]">No completed tasks yet. Tasks auto-complete when you submit audit or advance the case.</p>
          ) : (
            <div className="space-y-2">
              {staffTaskSummary.recentCompletions.map((task) => renderStaffTaskCard(task, false))}
            </div>
          )}
        </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-[10px] border border-[#D9E1EA] p-4">
            <h2 className="text-sm font-heading font-semibold text-[#102A43] mb-1">My revenue (last 7 days)</h2>
            <p className="text-xs text-[#627D98] mb-3">{dashboardData?.staff_revenue_summary?.attribution_note || "Revenue from your assigned cases only."}</p>
            <div className="h-[240px]">
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

          <div className="bg-white rounded-[10px] border border-[#D9E1EA] p-4">
            <h2 className="text-sm font-heading font-semibold text-[#102A43] mb-3">My revenue split</h2>
            {serviceRevenueBreakdown.length === 0 ? (
              <p className="text-sm text-[#627D98]">No attributed revenue yet.</p>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={serviceRevenueBreakdown} dataKey="value" nameKey="name" outerRadius={75}>
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
        </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1500px] mx-auto space-y-4 font-body">
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
        onStageResolved={handleStageResolved}
      />
      {!isOwnRevenueDashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-2">
          <StatCard
            title="Total Leads"
            value={kpiSnapshot.total_leads}
            trend="30d"
            isPositive={true}
            icon={Users}
            colorClass="text-[#009877]"
            bgClass="bg-[#009877]/10"
            active={activeKpi === "leads"}
            onClick={() => toggleKpi("leads")}
          />
          <StatCard
            title="Today's Leads"
            value={kpiSnapshot.todays_leads}
            trend="Live"
            isPositive={true}
            icon={Briefcase}
            colorClass="text-[#33A1FD]"
            bgClass="bg-[#33A1FD]/10"
            active={activeKpi === "today"}
            onClick={() => toggleKpi("today")}
          />
          <StatCard
            title="Converted"
            value={kpiSnapshot.converted}
            trend={kpiSnapshot.conversion}
            isPositive={true}
            icon={SearchCheck}
            colorClass="text-[#009877]"
            bgClass="bg-[#009877]/10"
            active={activeKpi === "converted"}
            onClick={() => toggleKpi("converted")}
          />
          <StatCard
            title="Revenue ₹"
            value={`₹${kpiSnapshot.revenue_today.toLocaleString("en-IN")}`}
            trend="Today"
            isPositive={true}
            icon={IndianRupee}
            colorClass="text-[#B87333]"
            bgClass="bg-[#B87333]/10"
            active={activeKpi === "revenue"}
            onClick={() => toggleKpi("revenue")}
          />
          <StatCard
            title="Audit ₹"
            value={`₹${(kpiSnapshot.audit_revenue_today ?? 0).toLocaleString("en-IN")}`}
            trend="Today"
            isPositive={true}
            icon={ShieldCheck}
            colorClass="text-[#0F766E]"
            bgClass="bg-[#0F766E]/10"
            active={activeKpi === "audit"}
            onClick={() => toggleKpi("audit")}
          />
          <StatCard
            title="Avg ticket"
            value={`₹${kpiSnapshot.avg_ticket_size.toLocaleString("en-IN")}`}
            trend="Rolling"
            isPositive={true}
            icon={Banknote}
            colorClass="text-[#33A1FD]"
            bgClass="bg-[#33A1FD]/10"
            active={activeKpi === "avg_ticket"}
            onClick={() => toggleKpi("avg_ticket")}
          />
          <StatCard
            title="Pending pay"
            value={`₹${kpiSnapshot.pending_payments.toLocaleString("en-IN")}`}
            trend="Attention"
            isPositive={false}
            icon={Clock}
            colorClass="text-[#DC2626]"
            bgClass="bg-[#DC2626]/10"
            active={activeKpi === "pending"}
            onClick={() => toggleKpi("pending")}
          />
        </div>
      )}

      {!isOwnRevenueDashboard && activeKpi === "all" ? (
        <p className="-mt-2 text-[11px] text-[#829AB1]">
          Click a KPI to filter cases · use tabs below for Cases, Money, and Ops shortcuts
        </p>
      ) : null}

      {!isOwnRevenueDashboard && activeKpi !== "all" ? (
        <section className="rounded-[12px] border border-[#D9E1EA] bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EAF0] px-4 py-3">
            <div>
              <h2 className="text-sm font-heading font-semibold text-[#102A43]">
                {KPI_LABELS[activeKpi]} · filtered applications
              </h2>
              <p className="text-xs text-[#627D98] mt-0.5">
                Showing {displayedApplications.length} of {applications.length}
                {activeKpi === "pending" ? ` · total due ${formatInr(pendingFilterTotal / 100)}` : ""}
                {pendingServiceFilter ? ` · ${pendingServiceFilter}` : ""}
                {" · "}
                {pendingServiceFilter
                  ? "click the service card again to clear"
                  : "click the same KPI again to clear"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAdminInDash(KPI_DETAIL_LINKS[activeKpi].href, KPI_DETAIL_LINKS[activeKpi].label)
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B69B7] hover:underline"
              >
                {KPI_DETAIL_LINKS[activeKpi].label}
                <ExternalLink className="h-3 w-3" />
              </button>
              {activeKpi === "pending" ? (
                <button
                  type="button"
                  onClick={() => openAdminInDash("/admin/billing", "Billing")}
                  className="text-xs font-semibold text-[#0B69B7] hover:underline"
                >
                  Open billing →
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPendingServiceFilter(null);
                  setActiveKpi("all");
                }}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
              >
                <X className="h-3.5 w-3.5" />
                Clear filter
              </button>
            </div>
          </div>

          {activeKpi === "pending" && pendingByService.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-[#E5EAF0] bg-[#FFF8F1] px-4 py-3">
              {pendingByService.map((row) => {
                const active = pendingServiceFilter === row.name;
                return (
                  <button
                    key={row.name}
                    type="button"
                    onClick={() => togglePendingService(row.name)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-xs transition ${
                      active
                        ? "border-[#F0A04B] bg-[#FFE8CC] shadow-sm ring-1 ring-[#F0A04B]/40"
                        : "border-[#F0D2A8] bg-white hover:border-[#E8B86D] hover:bg-[#FFFBF5]"
                    }`}
                  >
                    <span className="font-semibold text-[#102A43]">{row.name}</span>
                    <span className="text-[#627D98]">
                      {row.count} case{row.count === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-[#9C4F17]">{formatInr(row.duePence / 100)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {displayedApplications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#627D98]">
              {activeKpi === "pending"
                ? pendingServiceFilter
                  ? `No pending payments for ${pendingServiceFilter}.`
                  : "No applications with a pending payment amount."
                : "No applications match this KPI filter."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[#F5F7FA] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Reference</th>
                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold">Service</th>
                    {activeKpi === "pending" ? (
                      <>
                        <th className="px-3 py-2 text-left font-semibold">Pending for</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount due</th>
                      </>
                    ) : null}
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                  {displayedApplications.slice(0, 40).map((app) => {
                    const pending = activeKpi === "pending" ? getPendingPaymentDetail(app) : null;
                    return (
                      <tr
                        key={app.id}
                        className="cursor-pointer hover:bg-[#F8FCFF]"
                        onClick={() =>
                          openAdminInDash(
                            `/admin/my-cases?applicationId=${encodeURIComponent(String(app.id))}`,
                            "My cases",
                          )
                        }
                      >
                        <td className="px-3 py-2.5 font-medium text-[#102A43]">{app.reference_number}</td>
                        <td className="px-3 py-2.5">{app.customer_name || "—"}</td>
                        <td className="px-3 py-2.5">{app.service_name || "—"}</td>
                        {pending ? (
                          <>
                            <td className="px-3 py-2.5">
                              <span className="rounded-full bg-[#FFF1E0] px-2 py-0.5 text-[11px] font-semibold text-[#9C4F17]">
                                {pending.kind}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-[#B42318]">
                              {formatInr(pending.amountPence / 100)}
                            </td>
                          </>
                        ) : null}
                        <td className="px-3 py-2.5 capitalize">
                          {String(app.application_status || "—").replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#627D98]">
                          {app.created_at
                            ? new Date(app.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {displayedApplications.length > 40 ? (
                <p className="px-4 py-2 text-xs text-[#627D98] border-t border-[#E5EAF0]">
                  Showing first 40 of {displayedApplications.length} matches.
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {!isOwnRevenueDashboard && activeKpi === "all" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            {DASH_TABS.map((tab) => {
              const active = !embeddedPage && dashTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    openDashTab(tab.id);
                  }}
                  className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#009877] text-white shadow-sm"
                      : "text-[#486581] hover:bg-[#F5F7FA] hover:text-[#102A43]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            {embeddedPage ? (
              <span className="rounded-[8px] bg-[#0B69B7] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {embeddedPage.label}
              </span>
            ) : null}
            <p className="ml-auto hidden px-2 text-[11px] text-[#829AB1] sm:block">
              Tabs and shortcuts open here — no page redirect
            </p>
          </div>

          {embeddedPage ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setEmbeddedPage(null)}
                className="text-sm font-semibold text-[#0B69B7] hover:underline"
              >
                ← Back to {DASH_TABS.find((t) => t.id === dashTab)?.label || "dashboard"}
              </button>
              <DashboardEmbedPanel href={embeddedPage.href} />
            </div>
          ) : null}

          {!embeddedPage && dashTab === "overview" ? (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5 lg:col-span-8">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Revenue · 7 days</h2>
                    <button
                      type="button"
                      onClick={() => openAdminInDash("/admin/reports?type=revenue", "Reports")}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B69B7] hover:underline"
                    >
                      Full report <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                        <XAxis dataKey="day" tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip
                          contentStyle={{
                            background: "#FFFFFF",
                            border: "0.5px solid #D9E1EA",
                            borderRadius: "10px",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="expected"
                          fill="#BFD9F5"
                          radius={[4, 4, 0, 0]}
                          name="3-day avg"
                          cursor="pointer"
                          onClick={() => openAdminInDash("/admin/reports?type=revenue", "Reports")}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#009877"
                          strokeWidth={2.5}
                          name="Actual"
                          dot={{ r: 3, cursor: "pointer", onClick: () => openAdminInDash("/admin/reports?type=revenue", "Reports") }}
                          activeDot={{
                            r: 5,
                            cursor: "pointer",
                            onClick: () => openAdminInDash("/admin/reports?type=revenue", "Reports"),
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5 lg:col-span-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Revenue by service</h2>
                    <button
                      type="button"
                      onClick={() => openAdminInDash("/admin/reports?type=service_mix", "Reports")}
                      className="text-[11px] font-semibold text-[#0B69B7] hover:underline"
                    >
                      Mix →
                    </button>
                  </div>
                  {serviceRevenueRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#627D98]">No revenue yet.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {serviceRevenueRows.map((row, index) => {
                        const max = serviceRevenueRows[0]?.amount || 1;
                        const pct = Math.max(6, Math.round((row.amount / max) * 100));
                        return (
                          <li key={row.name}>
                            <button
                              type="button"
                              onClick={() => openAdminInDash("/admin/reports?type=service_mix", "Reports")}
                              className="w-full text-left"
                            >
                              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate font-semibold text-[#102A43] hover:text-[#0B69B7]">
                                  {row.name}
                                </span>
                                <span className="shrink-0 font-semibold text-[#486581]">
                                  {formatInr(row.amount)}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[#F0F4F8]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    background: chartColors[index % chartColors.length],
                                  }}
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5 xl:col-span-7">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-heading font-semibold text-[#102A43]">Pipeline</h2>
                      <p className="mt-0.5 text-xs text-[#627D98]">
                        {pipelineOpenTotal} open · {pipelineBreachedTotal} SLA breach
                        {pipelineBreachedTotal === 1 ? "" : "es"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openAdminInDash("/admin/reports?type=pipeline_sla", "Reports")}
                        className="text-xs font-semibold text-[#0B69B7] hover:underline"
                      >
                        SLA report
                      </button>
                      <button
                        type="button"
                      onClick={() => openNativeDashTab("pipeline")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Kanban →
                    </button>
                    </div>
                  </div>
                  {pipelineOverview.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#627D98]">No pipeline data.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead className="bg-[#F5F7FA] text-[#486581]">
                          <tr>
                            <th className="px-2.5 py-2 text-left text-xs font-semibold">Stage</th>
                            <th className="px-2.5 py-2 text-right text-xs font-semibold">Open</th>
                            <th className="px-2.5 py-2 text-right text-xs font-semibold">Avg age</th>
                            <th className="px-2.5 py-2 text-right text-xs font-semibold">Breach</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF0]">
                          {pipelineOverview.map((item) => (
                            <tr
                              key={item.stage}
                              className="cursor-pointer hover:bg-[#F8FCFF]"
                              onClick={() => openNativeDashTab("pipeline")}
                            >
                              <td className="px-2.5 py-2 font-medium text-[#102A43]">{item.stage}</td>
                              <td className="px-2.5 py-2 text-right text-[#334E68]">{item.openCases}</td>
                              <td className="px-2.5 py-2 text-right text-[#627D98]">{item.avgAge}</td>
                              <td className="px-2.5 py-2 text-right">
                                <span
                                  className={`font-semibold ${
                                    item.breached > 0 ? "text-[#B42318]" : "text-[#006F57]"
                                  }`}
                                >
                                  {item.breached}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white xl:col-span-5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#E5EAF0] px-3.5 py-3">
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Recent cases</h2>
                    <button
                      type="button"
                      onClick={() => openDashTab("cases")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      All cases →
                    </button>
                  </div>
                  {recentApplications.length === 0 ? (
                    <p className="px-3.5 py-8 text-center text-sm text-[#627D98]">No applications yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-[#E5EAF0]">
                          {recentApplications.map((app) => (
                            <tr
                              key={app.id}
                              className="cursor-pointer hover:bg-[#F8FCFF]"
                              onClick={() =>
                                openAdminInDash(
                                  `/admin/my-cases?applicationId=${encodeURIComponent(String(app.id))}`,
                                  "My cases",
                                )
                              }
                            >
                              <td className="px-3.5 py-2.5">
                                <p className="font-medium text-[#102A43]">{app.reference_number}</p>
                                <p className="text-[11px] text-[#627D98]">
                                  {(app.service_name || "—") + " · " + (app.customer_name || "—")}
                                </p>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <span className="rounded-full bg-[#F0F4F8] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#486581]">
                                  {String(app.application_status || "—").replace(/_/g, " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => openAdminInDash("/admin/alerts", "Alerts")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#F0D2A8] bg-[#FFF8F1] px-2.5 py-1.5 font-semibold text-[#9C4F17] hover:bg-[#FFF1E0]"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alerts {Number(alertsSummary?.open || 0)}
                  {Number(alertsSummary?.critical || 0) > 0
                    ? ` · ${alertsSummary?.critical} critical`
                    : ""}
                </button>
                <button
                  type="button"
                  onClick={() => openAdminInDash("/admin/reports?type=audit", "Reports")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1.5 font-semibold text-[#486581] hover:border-[#009877]/40 hover:text-[#102A43]"
                >
                  Audit success {healthExtras.auditSuccess}
                </button>
                <button
                  type="button"
                  onClick={() => openAdminInDash("/admin/reports?type=pipeline_sla", "Reports")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1.5 font-semibold text-[#486581] hover:border-[#009877]/40 hover:text-[#102A43]"
                >
                  Avg process {healthExtras.avgProcessing}
                </button>
                <button
                  type="button"
                  onClick={() => openAdminInDash("/admin/team-performance", "Performance")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1.5 font-semibold text-[#486581] hover:border-[#009877]/40 hover:text-[#102A43]"
                >
                  CSAT {healthExtras.csat}
                </button>
                {isFounderView ? (
                  <button
                    type="button"
                    onClick={() => openAdminInDash("/admin/security", "Security")}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#F2C7C3] bg-[#FFF1F0] px-2.5 py-1.5 font-semibold text-[#B42318] hover:bg-[#FFE8E6]"
                  >
                    Failed logins {failedLogins}
                  </button>
                ) : null}
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openDashTab("money")}
                    className="font-semibold text-[#0B69B7] hover:underline"
                  >
                    Money tab →
                  </button>
                  <button
                    type="button"
                    onClick={() => openDashTab("ops")}
                    className="font-semibold text-[#0B69B7] hover:underline"
                  >
                    Ops & setup →
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {!embeddedPage && dashTab === "cases" ? (
            <div className="space-y-3">
              <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Cases by status</h2>
                    <p className="mt-0.5 text-xs text-[#627D98]">
                      Click a status to filter · click a row to open the case
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openNativeDashTab("pipeline")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Pipeline →
                    </button>
                    <button
                      type="button"
                      onClick={() => openNativeDashTab("workload")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Workload →
                    </button>
                    <button
                      type="button"
                      onClick={() => openAdminInDash("/admin/reports?type=leads", "Reports")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Leads report →
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCaseStatusFilter(null)}
                    className={`rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold ${
                      !caseStatusFilter
                        ? "border-[#009877] bg-[#009877]/10 text-[#006F57]"
                        : "border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA]"
                    }`}
                  >
                    All ({applications.length})
                  </button>
                  {applicationStatusBreakdown.map((row) => {
                    const active = caseStatusFilter === row.name;
                    return (
                      <button
                        key={row.name}
                        type="button"
                        onClick={() => setCaseStatusFilter(active ? null : row.name)}
                        className={`rounded-[8px] border px-2.5 py-1.5 text-xs capitalize ${
                          active
                            ? "border-[#009877] bg-[#009877]/10 font-semibold text-[#006F57]"
                            : "border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA]"
                        }`}
                      >
                        {row.name} · {row.count}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
                {casesTabRows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[#627D98]">No cases for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-[#F5F7FA] text-[#486581]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Reference</th>
                          <th className="px-3 py-2 text-left font-semibold">Customer</th>
                          <th className="px-3 py-2 text-left font-semibold">Service</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                          <th className="px-3 py-2 text-left font-semibold">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                        {casesTabRows.map((app) => (
                          <tr
                            key={app.id}
                            className="cursor-pointer hover:bg-[#F8FCFF]"
                            onClick={() =>
                              openAdminInDash(
                                `/admin/my-cases?applicationId=${encodeURIComponent(String(app.id))}`,
                                "My cases",
                              )
                            }
                          >
                            <td className="px-3 py-2.5 font-medium text-[#102A43]">{app.reference_number}</td>
                            <td className="px-3 py-2.5">{app.customer_name || "—"}</td>
                            <td className="px-3 py-2.5">{app.service_name || "—"}</td>
                            <td className="px-3 py-2.5 capitalize">
                              {String(app.application_status || "—").replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-[#627D98]">
                              {app.created_at
                                ? new Date(app.created_at).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {!embeddedPage && dashTab === "workload" ? <WorkloadView embedded /> : null}

          {!embeddedPage && dashTab === "pipeline" ? <KanbanView embedded /> : null}

          {!embeddedPage && dashTab === "money" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                  {
                    label: "Pending pay",
                    value: formatInr(kpiSnapshot.pending_payments),
                    href: "/admin/reports?type=pending_payments",
                    action: () => toggleKpi("pending"),
                  },
                  {
                    label: "Revenue today",
                    value: formatInr(kpiSnapshot.revenue_today),
                    href: "/admin/reports?type=revenue",
                    action: () => toggleKpi("revenue"),
                  },
                  {
                    label: "Audit today",
                    value: formatInr(kpiSnapshot.audit_revenue_today ?? 0),
                    href: "/admin/reports?type=audit",
                    action: () => toggleKpi("audit"),
                  },
                  {
                    label: "Avg ticket",
                    value: formatInr(kpiSnapshot.avg_ticket_size),
                    href: "/admin/revenue",
                    action: () => toggleKpi("avg_ticket"),
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5"
                  >
                    <p className="text-[11px] text-[#627D98]">{card.label}</p>
                    <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">{card.value}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={card.action}
                        className="font-semibold text-[#006F57] hover:underline"
                      >
                        Filter KPI
                      </button>
                      <button
                        type="button"
                        onClick={() => openAdminInDash(card.href, card.label.includes("ticket") ? "Revenue" : "Reports")}
                        className="font-semibold text-[#0B69B7] hover:underline"
                      >
                        Detail →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Pending by service</h2>
                    <button
                      type="button"
                      onClick={() => openAdminInDash("/admin/billing", "Billing")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Billing →
                    </button>
                  </div>
                  {pendingByService.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#627D98]">Nothing pending.</p>
                  ) : (
                    <ul className="space-y-2">
                      {pendingByService.map((row) => (
                        <li key={row.name}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveKpi("pending");
                              setPendingServiceFilter(row.name);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-[#F0D2A8] bg-[#FFF8F1] px-3 py-2 text-left text-xs hover:bg-[#FFF1E0]"
                          >
                            <span className="font-semibold text-[#102A43]">{row.name}</span>
                            <span className="text-[#627D98]">
                              {row.count} · {formatInr(row.duePence / 100)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-heading font-semibold text-[#102A43]">Top services</h2>
                    <button
                      type="button"
                      onClick={() => openAdminInDash("/admin/reports?type=service_mix", "Reports")}
                      className="text-xs font-semibold text-[#0B69B7] hover:underline"
                    >
                      Service mix →
                    </button>
                  </div>
                  {serviceRevenueRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#627D98]">No revenue yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {serviceRevenueRows.map((row) => (
                        <li key={row.name}>
                          <button
                            type="button"
                            onClick={() => openAdminInDash("/admin/reports?type=service_mix", "Reports")}
                            className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-[#D9E1EA] px-3 py-2 text-left text-xs hover:bg-[#F8FCFF]"
                          >
                            <span className="font-semibold text-[#102A43]">{row.name}</span>
                            <span className="font-semibold text-[#486581]">{formatInr(row.amount)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openAdminInDash("/admin/billing", "Billing")} className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-3 py-2 text-xs font-semibold text-white hover:bg-[#007B61]">
                  <CreditCard className="h-3.5 w-3.5" /> Billing
                </button>
                <button type="button" onClick={() => openAdminInDash("/admin/revenue", "Revenue")} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]">
                  <Landmark className="h-3.5 w-3.5" /> Revenue
                </button>
                <button type="button" onClick={() => openAdminInDash("/admin/reports", "Reports")} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]">
                  <PieChartIcon className="h-3.5 w-3.5" /> All reports
                </button>
                <button type="button" onClick={() => openAdminInDash("/admin/easyfly/revenue", "EasyFly revenue")} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]">
                  <Plane className="h-3.5 w-3.5" /> EasyFly revenue
                </button>
              </div>
            </div>
          ) : null}

          {!embeddedPage && dashTab === "ops" ? (
            <div className="space-y-4">
              {CONSOLE_LINKS.map((group) => (
                <div key={group.group} className="rounded-[10px] border border-[#D9E1EA] bg-white p-3.5">
                  <h2 className="mb-3 text-sm font-heading font-semibold text-[#102A43]">{group.group}</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => openAdminInDash(item.href, item.label)}
                          className="flex items-start gap-2.5 rounded-[10px] border border-[#D9E1EA] px-3 py-2.5 text-left transition hover:border-[#009877]/40 hover:bg-[#F8FCFF]"
                        >
                          <span className="mt-0.5 rounded-lg bg-[#009877]/10 p-1.5 text-[#009877]">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-[#102A43]">{item.label}</span>
                            <span className="block text-[11px] text-[#829AB1]">{item.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isOpsView && (
        <div className="bg-white rounded-[10px] border-[0.5px] border-[#D9E1EA] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-heading font-semibold text-[#102A43]">My Assigned Tasks</h2>
            <button type="button" onClick={() => openAdminInDash("/admin/my-cases", "My cases")} className="text-sm font-semibold text-[#0B69B7] hover:underline">
              My cases →
            </button>
          </div>
          <div className="space-y-2">
            {taskItems.filter(
              (t) =>
                staffIdsMatch(t.assigned_staff, adminUser?.id) &&
                pendingTaskStatuses.has(String(t.status || "").toLowerCase()),
            ).length === 0 ? (
              <p className="text-sm text-[#627D98]">
                No pending tasks assigned to you. Check My Active Cases for completed work.
              </p>
            ) : (
              taskItems
                .filter(
                  (t) =>
                    staffIdsMatch(t.assigned_staff, adminUser?.id) &&
                    pendingTaskStatuses.has(String(t.status || "").toLowerCase()),
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#F8FAFC] border-[0.5px] border-[#D9E1EA] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[#102A43] text-sm font-medium">{task.application_reference}</p>
                      <p className="text-xs text-[#627D98] capitalize">
                        {task.task_type.replace(/_/g, " ")} • {task.customer_name || "—"}
                      </p>
                      <p className="text-xs text-[#627D98]">Due: {formatTaskDeadline(task.deadline)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className="rounded-full bg-[#009877]/12 px-2.5 py-1 text-[11px] text-[#006F57]">
                        {formatTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-full bg-[#B87333]/12 px-2.5 py-1 text-[11px] text-[#9C4F17]">
                        {task.priority}
                      </span>
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
        <div className="bg-white rounded-[10px] border-[0.5px] border-[#D9E1EA] px-4 py-3">
          <p className="text-sm text-[#486581]">
            Read-only mode active for this role. Strategic reports remain restricted to Admin / CEO and
            Operations Manager.
          </p>
        </div>
      )}
    </div>
  );
}
