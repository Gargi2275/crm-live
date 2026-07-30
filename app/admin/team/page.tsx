"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardOverview,
  getStaffAccuracyAll,
  type AdminDashboardOverview,
  type StaffAccuracyRow,
} from "@/lib/admin-auth";
import { motion } from "framer-motion";
import { Activity, Briefcase, UserCog, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { DashboardEmbedPanel } from "@/components/console/DashboardEmbedPanel";

type TeamKpiFilter = "all" | "assigned" | "completed";
type TeamTab = "overview" | "workload" | "performance" | "staff";

const TEAM_TABS: Array<{ id: TeamTab; label: string; icon: typeof Users; href?: string }> = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "workload", label: "Workload", icon: UserCog, href: "/admin/workload" },
  { id: "performance", label: "Performance", icon: Activity, href: "/admin/team-performance" },
  { id: "staff", label: "Staff accounts", icon: Briefcase, href: "/admin/staff" },
];

export default function TeamPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [accuracyRows, setAccuracyRows] = useState<StaffAccuracyRow[]>([]);
  const [kpiFilter, setKpiFilter] = useState<TeamKpiFilter>("all");
  const [teamTab, setTeamTab] = useState<TeamTab>("overview");

  useSetAdminPageChrome({
    title: "Team overview",
    subtitle:
      teamTab === "overview"
        ? "Load & accuracy snapshot"
        : teamTab === "workload"
          ? "Assign & balance work"
          : teamTab === "performance"
            ? "Accuracy & revenue"
            : "Staff accounts",
    icon: Users,
    syncKey: `${dashboardData ? "loaded" : "loading"}|${accuracyRows.length}|${kpiFilter}|${teamTab}`,
  });

  useEffect(() => {
    if (teamTab !== "overview") return;

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
  }, [teamTab]);

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

  const filteredRows = useMemo(() => {
    if (kpiFilter === "assigned") return mergedRows.filter((row) => row.assigned > 0);
    if (kpiFilter === "completed") return mergedRows.filter((row) => row.completed > 0);
    return mergedRows;
  }, [kpiFilter, mergedRows]);

  const kpiCards: Array<{ key: TeamKpiFilter; label: string; value: number }> = [
    { key: "all", label: "Total staff", value: mergedRows.length },
    { key: "assigned", label: "Assigned tasks", value: totalAssigned },
    { key: "completed", label: "Completed tasks", value: totalCompleted },
  ];

  const activeEmbedHref = TEAM_TABS.find((tab) => tab.id === teamTab)?.href;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-3 font-body max-w-[1500px] mx-auto"
    >
      <div className="inline-flex flex-wrap rounded-[10px] border border-[#D9E1EA] bg-white p-1 gap-0.5">
        {TEAM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = teamTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTeamTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? "bg-[#009877] text-white shadow-sm" : "text-[#486581] hover:bg-[#F5F7FA]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {teamTab !== "overview" && activeEmbedHref ? (
        <DashboardEmbedPanel href={activeEmbedHref} />
      ) : (
        <>
          <p className="text-xs text-[#627D98]">
            Snapshot of load and accuracy — switch tabs above for workload, performance, or staff accounts
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {kpiCards.map((card) => {
              const selected = kpiFilter === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setKpiFilter(card.key)}
                  aria-pressed={selected}
                  className={`bg-white border-[0.5px] rounded-[10px] px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-[#009877] ring-1 ring-[#009877]/25 bg-[#009877]/5"
                      : "border-[#D9E1EA] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <p className="text-[11px] text-[#627D98]">{card.label}</p>
                  <p className="mt-0.5 text-lg font-heading font-semibold text-[#102A43]">{card.value}</p>
                </button>
              );
            })}
          </div>

          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#E5EAF0] flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-[#102A43]">Team performance table</h2>
              <span className="text-xs text-[#627D98]">
                {filteredRows.length} / {mergedRows.length} staff
              </span>
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
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-xs text-[#627D98]">
                        No staff match this KPI filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((member) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
