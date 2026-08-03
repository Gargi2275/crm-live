"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAdminDashboardOverview,
  getStaffAccuracyAll,
  listAdminApplications,
  type AdminApplication,
  type AdminDashboardOverview,
  type StaffAccuracyRow,
} from "@/lib/admin-auth";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Lock,
  BarChart3,
  IndianRupee,
  Users,
  Clock,
  Activity,
  Workflow,
  ShieldCheck,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

type ReportPeriod = "today" | "week" | "month" | "all";
type ReportType =
  | "revenue"
  | "leads"
  | "pending_payments"
  | "staff_performance"
  | "pipeline_sla"
  | "audit"
  | "service_mix";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const CHART_COLORS = ["#009877", "#33A1FD", "#B87333", "#0F766E", "#D9E1EA", "#5F3DC4"];

const REPORT_OPTIONS: { id: ReportType; label: string; description: string; icon: typeof IndianRupee }[] = [
  {
    id: "revenue",
    label: "Revenue summary",
    description: "Daily/monthly collections and earnings trend",
    icon: IndianRupee,
  },
  {
    id: "leads",
    label: "Leads & conversion",
    description: "Lead volume, converted cases, conversion rate",
    icon: Users,
  },
  {
    id: "pending_payments",
    label: "Pending payments",
    description: "Applications with amount due or payment pending",
    icon: Clock,
  },
  {
    id: "staff_performance",
    label: "Staff performance",
    description: "Accuracy, assigned, completed, pending workload",
    icon: Activity,
  },
  {
    id: "pipeline_sla",
    label: "Pipeline & SLA",
    description: "Open cases by stage and SLA breaches",
    icon: Workflow,
  },
  {
    id: "audit",
    label: "Assessment outcomes",
    description: "Document check success ratio and assessment fee revenue",
    icon: ShieldCheck,
  },
  {
    id: "service_mix",
    label: "Service mix",
    description: "Revenue and case count by service type",
    icon: Layers,
  },
];

const PENDING_PAY_STATUSES = new Set([
  "payment_pending",
  "pending_quote",
  "quoted",
  "final_submission_pending",
]);

const PAID_STATUSES = new Set([
  "paid",
  "payment_received",
  "completed",
  "dispatched",
  "approved",
  "submitted",
]);

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

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

function inPeriod(date: Date | null, period: ReportPeriod) {
  if (!date) return period === "all";
  if (period === "all") return true;
  if (period === "today") return date >= startOfToday();
  if (period === "week") return date >= daysAgo(6);
  return date >= daysAgo(29);
}

function isPaidApplication(app: AdminApplication) {
  const status = String(app.application_status || "").toLowerCase();
  return (
    Boolean(app.payment_confirmed) ||
    String(app.full_payment_status || "").toLowerCase() === "paid" ||
    PAID_STATUSES.has(status)
  );
}

function isPendingPayment(app: AdminApplication) {
  const status = String(app.application_status || "").toLowerCase();
  return Number(app.amount_due_pence || 0) > 0 || PENDING_PAY_STATUSES.has(status);
}

function isAuditPaid(app: AdminApplication) {
  const payment = String(app.audit_payment_status || "").toLowerCase();
  return Boolean(app.audit_fee_paid) || payment === "paid" || payment === "succeeded";
}

/** Best available paid service amount in £. */
function appPaidGbp(app: AdminApplication) {
  if (!isPaidApplication(app)) return 0;
  const pence = Number(
    app.service_total_pence ||
      app.fee_plan_fee_pence ||
      app.quote_amount_pence ||
      (typeof app.quoted_fee === "number" ? app.quoted_fee * 100 : 0) ||
      0,
  );
  return Number.isFinite(pence) ? Math.max(0, pence) / 100 : 0;
}

function appAuditGbp(app: AdminApplication) {
  if (!isAuditPaid(app)) return 0;
  const pence = Number(app.audit_fee_pence || 0);
  return Number.isFinite(pence) ? Math.max(0, pence) / 100 : 0;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function periodDayCount(period: ReportPeriod) {
  if (period === "today") return 1;
  if (period === "week") return 7;
  if (period === "month") return 30;
  return 30;
}

function buildDailyRevenueSeries(apps: AdminApplication[], period: ReportPeriod) {
  const days = period === "all" ? 30 : periodDayCount(period);
  const labels: string[] = [];
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgo(i);
    const key = dayKey(d);
    labels.push(key.slice(5)); // MM-DD
    map.set(key, 0);
  }
  for (const app of apps) {
    const created = appCreatedAt(app);
    if (!created || !isPaidApplication(app)) continue;
    const key = dayKey(created);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) || 0) + appPaidGbp(app));
  }
  const rows = Array.from(map.entries()).map(([key, actual], index) => {
    const window = labels.slice(Math.max(0, index - 2), index + 1);
    const keys = Array.from(map.keys()).slice(Math.max(0, index - 2), index + 1);
    const expected =
      keys.length > 0 ? keys.reduce((sum, k) => sum + (map.get(k) || 0), 0) / keys.length : 0;
    return {
      day: key.slice(5),
      actual: Number(actual.toFixed(2)),
      expected: Number(expected.toFixed(2)),
      _window: window,
    };
  });
  return rows;
}

