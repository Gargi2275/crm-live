"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, RefreshCw, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { TeamPerformanceGrid } from "@/components/console/TeamPerformanceGrid";
import { TeamPerformanceCharts } from "@/components/console/TeamPerformanceCharts";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
  type TeamPerformancePeriod,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const TEAM_PERIOD_OPTIONS: { key: TeamPerformancePeriod; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

type ViewTab = "table" | "graphs";

export default function AdminTeamPerformancePage() {
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role;
  const canView = role === "admin" || role === "ops_manager";

  const [viewTab, setViewTab] = useState<ViewTab>("table");
  const [teamPeriod, setTeamPeriod] = useState<TeamPerformancePeriod>("month");
  const [dashboardData, setDashboardData] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const payload = await getAdminDashboardOverview({ teamPeriod });
      setDashboardData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load team performance.");
    } finally {
      setLoading(false);
    }
  }, [canView, teamPeriod]);

  useEffect(() => {
    if (adminUser && canView) void loadData();
  }, [adminUser, canView, loadData]);

  const periodLabel =
    dashboardData?.team_performance?.label ||
    TEAM_PERIOD_OPTIONS.find((option) => option.key === teamPeriod)?.label ||
    "Last 30 days";

  const clearFilters = useCallback(() => {
    setTeamPeriod("month");
  }, []);

  const activeFilterCount = teamPeriod !== "month" ? 1 : 0;

  useSetAdminPageChrome(
    canView
      ? {
          title: "Performance",
          subtitle: `All team · accuracy & revenue · ${periodLabel}`,
          icon: Activity,
          activeFilterCount,
          onClearFilters: clearFilters,
          syncKey: `${loading}|${teamPeriod}|${periodLabel}|${viewTab}|${dashboardData ? "loaded" : "empty"}`,
          meta: loading ? "Loading…" : `${dashboardData?.staff_members?.length ?? 0} staff`,
          actions: (
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          ),
          filtersContent: (
            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Period</span>
              <select
                value={teamPeriod}
                onChange={(e) => setTeamPeriod(e.target.value as TeamPerformancePeriod)}
                className={filterFieldClass}
                disabled={loading}
              >
                {TEAM_PERIOD_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ),
        }
      : null,
  );

  if (!adminUser) {
    return null;
  }

  if (!canView) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
        <p className="text-[#102A43] font-heading font-semibold">Access restricted</p>
        <p className="text-sm text-[#627D98]">Team performance is available to admins and operations managers.</p>
        <Link href="/admin" className="inline-flex text-sm font-semibold text-[#009877] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const staffMembers = dashboardData?.staff_members ?? [];
  const revenueNote = dashboardData?.staff_revenue_summary?.attribution_note;

  return (
    <div className="mx-auto max-w-[1500px] space-y-3 font-body">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
          <button
            type="button"
            onClick={() => setViewTab("table")}
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
              viewTab === "table"
                ? "bg-[#1A56DB] text-white shadow-sm"
                : "text-[#486581] hover:bg-[#F5F7FA]"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewTab("graphs")}
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
              viewTab === "graphs"
                ? "bg-[#1A56DB] text-white shadow-sm"
                : "text-[#486581] hover:bg-[#F5F7FA]"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Graphs
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[#486581]">
          <span className="font-semibold">Period</span>
          <select
            value={teamPeriod}
            onChange={(e) => setTeamPeriod(e.target.value as TeamPerformancePeriod)}
            className="rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43]"
            disabled={loading}
          >
            {TEAM_PERIOD_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && !dashboardData ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D9E1EA] border-t-[#009877]" />
        </div>
      ) : viewTab === "table" ? (
        <>
          <TeamPerformanceGrid
            staffMembers={staffMembers}
            periodLabel={periodLabel}
            teamPeriod={teamPeriod}
          />
          {revenueNote ? <p className="text-xs text-[#627D98] px-1">{revenueNote}</p> : null}
        </>
      ) : (
        <>
          <TeamPerformanceCharts staffMembers={staffMembers} periodLabel={periodLabel} />
          {revenueNote ? <p className="text-xs text-[#627D98] px-1">{revenueNote}</p> : null}
        </>
      )}
    </div>
  );
}
