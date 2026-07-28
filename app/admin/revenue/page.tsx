"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminDashboardOverview,
  isStaffOwnRevenueDashboard,
  type AdminDashboardOverview,
} from "@/lib/admin-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Landmark } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

export default function RevenuePage() {
  const { adminUser } = useAdminAuth();
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

  const isOwnRevenue = isStaffOwnRevenueDashboard(dashboardData, adminUser?.role);

  useSetAdminPageChrome({
    title: isOwnRevenue ? "My revenue" : "Revenue",
    icon: TrendingUp,
    syncKey: `${isOwnRevenue}|${dashboardData ? "loaded" : "loading"}`,
  });

  const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const adminKpiSnapshot = dashboardData?.kpi_snapshot;
  const staffKpiSnapshot = dashboardData?.my_revenue?.kpi_snapshot ?? adminKpiSnapshot;
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

  const staffRevenueRows = useMemo(
    () =>
      [...(dashboardData?.staff_members ?? [])]
        .filter((staff) => String(staff.role || "").toLowerCase() !== "admin")
        .sort((left, right) => Number(right.revenue_total || 0) - Number(left.revenue_total || 0)),
    [dashboardData?.staff_members],
  );

  if (isOwnRevenue) {
    const staffRevenue = staffKpiSnapshot;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 font-body max-w-[1100px] mx-auto"
      >
        <p className="text-sm text-[#627D98]">
          {dashboardData?.staff_revenue_summary?.attribution_note ||
            "Revenue from cases where you are on the latest assigned task."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-[#D9E1EA] rounded-[12px] p-3">
            <p className="text-xs text-[#627D98]">Today</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">
              {formatInr(Number(staffRevenue?.revenue_today || 0))}
            </p>
          </div>
          <div className="bg-white border border-[#D9E1EA] rounded-[12px] p-3">
            <p className="text-xs text-[#627D98]">Last 30 days</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">
              {formatInr(Number(staffRevenue?.revenue_30d || 0))}
            </p>
          </div>
          <div className="bg-white border border-[#D9E1EA] rounded-[12px] p-3">
            <p className="text-xs text-[#627D98]">All time</p>
            <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">
              {formatInr(Number(staffRevenue?.revenue_total || 0))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#D9E1EA] rounded-[12px] p-4 overflow-hidden">
            <h2 className="text-[#102A43] font-heading font-semibold mb-2">My revenue (last 7 days)</h2>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 12, right: 16, left: 4, bottom: 8 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="day" tick={{ fill: "#486581", fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fill: "#486581", fontSize: 11 }} width={48} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                  <Bar dataKey="actual" fill="#009877" name="My revenue" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-[#D9E1EA] rounded-[12px] p-4 overflow-hidden">
            <h2 className="text-[#102A43] font-heading font-semibold mb-2">My revenue split</h2>
            {serviceRows.length === 0 ? (
              <p className="text-sm text-[#627D98]">No attributed revenue yet.</p>
            ) : (
              <div className="space-y-2 text-sm text-[#486581]">
                {serviceRows.map((row) => (
                  <p key={row.service} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 break-words">{row.service}</span>
                    <span className="shrink-0 font-semibold text-[#102A43]">
                      {formatInr(row.revenue)} ({row.share.toFixed(1)}%)
                    </span>
                  </p>
                ))}
                <p className="pt-2 border-t border-[#E5EAF0] text-xs leading-relaxed">
                  Order {formatInr(Number(staffRevenue?.order_revenue || 0))} · Assessment{" "}
                  {formatInr(Number(staffRevenue?.audit_revenue || 0))} · Full payment{" "}
                  {formatInr(Number(staffRevenue?.full_revenue || 0))}
                </p>
              </div>
            )}
          </div>
        </div>

        <Link href="/admin" className="text-sm font-semibold text-[#009877] hover:underline">
          ← Back to dashboard
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1300px] mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Conversion</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#009877]" />{adminKpiSnapshot?.conversion ?? healthMetrics?.conversion ?? "0%"}</p>
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
        <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm overflow-hidden">
          <h2 className="text-[#102A43] font-heading font-semibold mb-2">Daily Revenue vs Expected</h2>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue} margin={{ top: 28, right: 16, left: 4, bottom: 8 }} barCategoryGap="22%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                <XAxis dataKey="day" tick={{ fill: "#486581", fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: "#486581", fontSize: 11 }} width={48} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="actual" fill="#33A1FD" name="Actual" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expected" fill="#B87333" name="3-day avg" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm overflow-hidden">
          <h2 className="text-[#102A43] font-heading font-semibold mb-2">Monthly Trend</h2>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                <XAxis dataKey="month" tick={{ fill: "#486581", fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: "#486581", fontSize: 11 }} width={48} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "0.5px solid #D9E1EA", borderRadius: "12px" }} />
                <Line dataKey="revenue" stroke="#009877" strokeWidth={3} name="Revenue" dot={{ r: 3 }} />
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

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <h2 className="text-[#102A43] font-heading font-semibold mb-1">Revenue by staff</h2>
        <p className="text-xs text-[#627D98] mb-3">
          {dashboardData?.staff_revenue_summary?.attribution_note ||
            "Credited to the staff member on the latest assigned task per application."}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Staff</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Last 30 days</th>
                <th className="px-4 py-2.5 text-left">All time</th>
                <th className="px-4 py-2.5 text-left">Paid cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {staffRevenueRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-[#627D98]">
                    No staff revenue data yet.
                  </td>
                </tr>
              ) : (
                staffRevenueRows.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-4 py-2.5 font-medium text-[#102A43]">{staff.name}</td>
                    <td className="px-4 py-2.5 capitalize">{String(staff.role || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5">{formatInr(Number(staff.revenue_30d || 0))}</td>
                    <td className="px-4 py-2.5">{formatInr(Number(staff.revenue_total || 0))}</td>
                    <td className="px-4 py-2.5">{staff.paid_cases_total ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {dashboardData?.staff_revenue_summary ? (
          <p className="text-xs text-[#627D98] mt-3">
            Unattributed (no task assignee): {formatInr(dashboardData.staff_revenue_summary.unattributed_revenue_total ?? 0)} all
            time · {formatInr(dashboardData.staff_revenue_summary.unattributed_revenue_window ?? 0)} last 30 days
          </p>
        ) : null}
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
