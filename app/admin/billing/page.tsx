"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/lib/admin-auth";
import { motion } from "framer-motion";
import { ReceiptText, AlertCircle, HandCoins } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

type BillingKpi = "all" | "pending" | "refunds" | "collected";

export default function BillingPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [kpiFilter, setKpiFilter] = useState<BillingKpi>("all");

  useSetAdminPageChrome({
    title: "Billing",
    icon: ReceiptText,
    syncKey: `${dashboardData ? "loaded" : "loading"}|${kpiFilter}`,
  });

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

  const filteredInvoiceRows = useMemo(() => {
    if (kpiFilter === "pending" || kpiFilter === "refunds") return [];
    return invoiceRows;
  }, [invoiceRows, kpiFilter]);

  const kpiCards = [
    {
      key: "pending" as const,
      label: "Pending invoices",
      value: formatInr(Number(kpiSnapshot?.pending_payments || 0)),
      icon: ReceiptText,
      tone: "text-[#0B69B7]",
    },
    {
      key: "refunds" as const,
      label: "Refunds / disputes",
      value: formatInr(Number(dashboardData?.health_metrics?.refunds_disputes || 0)),
      icon: AlertCircle,
      tone: "text-[#B42318]",
    },
    {
      key: "collected" as const,
      label: "Collected this week",
      value: formatInr(weeklyCollected),
      icon: HandCoins,
      tone: "text-[#009877]",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {kpiCards.map((card) => {
          const selected = kpiFilter === card.key || (kpiFilter === "all" && card.key === "collected");
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setKpiFilter((current) => (current === card.key ? "all" : card.key))}
              aria-pressed={kpiFilter === card.key}
              className={`bg-white border-[0.5px] rounded-[12px] p-4 text-left transition ${
                selected && kpiFilter === card.key
                  ? "border-[#009877] ring-1 ring-[#009877]/25 bg-[#009877]/5"
                  : "border-[#D9E1EA] hover:bg-[#F8FAFC]"
              }`}
            >
              <p className="text-xs text-[#627D98]">{card.label}</p>
              <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2">
                <card.icon className={`w-4 h-4 ${card.tone}`} />
                {card.value}
              </p>
            </button>
          );
        })}
      </div>

      <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 space-y-2 shadow-sm">
        {kpiFilter === "pending" || kpiFilter === "all" ? (
          <p className="text-[#486581] text-sm">Pending amount: {formatInr(Number(kpiSnapshot?.pending_payments || 0))}</p>
        ) : null}
        {kpiFilter === "refunds" || kpiFilter === "all" ? (
          <p className="text-[#486581] text-sm">
            Refund/dispute amount: {formatInr(Number(dashboardData?.health_metrics?.refunds_disputes || 0))}
          </p>
        ) : null}
        {kpiFilter === "collected" || kpiFilter === "all" ? (
          <p className="text-[#486581] text-sm">Collected this week: {formatInr(weeklyCollected)}</p>
        ) : null}
      </motion.div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Billing checklist</h2>
        <ul className="space-y-1 text-sm text-[#486581]">
          <li>Verify payer details before issuing receipts</li>
          <li>Review failed transaction logs every 2 hours</li>
          <li>Reconcile collected totals before daily closing</li>
        </ul>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Live service billing split</h2>
          <span className="text-xs text-[#627D98]">
            {kpiFilter === "pending"
              ? "Pending view"
              : kpiFilter === "refunds"
                ? "Refunds view"
                : "Collected / paid"}
          </span>
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
              {filteredInvoiceRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#627D98]">
                    {kpiFilter === "pending"
                      ? "No pending invoice rows in the live service split. Pending total is shown in the KPI above."
                      : kpiFilter === "refunds"
                        ? "No refund/dispute line items in the live service split."
                        : "No billing rows yet."}
                  </td>
                </tr>
              ) : (
                filteredInvoiceRows.map((item) => (
                  <tr key={item.name}>
                    <td className="px-4 py-2.5">{item.name}</td>
                    <td className="px-4 py-2.5">{Number(item.value || 0).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">Paid</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Billing FAQ and dispute handling
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">
          Disputes are acknowledged within 4 business hours. Failed payments trigger retry workflow at 15 min, 2 hr, and 24 hr
          intervals.
        </p>
      </details>
    </motion.div>
  );
}