function buildMonthlyRevenueSeries(apps: AdminApplication[]) {
  const map = new Map<string, number>();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    map.set(monthKey(d), 0);
  }
  for (const app of apps) {
    const created = appCreatedAt(app);
    if (!created || !isPaidApplication(app)) continue;
    const key = monthKey(created);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) || 0) + appPaidGbp(app));
  }
  return Array.from(map.entries()).map(([month, revenue]) => ({
    month: month.slice(5),
    revenue: Number(revenue.toFixed(2)),
    fullMonth: month,
  }));
}

function buildServiceRevenueSeries(apps: AdminApplication[]) {
  const map = new Map<string, number>();
  for (const app of apps) {
    if (!isPaidApplication(app)) continue;
    const name = app.service_name || "Other";
    map.set(name, (map.get(name) || 0) + appPaidGbp(app));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name: name.length > 22 ? `${name.slice(0, 20)}…` : name,
      fullName: name,
      value: Number(value.toFixed(2)),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function MetricCard({
  label,
  value,
  hint,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const className = `rounded-[12px] border bg-white p-4 text-left shadow-sm transition ${
    active
      ? "border-[#009877] ring-1 ring-[#009877]/30 bg-[#009877]/5"
      : "border-[#D9E1EA]"
  } ${interactive ? "cursor-pointer hover:border-[#009877]/40 hover:bg-[#F8FAFC]" : ""}`;

  if (!interactive) {
    return (
      <div className={className}>
        <p className="text-xs font-medium uppercase tracking-wide text-[#627D98]">{label}</p>
        <p className="mt-2 text-xl font-heading font-semibold text-[#102A43]">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-[#829AB1]">{hint}</p> : null}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#627D98]">{label}</p>
      <p className="mt-2 text-xl font-heading font-semibold text-[#102A43]">{value}</p>
      <p className="mt-1 text-[11px] text-[#829AB1]">{active ? "Filtering table" : hint || "Click to filter"}</p>
    </button>
  );
}

function ChartBox({
  title,
  height = 280,
  className = "",
  children,
}: {
  title: string;
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[10px] border border-[#E5EAF0] bg-white p-3 overflow-hidden ${className}`}>
      <p className="mb-2 truncate text-sm font-semibold text-[#102A43]">{title}</p>
      <div className="relative w-full min-w-0" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 8 };
const TOOLTIP_STYLE = { background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" };
const TICK_STYLE = { fill: "#486581", fontSize: 11 };

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { adminUser } = useAdminAuth();
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/reports");
  const canViewReports = canAccess;
  const canViewStaffAccuracy = adminUser?.role === "admin" || adminUser?.role === "ops_manager";

  const initialType = (searchParams.get("type") || "revenue") as ReportType;
  const [reportType, setReportTypeState] = useState<ReportType>(
    REPORT_OPTIONS.some((o) => o.id === initialType) ? initialType : "revenue",
  );
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [accuracyRows, setAccuracyRows] = useState<StaffAccuracyRow[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);

  const setReportType = useCallback(
    (next: ReportType) => {
      setReportTypeState(next);
      setKpiFilter(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", next);
      router.replace(`/admin/reports?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const toggleKpi = useCallback((key: string) => {
    setKpiFilter((current) => (current === key ? null : key));
  }, []);

  useEffect(() => {
    const next = searchParams.get("type") as ReportType | null;
    if (!next || !REPORT_OPTIONS.some((o) => o.id === next)) return;
    setReportTypeState(next);
  }, [searchParams]);

  const loadReports = useCallback(async () => {
    if (!canViewReports) return;
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      const to = end.toISOString().slice(0, 10);
      const from = start.toISOString().slice(0, 10);

      const [overview, apps] = await Promise.all([
        getAdminDashboardOverview(),
        listAdminApplications(),
      ]);
      setDashboardData(overview);
      setApplications(apps);

      if (canViewStaffAccuracy) {
        const accuracyPayload = await getStaffAccuracyAll(from, to);
        setAccuracyRows(accuracyPayload.results || []);
      } else {
        setAccuracyRows([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reports data.");
    } finally {
      setLoading(false);
    }
  }, [canViewReports, canViewStaffAccuracy]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const serviceOptions = useMemo(
    () =>
      Array.from(new Set(applications.map((app) => app.service_name).filter(Boolean) as string[])).sort(),
    [applications],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(applications.map((app) => String(app.application_status || "").toLowerCase()).filter(Boolean)),
      ).sort(),
    [applications],
  );

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const created = appCreatedAt(app);
      if (!inPeriod(created, period)) return false;
      if (serviceFilter !== "all" && app.service_name !== serviceFilter) return false;
      if (statusFilter !== "all" && String(app.application_status || "").toLowerCase() !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [applications, period, serviceFilter, statusFilter]);

  const pipelineOverview = dashboardData?.pipeline_overview ?? [];
  const staffMembers = dashboardData?.staff_members ?? [];

  const paidApps = useMemo(() => filteredApps.filter(isPaidApplication), [filteredApps]);
  const pendingApps = useMemo(() => filteredApps.filter(isPendingPayment), [filteredApps]);
  const leadsInPeriod = filteredApps.length;
  const convertedInPeriod = paidApps.length;
  const conversionRate =
    leadsInPeriod > 0 ? `${((convertedInPeriod / leadsInPeriod) * 100).toFixed(1)}%` : "0%";
  const pendingAmount = pendingApps.reduce((sum, app) => sum + Number(app.amount_due_pence || 0), 0) / 100;
  const revenueInPeriod = paidApps.reduce((sum, app) => sum + appPaidGbp(app), 0);
  const auditRevenueInPeriod = filteredApps.reduce((sum, app) => sum + appAuditGbp(app), 0);
  const avgTicket = convertedInPeriod > 0 ? revenueInPeriod / convertedInPeriod : 0;
  const todayLeads = filteredApps.filter((app) => inPeriod(appCreatedAt(app), "today")).length;
  const auditPassCount = filteredApps.filter((app) => String(app.audit_result || "").toLowerCase() === "green").length;
  const auditFailCount = filteredApps.filter((app) => String(app.audit_result || "").toLowerCase() === "red").length;
  const auditRequestedCount = filteredApps.filter((app) => {
    const result = String(app.audit_result || "").toLowerCase();
    return Boolean(result) || isAuditPaid(app);
  }).length;
  const auditSuccessRatio =
    auditPassCount + auditFailCount > 0
      ? `${((auditPassCount / (auditPassCount + auditFailCount)) * 100).toFixed(1)}%`
      : "0%";

  const importantKpis = useMemo(
    () => [
      {
        key: "revenue",
        label: "Revenue",
        value: formatInr(revenueInPeriod),
        hint: "Paid cases in filters",
        report: "revenue" as ReportType,
        kpi: "avg_ticket",
      },
      {
        key: "leads",
        label: "Leads",
        value: String(leadsInPeriod),
        hint: "Applications in period",
        report: "leads" as ReportType,
        kpi: "leads",
      },
      {
        key: "conversion",
        label: "Conversion",
        value: conversionRate,
        hint: "Paid / leads",
        report: "leads" as ReportType,
        kpi: "converted",
      },
      {
        key: "pending",
        label: "Pending pay",
        value: formatInr(pendingAmount),
        hint: `${pendingApps.length} cases`,
        report: "pending_payments" as ReportType,
        kpi: "amount",
      },
      {
        key: "audit_rev",
        label: "Assessment £",
        value: formatInr(auditRevenueInPeriod),
        hint: "Assessment fees paid",
        report: "audit" as ReportType,
        kpi: "revenue",
      },
      {
        key: "avg_ticket",
        label: "Avg ticket",
        value: formatInr(avgTicket),
        hint: "Per paid case",
        report: "revenue" as ReportType,
        kpi: "avg_ticket",
      },
    ],
    [
      auditRevenueInPeriod,
      avgTicket,
      conversionRate,
      leadsInPeriod,
      pendingAmount,
      pendingApps.length,
      revenueInPeriod,
    ],
  );

  const serviceMixFromApps = useMemo(() => {
    const map = new Map<string, { name: string; cases: number; paid: number }>();
    for (const app of filteredApps) {
      const name = app.service_name || "Other";
      const row = map.get(name) || { name, cases: 0, paid: 0 };
      row.cases += 1;
      if (isPaidApplication(app)) row.paid += 1;
      map.set(name, row);
    }
    return Array.from(map.values()).sort((a, b) => b.cases - a.cases);
  }, [filteredApps]);

  const staffRows = useMemo(() => {
    if (accuracyRows.length > 0) {
      return [...accuracyRows]
        .sort((a, b) => b.overall_accuracy - a.overall_accuracy)
        .map((row) => {
          const member = staffMembers.find((s) => s.id === row.staff_id);
          return {
            id: row.staff_id,
            name: row.staff_name,
            accuracy: row.overall_accuracy,
            badge: row.badge,
            assigned: member?.assigned ?? 0,
            completed: member?.completed ?? 0,
          };
        });
    }
    return [...staffMembers]
      .filter((s) => String(s.role || "").toLowerCase() !== "admin")
      .sort((a, b) => b.accuracy - a.accuracy)
      .map((s) => ({
        id: s.id,
        name: s.name,
        accuracy: s.accuracy,
        badge: "-",
        assigned: s.assigned,
        completed: s.completed,
      }));
  }, [accuracyRows, staffMembers]);

  const auditApps = useMemo(() => {
    return filteredApps.filter((app) => {
      const result = String(app.audit_result || "").toLowerCase();
      const payment = String(app.audit_payment_status || "").toLowerCase();
      return Boolean(result) || payment === "paid" || payment === "succeeded" || payment === "pending";
    });
  }, [filteredApps]);

  const staffAuditChart = useMemo(
    () =>
      staffMembers
        .filter((s) => String(s.role || "").toLowerCase() !== "admin")
        .map((s) => ({
          name: s.name.split(" ")[0] || s.name,
          fullName: s.name,
          passed: s.auditsPassed || 0,
          failed: s.auditsFailed || 0,
        }))
        .filter((s) => s.passed + s.failed > 0)
        .slice(0, 10),
    [staffMembers],
  );

  const kpiScopedApps = useMemo(() => {
    if (!kpiFilter) return filteredApps;
    if (reportType === "revenue") {
      if (kpiFilter === "revenue_today") {
        return filteredApps.filter((app) => inPeriod(appCreatedAt(app), "today") && isPaidApplication(app));
      }
      if (kpiFilter === "audit") {
        return filteredApps.filter((app) => isAuditPaid(app) || Boolean(app.audit_result));
      }
      if (kpiFilter === "avg_ticket") return filteredApps.filter(isPaidApplication);
      if (kpiFilter === "pending") return filteredApps.filter(isPendingPayment);
    }
    if (reportType === "leads") {
      if (kpiFilter === "converted") return filteredApps.filter(isPaidApplication);
      if (kpiFilter === "today") return filteredApps.filter((app) => inPeriod(appCreatedAt(app), "today"));
      if (kpiFilter === "conversion") return filteredApps.filter(isPaidApplication);
    }
    if (reportType === "pending_payments") {
      if (kpiFilter === "amount") return pendingApps.filter((app) => Number(app.amount_due_pence || 0) > 0);
      if (kpiFilter === "cases" || kpiFilter === "snapshot") return pendingApps;
    }
    if (reportType === "audit") {
      if (kpiFilter === "success") {
        return filteredApps.filter((app) => String(app.audit_result || "").toLowerCase() === "green");
      }
      if (kpiFilter === "failed") {
        return filteredApps.filter((app) => String(app.audit_result || "").toLowerCase() === "red");
      }
      if (kpiFilter === "revenue") {
        return filteredApps.filter((app) => isAuditPaid(app));
      }
      if (kpiFilter === "requested") return auditApps.length ? auditApps : filteredApps;
    }
    return filteredApps;
  }, [auditApps, filteredApps, kpiFilter, pendingApps, reportType]);

  const kpiScopedPendingApps = useMemo(() => {
    if (reportType !== "pending_payments") return pendingApps;
    if (!kpiFilter || kpiFilter === "cases" || kpiFilter === "snapshot") return pendingApps;
    if (kpiFilter === "amount") return pendingApps.filter((app) => Number(app.amount_due_pence || 0) > 0);
    return pendingApps;
  }, [kpiFilter, pendingApps, reportType]);

  const kpiScopedStaffRows = useMemo(() => {
    if (reportType !== "staff_performance" || !kpiFilter || kpiFilter === "staff") return staffRows;
    if (kpiFilter === "assigned") return staffRows.filter((row) => row.assigned > 0);
    if (kpiFilter === "completed") return staffRows.filter((row) => row.completed > 0);
    if (kpiFilter === "accuracy") {
      const avg =
        staffRows.length > 0
          ? staffRows.reduce((sum, row) => sum + Number(row.accuracy), 0) / staffRows.length
          : 0;
      return staffRows.filter((row) => Number(row.accuracy) >= avg);
    }
    return staffRows;
  }, [kpiFilter, reportType, staffRows]);

  const kpiScopedPipeline = useMemo(() => {
    if (reportType !== "pipeline_sla" || !kpiFilter || kpiFilter === "stages") return pipelineOverview;
    if (kpiFilter === "breached") return pipelineOverview.filter((row) => Number(row.breached || 0) > 0);
    if (kpiFilter === "open") return pipelineOverview.filter((row) => Number(row.openCases || 0) > 0);
    return pipelineOverview;
  }, [kpiFilter, pipelineOverview, reportType]);

  const kpiScopedServiceMix = useMemo(() => {
    if (reportType !== "service_mix" || !kpiFilter || kpiFilter === "services") return serviceMixFromApps;
    if (kpiFilter === "paid") return serviceMixFromApps.filter((row) => row.paid > 0);
    if (kpiFilter === "cases") return serviceMixFromApps.filter((row) => row.cases > 0);
    return serviceMixFromApps;
  }, [kpiFilter, reportType, serviceMixFromApps]);

  const chartApps = useMemo(() => {
    if (reportType === "pending_payments") return kpiScopedPendingApps;
    if (reportType === "audit") return kpiFilter ? kpiScopedApps : auditApps.length ? auditApps : filteredApps;
    if (reportType === "leads") return kpiFilter && kpiFilter !== "leads" ? kpiScopedApps : filteredApps;
    if (reportType === "revenue") return kpiScopedApps;
    return filteredApps;
  }, [
    auditApps,
    filteredApps,
    kpiFilter,
    kpiScopedApps,
    kpiScopedPendingApps,
    reportType,
  ]);

  const filteredDailyRevenue = useMemo(
    () => buildDailyRevenueSeries(chartApps, period),
    [chartApps, period],
  );
  const filteredMonthlyRevenue = useMemo(() => buildMonthlyRevenueSeries(chartApps), [chartApps]);
  const filteredServiceRevenue = useMemo(() => buildServiceRevenueSeries(chartApps), [chartApps]);

  const kpiStatusBreakdown = useMemo(() => {
    const source = chartApps;
    const map = new Map<string, number>();
    for (const app of source) {
      const status = String(app.application_status || "unknown").replace(/_/g, " ");
      map.set(status, (map.get(status) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [chartApps]);

  const auditOutcomeBreakdown = useMemo(() => {
    const source = reportType === "audit" ? chartApps : filteredApps;
    const counts = { green: 0, amber: 0, red: 0, pending: 0, none: 0 };
    for (const app of source) {
      const result = String(app.audit_result || "").toLowerCase();
      if (result === "green") counts.green += 1;
      else if (result === "amber") counts.amber += 1;
      else if (result === "red") counts.red += 1;
      else if (result === "pending") counts.pending += 1;
      else counts.none += 1;
    }
    return [
      { name: "Pass (green)", value: counts.green, fill: "#009877" },
      { name: "Fix (amber)", value: counts.amber, fill: "#B87333" },
      { name: "Fail (red)", value: counts.red, fill: "#B42318" },
      { name: "Pending", value: counts.pending, fill: "#33A1FD" },
      { name: "No audit", value: counts.none, fill: "#D9E1EA" },
    ].filter((row) => row.value > 0);
  }, [chartApps, filteredApps, reportType]);

  useEffect(() => {
    setKpiFilter(null);
  }, [period, serviceFilter, statusFilter]);

  const clearFilters = useCallback(() => {
    setPeriod("month");
    setServiceFilter("all");
    setStatusFilter("all");
    setKpiFilter(null);
    setReportType("revenue");
  }, [setReportType]);

  const activeFilterCount =
    (period !== "month" ? 1 : 0) +
    (serviceFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (kpiFilter ? 1 : 0);

  useSetAdminPageChrome(
    canViewReports
      ? {
          title: "Reports",
          subtitle: "Mandatory operational & finance reports",
          icon: BarChart3,
          activeFilterCount,
          onClearFilters: clearFilters,
          syncKey: `${reportType}|${period}|${serviceFilter}|${statusFilter}|${kpiFilter}|${loading}|${filteredApps.length}`,
          meta: loading ? "Loading…" : `${filteredApps.length} apps in period${kpiFilter ? " · KPI filter on" : ""}`,
          filtersContent: (
            <>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Report</span>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className={filterFieldClass}
                >
                  {REPORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Period</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                  className={filterFieldClass}
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Service</span>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">All services</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ),
        }
      : null,
  );

  if (!accessReady) {
    return (
      <div className="mx-auto max-w-[900px] font-body">
        <div className="inline-flex items-center gap-2 rounded-[12px] border border-[#D9E1EA] bg-white p-5 text-[#486581]">
          Checking access…
        </div>
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="mx-auto max-w-[900px] font-body">
        <div className="inline-flex items-center gap-2 rounded-[12px] border border-[#D9E1EA] bg-white p-5 text-[#486581]">
          <Lock className="h-4 w-4 text-[#9C4F17]" /> Access restricted. Ask an admin to grant the Reports
          module for your role.
        </div>
      </div>
    );
  }

  const activeReport = REPORT_OPTIONS.find((item) => item.id === reportType)!;

  const statusChartData = kpiStatusBreakdown.map((row) => ({
    ...row,
    name: row.name.length > 16 ? `${row.name.slice(0, 14)}…` : row.name,
    fullName: row.name,
  }));

  const pipelineChartScoped = kpiScopedPipeline.map((row) => ({
    stage: row.stage.length > 14 ? `${row.stage.slice(0, 12)}…` : row.stage,
    fullStage: row.stage,
    open: Number(row.openCases || 0),
    breached: Number(row.breached || 0),
  }));

  const servicePieData = filteredServiceRevenue;

  const activateImportantKpi = (item: (typeof importantKpis)[number]) => {
    setReportTypeState(item.report);
    setKpiFilter(item.kpi);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", item.report);
    router.replace(`/admin/reports?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 font-body">
      <section className="rounded-[12px] border border-[#D9E1EA] bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-heading font-semibold text-[#102A43]">Important KPIs</h2>
            <p className="text-[11px] text-[#829AB1]">
              Live from current filters · click to open module &amp; filter charts
              {kpiFilter ? " · KPI filter on" : ""}
            </p>
          </div>
          {loading ? <span className="text-xs text-[#627D98]">Loading…</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
          {importantKpis.map((item) => {
            const active = reportType === item.report && kpiFilter === item.kpi;
            return (
              <MetricCard
                key={item.key}
                label={item.label}
                value={item.value}
                hint={item.hint}
                active={active}
                onClick={() => activateImportantKpi(item)}
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#D9E1EA] bg-white p-2">
        <div className="flex flex-wrap gap-1.5">
          {REPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = reportType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setReportType(option.id)}
                title={option.description}
                className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[#009877] bg-[#009877] text-white"
                    : "border-[#D9E1EA] bg-[#F8FAFC] text-[#486581] hover:border-[#33A1FD]/40 hover:bg-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#D9E1EA] bg-white p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-heading font-semibold text-[#102A43]">{activeReport.label}</h2>
            <p className="text-xs text-[#627D98] mt-0.5">{activeReport.description}</p>
          </div>
          {loading ? <span className="text-xs text-[#627D98]">Loading…</span> : null}
        </div>

        <div className="space-y-4">
        {reportType === "revenue" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Revenue (filtered)"
                value={formatInr(revenueInPeriod)}
                hint={`${convertedInPeriod} paid cases`}
                active={kpiFilter === "avg_ticket"}
                onClick={() => toggleKpi("avg_ticket")}
              />
              <MetricCard
                label="Assessment revenue"
                value={formatInr(auditRevenueInPeriod)}
                active={kpiFilter === "audit"}
                onClick={() => toggleKpi("audit")}
              />
              <MetricCard
                label="Avg ticket"
                value={formatInr(avgTicket)}
                active={kpiFilter === "avg_ticket"}
                onClick={() => toggleKpi("avg_ticket")}
              />
              <MetricCard
                label="Pending payments"
                value={formatInr(pendingAmount)}
                hint={`${pendingApps.length} cases`}
                active={kpiFilter === "pending"}
                onClick={() => toggleKpi("pending")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartBox title="Daily revenue trend (filtered)" height={300} className="lg:col-span-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredDailyRevenue} margin={{ ...CHART_MARGIN, top: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                    <XAxis dataKey="day" tick={TICK_STYLE} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis tick={TICK_STYLE} width={48} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="actual" stroke="#009877" strokeWidth={3} name="Actual" dot={{ r: 3 }} />
                    <Line dataKey="expected" stroke="#33A1FD" strokeWidth={2} name="3-day avg" dot={{ r: 3 }} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
              <ChartBox title="Monthly revenue (filtered)" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredMonthlyRevenue} margin={CHART_MARGIN} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                    <XAxis dataKey="month" tick={TICK_STYLE} interval={0} />
                    <YAxis tick={TICK_STYLE} width={48} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="revenue" fill="#009877" radius={[6, 6, 0, 0]} name="Revenue" maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartBox title="Service revenue mix (filtered)" height={300}>
                {servicePieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#627D98]">No paid service revenue in filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <Pie
                        data={servicePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {servicePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={56} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBox>
              <ChartBox title="Status mix (filtered apps)" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={118} tick={TICK_STYLE} interval={0} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => [Number(value || 0), "Cases"]}
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName || "")}
                    />
                    <Bar dataKey="value" fill="#33A1FD" radius={[0, 6, 6, 0]} name="Cases" maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
            <div className="overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[380px]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Reference</th>
                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold">Service</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                  {kpiScopedApps.slice(0, 80).map((app) => (
                    <tr key={app.id} className="hover:bg-[#F8FCFF]">
                      <td className="px-3 py-2 font-medium text-[#102A43]">{app.reference_number}</td>
                      <td className="px-3 py-2">{app.customer_name || "—"}</td>
                      <td className="px-3 py-2">{app.service_name || "—"}</td>
                      <td className="px-3 py-2 capitalize">{String(app.application_status || "—").replace(/_/g, " ")}</td>
                      <td className="px-3 py-2">{app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {kpiScopedApps.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#627D98]">No applications match this KPI filter.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {reportType === "leads" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Leads in period"
                value={String(leadsInPeriod)}
                active={kpiFilter === "leads" || kpiFilter === null}
                onClick={() => toggleKpi("leads")}
              />
              <MetricCard
                label="Converted"
                value={String(convertedInPeriod)}
                active={kpiFilter === "converted"}
                onClick={() => toggleKpi("converted")}
              />
              <MetricCard
                label="Conversion"
                value={conversionRate}
                active={kpiFilter === "conversion"}
                onClick={() => toggleKpi("conversion")}
              />
              <MetricCard
                label="Today's leads"
                value={String(todayLeads)}
                active={kpiFilter === "today"}
                onClick={() => toggleKpi("today")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartBox title="Status breakdown" height={280}>
                {statusChartData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#627D98]">No status data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="42%" outerRadius={72} paddingAngle={2}>
                        {statusChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={56} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBox>
              <div className="lg:col-span-2 overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[420px]">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Reference</th>
                      <th className="px-3 py-2 text-left font-semibold">Customer</th>
                      <th className="px-3 py-2 text-left font-semibold">Service</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Converted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                    {(kpiFilter === "leads" || !kpiFilter ? filteredApps : kpiScopedApps).slice(0, 80).map((app) => (
                      <tr key={app.id} className="hover:bg-[#F8FCFF]">
                        <td className="px-3 py-2 font-medium text-[#102A43]">{app.reference_number}</td>
                        <td className="px-3 py-2">{app.customer_name || "—"}</td>
                        <td className="px-3 py-2">{app.service_name || "—"}</td>
                        <td className="px-3 py-2 capitalize">{String(app.application_status || "—").replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">{isPaidApplication(app) ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(kpiFilter === "leads" || !kpiFilter ? filteredApps : kpiScopedApps).length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[#627D98]">No leads match these filters.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {reportType === "pending_payments" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard
                label="Pending cases"
                value={String(pendingApps.length)}
                active={kpiFilter === "cases" || kpiFilter === null}
                onClick={() => toggleKpi("cases")}
              />
              <MetricCard
                label="Amount due (filtered)"
                value={formatInr(pendingAmount)}
                active={kpiFilter === "amount"}
                onClick={() => toggleKpi("amount")}
              />
              <MetricCard
                label="Avg due / case"
                value={formatInr(pendingApps.length ? pendingAmount / pendingApps.length : 0)}
                active={kpiFilter === "amount"}
                onClick={() => toggleKpi("amount")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartBox title="Pending by service" height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.values(
                      kpiScopedPendingApps.reduce(
                        (acc, app) => {
                          const name = app.service_name || "Other";
                          const short = name.length > 14 ? `${name.slice(0, 12)}…` : name;
                          acc[name] = acc[name] || { name: short, fullName: name, count: 0, due: 0 };
                          acc[name].count += 1;
                          acc[name].due += Number(app.amount_due_pence || 0) / 100;
                          return acc;
                        },
                        {} as Record<string, { name: string; fullName: string; count: number; due: number }>,
                      ),
                    )}
                    margin={{ ...CHART_MARGIN, bottom: 28 }}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                    <XAxis dataKey="name" tick={TICK_STYLE} interval={0} angle={-20} textAnchor="end" height={48} />
                    <YAxis tick={TICK_STYLE} width={36} allowDecimals={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName || "")}
                    />
                    <Bar dataKey="count" fill="#B87333" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
              <div className="lg:col-span-2 overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[420px]">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Reference</th>
                      <th className="px-3 py-2 text-left font-semibold">Customer</th>
                      <th className="px-3 py-2 text-left font-semibold">Service</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Amount due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                    {kpiScopedPendingApps.slice(0, 80).map((app) => (
                      <tr key={app.id} className="hover:bg-[#F8FCFF]">
                        <td className="px-3 py-2 font-medium text-[#102A43]">{app.reference_number}</td>
                        <td className="px-3 py-2">{app.customer_name || "—"}</td>
                        <td className="px-3 py-2">{app.service_name || "—"}</td>
                        <td className="px-3 py-2 capitalize">{String(app.application_status || "—").replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 font-semibold text-[#8D5E12]">
                          {formatInr(Number(app.amount_due_pence || 0) / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {kpiScopedPendingApps.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[#627D98]">No pending payments in this filter.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {reportType === "staff_performance" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Staff in report"
                value={String(staffRows.length)}
                active={kpiFilter === "staff" || kpiFilter === null}
                onClick={() => toggleKpi("staff")}
              />
              <MetricCard
                label="Avg accuracy"
                value={
                  staffRows.length
                    ? `${(staffRows.reduce((s, r) => s + Number(r.accuracy), 0) / staffRows.length).toFixed(1)}%`
                    : "0%"
                }
                active={kpiFilter === "accuracy"}
                onClick={() => toggleKpi("accuracy")}
              />
              <MetricCard
                label="Assigned total"
                value={String(staffRows.reduce((s, r) => s + r.assigned, 0))}
                active={kpiFilter === "assigned"}
                onClick={() => toggleKpi("assigned")}
              />
              <MetricCard
                label="Completed total"
                value={String(staffRows.reduce((s, r) => s + r.completed, 0))}
                active={kpiFilter === "completed"}
                onClick={() => toggleKpi("completed")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartBox title="Accuracy by staff" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiScopedStaffRows.slice(0, 10).map((r) => ({ name: r.name.split(" ")[0], accuracy: r.accuracy, fullName: r.name }))}
                    margin={CHART_MARGIN}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                    <XAxis dataKey="name" tick={TICK_STYLE} interval={0} />
                    <YAxis domain={[0, 100]} tick={TICK_STYLE} width={36} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName || "")}
                    />
                    <Bar dataKey="accuracy" fill="#009877" radius={[6, 6, 0, 0]} name="Accuracy %" maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
              <div className="overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[360px]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Staff</th>
                      <th className="px-3 py-2 text-left font-semibold">Accuracy</th>
                      <th className="px-3 py-2 text-left font-semibold">Assigned</th>
                      <th className="px-3 py-2 text-left font-semibold">Completed</th>
                      <th className="px-3 py-2 text-left font-semibold">Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                    {kpiScopedStaffRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8FCFF]">
                        <td className="px-3 py-2 font-medium text-[#102A43]">{row.name}</td>
                        <td className="px-3 py-2">{Number(row.accuracy).toFixed(1)}%</td>
                        <td className="px-3 py-2">{row.assigned}</td>
                        <td className="px-3 py-2">{row.completed}</td>
                        <td className="px-3 py-2">{row.badge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {kpiScopedStaffRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[#627D98]">No staff performance rows available.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {reportType === "pipeline_sla" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard
                label="Open stages"
                value={String(pipelineOverview.length)}
                active={kpiFilter === "stages" || kpiFilter === null}
                onClick={() => toggleKpi("stages")}
              />
              <MetricCard
                label="Total SLA breaches"
                value={String(pipelineOverview.reduce((sum, row) => sum + Number(row.breached || 0), 0))}
                active={kpiFilter === "breached"}
                onClick={() => toggleKpi("breached")}
              />
              <MetricCard
                label="Open cases"
                value={String(pipelineOverview.reduce((sum, row) => sum + Number(row.openCases || 0), 0))}
                active={kpiFilter === "open"}
                onClick={() => toggleKpi("open")}
              />
            </div>
            <ChartBox title="Open cases vs SLA breaches by stage" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartScoped} margin={{ ...CHART_MARGIN, top: 28 }} barCategoryGap="22%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="stage" tick={TICK_STYLE} interval={0} />
                  <YAxis tick={TICK_STYLE} width={40} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullStage || "")}
                  />
                  <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="open" fill="#33A1FD" name="Open" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="breached" fill="#B42318" name="SLA breach" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {kpiScopedPipeline.map((row) => (
                <div key={row.stage} className="rounded-[10px] border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                  <p className="text-sm font-semibold text-[#102A43]">{row.stage}</p>
                  <p className="mt-2 text-xs text-[#486581] flex justify-between gap-2">
                    <span>Open</span>
                    <span className="font-semibold text-[#102A43]">{row.openCases}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#486581] flex justify-between gap-2">
                    <span>Avg age</span>
                    <span className="font-semibold text-[#102A43]">{row.avgAge}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#486581] flex justify-between gap-2">
                    <span>SLA breach</span>
                    <span className={`font-semibold ${Number(row.breached) > 0 ? "text-[#B42318]" : "text-[#006F57]"}`}>
                      {row.breached}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {reportType === "audit" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Checks requested"
                value={String(auditRequestedCount)}
                active={kpiFilter === "requested" || kpiFilter === null}
                onClick={() => toggleKpi("requested")}
              />
              <MetricCard
                label="Check success ratio"
                value={auditSuccessRatio}
                active={kpiFilter === "success"}
                onClick={() => toggleKpi("success")}
              />
              <MetricCard
                label="Assessment revenue"
                value={formatInr(auditRevenueInPeriod)}
                active={kpiFilter === "revenue"}
                onClick={() => toggleKpi("revenue")}
              />
              <MetricCard
                label="Failed checks"
                value={String(auditFailCount)}
                active={kpiFilter === "failed"}
                onClick={() => toggleKpi("failed")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartBox title="Document check outcomes" height={300}>
                {auditOutcomeBreakdown.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#627D98]">No outcomes in filter.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <Pie
                        data={auditOutcomeBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {auditOutcomeBreakdown.map((row, i) => (
                          <Cell key={row.name} fill={row.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={56} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBox>
              <ChartBox title="Staff checks passed vs failed" height={300}>
                {staffAuditChart.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#627D98]">No staff check totals yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffAuditChart} margin={{ ...CHART_MARGIN, top: 28 }} barCategoryGap="22%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                      <XAxis dataKey="name" tick={TICK_STYLE} interval={0} />
                      <YAxis tick={TICK_STYLE} width={36} allowDecimals={false} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName || "")}
                      />
                      <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="passed" fill="#009877" name="Passed" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="failed" fill="#B42318" name="Failed" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartBox>
            </div>
            <div className="overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[380px]">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Reference</th>
                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold">Service</th>
                    <th className="px-3 py-2 text-left font-semibold">Check result</th>
                    <th className="px-3 py-2 text-left font-semibold">Assessment payment</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                  {(kpiFilter ? kpiScopedApps : auditApps.length ? auditApps : filteredApps).slice(0, 80).map((app) => {
                    const result = String(app.audit_result || "none");
                    return (
                      <tr key={app.id} className="hover:bg-[#F8FCFF]">
                        <td className="px-3 py-2 font-medium text-[#102A43]">{app.reference_number}</td>
                        <td className="px-3 py-2">{app.customer_name || "—"}</td>
                        <td className="px-3 py-2">{app.service_name || "—"}</td>
                        <td className="px-3 py-2 capitalize">
                          <span
                            className={
                              result === "green"
                                ? "text-[#006F57] font-semibold"
                                : result === "red"
                                  ? "text-[#B42318] font-semibold"
                                  : result === "amber"
                                    ? "text-[#8D5E12] font-semibold"
                                    : "text-[#627D98]"
                            }
                          >
                            {result.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {String(app.audit_payment_status || "—").replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {String(app.application_status || "—").replace(/_/g, " ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(kpiFilter ? kpiScopedApps : auditApps.length ? auditApps : filteredApps).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#627D98]">No applications match these filters.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {reportType === "service_mix" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard
                label="Services"
                value={String(serviceMixFromApps.length)}
                active={kpiFilter === "services" || kpiFilter === null}
                onClick={() => toggleKpi("services")}
              />
              <MetricCard
                label="Cases in period"
                value={String(leadsInPeriod)}
                active={kpiFilter === "cases"}
                onClick={() => toggleKpi("cases")}
              />
              <MetricCard
                label="Paid cases"
                value={String(convertedInPeriod)}
                active={kpiFilter === "paid"}
                onClick={() => toggleKpi("paid")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartBox title="Revenue by service (filtered)" height={300}>
                {servicePieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#627D98]">No revenue mix in filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <Pie
                        data={servicePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {servicePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={56} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBox>
              <ChartBox title="Cases by service (filtered)" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiScopedServiceMix.map((row) => ({
                      ...row,
                      label: row.name.length > 12 ? `${row.name.slice(0, 10)}…` : row.name,
                    }))}
                    margin={{ ...CHART_MARGIN, top: 28, bottom: 28 }}
                    barCategoryGap="22%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                    <XAxis dataKey="label" tick={TICK_STYLE} interval={0} angle={-15} textAnchor="end" height={48} />
                    <YAxis tick={TICK_STYLE} width={36} allowDecimals={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.name || "")}
                    />
                    <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="cases" fill="#33A1FD" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="paid" fill="#009877" name="Paid" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
            <div className="overflow-auto rounded-[10px] border border-[#E5EAF0] max-h-[280px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#F5F7FA] text-[#486581]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Service</th>
                    <th className="px-3 py-2 text-left font-semibold">Cases</th>
                    <th className="px-3 py-2 text-left font-semibold">Paid</th>
                    <th className="px-3 py-2 text-left font-semibold">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                  {kpiScopedServiceMix.map((row) => (
                    <tr key={row.name} className="hover:bg-[#F8FCFF]">
                      <td className="px-3 py-2 font-medium text-[#102A43]">{row.name}</td>
                      <td className="px-3 py-2">{row.cases}</td>
                      <td className="px-3 py-2">{row.paid}</td>
                      <td className="px-3 py-2">
                        {row.cases ? `${((row.paid / row.cases) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {kpiScopedServiceMix.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#627D98]">No services match these filters.</p>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
      </section>
    </div>
  );
}
