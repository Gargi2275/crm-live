"use client";

import { DAILY_REVENUE, MONTHLY_REVENUE } from "@/lib/data/mockConsoleData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

export default function RevenuePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Remittance / Revenue</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-blue-100 rounded-lg p-4">
          <h2 className="text-slate-900 font-semibold mb-2">Daily Revenue vs Expected</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                <XAxis dataKey="day" tick={{ fill: "#334155" }} />
                <YAxis tick={{ fill: "#334155" }} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE" }} />
                <Bar dataKey="actual" fill="#33A1FD" />
                <Bar dataKey="expected" fill="#B87333" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-blue-100 rounded-lg p-4">
          <h2 className="text-slate-900 font-semibold mb-2">Monthly Trend</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                <XAxis dataKey="month" tick={{ fill: "#334155" }} />
                <YAxis tick={{ fill: "#334155" }} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #BFDBFE" }} />
                <Line dataKey="revenue" stroke="#22C55E" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

