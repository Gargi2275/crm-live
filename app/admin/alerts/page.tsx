"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminAlerts,
  updateAdminAlertStatus,
  type AdminAlert,
  type AdminAlertsResponse,
} from "@/lib/admin-auth";
import { getAlertTypeLabel } from "@/lib/alert-formatters";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { AlertTriangle, CircleCheck, TimerReset } from "lucide-react";

export default function AlertsPage() {
  const [alertsData, setAlertsData] = useState<AdminAlertsResponse | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<number | null>(null);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const payload = await getAdminAlerts();
        setAlertsData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load alerts data.");
      }
    };

    void loadAlerts();

    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const alertFeed = useMemo(() => alertsData?.alerts ?? [], [alertsData]);

  const criticalCount = useMemo(() => Number(alertsData?.summary?.critical ?? 0), [alertsData]);

  const handleAlertStatusUpdate = async (alert: AdminAlert, status: "acknowledged" | "resolved" | "dismissed") => {
    try {
      setUpdatingAlertId(alert.id);
      await updateAdminAlertStatus(alert.id, status);
      const refreshed = await getAdminAlerts();
      setAlertsData(refreshed);
      toast.success(`Alert marked as ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update alert.");
    } finally {
      setUpdatingAlertId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 font-body max-w-[1300px] mx-auto"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">NDR / SLA Alerts</h1>
          <p className="text-sm text-[#627D98] mt-1">Track critical cases quickly with clear actions and status cues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Open alerts</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#B42318]" />{alertsData?.summary.open ?? 0}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Critical signals</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><TimerReset className="w-4 h-4 text-[#9C4F17]" />{criticalCount}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Auto-monitored</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CircleCheck className="w-4 h-4 text-[#009877]" />Realtime</p>
        </div>
      </div>

      <div className="space-y-3">
        {alertFeed.map((alert) => (
          <motion.div key={alert.id} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-sm text-[#102A43] font-medium">{alert.title}</p>
              <p className="text-xs text-[#627D98]">{alert.formatted_message || alert.message || alert.source_reference}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#486581]">{alert.alert_type_label || getAlertTypeLabel(alert.alert_type)} | Status: {alert.status}</p>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} className="text-xs px-3 py-1 rounded-full bg-[#F5F7FA] text-[#334E68] border-[0.5px] border-[#D9E1EA] disabled:opacity-60" onClick={() => void handleAlertStatusUpdate(alert, "dismissed")} disabled={updatingAlertId === alert.id || alert.status === "dismissed"}>
                Dismiss
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} className="text-xs px-3 py-1 rounded-full bg-[#009877] text-white hover:bg-[#007B61] disabled:opacity-60" onClick={() => void handleAlertStatusUpdate(alert, "acknowledged")} disabled={updatingAlertId === alert.id || alert.status === "acknowledged"}>
                Acknowledge
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Alert handling queue</h2>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Case</th>
                <th className="px-4 py-2.5 text-left">Owner</th>
                <th className="px-4 py-2.5 text-left">Age</th>
                <th className="px-4 py-2.5 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {(alertsData?.notifications ?? []).map((notification, index) => (
                <tr key={notification.id}>
                  <td className="px-4 py-2.5">{notification.message}</td>
                  <td className="px-4 py-2.5">{notification.type_label || getAlertTypeLabel(notification.type)}</td>
                  <td className="px-4 py-2.5">{new Date(notification.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-2.5">{index === 0 ? "Critical" : index < 3 ? "High" : "Medium"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Alert response SOP
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Critical alerts must be acknowledged within 15 minutes, tagged to owner, and escalated to Ops if unresolved after 1 hour.</p>
        </details>
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Follow-up cadence
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Cases with pending customer action are re-pinged at 4h, 24h, and 48h, then moved to priority review queue.</p>
        </details>
      </div>
    </motion.div>
  );
}

