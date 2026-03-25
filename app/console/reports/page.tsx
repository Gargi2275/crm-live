"use client";

import { useState } from "react";
import { useConsole } from "@/components/console/ConsoleContext";
import { DAILY_REVENUE, STAFF_MEMBERS, SERVICE_REVENUE_BREAKDOWN } from "@/lib/data/mockConsoleData";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

export default function ReportsPage() {
  const { role } = useConsole();
  const [tab, setTab] = useState<"Daily" | "Weekly" | "Monthly">("Daily");

  if (role === "Staff / Case Worker") {
    return <div className="text-slate-600">Reports are available for Admin and Operations Manager only.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <div className="flex gap-2">
        {(["Daily", "Weekly", "Monthly"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`px-3 py-1.5 rounded text-sm ${tab === item ? "bg-[#33A1FD]/15 text-[#33A1FD]" : "bg-white border border-blue-100 text-slate-600"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Daily" && (
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
          {["Leads Today: 12", "Converted: 8", "Revenue: ₹28,500", "Tasks: 24", "SLA Breaches: 2", "Refunds: ₹1,200"].map((item) => (
            <div key={item} className="bg-white border border-blue-100 rounded-lg p-3 text-slate-700 text-sm">{item}</div>
          ))}
        </div>
      )}

      {tab === "Weekly" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-lg p-4 lg:col-span-2">
            <p className="text-slate-900 font-semibold mb-2">Conversion rate trend</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DAILY_REVENUE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                  <XAxis dataKey="day" tick={{ fill: "#334155" }} />
                  <YAxis tick={{ fill: "#334155" }} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE" }} />
                  <Line dataKey="actual" stroke="#33A1FD" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-blue-100 rounded-lg p-4">
            <p className="text-slate-900 font-semibold mb-2">Top performing staff</p>
            {STAFF_MEMBERS.map((s, i) => (
              <p key={s.id} className="text-sm text-slate-300">{i + 1}. {s.name} ({s.accuracy}%)</p>
            ))}
          </div>
        </div>
      )}

      {tab === "Monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-blue-100 rounded-lg p-4 space-y-2 text-slate-700 text-sm">
            <p>Total revenue: ₹6,58,000</p>
            <p>Growth %: 12.4%</p>
            <p>Marketing spend vs ROI: 1:4.3</p>
            <p>Customer satisfaction score: 4.7 / 5</p>
            <p>Profit margin: 33%</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-lg p-4">
            <p className="text-slate-900 font-semibold mb-2">Audit fail reasons</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICE_REVENUE_BREAKDOWN} dataKey="value" nameKey="name" outerRadius={90}>
                    {SERVICE_REVENUE_BREAKDOWN.map((_, i) => <Cell key={i} fill={["#33A1FD", "#B87333", "#22C55E", "#6366F1"][i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

