"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardOverview,
  getStaffAccuracyAll,
  type AdminDashboardOverview,
  type StaffAccuracyRow,
} from "@/lib/admin-auth";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function ReportsPage() {
  const { adminUser } = useAdminAuth();
  const [tab, setTab] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [accuracyRows, setAccuracyRows] = useState<StaffAccuracyRow[]>([]);
  const canViewReports = ["admin", "ops_manager", "reviewer"].includes(adminUser?.role || "");

  const getDateWindow = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    const to = end.toISOString().slice(0, 10);
    const from = start.toISOString().slice(0, 10);
    return { from, to };
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);

        if (adminUser?.role === "admin" || adminUser?.role === "ops_manager") {
          const { from, to } = getDateWindow();
          const accuracyPayload = await getStaffAccuracyAll(from, to);
          setAccuracyRows(accuracyPayload.results || []);
        } else {
          setAccuracyRows([]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load reports data.");
      }
    };

    void loadDashboard();
  }, [adminUser?.role]);

  const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const kpiSnapshot = dashboardData?.kpi_snapshot;
  const healthMetrics = dashboardData?.health_metrics;
  const dailyRevenue = dashboardData?.daily_revenue ?? [];
  const monthlyRevenue = dashboardData?.monthly_revenue ?? [];
  const serviceRevenueBreakdown = dashboardData?.service_revenue_breakdown ?? [];
  const staffMembers = dashboardData?.staff_members ?? [];

  const topStaff = useMemo(() => {
    if (accuracyRows.length > 0) {
      return [...accuracyRows]
        .sort((left, right) => right.overall_accuracy - left.overall_accuracy)
        .slice(0, 5)
        .map((item) => ({
          id: item.staff_id,
          name: item.staff_name,
          accuracy: item.overall_accuracy,
          badge: item.badge,
        }));
    }

    return [...staffMembers]
      .sort((left, right) => right.accuracy - left.accuracy)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        accuracy: item.accuracy,
        badge: "-",
      }));
  }, [accuracyRows, staffMembers]);

  const weeklyRevenue = useMemo(
    () => dailyRevenue.reduce((sum, item) => sum + Number(item.actual || 0), 0),
    [dailyRevenue],
  );

  const currentMonthRevenue = monthlyRevenue.length > 0 ? Number(monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0) : 0;
  const breachCount = dashboardData?.pipeline_overview.reduce((sum, item) => sum + Number(item.breached || 0), 0) ?? 0;

  const snapshotRows = [
    {
      period: "Daily",
      leads: kpiSnapshot?.todays_leads ?? 0,
      conversion: kpiSnapshot?.conversion ?? "0%",
      revenue: Number(kpiSnapshot?.revenue_today || 0),
      breaches: breachCount,
    },
    {
      period: "Weekly",
      leads: kpiSnapshot?.total_leads ?? 0,
      conversion: kpiSnapshot?.conversion ?? "0%",
      revenue: weeklyRevenue,
      breaches: breachCount,
    },
    {
      period: "Monthly",
      leads: kpiSnapshot?.total_leads ?? 0,
      conversion: healthMetrics?.conversion ?? "0%",
      revenue: currentMonthRevenue,
      breaches: breachCount,
    },
  ];

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
          {[
            `Leads Today: ${kpiSnapshot?.todays_leads ?? 0}`,
            `Converted: ${kpiSnapshot?.converted ?? 0}`,
            `Revenue: ${formatInr(Number(kpiSnapshot?.revenue_today || 0))}`,
            `Pending Payments: ${formatInr(Number(kpiSnapshot?.pending_payments || 0))}`,
            `SLA Breaches: ${breachCount}`,
            `Avg Ticket: ${formatInr(Number(kpiSnapshot?.avg_ticket_size || 0))}`,
          ].map((item) => (
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
                <LineChart data={dailyRevenue}>
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
            {topStaff.map((s, i) => (
              <p key={s.id} className="text-sm text-[#486581]">
                {i + 1}. {s.name} ({Number(s.accuracy).toFixed(2)}%) {s.badge !== "-" ? `- ${s.badge}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === "Monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-2 text-[#334E68] text-sm shadow-sm">
            <p>Total revenue (this month): {formatInr(currentMonthRevenue)}</p>
            <p>Growth %: {kpiSnapshot?.conversion ?? "0%"}</p>
            <p>Pending payments: {formatInr(Number(healthMetrics?.pending_payments || 0))}</p>
            <p>Customer satisfaction score: {healthMetrics?.customer_satisfaction ?? "0 / 5"}</p>
            <p>Audit success ratio: {healthMetrics?.audit_success_ratio ?? "0%"}</p>
          </div>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold mb-2">Audit fail reasons</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceRevenueBreakdown} dataKey="value" nameKey="name" outerRadius={90}>
                    {serviceRevenueBreakdown.map((_, i) => <Cell key={i} fill={["#33A1FD", "#B87333", "#009877", "#D9E1EA"][i]} />)}
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
          <span className="text-xs text-[#627D98]">Live data</span>
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
              {snapshotRows.map((row) => (
                <tr key={row.period}>
                  <td className="px-4 py-2.5">{row.period}</td>
                  <td className="px-4 py-2.5">{row.leads}</td>
                  <td className="px-4 py-2.5">{row.conversion}</td>
                  <td className="px-4 py-2.5">{formatInr(row.revenue)}</td>
                  <td className="px-4 py-2.5">{row.breaches}</td>
                </tr>
              ))}
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
