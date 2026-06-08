// "use client";

// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import { getAdminAlerts, updateAdminAlertStatus, type AdminAlert } from "@/lib/admin-auth";
// import { AlertTriangle, CheckCircle2, Eye, RefreshCw, ShieldAlert, XCircle } from "lucide-react";

// type AlertStatus = AdminAlert["status"];

// const statusPill = (status: AlertStatus) => {
//   switch (status) {
//     case "open":
//       return "bg-[#DC2626]/10 text-[#B42318] border border-[#DC2626]/25";
//     case "acknowledged":
//       return "bg-[#33A1FD]/10 text-[#0B69B7] border border-[#33A1FD]/25";
//     case "resolved":
//       return "bg-[#009877]/10 text-[#006F57] border border-[#009877]/25";
//     case "dismissed":
//       return "bg-[#627D98]/10 text-[#486581] border border-[#627D98]/25";
//     default:
//       return "bg-[#F5F7FA] text-[#486581] border border-[#D9E1EA]";
//   }
// };

// const severityPill = (severity: AdminAlert["severity"]) => {
//   if (severity === "critical") return "bg-[#B42318]/10 text-[#B42318] border border-[#B42318]/25";
//   if (severity === "high") return "bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/25";
//   if (severity === "medium") return "bg-[#0B69B7]/10 text-[#0B69B7] border border-[#0B69B7]/25";
//   return "bg-[#627D98]/10 text-[#486581] border border-[#627D98]/25";
// };

// export default function AdminAlertsPage() {
//   const [alerts, setAlerts] = useState<AdminAlert[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [updatingId, setUpdatingId] = useState<number | null>(null);
//   const [filter, setFilter] = useState<"all" | "open" | "acknowledged">("all");

//   const load = async (options?: { markRead?: boolean }) => {
//     setLoading(true);
//     try {
//       const payload = await getAdminAlerts(Boolean(options?.markRead));
//       setAlerts(payload.alerts || []);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to load alerts.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     void load();
//   }, []);

//   const filtered = useMemo(() => {
//     if (filter === "all") return alerts;
//     return alerts.filter((a) => a.status === filter);
//   }, [alerts, filter]);

//   const updateStatus = async (id: number, next: "acknowledged" | "resolved" | "dismissed") => {
//     setUpdatingId(id);
//     try {
//       const updated = await updateAdminAlertStatus(id, next);
//       setAlerts((prev) => prev.map((item) => (item.id === id ? updated : item)));
//       toast.success(`Alert marked ${next}.`);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to update alert.");
//     } finally {
//       setUpdatingId(null);
//     }
//   };

//   return (
//     <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto space-y-4 font-body">
//       <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
//             <ShieldAlert className="w-5 h-5 text-[#B42318]" /> NDR / SLA Alerts
//           </h1>
//           <p className="mt-1 text-sm text-[#627D98]">Backend-driven alerts (SLA breaches, correction delays, payment issues, overdue urgent tasks).</p>
//         </div>

//         <div className="flex flex-wrap items-center gap-2">
//           <select
//             value={filter}
//             onChange={(e) => setFilter(e.target.value as typeof filter)}
//             className="bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm text-[#102A43]"
//             aria-label="Filter alerts"
//           >
//             <option value="all">All</option>
//             <option value="open">Open</option>
//             <option value="acknowledged">Acknowledged</option>
//           </select>
//           <button
//             type="button"
//             onClick={() => void load()}
//             className="inline-flex items-center gap-2 bg-white border border-[#D9E1EA] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
//           >
//             <RefreshCw className="w-4 h-4" /> Refresh
//           </button>
//           <button
//             type="button"
//             onClick={() => void load({ markRead: true })}
//             className="inline-flex items-center gap-2 bg-[#EFF7FF] border border-[#B7D7F7] rounded-[10px] px-3 py-2 text-sm font-semibold text-[#0B69B7] hover:bg-[#E6F2FF]"
//           >
//             <Eye className="w-4 h-4" /> Mark visible as read
//           </button>
//         </div>
//       </div>

//       <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
//         <div className="grid grid-cols-12 gap-0 border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 text-[11px] font-semibold text-[#627D98] uppercase tracking-wide">
//           <div className="col-span-5">Alert</div>
//           <div className="col-span-2">Type</div>
//           <div className="col-span-2">Severity / Status</div>
//           <div className="col-span-2">Last seen</div>
//           <div className="col-span-1 text-right">Actions</div>
//         </div>

