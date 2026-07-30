"use client";

import { useMemo, useState } from "react";
import { Breadcrumb } from "@/components/console/Breadcrumb";
import { StatCard } from "@/components/ui/console/StatCard";
import { ShieldAlert, Users, FileLock, KeyRound, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

const AUDIT_LOGS = [
  { id: 1, user: "Aman D.", action: "Downloaded File", target: "OCI-1002_passport.pdf", time: "10:45 AM", flag: false },
  { id: 2, user: "Ravi K.", action: "Changed Stage", target: "OCI-1010 → PAYMENT", time: "10:30 AM", flag: false },
  { id: 3, user: "Unknown IP", action: "Failed Login", target: "admin@flyoci.com", time: "09:12 AM", flag: true },
  { id: 4, user: "Meera J.", action: "Overrode SLA", target: "OCI-1005", time: "08:55 AM", flag: true },
  { id: 5, user: "Priya S.", action: "Sent WhatsApp", target: "OCI-1001 (+91 9876543210)", time: "08:40 AM", flag: false },
  { id: 6, user: "System", action: "Auto-Assigned", target: "OCI-1011 → Ravi K.", time: "08:15 AM", flag: false },
];

const ROLES = ["Admin", "Ops Manager", "Audit Officer", "Case Worker", "Viewer"];
const PERMISSIONS = [
  { name: "View All Cases", values: [true, true, true, false, true] },
  { name: "Edit Stages", values: [true, true, false, true, false] },
  { name: "Override SLAs", values: [true, true, false, false, false] },
  { name: "Delete Records", values: [true, false, false, false, false] },
  { name: "Download Full DB", values: [true, false, false, false, false] },
  { name: "View Analytics", values: [true, true, true, false, false] },
];

type SecurityKpi = "all" | "failed" | "sessions" | "files" | "otp";

export default function SecurityPage() {
  const [kpiFilter, setKpiFilter] = useState<SecurityKpi>("all");

  useSetAdminPageChrome({
    title: "Security",
    icon: ShieldAlert,
    syncKey: `security|${kpiFilter}`,
  });

  const filteredLogs = useMemo(() => {
    if (kpiFilter === "failed") {
      return AUDIT_LOGS.filter((row) => row.flag || /failed login/i.test(row.action));
    }
    if (kpiFilter === "files") {
      return AUDIT_LOGS.filter((row) => /download|file/i.test(row.action));
    }
    if (kpiFilter === "otp") {
      return AUDIT_LOGS.filter((row) => /otp|whatsapp/i.test(row.action));
    }
    if (kpiFilter === "sessions") {
      return AUDIT_LOGS.filter((row) => !row.flag);
    }
    return AUDIT_LOGS;
  }, [kpiFilter]);

  const toggleKpi = (key: SecurityKpi) => {
    setKpiFilter((current) => (current === key ? "all" : key));
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto font-body">
      <Breadcrumb />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Failed Logins (24h)"
          value="12"
          trend="+3"
          isPositive={false}
          icon={ShieldAlert}
          colorClass="text-red-600"
          bgClass="bg-red-100"
          active={kpiFilter === "failed"}
          onClick={() => toggleKpi("failed")}
        />
        <StatCard
          title="Active Sessions"
          value="28"
          icon={Users}
          colorClass="text-blue-600"
          bgClass="bg-blue-100"
          active={kpiFilter === "sessions"}
          onClick={() => toggleKpi("sessions")}
        />
        <StatCard
          title="File Accesses (24h)"
          value="1,842"
          icon={FileLock}
          colorClass="text-purple-600"
          bgClass="bg-purple-100"
          active={kpiFilter === "files"}
          onClick={() => toggleKpi("files")}
        />
        <StatCard
          title="OTPs Sent"
          value="345"
          icon={KeyRound}
          colorClass="text-orange-600"
          bgClass="bg-orange-100"
          active={kpiFilter === "otp"}
          onClick={() => toggleKpi("otp")}
        />
      </div>

      <div className="bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] p-5 mb-8">
        <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-3">Security Architecture Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#486581]">
          <div className="rounded-[10px] border border-[#D9E1EA] p-3 bg-[#F8FAFC]">
            <p className="font-semibold text-[#102A43] mb-1">End-to-end encryption</p>
            <p>AES-256 encrypted storage for passports, address proofs, and customer documents.</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3 bg-[#F8FAFC]">
            <p className="font-semibold text-[#102A43] mb-1">Access control</p>
            <p>Role-based restrictions for Admin, Ops Manager, Audit Officer, Case Worker, and Viewer.</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3 bg-[#F8FAFC]">
            <p className="font-semibold text-[#102A43] mb-1">OTP + persistent session</p>
            <p>OTP on login and sessions remain active until the user logs out manually.</p>
          </div>
          <div className="rounded-[10px] border border-[#D9E1EA] p-3 bg-[#F8FAFC]">
            <p className="font-semibold text-[#102A43] mb-1">Traceable audit logs</p>
            <p>Every view, edit, status change, and communication event is logged with timestamp.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] overflow-hidden mb-8">
        <div className="p-5 border-b border-[0.5px] border-[#D9E1EA] flex justify-between items-center">
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">System Audit Log</h2>
          <span className="text-xs text-[#627D98]">{filteredLogs.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User / System</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#627D98]">
                    No audit events for this KPI filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={cn(log.flag && "bg-[#FFF1F0]/60")}>
                    <td className="px-5 py-3 text-[#627D98]">{log.time}</td>
                    <td className="px-5 py-3 font-medium text-[#102A43]">{log.user}</td>
                    <td className="px-5 py-3 text-[#334E68]">{log.action}</td>
                    <td className="px-5 py-3 text-[#486581]">{log.target}</td>
                    <td className="px-5 py-3">
                      {log.flag ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B42318]">
                          <AlertTriangle className="h-3.5 w-3.5" /> Flagged
                        </span>
                      ) : (
                        <span className="text-xs text-[#829AB1]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] overflow-hidden">
        <div className="p-5 border-b border-[0.5px] border-[#D9E1EA]">
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">Role permission matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-5 py-3">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-5 py-3 text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {PERMISSIONS.map((permission) => (
                <tr key={permission.name}>
                  <td className="px-5 py-3 font-medium text-[#102A43]">{permission.name}</td>
                  {permission.values.map((allowed, index) => (
                    <td key={`${permission.name}-${ROLES[index]}`} className="px-5 py-3 text-center">
                      {allowed ? (
                        <Check className="mx-auto h-4 w-4 text-[#009877]" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-[#B42318]" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
