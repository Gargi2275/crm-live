"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AdminDashboardOverview, TeamPerformancePeriod } from "@/lib/admin-auth";

type StaffMember = AdminDashboardOverview["staff_members"][number];

type KpiFilterKey =
  | "all"
  | "cases"
  | "assigned"
  | "completed"
  | "cases_done"
  | "pending"
  | "accuracy"
  | "revenue";

type TeamPerformanceGridProps = {
  staffMembers: StaffMember[];
  periodLabel: string;
  teamPeriod: TeamPerformancePeriod;
  onPeriodChange: (period: TeamPerformancePeriod) => void;
  loading?: boolean;
};

const TEAM_PERIOD_OPTIONS: { key: TeamPerformancePeriod; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export function TeamPerformanceGrid({
  staffMembers,
  periodLabel,
  teamPeriod,
  onPeriodChange,
  loading = false,
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
        case "cases":
          return (staff.cases_generated ?? 0) > 0;
        case "assigned":
          return staff.assigned > 0;
        case "completed":
          return staff.completed > 0;
        case "cases_done":
          return (staff.cases_completed ?? 0) > 0;
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
        cases_generated: acc.cases_generated + (staff.cases_generated ?? 0),
        cases_completed: acc.cases_completed + (staff.cases_completed ?? 0),
        assigned: acc.assigned + staff.assigned,
        completed: acc.completed + staff.completed,
        pending: acc.pending + staff.pending,
        revenue_period: acc.revenue_period + Number(staff.revenue_30d ?? 0),
        revenue_total: acc.revenue_total + Number(staff.revenue_total ?? 0),
        accuracy_sum: acc.accuracy_sum + staff.accuracy,
        accuracy_count: acc.accuracy_count + (staff.assigned > 0 ? 1 : 0),
      }),
      {
        cases_generated: 0,
        cases_completed: 0,
        assigned: 0,
        completed: 0,
        pending: 0,
        revenue_period: 0,
        revenue_total: 0,
        accuracy_sum: 0,
        accuracy_count: 0,
      },
    );
  }, [nonAdminStaff]);

  const avgAccuracy = totals.accuracy_count
    ? Math.round((totals.accuracy_sum / totals.accuracy_count) * 10) / 10
    : 0;

  const displayTotals = useMemo(() => {
    const rows = kpiFilter === "all" ? nonAdminStaff : filteredStaff;
    return rows.reduce(
      (acc, staff) => ({
        cases_generated: acc.cases_generated + (staff.cases_generated ?? 0),
        cases_completed: acc.cases_completed + (staff.cases_completed ?? 0),
        assigned: acc.assigned + staff.assigned,
        completed: acc.completed + staff.completed,
        pending: acc.pending + staff.pending,
        revenue_period: acc.revenue_period + Number(staff.revenue_30d ?? 0),
        revenue_total: acc.revenue_total + Number(staff.revenue_total ?? 0),
        accuracy_sum: acc.accuracy_sum + staff.accuracy,
        accuracy_count: acc.accuracy_count + (staff.assigned > 0 ? 1 : 0),
      }),
      {
        cases_generated: 0,
        cases_completed: 0,
        assigned: 0,
        completed: 0,
        pending: 0,
        revenue_period: 0,
        revenue_total: 0,
        accuracy_sum: 0,
        accuracy_count: 0,
      },
    );
  }, [filteredStaff, kpiFilter, nonAdminStaff]);

  const displayAvgAccuracy = displayTotals.accuracy_count
    ? Math.round((displayTotals.accuracy_sum / displayTotals.accuracy_count) * 10) / 10
    : 0;

  return (
    <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
      <div className="p-5 border-b border-[#E5EAF0] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold text-[#102A43]">Team performance</h2>
          <p className="text-xs text-[#627D98] mt-0.5">
            All team · accuracy & revenue · {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onPeriodChange(option.key)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-full font-heading transition-colors ${
                teamPeriod === option.key
                  ? "bg-[#009877] text-white"
                  : "bg-[#F5F7FA] text-[#486581] hover:bg-[#E5EAF0]"
              } disabled:opacity-60`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 px-5 py-3 border-b border-[#E5EAF0] bg-[#F8FAFC]">
        {[
          { key: "cases" as const, label: "Cases", value: totals.cases_generated, tone: "text-[#102A43]" },
          { key: "assigned" as const, label: "Assigned", value: totals.assigned, tone: "text-[#0B69B7]" },
          { key: "completed" as const, label: "Completed", value: totals.completed, tone: "text-[#006F57]" },
          { key: "cases_done" as const, label: "Cases done", value: totals.cases_completed, tone: "text-[#006F57]" },
          { key: "pending" as const, label: "Pending", value: totals.pending, tone: "text-[#9C4F17]" },
          { key: "accuracy" as const, label: "Accuracy", value: `${avgAccuracy}%`, tone: "text-[#102A43]" },
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
        <table className="w-full text-sm text-left align-middle min-w-[1100px]">
          <thead className="bg-[#F5F7FA] text-[#486581] font-heading font-medium">
            <tr>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-3 py-3 font-medium text-center">Cases</th>
              <th className="px-3 py-3 font-medium text-center">Assigned</th>
              <th className="px-3 py-3 font-medium text-center">Completed</th>
              <th className="px-3 py-3 font-medium text-center">Cases done</th>
              <th className="px-3 py-3 font-medium text-center">Pending</th>
              <th className="px-3 py-3 font-medium text-center">Accuracy</th>
              <th className="px-3 py-3 font-medium text-center">Avg time</th>
              <th className="px-3 py-3 font-medium text-center">SLA</th>
              <th className="px-3 py-3 font-medium text-center">Audits P/F</th>
              <th className="px-3 py-3 font-medium text-center">Revenue ({periodLabel})</th>
              <th className="px-3 py-3 font-medium text-center">Revenue (all)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0]">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 text-[#102A43] font-medium">
                  {staff.name}
                  <span className="ml-2 text-[11px] text-[#627D98] font-normal">{staff.role}</span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#102A43]">
                  {staff.cases_generated ?? 0}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#0B69B7]">{staff.assigned}</td>
                <td className="px-3 py-3 text-center font-semibold text-[#006F57]">{staff.completed}</td>
                <td className="px-3 py-3 text-center font-semibold text-[#006F57]">
                  {staff.cases_completed ?? 0}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#9C4F17]">{staff.pending}</td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`font-semibold ${
                      staff.accuracy >= 90
                        ? "text-[#006F57]"
                        : staff.accuracy >= 70
                          ? "text-[#9C4F17]"
                          : "text-[#B42318]"
                    }`}
                  >
                    {staff.accuracy}%
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-[#486581]">{staff.avgTime}</td>
                <td className="px-3 py-3 text-center">
                  <span className={staff.slaBreach > 0 ? "text-[#B42318] font-semibold" : "text-[#486581]"}>
                    {staff.slaBreach}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-[#006F57] font-semibold">{staff.auditsPassed}</span>
                  <span className="text-[#627D98] mx-0.5">/</span>
                  <span className="text-[#B42318] font-semibold">{staff.auditsFailed}</span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-[#102A43]">
                  ₹{Number(staff.revenue_30d ?? 0).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-3 text-center text-[#486581]">
                  ₹{Number(staff.revenue_total ?? 0).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-5 py-6 text-center text-sm text-[#627D98]">
                  {nonAdminStaff.length === 0
                    ? "No staff members found for this period."
                    : "No staff match this KPI filter."}
                </td>
              </tr>
            ) : filteredStaff.length > 0 ? (
              <tr className="bg-[#F8FAFC] font-semibold">
                <td className="px-4 py-3 text-[#102A43]">
                  {kpiFilter === "all" ? "Team total" : "Filtered total"}
                </td>
                <td className="px-3 py-3 text-center">{displayTotals.cases_generated}</td>
                <td className="px-3 py-3 text-center text-[#0B69B7]">{displayTotals.assigned}</td>
                <td className="px-3 py-3 text-center text-[#006F57]">{displayTotals.completed}</td>
                <td className="px-3 py-3 text-center text-[#006F57]">{displayTotals.cases_completed}</td>
                <td className="px-3 py-3 text-center text-[#9C4F17]">{displayTotals.pending}</td>
                <td className="px-3 py-3 text-center">{displayAvgAccuracy}%</td>
                <td className="px-3 py-3 text-center text-[#627D98]">—</td>
                <td className="px-3 py-3 text-center text-[#627D98]">—</td>
                <td className="px-3 py-3 text-center text-[#627D98]">—</td>
                <td className="px-3 py-3 text-center">
                  ₹{displayTotals.revenue_period.toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-3 text-center">
                  ₹{displayTotals.revenue_total.toLocaleString("en-IN")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
