"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { listEasyFlyBookings, type EasyFlyBooking } from "@/lib/easyfly";
import { AlertCircle, Clock, Plane, RotateCcw, FileX, RefreshCw } from "lucide-react";

const ACTION_DASHBOARD_ROLES = new Set([
  "ops_manager",
  "reviewer",
  "case_processor",
  "support_agent",
]);

type TabId = "pending" | "departing" | "returning" | "schedule" | "refunds" | "docs";

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const formatInr = (n: number) => `INR ${n.toLocaleString("en-IN")}`;

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.floor((d.getTime() - today.getTime()) / 86_400_000);
}

function getPendingTier(b: EasyFlyBooking): 0 | 1 | 2 | 3 | 4 {
  if (!b.paymentDueDate) return 4;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${b.paymentDueDate}T00:00:00`);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return 0;
  if (diff === 0) return 1;
  if (diff === 1) return 2;
  return 3;
}

const TIER_LABEL: Record<number, { label: string; chip: string }> = {
  0: { label: "Overdue", chip: "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]" },
  1: { label: "Due Today", chip: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" },
  2: { label: "Due Tomorrow", chip: "bg-[#FEF9C3] text-[#713F12] border-[#FEF08A]" },
  3: { label: "Within 7 Days", chip: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]" },
  4: { label: "No Due Date", chip: "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]" },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={10} className="px-3 py-6 text-center text-xs text-[#627D98]">
        {message}
      </td>
    </tr>
  );
}

export default function EasyFlyActionDashboard() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const [bookings, setBookings] = useState<EasyFlyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("pending");

  useEffect(() => {
    if (!adminUser) return;
    if (!ACTION_DASHBOARD_ROLES.has(adminUser.role)) {
      router.replace("/admin");
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const result = await listEasyFlyBookings();
        if (mounted) setBookings(result.bookings);
      } catch {
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [adminUser, router]);

  const pendingRows = useMemo(
    () => bookings.filter((b) => b.amountDue > 0).sort((a, b) => getPendingTier(a) - getPendingTier(b)),
    [bookings],
  );
  const departingRows = useMemo(
    () =>
      bookings
        .filter((b) => { const d = getDaysUntil(b.depDate); return d >= 0 && d <= 3; })
        .sort((a, b) => getDaysUntil(a.depDate) - getDaysUntil(b.depDate)),
    [bookings],
  );
  const returningRows = useMemo(
    () =>
      bookings
        .filter((b) => { const d = getDaysUntil(b.returnDate); return d >= 0 && d <= 3; })
        .sort((a, b) => getDaysUntil(a.returnDate) - getDaysUntil(b.returnDate)),
    [bookings],
  );
  const scheduleRows = useMemo(() => bookings.filter((b) => b.scheduleChange !== "none"), [bookings]);
  const refundRows = useMemo(() => bookings.filter((b) => b.refundStatus === "pending"), [bookings]);
  const incompleteDocRows = useMemo(
    () => bookings.filter((b) => !b.docs.invoice || !b.docs.atol || !b.docs.passport),
    [bookings],
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number; urgent?: boolean }[] = [
    {
      id: "pending",
      label: "Pending Payments",
      icon: <Clock className="w-3.5 h-3.5" />,
      count: pendingRows.length,
      urgent: pendingRows.some((b) => getPendingTier(b) <= 1),
    },
    {
      id: "departing",
      label: "Departures 72h",
      icon: <Plane className="w-3.5 h-3.5" />,
      count: departingRows.length,
    },
    {
      id: "returning",
      label: "Returns 72h",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      count: returningRows.length,
    },
    {
      id: "schedule",
      label: "Schedule Changes",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      count: scheduleRows.length,
      urgent: scheduleRows.some((b) => b.scheduleChange === "major"),
    },
    {
      id: "refunds",
      label: "Refunds",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      count: refundRows.length,
    },
    {
      id: "docs",
      label: "Incomplete Docs",
      icon: <FileX className="w-3.5 h-3.5" />,
      count: incompleteDocRows.length,
    },
  ];

  if (!adminUser) return null;

  const th = "px-3 py-2 text-left text-xs font-semibold text-[#486581] whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-[#334E68] whitespace-nowrap";

  return (
    <div className="mx-auto max-w-[1200px] space-y-3 font-body">
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#009877]/25 bg-[#009877]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#006F57]">
            <Plane className="h-3 w-3" />
            EasyFly · Action Dashboard
          </div>
          <h1 className="mt-1 text-lg font-heading font-semibold text-[#102A43]">
            Good {getGreeting()}, {adminUser.full_name.split(" ")[0]}
          </h1>
        </div>
      </div>

      {/* KPI tab bar */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const hasItems = t.count > 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={[
                "flex flex-col items-start gap-1 rounded-[12px] border px-3 py-2.5 text-left transition-all",
                isActive
                  ? "border-[#009877]/40 bg-[#009877]/10 shadow-[0_4px_12px_rgba(0,152,119,0.12)]"
                  : "border-[#D9E1EA] bg-white hover:bg-[#F8FCFF]",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between">
                <span className={isActive ? "text-[#009877]" : "text-[#627D98]"}>{t.icon}</span>
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    !hasItems
                      ? "bg-[#F5F7FA] text-[#9AA5B1]"
                      : t.urgent
                        ? "bg-[#FEE2E2] text-[#B42318]"
                        : isActive
                          ? "bg-[#009877]/20 text-[#006F57]"
                          : "bg-[#F5F7FA] text-[#486581]",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              </div>
              <span
                className={[
                  "text-[11px] font-semibold leading-tight",
                  isActive ? "text-[#006F57]" : "text-[#334E68]",
                ].join(" ")}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table panel */}
      <div className="rounded-[14px] border border-[#D9E1EA] bg-white overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-[#627D98]">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            {/* PENDING PAYMENTS */}
            {activeTab === "pending" && (
              <table className="w-full min-w-[560px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Supplier</th>
                    <th className={th}>Amount Due</th>
                    <th className={th}>Due Date</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {pendingRows.length === 0 ? (
                    <EmptyState message="No pending payments. All settled." />
                  ) : (
                    pendingRows.map((b) => {
                      const tier = getPendingTier(b);
                      return (
                        <tr key={b.id} className={tier === 4 ? "bg-[#FFF5F5]" : "hover:bg-[#F8FCFF]"}>
                          <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                          <td className={td}>{b.pnr}</td>
                          <td className={td}>{b.supplier}</td>
                          <td className={`${td} font-semibold text-[#B42318]`}>{formatInr(b.amountDue)}</td>
                          <td className={td}>
                            {b.paymentDueDate ? (
                              formatDate(b.paymentDueDate)
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#B42318] font-medium">
                                <AlertCircle className="w-3 h-3" /> Not set
                              </span>
                            )}
                          </td>
                          <td className={td}>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${TIER_LABEL[tier].chip}`}>
                              {TIER_LABEL[tier].label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* DEPARTURES */}
            {activeTab === "departing" && (
              <table className="w-full min-w-[460px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Airline</th>
                    <th className={th}>Dep Date</th>
                    <th className={th}>Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {departingRows.length === 0 ? (
                    <EmptyState message="No departures in the next 72 hours." />
                  ) : (
                    departingRows.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FCFF]">
                        <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                        <td className={td}>{b.pnr}</td>
                        <td className={td}>{b.airlineCode}</td>
                        <td className={td}>{formatDate(b.depDate)}</td>
                        <td className={td}>
                          <span className={`font-medium ${!b.docs.invoice || !b.docs.atol || !b.docs.passport ? "text-[#B42318]" : "text-[#006F57]"}`}>
                            {!b.docs.invoice || !b.docs.atol || !b.docs.passport ? "Incomplete" : "Complete"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* RETURNS */}
            {activeTab === "returning" && (
              <table className="w-full min-w-[400px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Airline</th>
                    <th className={th}>Return Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {returningRows.length === 0 ? (
                    <EmptyState message="No returns in the next 72 hours." />
                  ) : (
                    returningRows.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FCFF]">
                        <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                        <td className={td}>{b.pnr}</td>
                        <td className={td}>{b.airlineCode}</td>
                        <td className={td}>{formatDate(b.returnDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SCHEDULE CHANGES */}
            {activeTab === "schedule" && (
              <table className="w-full min-w-[480px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Supplier</th>
                    <th className={th}>Dep Date</th>
                    <th className={th}>Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {scheduleRows.length === 0 ? (
                    <EmptyState message="No schedule changes pending." />
                  ) : (
                    scheduleRows.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FCFF]">
                        <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                        <td className={td}>{b.pnr}</td>
                        <td className={td}>{b.supplier}</td>
                        <td className={td}>{formatDate(b.depDate)}</td>
                        <td className={td}>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              b.scheduleChange === "major"
                                ? "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45"
                                : "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40"
                            }`}
                          >
                            {b.scheduleChange === "major" ? "Major" : "Minor"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* REFUNDS */}
            {activeTab === "refunds" && (
              <table className="w-full min-w-[400px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Supplier</th>
                    <th className={th}>Dep Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {refundRows.length === 0 ? (
                    <EmptyState message="No pending refunds." />
                  ) : (
                    refundRows.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FCFF]">
                        <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                        <td className={td}>{b.pnr}</td>
                        <td className={td}>{b.supplier}</td>
                        <td className={td}>{formatDate(b.depDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* INCOMPLETE DOCS */}
            {activeTab === "docs" && (
              <table className="w-full min-w-[420px]">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    <th className={th}>Pax Name</th>
                    <th className={th}>PNR</th>
                    <th className={th}>Dep Date</th>
                    <th className={th}>Missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F8]">
                  {incompleteDocRows.length === 0 ? (
                    <EmptyState message="All bookings have complete documents." />
                  ) : (
                    incompleteDocRows.map((b) => {
                      const missing = [
                        !b.docs.invoice && "Invoice",
                        !b.docs.atol && "ATOL",
                        !b.docs.passport && "Passport",
                      ]
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <tr key={b.id} className="hover:bg-[#F8FCFF]">
                          <td className={`${td} font-medium text-[#102A43]`}>{b.paxName}</td>
                          <td className={td}>{b.pnr}</td>
                          <td className={td}>{formatDate(b.depDate)}</td>
                          <td className={`${td} text-[#B42318] font-medium`}>{missing}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