//         {loading ? (
//           <div className="p-4 text-sm text-[#627D98]">Loading alerts…</div>
//         ) : filtered.length === 0 ? (
//           <div className="p-4 text-sm text-[#627D98]">No alerts found.</div>
//         ) : (
//           <div className="divide-y divide-[#E5EAF0]">
//             {filtered.map((alert) => (
//               <div key={alert.id} className="grid grid-cols-12 gap-3 px-4 py-4">
//                 <div className="col-span-12 lg:col-span-5 min-w-0">
//                   <div className="flex items-start gap-2">
//                     <AlertTriangle className="w-4 h-4 text-[#B45309] mt-0.5 shrink-0" />
//                     <div className="min-w-0">
//                       <p className="text-sm font-heading font-semibold text-[#102A43] truncate">{alert.title}</p>
//                       <p className="mt-1 text-xs text-[#627D98] break-words">{alert.message}</p>
//                       {alert.source_reference ? (
//                         <p className="mt-1 text-[11px] text-[#486581]">Ref: {alert.source_reference}</p>
//                       ) : null}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="col-span-6 lg:col-span-2">
//                   <p className="text-xs font-semibold text-[#102A43]">{alert.alert_type_label || alert.alert_type}</p>
//                   <p className="mt-1 text-[11px] text-[#627D98]">Occurrences: {alert.occurrences}</p>
//                 </div>

//                 <div className="col-span-6 lg:col-span-2 flex flex-col gap-2">
//                   <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityPill(alert.severity)}`}>
//                     {alert.severity}
//                   </span>
//                   <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPill(alert.status)}`}>
//                     {alert.status}
//                   </span>
//                 </div>

//                 <div className="col-span-6 lg:col-span-2">
//                   <p className="text-xs text-[#102A43]">
//                     {alert.last_seen_at ? new Date(alert.last_seen_at).toLocaleString() : "—"}
//                   </p>
//                   <p className="mt-1 text-[11px] text-[#627D98]">
//                     First: {alert.first_seen_at ? new Date(alert.first_seen_at).toLocaleDateString() : "—"}
//                   </p>
//                 </div>

//                 <div className="col-span-6 lg:col-span-1 flex items-center justify-end gap-2">
//                   <button
//                     type="button"
//                     disabled={updatingId === alert.id}
//                     onClick={() => void updateStatus(alert.id, "acknowledged")}
//                     className="inline-flex items-center justify-center h-9 w-9 rounded-[10px] border border-[#B7D7F7] bg-[#EFF7FF] text-[#0B69B7] hover:bg-[#E6F2FF] disabled:opacity-60"
//                     aria-label="Acknowledge"
//                     title="Acknowledge"
//                   >
//                     <CheckCircle2 className="w-4 h-4" />
//                   </button>
//                   <button
//                     type="button"
//                     disabled={updatingId === alert.id}
//                     onClick={() => void updateStatus(alert.id, "resolved")}
//                     className="inline-flex items-center justify-center h-9 w-9 rounded-[10px] border border-[#009877]/25 bg-[#009877]/10 text-[#006F57] hover:bg-[#009877]/15 disabled:opacity-60"
//                     aria-label="Resolve"
//                     title="Resolve"
//                   >
//                     <CheckCircle2 className="w-4 h-4" />
//                   </button>
//                   <button
//                     type="button"
//                     disabled={updatingId === alert.id}
//                     onClick={() => void updateStatus(alert.id, "dismissed")}
//                     className="inline-flex items-center justify-center h-9 w-9 rounded-[10px] border border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-60"
//                     aria-label="Dismiss"
//                     title="Dismiss"
//                   >
//                     <XCircle className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

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
{alert.source_reference === "tasks:high_priority" &&
  Array.isArray((alert.metadata as Record<string, unknown>)?.task_ids) &&
  ((alert.metadata as Record<string, unknown>).task_ids as Record<string, unknown>[]).map((task) => (
    <p key={String(task.id)} className="text-xs text-[#B42318] mt-0.5">
      #{String(task.application__reference_number ?? "N/A")} — {String(task.task_type)} — {String(task.priority).toUpperCase()} — due {new Date(String(task.deadline)).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
    </p>
  ))
}
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
  {(alertsData?.notifications ?? []).map((notification) => (
    <tr key={notification.id}>
      {/* Case column — show task details if available */}
      <td className="px-4 py-2.5">
        <span>{notification.message}</span>
        {Array.isArray(notification.task_ids) &&
          notification.task_ids.map((task) => (
            <p key={String(task.id)} className="text-xs text-[#B42318] mt-0.5">
              #{String(task.application__reference_number ?? "N/A")} — {String(task.task_type)} — {String(task.priority).toUpperCase()} — due {new Date(String(task.deadline)).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </p>
          ))
        }
      </td>
      {/* Owner column — show actor name if available */}
      <td className="px-4 py-2.5">
        {notification.assignee_name
          || notification.actor
          || notification.type_label
          || getAlertTypeLabel(notification.type)}
      </td>
      {/* Age column */}
      <td className="px-4 py-2.5">
        {new Date(notification.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </td>
      {/* Priority column */}
      <td className="px-4 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          notification.severity === "critical" ? "bg-red-100 text-red-700" :
          notification.severity === "high" ? "bg-orange-100 text-orange-700" :
          notification.severity === "low" ? "bg-gray-100 text-gray-600" :
          "bg-yellow-100 text-yellow-700"
        }`}>
          {notification.severity
            ? notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)
            : "Medium"}
        </span>
      </td>
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

