"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardOverview,
  getStaffAccuracyAll,
  type AdminDashboardOverview,
  type StaffAccuracyRow,
} from "@/lib/admin-auth";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function TeamPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [accuracyRows, setAccuracyRows] = useState<StaffAccuracyRow[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboardOverview();
        setDashboardData(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load team data.");
      }

      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);
        const to = end.toISOString().slice(0, 10);
        const from = start.toISOString().slice(0, 10);
        const accuracyPayload = await getStaffAccuracyAll(from, to);
        setAccuracyRows(accuracyPayload.results || []);
      } catch {
        // Keep the team view usable with dashboard staff metrics when role permissions block accuracy endpoint.
      }
    };

    void loadDashboard();
  }, []);

  const staffMembers = dashboardData?.staff_members ?? [];
  const staffById = useMemo(() => {
    const map = new Map<number, (typeof staffMembers)[number]>();
    for (const member of staffMembers) {
      map.set(member.id, member);
    }
    return map;
  }, [staffMembers]);

  const mergedRows = useMemo(() => {
    if (accuracyRows.length > 0) {
      return accuracyRows.map((row) => {
        const member = staffById.get(row.staff_id);
        return {
          id: row.staff_id,
          name: row.staff_name,
          role: member?.role || row.staff_role,
          assigned: member?.assigned ?? 0,
          completed: member?.completed ?? 0,
          pending: member?.pending ?? 0,
          loadStatus: member?.loadStatus ?? "Available",
          slaBreach: member?.slaBreach ?? 0,
          accuracy: row.overall_accuracy,
          auditAccuracy: row.audit_accuracy,
          formAccuracy: row.form_fill_accuracy,
          slaCompliance: row.sla_compliance,
          correctionRate: row.correction_rate_score,
          badge: row.badge,
        };
      });
    }

    return staffMembers.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      assigned: member.assigned,
      completed: member.completed,
      pending: member.pending,
      loadStatus: member.loadStatus,
      slaBreach: member.slaBreach,
      accuracy: member.accuracy,
      auditAccuracy: 0,
      formAccuracy: 0,
      slaCompliance: 0,
      correctionRate: 0,
      badge: "Needs Improvement",
    }));
  }, [accuracyRows, staffById, staffMembers]);

  const totalAssigned = useMemo(() => mergedRows.reduce((sum, member) => sum + member.assigned, 0), [mergedRows]);
  const totalCompleted = useMemo(() => mergedRows.reduce((sum, member) => sum + member.completed, 0), [mergedRows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1300px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Team Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Total staff</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{mergedRows.length}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Assigned tasks</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{totalAssigned}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Completed tasks</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{totalCompleted}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {mergedRows.map((item) => (
          <motion.div key={item.id} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold">{item.name}</p>
            <p className="text-xs text-[#627D98]">{item.role}</p>
            <p className="text-sm text-[#486581] mt-2">Tasks: <span className="text-[#0B69B7]">{item.assigned}</span> | Completed: <span className="text-[#006F57]">{item.completed}</span></p>
            <p className="text-sm text-[#486581]">Pending: <span className="text-[#9C4F17]">{item.pending}</span> | Status: <span className="text-[#334E68]">{item.loadStatus}</span></p>
            <p className="text-sm text-[#486581]">Badge: <span className="text-[#102A43] font-semibold">{item.badge}</span></p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Management note</h2>
        <p className="text-sm text-[#486581]">Prioritize balancing high-load members first to reduce SLA pressure across active queues.</p>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Team performance table</h2>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left">Assigned</th>
                <th className="px-4 py-2.5 text-left">Completed</th>
                <th className="px-4 py-2.5 text-left">SLA Breach</th>
                <th className="px-4 py-2.5 text-left">Audit %</th>
                <th className="px-4 py-2.5 text-left">Form %</th>
                <th className="px-4 py-2.5 text-left">SLA %</th>
                <th className="px-4 py-2.5 text-left">Correction %</th>
                <th className="px-4 py-2.5 text-left">Overall %</th>
                <th className="px-4 py-2.5 text-left">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {mergedRows.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-2.5">{member.name}</td>
                  <td className="px-4 py-2.5">{member.assigned}</td>
                  <td className="px-4 py-2.5">{member.completed}</td>
                  <td className="px-4 py-2.5">{member.slaBreach}</td>
                  <td className="px-4 py-2.5">{Number(member.auditAccuracy).toFixed(2)}%</td>
                  <td className="px-4 py-2.5">{Number(member.formAccuracy).toFixed(2)}%</td>
                  <td className="px-4 py-2.5">{Number(member.slaCompliance).toFixed(2)}%</td>
                  <td className="px-4 py-2.5">{Number(member.correctionRate).toFixed(2)}%</td>
                  <td className="px-4 py-2.5">{Number(member.accuracy).toFixed(2)}%</td>
                  <td className="px-4 py-2.5">{member.badge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Weekly coaching focus
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Review cases with repeated SLA breaches, assign one quality audit buddy per staff member, and cap concurrent high-priority work.</p>
      </details>
    </motion.div>
  );
}

