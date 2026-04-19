"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/lib/admin-auth";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load settings data.");
      }
    };

    void loadDashboard();
  }, []);

  const accessLogs = dashboardData?.access_logs ?? [];
  const alertsSummary = dashboardData?.alerts_summary;
  const configRows = useMemo(
    () => [
      {
        setting: "Open alerts",
        value: String(alertsSummary?.open ?? 0),
        lastUpdated: accessLogs[0]?.time || "-",
      },
      {
        setting: "Acknowledged alerts",
        value: String(alertsSummary?.acknowledged ?? 0),
        lastUpdated: accessLogs[1]?.time || accessLogs[0]?.time || "-",
      },
      {
        setting: "Critical alerts",
        value: String(alertsSummary?.critical ?? 0),
        lastUpdated: accessLogs[2]?.time || accessLogs[0]?.time || "-",
      },
    ],
    [alertsSummary, accessLogs],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Settings</h1>

      <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Live Operational Controls</h2>
        <div className="space-y-3 text-sm text-[#486581]">
          <div className="flex items-center justify-between rounded-[12px] border border-[#D9E1EA] p-3">
            <div>
              <p className="text-[#102A43] font-medium">Open alerts (live)</p>
              <p className="text-xs text-[#627D98]">Current unresolved alert count from backend</p>
            </div>
            <p className="text-[#102A43] font-semibold">{alertsSummary?.open ?? 0}</p>
          </div>

          <div className="flex items-center justify-between rounded-[12px] border border-[#D9E1EA] p-3">
            <div>
              <p className="text-[#102A43] font-medium">Critical alerts (live)</p>
              <p className="text-xs text-[#627D98]">High-priority incidents requiring immediate action</p>
            </div>
            <p className="text-[#102A43] font-semibold">{alertsSummary?.critical ?? 0}</p>
          </div>

          <div className="rounded-[12px] border border-[#D9E1EA] p-3">
            <p className="text-[#102A43] font-medium mb-2">Recent access events</p>
            <p className="text-sm text-[#486581]">{accessLogs.length} entries loaded from backend audit feed.</p>
          </div>
        </div>
      </motion.div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Audit Log</h2>
        {accessLogs.length > 0 ? (
          accessLogs.map((log, index) => (
            <p key={`${log.staff}-${index}`} className="text-sm text-[#486581]">{log.time} | {log.staff} | {log.file}</p>
          ))
        ) : (
          <p className="text-sm text-[#486581]">No recent audit entries.</p>
        )}
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Role-safe defaults</h2>
        <ul className="space-y-1 text-sm text-[#486581]">
          <li>Role badge in navbar active</li>
          <li>Staff export/download actions hidden by role</li>
          <li>Sensitive access remains audit-logged</li>
        </ul>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Configuration table</h2>
          <span className="text-xs text-[#627D98]">Current settings</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Setting</th>
                <th className="px-4 py-2.5 text-left">Value</th>
                <th className="px-4 py-2.5 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {configRows.map((row) => (
                <tr key={row.setting}>
                  <td className="px-4 py-2.5">{row.setting}</td>
                  <td className="px-4 py-2.5">{row.value}</td>
                  <td className="px-4 py-2.5">{row.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Hardening recommendations
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Enable OTP confirmation for sensitive actions (exports, stage overrides, file downloads) and enforce 90-day password rotation.</p>
      </details>
    </motion.div>
  );
}

