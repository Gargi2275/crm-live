"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useConsole } from "@/components/console/ConsoleContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
} from "@/lib/admin-auth";
import toast from "react-hot-toast";

export default function ConsoleDashboard() {
  const { autoAssignTasks } = useConsole();
  const { adminUser } = useAdminAuth();
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
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
  const isStaffView = userRole === "case_processor" || userRole === "reviewer" || userRole === "support_agent";
  const chartColors = ["#009877", "#33A1FD", "#B87333", "#DCE7F3"];

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard overview.");
      }
    };

    void loadDashboard();
  }, []);

  const kpiSnapshot = dashboardData?.kpi_snapshot ?? {
    total_leads: 0,
    todays_leads: 0,
    converted: 0,
    conversion: "0%",
    revenue_today: 0,
    pending_payments: 0,
    avg_ticket_size: 0,
  };
  const dailyRevenue = dashboardData?.daily_revenue ?? [];
  const monthlyRevenue = dashboardData?.monthly_revenue ?? [];
  const serviceRevenueBreakdown = dashboardData?.service_revenue_breakdown ?? [];
  const staffMembers = dashboardData?.staff_members ?? [];
  const accessLogs = dashboardData?.access_logs ?? [];
  const pipelineOverview = dashboardData?.pipeline_overview ?? [];
  const failedLogins = dashboardData?.failed_logins ?? 0;

  const healthMetrics = useMemo(
    () => [
      ["Total Leads Generated", dashboardData?.health_metrics.total_leads ?? 0],
      ["Leads Converted", dashboardData?.health_metrics.leads_converted ?? 0],
      ["Conversion %", dashboardData?.health_metrics.conversion ?? "0%"],
      ["Revenue per Service Type", dashboardData?.health_metrics.revenue_per_service ?? "N/A"],
      ["Pending Payments", `₹${(dashboardData?.health_metrics.pending_payments ?? 0).toLocaleString("en-IN")}`],
      ["Refunds/Disputes", `₹${(dashboardData?.health_metrics.refunds_disputes ?? 0).toLocaleString("en-IN")}`],
      ["Audits Requested", dashboardData?.health_metrics.audits_requested ?? 0],
      ["Audit Success Ratio", dashboardData?.health_metrics.audit_success_ratio ?? "0%"],
      ["Avg Processing Time", dashboardData?.health_metrics.avg_processing_time ?? "0h"],
      ["Customer Satisfaction Rating", dashboardData?.health_metrics.customer_satisfaction ?? "0 / 5"],
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

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1500px] mx-auto space-y-6 font-body">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">FlyOCI Console</h1>
          <p className="text-[#486581] text-sm mt-1">{roleLabel} dashboard overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
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
      </div>

      {isOpsView && (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-heading font-semibold text-[#102A43]">Workload Distribution</h2>
            <button
              onClick={autoAssignTasks}
              className="bg-[#009877] text-white px-4 py-2 rounded-[10px] text-sm font-heading font-semibold hover:bg-[#007B61]"
            >
              AUTO-ASSIGN
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {staffMembers.map((item) => (
              <div key={item.id} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
                <p className="text-[#102A43] font-heading font-semibold">{item.name} ({item.initials})</p>
                <p className="text-xs text-[#627D98]">{item.role}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="bg-[#33A1FD]/12 text-[#0B69B7] px-2 py-1 rounded-full">Assigned {item.assigned}</span>
                  <span className="bg-[#B87333]/12 text-[#9C4F17] px-2 py-1 rounded-full">Pending {item.pending}</span>
                </div>
                <p className="text-xs mt-2 text-[#627D98]">Status: {item.loadStatus}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isFounderView && !isOpsView && !isStaffView && (
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
          <div className="lg:col-span-2 bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
            <div className="p-5 border-b border-[0.5px] border-[#D9E1EA]">
              <h2 className="text-lg font-heading font-semibold text-[#102A43]">Team Performance Grid</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle">
                <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
                  <tr>
                    <th className="px-5 py-3 font-medium">Staff Name</th>
                    <th className="px-5 py-3 font-medium text-center">Assigned</th>
                    <th className="px-5 py-3 font-medium text-center">Completed</th>
                    <th className="px-5 py-3 font-medium text-center">Pending</th>
                    <th className="px-5 py-3 font-medium text-center">Avg Time/Task</th>
                    <th className="px-5 py-3 font-medium text-center">SLA Breaches</th>
                    <th className="px-5 py-3 font-medium text-center">Accuracy Score</th>
                    <th className="px-5 py-3 font-medium text-center">Audits P/F</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3 text-[#102A43] font-medium">{staff.name}</td>
                      <td className="px-5 py-3 text-center text-[#0B69B7]">{staff.assigned}</td>
                      <td className="px-5 py-3 text-center text-[#006F57]">{staff.completed}</td>
                      <td className="px-5 py-3 text-center text-[#9C4F17]">{staff.pending}</td>
                      <td className="px-5 py-3 text-center text-[#486581]">{staff.avgTime}</td>
                      <td className="px-5 py-3 text-center text-[#B42318]">{staff.slaBreach}</td>
                      <td className="px-5 py-3 text-center text-[#102A43]">{staff.accuracy}%</td>
                      <td className="px-5 py-3 text-center text-[#102A43]">{staff.auditsPassed}/{staff.auditsFailed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
      ) : isStaffView ? (
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
          <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-4">My Daily Worklist</h2>
          <div className="space-y-3">
            {[
              "Audit Customer - Devkishan Suthar",
              "Request docs for Priya Sharma",
              "Fill form for Arjun Mehta",
            ].map((task) => (
              <div key={task} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[#102A43] text-sm font-medium">{task}</p>
                  <p className="text-xs text-[#627D98]">Due in 2 hours • LEAD-1001</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button className="text-xs bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/35 px-2 py-1 rounded-full" onClick={() => toast.success("Documents requested")}>Request Documents</button>
                  <button className="text-xs bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 px-2 py-1 rounded-full">Mark Audit Complete</button>
                  <button className="text-xs bg-[#B87333]/12 text-[#9C4F17] border-[0.5px] border-[#B87333]/35 px-2 py-1 rounded-full">Move to Next Stage</button>
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-[#102A43] font-heading font-semibold mt-6 mb-2">Accountability Panel</h3>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 space-y-1">
            <p className="text-xs text-[#627D98]">Audit completed | Devkishan Suthar | 10:22 AM</p>
            <p className="text-xs text-[#627D98]">Requested documents | Priya Sharma | 10:05 AM</p>
            <p className="text-xs text-[#627D98]">Moved to Review Pending | Sunita Patel | 09:42 AM</p>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
