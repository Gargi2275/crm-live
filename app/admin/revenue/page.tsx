"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/lib/admin-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Landmark } from "lucide-react";
import toast from "react-hot-toast";

export default function RevenuePage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load revenue data.");
      }
    };

    void loadDashboard();
  }, []);

  const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const kpiSnapshot = dashboardData?.kpi_snapshot;
  const healthMetrics = dashboardData?.health_metrics;
  const dailyRevenue = dashboardData?.daily_revenue ?? [];
  const monthlyRevenue = dashboardData?.monthly_revenue ?? [];
  const serviceRevenueBreakdown = dashboardData?.service_revenue_breakdown ?? [];

  const weeklyCollections = useMemo(
    () => dailyRevenue.reduce((sum, item) => sum + Number(item.actual || 0), 0),
    [dailyRevenue],
  );

  const thisMonthRevenue = monthlyRevenue.length > 0 ? Number(monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0) : 0;

  const serviceRows = useMemo(
    () =>
      serviceRevenueBreakdown.map((item) => ({
        service: item.name,
        share: Number(item.value || 0),
        revenue: Number(item.amount || 0),
      })),
    [serviceRevenueBreakdown],
  );

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
          <p className="text-xs text-[#627D98]">Conversion</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#009877]" />{kpiSnapshot?.conversion ?? "0%"}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Weekly collections</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#0B69B7]" />{formatInr(weeklyCollections)}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Pending payments</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><Landmark className="w-4 h-4 text-[#9C4F17]" />{formatInr(Number(healthMetrics?.pending_payments || 0))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
          <h2 className="text-[#102A43] font-heading font-semibold mb-2">Daily Revenue vs Expected</h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue}>
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
              <LineChart data={monthlyRevenue}>
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
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Service revenue split table</h2>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Service</th>
                <th className="px-4 py-2.5 text-left">Share</th>
                <th className="px-4 py-2.5 text-left">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {serviceRows.map((row) => (
                <tr key={row.service}>
                  <td className="px-4 py-2.5">{row.service}</td>
                  <td className="px-4 py-2.5">{row.share.toFixed(1)}%</td>
                  <td className="px-4 py-2.5">{formatInr(row.revenue)}</td>
                </tr>
              ))}
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

