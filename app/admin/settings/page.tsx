"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardOverview,
  getWorkloadSettings,
  updateWorkloadSettings,
  type AdminDashboardOverview,
  type WorkloadSettings,
} from "@/lib/admin-auth";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function SettingsPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = String(adminUser?.role || "").toLowerCase() === "admin";
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [workloadSettings, setWorkloadSettings] = useState<WorkloadSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useSetAdminPageChrome({
    title: "Settings",
    icon: Settings,
    syncKey: dashboardData ? "loaded" : "loading",
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load settings data.");
      }
    };

    const loadSettings = async () => {
      try {
        const settings = await getWorkloadSettings();
        setWorkloadSettings(settings);
      } catch {
        // Non-fatal for roles without settings/workload access.
      }
    };

    void loadDashboard();
    void loadSettings();
  }, []);

  const handleToggleLeaveApproval = async (checked: boolean) => {
    if (!isAdmin) {
      toast.error("Only admin can change this setting.");
      return;
    }
    setSettingsSaving(true);
    try {
      const updated = await updateWorkloadSettings(checked);
      setWorkloadSettings(updated);
        toast.success(
          checked
            ? "On-leave staff reassign now needs admin approval."
            : "On-leave staff can reassign tasks directly.",
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting.");
    } finally {
      setSettingsSaving(false);
    }
  };

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
      {
        setting: "Staff reassign needs admin approval",
        value: workloadSettings?.require_admin_approval_on_leave_reassign ? "On" : "Off",
        lastUpdated: workloadSettings?.updated_at
          ? new Date(workloadSettings.updated_at).toLocaleString()
          : "-",
      },
    ],
    [alertsSummary, accessLogs, workloadSettings],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
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

          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#D9E1EA] p-3">
            <div className="min-w-0">
              <p className="text-[#102A43] font-medium">Require admin approval for staff reassign</p>
              <p className="text-xs text-[#627D98]">
                When On, staff who are on leave and reassign a task need admin approval. Reassign only
                appears for staff marked on leave today. Pending requests show on the dashboard and in
                the top notification bell (approve under Workload → Reassigns).
              </p>
            </div>
            <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#009877]"
                checked={Boolean(workloadSettings?.require_admin_approval_on_leave_reassign)}
                disabled={!isAdmin || settingsSaving || workloadSettings == null}
                onChange={(e) => void handleToggleLeaveApproval(e.target.checked)}
              />
              <span className="text-xs font-semibold text-[#102A43]">
                {workloadSettings?.require_admin_approval_on_leave_reassign ? "On" : "Off"}
              </span>
            </label>
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
            <p key={`${log.staff}-${index}`} className="text-sm text-[#486581]">
              {log.time} | {log.staff} | {log.file}
            </p>
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
    </motion.div>
  );
}
