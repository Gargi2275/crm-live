"use client";

import { useState } from "react";
import { useConsole } from "@/components/console/ConsoleContext";
import { DAILY_REVENUE, STAFF_MEMBERS, SERVICE_REVENUE_BREAKDOWN } from "@/lib/data/mockConsoleData";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export default function ReportsPage() {
  const { role } = useConsole();
  const [tab, setTab] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const canViewReports = role === "Admin / CEO" || role === "Operations Manager";

  if (!canViewReports) {
    return (
      <div className="max-w-[900px] mx-auto font-body">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 text-[#486581] inline-flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#9C4F17]" /> Reports are available for Admin / CEO and Operations Manager only.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6 font-body max-w-[1300px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Reports</h1>

      <div className="flex gap-2">
        {(["Daily", "Weekly", "Monthly"] as const).map((item) => (
          <motion.button
            key={item}
            onClick={() => setTab(item)}
            whileTap={{ scale: 0.97 }}
            className={`px-3 py-1.5 rounded-full text-sm font-heading ${tab === item ? "bg-[#009877] text-white" : "bg-white border-[0.5px] border-[#D9E1EA] text-[#486581]"}`}
          >
            {item}
          </motion.button>
        ))}
      </div>

      {tab === "Daily" && (
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
          {["Leads Today: 12", "Converted: 8", "Revenue: ₹28,500", "Tasks: 24", "SLA Breaches: 2", "Refunds: ₹1,200"].map((item) => (
            <motion.div key={item} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 text-[#334E68] text-sm shadow-sm">
              {item}
            </motion.div>
          ))}
        </div>
      )}

      {tab === "Weekly" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 lg:col-span-2 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold mb-2">Conversion rate trend</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DAILY_REVENUE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="day" tick={{ fill: "#486581" }} />
                  <YAxis tick={{ fill: "#486581" }} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                  <Line dataKey="actual" stroke="#33A1FD" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold mb-2">Top performing staff</p>
            {STAFF_MEMBERS.map((s, i) => (
              <p key={s.id} className="text-sm text-[#486581]">{i + 1}. {s.name} ({s.accuracy}%)</p>
            ))}
          </div>
        </div>
      )}

      {tab === "Monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-2 text-[#334E68] text-sm shadow-sm">
            <p>Total revenue: ₹6,58,000</p>
            <p>Growth %: 12.4%</p>
            <p>Marketing spend vs ROI: 1:4.3</p>
            <p>Customer satisfaction score: 4.7 / 5</p>
            <p>Profit margin: 33%</p>
          </div>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold mb-2">Audit fail reasons</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICE_REVENUE_BREAKDOWN} dataKey="value" nameKey="name" outerRadius={90}>
                    {SERVICE_REVENUE_BREAKDOWN.map((_, i) => <Cell key={i} fill={["#33A1FD", "#B87333", "#009877", "#D9E1EA"][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Report snapshot table</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Period</th>
                <th className="px-4 py-2.5 text-left">Leads</th>
                <th className="px-4 py-2.5 text-left">Conversion</th>
                <th className="px-4 py-2.5 text-left">Revenue</th>
                <th className="px-4 py-2.5 text-left">SLA Breaches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">Daily</td><td className="px-4 py-2.5">47</td><td className="px-4 py-2.5">66%</td><td className="px-4 py-2.5">₹28,500</td><td className="px-4 py-2.5">2</td></tr>
              <tr><td className="px-4 py-2.5">Weekly</td><td className="px-4 py-2.5">302</td><td className="px-4 py-2.5">63%</td><td className="px-4 py-2.5">₹2,18,000</td><td className="px-4 py-2.5">9</td></tr>
              <tr><td className="px-4 py-2.5">Monthly</td><td className="px-4 py-2.5">1,248</td><td className="px-4 py-2.5">61%</td><td className="px-4 py-2.5">₹6,58,000</td><td className="px-4 py-2.5">38</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Reporting interpretation notes
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Use weekly trend data to identify conversion bottlenecks and monthly view for growth, ROI, and staffing adjustments.</p>
      </details>
    </motion.div>
  );
}
