"use client";

import { Breadcrumb } from "@/components/console/Breadcrumb";
import { StatCard } from "@/components/ui/console/StatCard";
import { ShieldAlert, Users, FileLock, KeyRound, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function SecurityPage() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto font-body">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Security & Audit</h1>
          <p className="text-[#486581] text-sm mt-1">Monitor access, logs, and system permissions</p>
        </div>
      </div>
      
      <Breadcrumb />

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Failed Logins (24h)" value="12" trend="+3" isPositive={false} icon={ShieldAlert} colorClass="text-red-600" bgClass="bg-red-100" />
        <StatCard title="Active Sessions" value="28" icon={Users} colorClass="text-blue-600" bgClass="bg-blue-100" />
        <StatCard title="File Accesses (24h)" value="1,842" icon={FileLock} colorClass="text-purple-600" bgClass="bg-purple-100" />
        <StatCard title="OTPs Sent" value="345" icon={KeyRound} colorClass="text-orange-600" bgClass="bg-orange-100" />
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

      {/* Audit Log Table */}
      <div className="bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] overflow-hidden mb-8">
        <div className="p-5 border-b border-[0.5px] border-[#D9E1EA] flex justify-between items-center">
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">System Audit Log</h2>
          <button className="text-sm font-heading font-medium text-[#009877] hover:text-[#007B61]">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User / System</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target Details</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {AUDIT_LOGS.map((log) => (
                <tr 
                  key={log.id} 
                  className={cn(
                    "transition-colors",
                    log.flag ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-[#F8FAFC]"
                  )}
                >
                  <td className="px-5 py-3 text-[#627D98] whitespace-nowrap">{log.time}</td>
                  <td className="px-5 py-3 font-medium text-[#102A43]">{log.user}</td>
                  <td className="px-5 py-3 text-[#334E68]">{log.action}</td>
                  <td className="px-5 py-3 text-[#486581]">{log.target}</td>
                  <td className="px-5 py-3 text-center">
                    {log.flag ? (
                      <span className="inline-flex items-center gap-1 bg-[#B42318]/12 text-[#B42318] font-medium px-2.5 py-0.5 rounded-full text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Suspicious
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#33A1FD]/12 text-[#0B69B7] font-medium px-2.5 py-0.5 rounded-full text-xs">
                        Standard
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] overflow-hidden">
        <div className="p-5 border-b border-[0.5px] border-[#D9E1EA]">
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">Role Permissions Base Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
              <tr>
                <th className="px-5 py-3 text-left w-1/3">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-5 py-3">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {PERMISSIONS.map((perm, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-3 text-left font-medium text-[#102A43]">{perm.name}</td>
                  {perm.values.map((hasPerm, jdx) => (
                    <td key={jdx} className="px-5 py-3">
                      {hasPerm ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 mx-auto opacity-50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Security escalation protocol
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Suspicious access triggers session kill, forced OTP reset, and incident assignment to Ops Manager within 10 minutes.</p>
        </details>
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Data retention and audit readiness
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">All file access events and status edits are retained for compliance review and monthly audit export cycles.</p>
        </details>
      </div>
    </div>
  );
}
