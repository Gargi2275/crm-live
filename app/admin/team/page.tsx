"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAdminDashboardOverview,
  getStaffAccuracyAll,
  type AdminDashboardOverview,
  type StaffAccuracyRow,
} from "@/lib/admin-auth";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

export default function TeamPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [accuracyRows, setAccuracyRows] = useState<StaffAccuracyRow[]>([]);

  useSetAdminPageChrome({
    title: "Team overview",
    icon: Users,
    syncKey: `${dashboardData ? "loaded" : "loading"}|${accuracyRows.length}`,
  });

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
      className="space-y-3 font-body max-w-[1300px] mx-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#627D98]">Snapshot of load and accuracy — use Workload to assign</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/workload" className="inline-flex items-center rounded-[8px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]">
            Assign workload
          </Link>
          <Link href="/admin/team-performance" className="inline-flex items-center rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]">
            Performance grid
          </Link>
          <Link href="/admin/staff" className="inline-flex items-center rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]">
            Staff accounts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] px-3 py-2.5">
          <p className="text-[11px] text-[#627D98]">Total staff</p>
          <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">{mergedRows.length}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] px-3 py-2.5">
          <p className="text-[11px] text-[#627D98]">Assigned tasks</p>
          <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">{totalAssigned}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] px-3 py-2.5">
          <p className="text-[11px] text-[#627D98]">Completed tasks</p>
          <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">{totalCompleted}</p>
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Team performance table</h2>
          <span className="text-xs text-[#627D98]">Live data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Name</th>
                <th className="px-3 py-2 text-left text-xs">Assigned</th>
                <th className="px-3 py-2 text-left text-xs">Completed</th>
                <th className="px-3 py-2 text-left text-xs">Pending</th>
                <th className="px-3 py-2 text-left text-xs">Load</th>
                <th className="px-3 py-2 text-left text-xs">SLA Breach</th>
                <th className="px-3 py-2 text-left text-xs">Overall %</th>
                <th className="px-3 py-2 text-left text-xs">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {mergedRows.map((member) => (
                <tr key={member.id} className="hover:bg-[#F8FCFF]">
                  <td className="px-3 py-2 text-xs">
                    <span className="font-semibold text-[#102A43]">{member.name}</span>
                    <span className="block text-[10px] text-[#627D98]">{member.role}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{member.assigned}</td>
                  <td className="px-3 py-2 text-xs">{member.completed}</td>
                  <td className="px-3 py-2 text-xs">{member.pending}</td>
                  <td className="px-3 py-2 text-xs">{member.loadStatus}</td>
                  <td className="px-3 py-2 text-xs">{member.slaBreach}</td>
                  <td className="px-3 py-2 text-xs">{Number(member.accuracy).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-xs">{member.badge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
