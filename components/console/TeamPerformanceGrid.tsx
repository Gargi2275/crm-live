"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AdminDashboardOverview, TeamPerformancePeriod } from "@/lib/admin-auth";

type StaffMember = AdminDashboardOverview["staff_members"][number];

type KpiFilterKey = "all" | "assigned" | "completed" | "pending" | "accuracy" | "revenue";

type TeamPerformanceGridProps = {
  staffMembers: StaffMember[];
  periodLabel: string;
  teamPeriod: TeamPerformancePeriod;
};

function formatAccuracy(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Number(value).toFixed(1)}%`;
}

export function TeamPerformanceGrid({
  staffMembers,
  periodLabel,
  teamPeriod,
}: TeamPerformanceGridProps) {
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>("all");

  useEffect(() => {
    setKpiFilter("all");
  }, [teamPeriod]);

  const nonAdminStaff = useMemo(
    () => staffMembers.filter((s) => String(s.role || "").toLowerCase() !== "admin"),
    [staffMembers],
  );

  const filteredStaff = useMemo(() => {
    if (kpiFilter === "all") return nonAdminStaff;
    return nonAdminStaff.filter((staff) => {
      switch (kpiFilter) {
        case "assigned":
          return staff.assigned > 0;
        case "completed":
          return staff.completed > 0;
        case "pending":
          return staff.pending > 0;
        case "accuracy":
          return staff.assigned > 0;
        case "revenue":
          return Number(staff.revenue_30d ?? 0) > 0;
        default:
          return true;
      }
    });
  }, [kpiFilter, nonAdminStaff]);

  const toggleKpiFilter = (key: KpiFilterKey) => {
    setKpiFilter((current) => (current === key ? "all" : key));
  };

  const totals = useMemo(() => {
    return nonAdminStaff.reduce(
      (acc, staff) => ({
        assigned: acc.assigned + staff.assigned,
        completed: acc.completed + staff.completed,
        pending: acc.pending + staff.pending,
        revenue_period: acc.revenue_period + Number(staff.revenue_30d ?? 0),
      }),
      {
        assigned: 0,
        completed: 0,
        pending: 0,
        revenue_period: 0,
      },
    );
  }, [nonAdminStaff]);

  // Weighted team accuracy = completed / assigned (not average of row %).
  const teamAccuracy =
    totals.assigned > 0 ? Math.round((totals.completed / totals.assigned) * 1000) / 10 : 0;

  const displayTotals = useMemo(() => {
    const rows = kpiFilter === "all" ? nonAdminStaff : filteredStaff;
    return rows.reduce(
      (acc, staff) => ({
        assigned: acc.assigned + staff.assigned,
        completed: acc.completed + staff.completed,
        pending: acc.pending + staff.pending,
        revenue_period: acc.revenue_period + Number(staff.revenue_30d ?? 0),
      }),
      {
        assigned: 0,
        completed: 0,
        pending: 0,
        revenue_period: 0,
      },
    );
  }, [filteredStaff, kpiFilter, nonAdminStaff]);

  const displayAccuracy =
    displayTotals.assigned > 0
      ? Math.round((displayTotals.completed / displayTotals.assigned) * 1000) / 10
      : 0;

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
      <div className="p-5 border-b border-[#E5EAF0]">
        <h2 className="text-lg font-heading font-semibold text-[#102A43]">Team performance</h2>
        <p className="text-xs text-[#627D98] mt-0.5">
          Accuracy = completed ÷ assigned · leave today · {periodLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 px-5 py-3 border-b border-[#E5EAF0] bg-[#F8FAFC]">
        {[
          { key: "assigned" as const, label: "Assigned", value: totals.assigned, tone: "text-[#0B69B7]" },
          { key: "completed" as const, label: "Completed", value: totals.completed, tone: "text-[#006F57]" },
          { key: "pending" as const, label: "Pending", value: totals.pending, tone: "text-[#9C4F17]" },
          {
            key: "accuracy" as const,
            label: "Accuracy",
            value: formatAccuracy(teamAccuracy),
            tone: "text-[#102A43]",
          },
          {
            key: "revenue" as const,
            label: `Revenue (${periodLabel})`,
            value: `₹${totals.revenue_period.toLocaleString("en-IN")}`,
            tone: "text-[#102A43]",
          },
        ].map((item) => {
          const active = kpiFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleKpiFilter(item.key)}
              className={`rounded-[8px] border px-2 py-2 text-left transition-colors ${
                active
                  ? "border-[#009877] bg-[#009877]/10 ring-1 ring-[#009877]/25"
                  : "border-[#E5EAF0] bg-white hover:border-[#33A1FD]/40"
              }`}
            >
              <p className="text-[10px] text-[#627D98] truncate">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${item.tone}`}>{item.value}</p>
            </button>
          );
        })}
      </div>

      {kpiFilter !== "all" ? (
        <div className="px-5 py-2 border-b border-[#E5EAF0] bg-[#EFF7FF]/50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#486581]">
            Showing <span className="font-semibold text-[#102A43]">{filteredStaff.length}</span> of{" "}
            {nonAdminStaff.length} staff · click the same KPI again to show all
          </p>
          <button
            type="button"
            onClick={() => setKpiFilter("all")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#486581] hover:text-[#102A43]"
          >
            <X className="w-3.5 h-3.5" />
            Clear filter
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left align-middle min-w-[720px]">
          <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
            <tr>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-3 py-3 font-medium text-center">Today</th>
              <th className="px-3 py-3 font-medium text-center">Assigned</th>
              <th className="px-3 py-3 font-medium text-center">Completed</th>
              <th className="px-3 py-3 font-medium text-center">Pending</th>
              <th className="px-3 py-3 font-medium text-center">Accuracy</th>
              <th className="px-3 py-3 font-medium text-center">Avg time</th>
              <th className="px-3 py-3 font-medium text-center">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0]">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 text-[#102A43] font-medium">
                  {staff.name}
                  <span className="ml-2 text-[11px] text-[#627D98] font-normal">{staff.role}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {staff.on_leave_today ? (
                    <span
                      className={`inline-flex flex-col items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        staff.blocks_auto_assign_today
                          ? "border-[#F8B4B4] bg-[#FEE2E2] text-[#9B1C1C]"
                          : "border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]"
                      }`}
                      title={
                        staff.blocks_auto_assign_today && (staff.pending_on_leave || 0) > 0
                          ? `${staff.pending_on_leave} pending task(s) still on this staff — reassign from Workload`
                          : staff.leave_label_today || "On leave"
                      }
                    >
                      {staff.leave_label_today || "Leave"}
                      {staff.blocks_auto_assign_today && (staff.pending_on_leave || 0) > 0 ? (
                        <span className="font-normal">{staff.pending_on_leave} pending</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#006F57]">Available</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#0B69B7]">{staff.assigned}</td>
                <td className="px-3 py-3 text-center font-semibold text-[#006F57]">{staff.completed}</td>
                <td
                  className={`px-3 py-3 text-center font-semibold ${
                    staff.blocks_auto_assign_today && staff.pending > 0
                      ? "text-[#B42318]"
                      : "text-[#9C4F17]"
                  }`}
                  title={
                    staff.blocks_auto_assign_today && staff.pending > 0
                      ? "Still assigned while on leave — reassign from Workload"
                      : undefined
                  }
                >
                  {staff.pending}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`font-semibold ${
                      staff.assigned === 0
                        ? "text-[#627D98]"
                        : staff.accuracy >= 90
                          ? "text-[#006F57]"
                          : staff.accuracy >= 70
                            ? "text-[#9C4F17]"
                            : "text-[#B42318]"
                    }`}
                    title={
                      staff.assigned > 0
                        ? `${staff.completed} completed ÷ ${staff.assigned} assigned`
                        : "No assigned tasks in this period"
                    }
                  >
                    {formatAccuracy(staff.accuracy)}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-[#486581]">
                  {staff.completed > 0 ? staff.avgTime : "—"}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#102A43]">
                  ₹{Number(staff.revenue_30d ?? 0).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-sm text-[#627D98]">
                  {nonAdminStaff.length === 0
                    ? "No staff members found for this period."
                    : "No staff match this KPI filter."}
                </td>
              </tr>
            ) : (
              <tr className="bg-[#F8FAFC] font-semibold">
                <td className="px-4 py-3 text-[#102A43]">
                  {kpiFilter === "all" ? "Team total" : "Filtered total"}
                </td>
                <td className="px-3 py-3 text-center text-[#627D98]">—</td>
                <td className="px-3 py-3 text-center text-[#0B69B7]">{displayTotals.assigned}</td>
                <td className="px-3 py-3 text-center text-[#006F57]">{displayTotals.completed}</td>
                <td className="px-3 py-3 text-center text-[#9C4F17]">{displayTotals.pending}</td>
                <td className="px-3 py-3 text-center">{formatAccuracy(displayAccuracy)}</td>
                <td className="px-3 py-3 text-center text-[#627D98]">—</td>
                <td className="px-3 py-3 text-center">
                  ₹{displayTotals.revenue_period.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
