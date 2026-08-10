"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, IndianRupee, Target, Users, X } from "lucide-react";
import type { AdminDashboardOverview } from "@/lib/admin-auth";

type StaffMember = AdminDashboardOverview["staff_members"][number];

type TeamPerformanceChartsProps = {
  staffMembers: StaffMember[];
  periodLabel: string;
};

const COLORS = {
  teal: "#009877",
  tealDeep: "#006F57",
  blue: "#0B69B7",
  sky: "#33A1FD",
  amber: "#9C4F17",
  red: "#B42318",
  slate: "#627D98",
  ink: "#102A43",
};

function formatInr(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatAccuracy(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function shortName(name: string) {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "—";
  return `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ""}`;
}

function ChartCard({
  title,
  subtitle,
  children,
  empty,
  accent = COLORS.teal,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
  accent?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[16px] border border-[#D9E1EA] bg-white shadow-[0_1px_0_rgba(16,42,67,0.04)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 85%)` }}
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-heading font-semibold text-[#102A43]">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-[#627D98]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
        {empty ? (
          <p className="mt-10 text-center text-sm text-[#627D98]">No data for this period.</p>
        ) : (
          <div className="mt-3 h-[300px]">{children}</div>
        )}
      </div>
    </motion.div>
  );
}

function RichTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const fullName = String(payload[0]?.payload?.fullName || label || "");
  return (
    <div className="min-w-[180px] rounded-[12px] border border-[#D9E1EA] bg-white/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-semibold text-[#102A43]">{fullName}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const name = String(entry.name || entry.dataKey || "");
          const raw = Number(entry.value || 0);
          return (
            <div key={name} className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#486581]">
                <span className="h-2 w-2 rounded-full" style={{ background: entry.color || COLORS.teal }} />
                {name}
              </span>
              <span className="font-semibold text-[#102A43]">
                {valueFormatter ? valueFormatter(raw, name) : String(entry.value ?? "—")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name: string; value: number; pct?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const value = Number(row?.value || 0);
  const pct = Number(row?.payload?.pct || 0);
  return (
    <div className="rounded-[12px] border border-[#D9E1EA] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-semibold text-[#102A43]">{row?.name}</p>
      <p className="mt-1 text-sm font-heading font-semibold text-[#009877]">
        {value.toLocaleString("en-IN")}
        <span className="ml-1 text-xs font-normal text-[#627D98]">({pct.toFixed(1)}%)</span>
      </p>
    </div>
  );
}

export function TeamPerformanceCharts({ staffMembers, periodLabel }: TeamPerformanceChartsProps) {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [kpiFilter, setKpiFilter] = useState<"all" | "completion" | "accuracy" | "revenue">("all");
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const staff = useMemo(
    () => staffMembers.filter((s) => String(s.role || "").toLowerCase() !== "admin"),
    [staffMembers],
  );

  const scopedStaff = useMemo(() => {
    if (kpiFilter === "all") return staff;
    if (kpiFilter === "completion") {
      return staff
        .filter((s) => s.assigned > 0)
        .sort((a, b) => {
          const aRate = a.assigned > 0 ? a.completed / a.assigned : 0;
          const bRate = b.assigned > 0 ? b.completed / b.assigned : 0;
          return bRate - aRate || b.completed - a.completed;
        });
    }
    if (kpiFilter === "accuracy") {
      return staff
        .filter((s) => s.assigned > 0)
        .sort((a, b) => Number(b.accuracy || 0) - Number(a.accuracy || 0));
    }
    return staff
      .filter((s) => Number(s.revenue_30d ?? 0) > 0)
      .sort((a, b) => Number(b.revenue_30d ?? 0) - Number(a.revenue_30d ?? 0));
  }, [kpiFilter, staff]);

  const totals = useMemo(() => {
    const assigned = staff.reduce((sum, s) => sum + s.assigned, 0);
    const completed = staff.reduce((sum, s) => sum + s.completed, 0);
    const pending = staff.reduce((sum, s) => sum + s.pending, 0);
    const revenue = staff.reduce((sum, s) => sum + Number(s.revenue_30d ?? 0), 0);
    const accuracy = assigned > 0 ? Math.round((completed / assigned) * 1000) / 10 : 0;
    return { assigned, completed, pending, revenue, accuracy, staffCount: staff.length };
  }, [staff]);

  const dimOpacity = (fullName: string) => {
    if (!selectedStaff) return 1;
    return selectedStaff === fullName ? 1 : 0.28;
  };

  const workloadData = useMemo(
    () =>
      scopedStaff.map((s) => ({
        name: shortName(s.name),
        fullName: s.name,
        Completed: s.completed,
        Pending: s.pending,
      })),
    [scopedStaff],
  );

  const accuracyData = useMemo(
    () =>
      [...scopedStaff]
        .map((s) => ({
          name: shortName(s.name),
          fullName: s.name,
          Accuracy: Number(s.accuracy || 0),
          fill:
            Number(s.accuracy || 0) >= 90
              ? COLORS.teal
              : Number(s.accuracy || 0) >= 70
                ? COLORS.amber
                : COLORS.red,
        }))
        .sort((a, b) => b.Accuracy - a.Accuracy),
    [scopedStaff],
  );

  const revenueData = useMemo(
    () =>
      [...scopedStaff]
        .map((s) => ({
          name: shortName(s.name),
          fullName: s.name,
          Period: Number(s.revenue_30d ?? 0),
        }))
        .sort((a, b) => b.Period - a.Period),
    [scopedStaff],
  );

  const scopedTotals = useMemo(() => {
    const assigned = scopedStaff.reduce((sum, s) => sum + s.assigned, 0);
    const completed = scopedStaff.reduce((sum, s) => sum + s.completed, 0);
    const pending = scopedStaff.reduce((sum, s) => sum + s.pending, 0);
    return { assigned, completed, pending };
  }, [scopedStaff]);

  const workloadPie = useMemo(() => {
    const completed = scopedTotals.completed;
    const pending = scopedTotals.pending;
    const total = completed + pending || 1;
    return [
      { name: "Completed", value: completed, pct: (completed / total) * 100, fill: COLORS.teal },
      { name: "Pending", value: pending, pct: (pending / total) * 100, fill: COLORS.amber },
    ].filter((row) => row.value > 0);
  }, [scopedTotals]);

  const hasStaff = scopedStaff.length > 0;

  const toggleStaff = (fullName: string) => {
    if (!fullName) return;
    setSelectedStaff((current) => (current === fullName ? null : fullName));
  };

  const toggleKpi = (key: "all" | "completion" | "accuracy" | "revenue") => {
    setKpiFilter((current) => (current === key ? "all" : key));
    setSelectedStaff(null);
  };

  const filterLabel =
    kpiFilter === "completion"
      ? "Staff with assigned work"
      : kpiFilter === "accuracy"
        ? "Staff with accuracy scores"
        : kpiFilter === "revenue"
          ? "Staff with revenue"
          : "All staff";

  const summaryCards = [
    {
      key: "all" as const,
      label: "Team size",
      value: String(totals.staffCount),
      icon: Users,
      tone: "text-[#0B69B7]",
      bg: "from-[#E8F3FF] to-white",
      hint: "Show all staff",
    },
    {
      key: "completion" as const,
      label: "Completion rate",
      value: formatAccuracy(totals.accuracy),
      icon: Target,
      tone: "text-[#009877]",
      bg: "from-[#E8F8F3] to-white",
      hint: "Filter assigned staff",
    },
    {
      key: "accuracy" as const,
      label: "Accuracy",
      value: formatAccuracy(totals.accuracy),
      icon: Activity,
      tone: "text-[#9C4F17]",
      bg: "from-[#FFF6EB] to-white",
      hint: "completed ÷ assigned",
    },
    {
      key: "revenue" as const,
      label: "Period revenue",
      value: formatInr(totals.revenue),
      icon: IndianRupee,
      tone: "text-[#006F57]",
      bg: "from-[#ECFDF5] to-white",
      hint: "Filter staff with revenue",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[16px] border border-[#D9E1EA] bg-gradient-to-br from-[#F7FBFA] via-white to-[#EEF6FF] px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-[#009877]/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-heading font-semibold text-[#102A43]">Team performance graphs</h2>
            <p className="mt-0.5 text-xs text-[#627D98]">
              Accuracy = completed ÷ assigned · {periodLabel}
            </p>
          </div>
          <AnimatePresence>
            {selectedStaff || kpiFilter !== "all" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-wrap items-center gap-2"
              >
                {kpiFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => toggleKpi("all")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0B69B7]/30 bg-[#E8F3FF] px-3 py-1.5 text-xs font-semibold text-[#0B69B7]"
                  >
                    KPI: {filterLabel}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {selectedStaff ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#009877]/35 bg-[#009877]/10 px-3 py-1.5 text-xs font-semibold text-[#006F57]"
                  >
                    Spotlight: {selectedStaff}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const active = kpiFilter === card.key || (card.key === "all" && kpiFilter === "all");
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => toggleKpi(card.key)}
                aria-pressed={active}
                className={`rounded-[12px] border bg-gradient-to-br ${card.bg} p-3 text-left shadow-sm transition ${
                  active
                    ? "border-[#009877] ring-1 ring-[#009877]/30"
                    : "border-white/80 hover:border-[#009877]/40"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#627D98]">{card.label}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-heading font-semibold text-[#102A43]">
                  <card.icon className={`h-4 w-4 ${card.tone}`} />
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-[#829AB1]">
                  {active && card.key !== "all" ? "Filtering charts" : card.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Workload by staff"
          subtitle="Completed vs pending (assigned = both)"
          accent={COLORS.blue}
          empty={!hasStaff}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barCategoryGap="18%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
              <Tooltip cursor={{ fill: "rgba(0,152,119,0.06)" }} content={<RichTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Bar
                dataKey="Completed"
                stackId="load"
                fill={COLORS.teal}
                radius={[0, 0, 0, 0]}
                maxBarSize={36}
                cursor="pointer"
                onClick={(data) => toggleStaff(String((data as { fullName?: string })?.fullName || ""))}
              >
                {workloadData.map((row) => (
                  <Cell key={`c-${row.fullName}`} fillOpacity={dimOpacity(row.fullName)} />
                ))}
              </Bar>
              <Bar
                dataKey="Pending"
                stackId="load"
                fill={COLORS.amber}
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
                cursor="pointer"
                onClick={(data) => toggleStaff(String((data as { fullName?: string })?.fullName || ""))}
              >
                {workloadData.map((row) => (
                  <Cell key={`p-${row.fullName}`} fillOpacity={dimOpacity(row.fullName)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Accuracy by staff"
          subtitle="completed ÷ assigned · green ≥90% · amber ≥70%"
          accent={COLORS.teal}
          empty={!hasStaff}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accuracyData} layout="vertical" margin={{ top: 8, right: 20, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF4" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis
                type="category"
                dataKey="name"
                width={76}
                tick={{ fill: "#486581", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,152,119,0.06)" }}
                content={<RichTooltip valueFormatter={(v) => formatAccuracy(v)} />}
              />
              <Bar
                dataKey="Accuracy"
                radius={[0, 8, 8, 0]}
                maxBarSize={22}
                cursor="pointer"
                onClick={(data) => toggleStaff(String((data as { fullName?: string })?.fullName || ""))}
              >
                {accuracyData.map((row) => (
                  <Cell key={row.fullName} fill={row.fill} fillOpacity={dimOpacity(row.fullName)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by staff" subtitle={periodLabel} accent={COLORS.teal} empty={!hasStaff}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                cursor={{ fill: "rgba(0,152,119,0.06)" }}
                content={<RichTooltip valueFormatter={(v) => formatInr(v)} />}
              />
              <Bar
                dataKey="Period"
                name="Revenue"
                fill={COLORS.teal}
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
                cursor="pointer"
                onClick={(data) => toggleStaff(String((data as { fullName?: string })?.fullName || ""))}
              >
                {revenueData.map((row) => (
                  <Cell key={`pr-${row.fullName}`} fillOpacity={dimOpacity(row.fullName)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team workload mix" subtitle="Completed vs pending" accent={COLORS.blue} empty={workloadPie.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={workloadPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={3}
                activeIndex={activePieIndex ?? undefined}
                onMouseEnter={(_, index) => setActivePieIndex(index)}
                onMouseLeave={() => setActivePieIndex(null)}
              >
                {workloadPie.map((row) => (
                  <Cell key={row.name} fill={row.fill} stroke="#fff" strokeWidth={2} style={{ cursor: "pointer" }} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
              <text x="50%" y="46%" textAnchor="middle" className="fill-[#102A43] text-lg font-semibold">
                {scopedTotals.assigned}
              </text>
              <text x="50%" y="58%" textAnchor="middle" className="fill-[#627D98] text-[11px]">
                assigned
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
