"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { TeamPerformanceGrid } from "@/components/console/TeamPerformanceGrid";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
  type TeamPerformancePeriod,
} from "@/lib/admin-auth";

export default function AdminTeamPerformancePage() {
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role;
  const canView = role === "admin" || role === "ops_manager";

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
  const periodLabel = dashboardData?.team_performance?.label ?? "Last 30 days";
  const revenueNote = dashboardData?.staff_revenue_summary?.attribution_note;

  return (
    <div className="space-y-5 font-body">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#009877]/10 p-2.5">
            <Activity className="w-5 h-5 text-[#009877]" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-semibold text-[#102A43]">Team Performance</h1>
            <p className="text-sm text-[#627D98] mt-0.5">
              Accuracy, revenue, cases generated, assigned, completed, and pending — by staff and period.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm font-semibold text-[#486581] hover:bg-[#F8FAFC]"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#009877] px-3 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !dashboardData ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D9E1EA] border-t-[#009877]" />
        </div>
      ) : (
        <>
          <TeamPerformanceGrid
            staffMembers={staffMembers}
            periodLabel={periodLabel}
            teamPeriod={teamPeriod}
            onPeriodChange={setTeamPeriod}
            loading={loading}
          />
          {revenueNote ? (
            <p className="text-xs text-[#627D98] px-1">{revenueNote}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
