"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/lib/admin-auth";
import { motion } from "framer-motion";
import { ReceiptText, AlertCircle, HandCoins } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function BillingPage() {
  const { adminUser } = useAdminAuth();
  const canExport = ["admin", "ops_manager"].includes(adminUser?.role || "");
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load billing data.");
      }
    };

    void loadDashboard();
  }, []);

  const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const kpiSnapshot = dashboardData?.kpi_snapshot;
  const dailyRevenue = dashboardData?.daily_revenue ?? [];
  const weeklyCollected = useMemo(
    () => dailyRevenue.reduce((sum, item) => sum + Number(item.actual || 0), 0),
    [dailyRevenue],
  );
  const invoiceRows = dashboardData?.service_revenue_breakdown ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Billing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Pending invoices</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><ReceiptText className="w-4 h-4 text-[#0B69B7]" />{formatInr(Number(kpiSnapshot?.pending_payments || 0))}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Refunds / disputes</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><AlertCircle className="w-4 h-4 text-[#B42318]" />{formatInr(Number(dashboardData?.health_metrics.refunds_disputes || 0))}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Collected this week</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><HandCoins className="w-4 h-4 text-[#009877]" />{formatInr(weeklyCollected)}</p>
        </div>
      </div>

      <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 space-y-2 shadow-sm">
        <p className="text-[#486581] text-sm">Pending amount: {formatInr(Number(kpiSnapshot?.pending_payments || 0))}</p>
        <p className="text-[#486581] text-sm">Refund/dispute amount: {formatInr(Number(dashboardData?.health_metrics.refunds_disputes || 0))}</p>
        <p className="text-[#486581] text-sm">Collected this week: {formatInr(weeklyCollected)}</p>
        {canExport ? (
          <motion.button whileTap={{ scale: 0.97 }} className="text-sm px-3 py-1.5 rounded-[10px] bg-[#009877] text-white hover:bg-[#007B61] font-heading">Export Billing CSV</motion.button>
        ) : (
          <p className="text-xs text-[#9C4F17] bg-[#B87333]/12 inline-flex px-2 py-1 rounded-full">Export hidden for Staff role</p>
        )}
      </motion.div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Billing checklist</h2>
        <ul className="space-y-1 text-sm text-[#486581]">
          <li>Verify payer details before issuing receipts</li>
          <li>Review failed transaction logs every 2 hours</li>
          <li>Export CSV before daily closing window</li>
        </ul>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Live service billing split</h2>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Service</th>
                <th className="px-4 py-2.5 text-left">Share</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {invoiceRows.map((item) => (
                <tr key={item.name}>
                  <td className="px-4 py-2.5">{item.name}</td>
                  <td className="px-4 py-2.5">{Number(item.value || 0).toFixed(1)}%</td>
                  <td className="px-4 py-2.5">Paid</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Billing FAQ and dispute handling
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Disputes are acknowledged within 4 business hours. Failed payments trigger retry workflow at 15 min, 2 hr, and 24 hr intervals.</p>
      </details>
    </motion.div>
  );
}

