"use client";

import { useMemo, useState } from "react";
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
import {
  KPI_SNAPSHOT,
  DAILY_REVENUE,
  MONTHLY_REVENUE,
  SERVICE_REVENUE_BREAKDOWN,
  STAFF_MEMBERS,
  ACCESS_LOGS,
} from "@/lib/data/mockConsoleData";
import toast from "react-hot-toast";

export default function ConsoleDashboard() {
  const { role, autoAssignTasks } = useConsole();
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const chartColors = ["#33A1FD", "#B87333", "#22C55E", "#6366F1"];

  const healthMetrics = useMemo(
    () => [
      ["Total Leads Generated", KPI_SNAPSHOT.totalLeads],
      ["Leads Converted", KPI_SNAPSHOT.converted],
      ["Conversion %", KPI_SNAPSHOT.conversion],
      ["Revenue per Service Type", "OCI 48% | Passport 25% | E-Visa 19%"],
      ["Pending Payments", `₹${KPI_SNAPSHOT.pendingPayments.toLocaleString("en-IN")}`],
      ["Refunds/Disputes", "₹4,500"],
      ["Audits Requested", "38"],
      ["Audit Success Ratio", "91%"],
      ["Avg Processing Time", "14.2h"],
      ["Customer Satisfaction Rating", "4.7 / 5"],
    ],
    [],
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1500px] mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FlyOCI Console</h1>
          <p className="text-slate-300 text-sm mt-1">{role} Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard 
          title="Total Leads" 
          value={KPI_SNAPSHOT.totalLeads}
          trend="Last 30 days"
          isPositive={true} 
          icon={Users}
          colorClass="text-violet-300"
          bgClass="bg-violet-500/20"
        />
        <StatCard 
          title="Today's Leads" 
          value="12"
          trend="Live"
          isPositive={true} 
          icon={Briefcase}
          colorClass="text-[#33A1FD]"
          bgClass="bg-[#33A1FD]/20"
        />
        <StatCard 
          title="Leads Converted" 
          value={KPI_SNAPSHOT.converted}
          trend={KPI_SNAPSHOT.conversion}
          isPositive={true} 
          icon={SearchCheck}
          colorClass="text-orange-300"
          bgClass="bg-orange-500/20"
        />
        <StatCard 
          title="Total Revenue ₹" 
          value={`₹${KPI_SNAPSHOT.revenueToday.toLocaleString("en-IN")}`}
          trend="Today"
          isPositive={true}
          icon={IndianRupee}
          colorClass="text-green-300"
          bgClass="bg-green-500/20"
        />
        <StatCard 
          title="Avg. Ticket Size" 
          value="₹5,845"
          trend="Rolling"
          isPositive={true} 
          icon={Banknote}
          colorClass="text-cyan-300"
          bgClass="bg-cyan-500/20"
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${KPI_SNAPSHOT.pendingPayments.toLocaleString("en-IN")}`}
          trend="Attention"
          isPositive={false}
          icon={Clock}
          colorClass="text-red-300"
          bgClass="bg-red-500/20"
        />
      </div>

      {role === "Operations Manager" && (
        <div className="bg-white rounded-xl border border-blue-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-900">Workload Distribution</h2>
            <button
              onClick={autoAssignTasks}
              className="bg-[#F97316] text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              AUTO-ASSIGN
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {STAFF_MEMBERS.map((item) => (
              <div key={item.id} className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3">
                <p className="text-slate-900 font-semibold">{item.name} ({item.initials})</p>
                <p className="text-xs text-slate-400">{item.role}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="bg-[#33A1FD]/20 text-[#33A1FD] px-2 py-1 rounded">Assigned {item.assigned}</span>
                  <span className="bg-[#B87333]/20 text-[#B87333] px-2 py-1 rounded">Pending {item.pending}</span>
                </div>
                <p className="text-xs mt-2 text-slate-300">Status: {item.loadStatus}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-blue-100 p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue Dashboard</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={DAILY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE", color: "#0F172A" }} />
                <Bar dataKey="expected" fill="#33A1FD" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="actual" stroke="#B87333" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-blue-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Revenue Split</h2>
            <span className="bg-[#33A1FD]/20 text-[#33A1FD] text-xs font-bold px-2 py-0.5 rounded-full">Live</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SERVICE_REVENUE_BREAKDOWN} dataKey="value" nameKey="name" outerRadius={90}>
                  {SERVICE_REVENUE_BREAKDOWN.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE", color: "#0F172A" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
        <div className="p-5 border-b border-blue-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Business Health Metrics</h2>
          <div className="flex gap-2">
            {(["Daily", "Weekly", "Monthly"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`text-xs px-3 py-1 rounded ${period === item ? "bg-[#33A1FD]/15 text-[#33A1FD]" : "bg-[#F0F4FF] text-slate-600"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {healthMetrics.map(([label, value]) => (
            <div key={label} className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3 flex justify-between">
              <span className="text-slate-300 text-sm">{label}</span>
              <span className="text-slate-900 font-semibold text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {role !== "Staff / Case Worker" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
            <div className="p-5 border-b border-blue-100">
              <h2 className="text-lg font-bold text-slate-900">Team Performance Grid</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle">
                <thead className="bg-[#F8FAFF] text-slate-600 font-medium">
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
                <tbody className="divide-y divide-blue-100">
                  {STAFF_MEMBERS.map((staff) => (
                    <tr key={staff.id} className="hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-5 py-3 text-slate-900">{staff.name}</td>
                      <td className="px-5 py-3 text-center text-slate-200">{staff.assigned}</td>
                      <td className="px-5 py-3 text-center text-green-300">{staff.completed}</td>
                      <td className="px-5 py-3 text-center text-orange-300">{staff.pending}</td>
                      <td className="px-5 py-3 text-center text-slate-300">{staff.avgTime}</td>
                      <td className="px-5 py-3 text-center text-red-300">{staff.slaBreach}</td>
                      <td className="px-5 py-3 text-center text-slate-200">{staff.accuracy}%</td>
                      <td className="px-5 py-3 text-center text-slate-200">{staff.auditsPassed}/{staff.auditsFailed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Security & Compliance</h2>
            <div className="space-y-3">
              <div className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                <span className="text-slate-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-300" /> Failed logins</span>
                <span className="text-red-300">6</span>
              </div>
              <div className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3">
                <p className="text-slate-300 text-sm mb-2">Recent data access log</p>
                {ACCESS_LOGS.map((log) => (
                  <p key={`${log.staff}-${log.time}`} className="text-xs text-slate-400">
                    {log.staff} | {log.file} | {log.time}
                  </p>
                ))}
              </div>
              <div className="bg-green-500/20 text-green-300 border border-green-500/30 text-sm px-3 py-2 rounded-lg inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> All Documents Encrypted
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#10263C] rounded-xl border border-[#1E3A56] p-5">
          <h2 className="text-lg font-bold text-white mb-4">My Daily Worklist</h2>
          <div className="space-y-3">
            {[
              "Audit Customer - Devkishan Suthar",
              "Request docs for Priya Sharma",
              "Fill form for Arjun Mehta",
            ].map((task) => (
              <div key={task} className="bg-[#0F2437] border border-[#1E3A56] rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm">{task}</p>
                  <p className="text-xs text-slate-400">Due in 2 hours • LEAD-1001</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button className="text-xs bg-[#33A1FD]/20 text-[#33A1FD] px-2 py-1 rounded" onClick={() => toast.success("Documents requested")}>Request Documents</button>
                  <button className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Mark Audit Complete</button>
                  <button className="text-xs bg-[#F97316]/20 text-[#F97316] px-2 py-1 rounded">Move to Next Stage</button>
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-white font-semibold mt-6 mb-2">Accountability Panel</h3>
          <div className="bg-[#0F2437] border border-[#1E3A56] rounded-lg p-3 space-y-1">
            <p className="text-xs text-slate-400">Audit completed | Devkishan Suthar | 10:22 AM</p>
            <p className="text-xs text-slate-400">Requested documents | Priya Sharma | 10:05 AM</p>
            <p className="text-xs text-slate-400">Moved to Review Pending | Sunita Patel | 09:42 AM</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-blue-100 p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Monthly Revenue Trend</h2>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MONTHLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
              <XAxis dataKey="month" tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE", color: "#0F172A" }} />
              <Line type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
