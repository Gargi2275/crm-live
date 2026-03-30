"use client";

import { DAILY_REVENUE, MONTHLY_REVENUE } from "@/lib/data/mockConsoleData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Landmark } from "lucide-react";

export default function RevenuePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1300px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Remittance / Revenue</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Monthly growth</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#009877]" />12.4%</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Avg daily collections</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#0B69B7]" />₹92,000</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Settlement health</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><Landmark className="w-4 h-4 text-[#9C4F17]" />Stable</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
          <h2 className="text-[#102A43] font-heading font-semibold mb-2">Daily Revenue vs Expected</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                <XAxis dataKey="day" tick={{ fill: "#486581" }} />
                <YAxis tick={{ fill: "#486581" }} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                <Bar dataKey="actual" fill="#33A1FD" />
                <Bar dataKey="expected" fill="#B87333" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
          <h2 className="text-[#102A43] font-heading font-semibold mb-2">Monthly Trend</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                <XAxis dataKey="month" tick={{ fill: "#486581" }} />
                <YAxis tick={{ fill: "#486581" }} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                <Line dataKey="revenue" stroke="#009877" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Service profitability table</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Service</th>
                <th className="px-4 py-2.5 text-left">Revenue</th>
                <th className="px-4 py-2.5 text-left">Cost</th>
                <th className="px-4 py-2.5 text-left">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">OCI</td><td className="px-4 py-2.5">₹3,15,000</td><td className="px-4 py-2.5">₹1,92,000</td><td className="px-4 py-2.5">39%</td></tr>
              <tr><td className="px-4 py-2.5">Passport Renewal</td><td className="px-4 py-2.5">₹1,64,000</td><td className="px-4 py-2.5">₹1,08,000</td><td className="px-4 py-2.5">34%</td></tr>
              <tr><td className="px-4 py-2.5">E-Visa</td><td className="px-4 py-2.5">₹1,21,000</td><td className="px-4 py-2.5">₹78,000</td><td className="px-4 py-2.5">35%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Revenue insights
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">OCI remains the strongest contributor. Weekend collections are softer, indicating opportunity for remarketing.</p>
        </details>
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            CPA and marketing notes
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Current blended CPA is ₹1,240. Focus on higher-intent lead sources to improve conversion-to-cost ratio.</p>
        </details>
      </div>
    </motion.div>
  );
}

