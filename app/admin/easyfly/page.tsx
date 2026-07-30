"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteEasyFlyBooking,
  easyflyPaymentMethodBadgeClass,
  EASYFLY_PAYMENT_MODE_OPTIONS,
  listEasyFlyBookings,
  type EasyFlyBooking,
  type EasyFlyPermissions,
  type PaymentMode,
} from "@/lib/easyfly";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  BadgeCheck,
  Eye,
  FileText,
  IdCard,
  Pencil,
  Plane,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

type RefundStatus = "none" | "pending" | "credit_note";
type ScheduleChange = "none" | "minor" | "major";

const formatInr = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function statusTone(status: RefundStatus) {
  if (status === "none") return "success";
  if (status === "pending") return "warning";
  return "purple";
}

function scheduleTone(status: ScheduleChange) {
  if (status === "none") return "neutral";
  if (status === "minor") return "warning";
  return "danger";
}

function paymentModeLabel(mode: PaymentMode | string): string {
  const match = EASYFLY_PAYMENT_MODE_OPTIONS.find((option) => option.value === mode);
  if (match) return match.label;
  return String(mode || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function BookingTag({ label, tone }: { label: string; tone: "neutral" | "success" | "warning" | "danger" | "purple" }) {
  const toneClass = {
    neutral: "bg-[#F5F7FA] text-[#486581] border-[#D9E1EA]",
    success: "bg-[#009877]/12 text-[#006F57] border-[#009877]/35",
    warning: "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40",
    danger: "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45",
    purple: "bg-[#EDE4FF] text-[#5F3DC4] border-[#B197FC]/40",
  }[tone];

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}

function DocumentStatus({ icon, label, uploaded }: { icon: React.ReactNode; label: string; uploaded: boolean }) {
  return (
    <span
      title={`${label} ${uploaded ? "uploaded" : "missing"}`}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-[8px] border ${
        uploaded ? "border-[#009877]/30 bg-[#009877]/10 text-[#009877]" : "border-[#D9E1EA] bg-[#F5F7FA] text-[#9AA5B1]"
      }`}
    >
      <span className="relative inline-flex items-center justify-center">
        {icon}
        {uploaded ? <CheckCircle2 className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-full bg-white text-[#009877]" /> : null}
      </span>
    </span>
  );
}

function ActionButton({
  href,
  label,
  icon,
  variant = "neutral",
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  variant?: "neutral" | "primary" | "danger";
  onClick?: () => void;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs font-semibold transition-colors";
  const variantClass =
    variant === "primary"
      ? "border-[#009877]/35 bg-[#009877]/12 text-[#006F57] hover:bg-[#009877]/18"
      : variant === "danger"
        ? "border-[#F1A7A0]/45 bg-[#FDECEC] text-[#B42318] hover:bg-[#FAD4D0]"
        : "border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA]";

  if (href) {
    return (
      <Link href={href} className={`${base} ${variantClass}`}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${variantClass}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type KpiFilter =
  | "all"
  | "bookings"
  | "supplier_paid"
  | "client_received"
  | "client_pending"
  | "cash"
  | "online"
  | "earnings";

type PaymentChannelFilter = "all" | "cash" | "online";

function StatCard({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`rounded-[16px] border bg-white p-4 text-left shadow-[0_8px_22px_rgba(16,42,67,0.04)] transition-colors ${
        active
          ? "border-[#009877] ring-1 ring-[#009877]/30 bg-[#009877]/5"
          : "border-[#D9E1EA]"
      } ${interactive ? "cursor-pointer hover:border-[#33A1FD]/50" : "cursor-default"}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[#627D98]">{label}</p>
      <p className={`mt-2 text-[22px] font-heading font-semibold ${accent || "text-[#102A43]"}`}>{value}</p>
    </button>
  );
}

const getPaymentPending = (booking: EasyFlyBooking) =>
  Math.max(0, booking.amountDue || (booking.payAgreed || 0) - booking.amountReceived);

const getEarnings = (booking: EasyFlyBooking) =>
  Math.max(0, booking.amountReceived - booking.amountPaid);

const isCashPayment = (mode: PaymentMode | string | null | undefined) =>
  String(mode || "").toLowerCase() === "cash";

const isOnlinePayment = (mode: PaymentMode | string | null | undefined) => {
  const key = String(mode || "").toLowerCase();
  return key === "card" || key === "bank_transfer";
};

const bookingDateValue = (createdAt: string) => (createdAt || "").slice(0, 10);

const matchesKpiFilter = (booking: EasyFlyBooking, kpiFilter: KpiFilter) => {
  switch (kpiFilter) {
    case "all":
    case "bookings":
      return true;
    case "supplier_paid":
      return booking.amountPaid > 0;
    case "client_received":
      return booking.amountReceived > 0;
    case "client_pending":
      return getPaymentPending(booking) > 0;
    case "cash":
      return isCashPayment(booking.paymentMode);
    case "online":
      return isOnlinePayment(booking.paymentMode);
    case "earnings":
      return getEarnings(booking) > 0;
    default:
      return true;
  }
};

export default function EasyFlyBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<EasyFlyBooking[]>([]);
  const [permissions, setPermissions] = useState<EasyFlyPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [depFrom, setDepFrom] = useState("");
  const [depTo, setDepTo] = useState("");
  const [bookedFrom, setBookedFrom] = useState("");
  const [bookedTo, setBookedTo] = useState("");
  const [paymentChannelFilter, setPaymentChannelFilter] = useState<PaymentChannelFilter>("all");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>(() =>
    searchParams.get("defaultTab") === "pending" ? "client_pending" : "all",
  );

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listEasyFlyBookings();
        if (!isMounted) return;
        setBookings(result.bookings);
        setPermissions(result.permissions);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load EasyFly bookings.");
        setBookings([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadBookings();
    return () => {
      isMounted = false;
    };
  }, []);

  const canDelete = permissions?.can_delete_booking ?? false;
  const canEdit = permissions?.can_edit_booking ?? false;
  const showFinancials = permissions?.can_view_revenue ?? false;
  const isStaffDashboard = Boolean(permissions?.is_staff && !permissions?.can_view_all_bookings);
  const baseRows = bookings;

  const supplierOptions = useMemo(() => Array.from(new Set(baseRows.map((booking) => booking.supplier))).filter(Boolean), [baseRows]);
  const airlineOptions = useMemo(() => Array.from(new Set(baseRows.map((booking) => booking.airlineCode))).filter(Boolean), [baseRows]);

  const chromeFilteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseRows.filter((booking) => {
      const matchesSearch =
        !q ||
        booking.paxName.toLowerCase().includes(q) ||
        booking.pnr.toLowerCase().includes(q) ||
        booking.invoiceNumber.toLowerCase().includes(q) ||
        booking.srNo.toLowerCase().includes(q);

      const matchesSupplier = supplierFilter === "all" || booking.supplier === supplierFilter;
      const matchesAirline = airlineFilter === "all" || booking.airlineCode === airlineFilter;
      const matchesFrom = !depFrom || booking.depDate >= depFrom;
      const matchesTo = !depTo || booking.depDate <= depTo;
      const bookedOn = bookingDateValue(booking.createdAt);
      const matchesBookedFrom = !bookedFrom || bookedOn >= bookedFrom;
      const matchesBookedTo = !bookedTo || bookedOn <= bookedTo;
      const matchesPaymentChannel =
        paymentChannelFilter === "all" ||
        (paymentChannelFilter === "cash" && isCashPayment(booking.paymentMode)) ||
        (paymentChannelFilter === "online" && isOnlinePayment(booking.paymentMode));

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesAirline &&
        matchesFrom &&
        matchesTo &&
        matchesBookedFrom &&
        matchesBookedTo &&
        matchesPaymentChannel
      );
    });
  }, [
    airlineFilter,
    baseRows,
    bookedFrom,
    bookedTo,
    depFrom,
    depTo,
    paymentChannelFilter,
    search,
    supplierFilter,
  ]);

  const filteredRows = useMemo(() => {
    const rows = chromeFilteredRows.filter((booking) => matchesKpiFilter(booking, kpiFilter));

    const preferPending = searchParams.get("defaultTab") === "pending" || kpiFilter === "client_pending";
    if (!preferPending) return rows;

    return [...rows].sort((a, b) => {
      const pendingA = getPaymentPending(a);
      const pendingB = getPaymentPending(b);
      const aHasPending = pendingA > 0;
      const bHasPending = pendingB > 0;
      if (aHasPending && !bHasPending) return -1;
      if (!aHasPending && bHasPending) return 1;
      if (aHasPending && bHasPending) return pendingB - pendingA;
      return 0;
    });
  }, [chromeFilteredRows, kpiFilter, searchParams]);

  const stats = useMemo(() => {
    const totalBookings = chromeFilteredRows.length;
    const amountPaid = chromeFilteredRows.reduce((sum, booking) => sum + booking.amountPaid, 0);
    const amountReceived = chromeFilteredRows.reduce((sum, booking) => sum + booking.amountReceived, 0);
    const pendingPayments = chromeFilteredRows.reduce((sum, booking) => sum + getPaymentPending(booking), 0);
    const totalCash = chromeFilteredRows.reduce(
      (sum, booking) => sum + (isCashPayment(booking.paymentMode) ? booking.amountReceived : 0),
      0,
    );
    const totalOnline = chromeFilteredRows.reduce(
      (sum, booking) => sum + (isOnlinePayment(booking.paymentMode) ? booking.amountReceived : 0),
      0,
    );
    const cashCount = chromeFilteredRows.filter((booking) => isCashPayment(booking.paymentMode)).length;
    const onlineCount = chromeFilteredRows.filter((booking) => isOnlinePayment(booking.paymentMode)).length;
    const earnings = chromeFilteredRows.reduce((sum, booking) => sum + getEarnings(booking), 0);
    return {
      totalBookings,
      amountPaid,
      amountReceived,
      pendingPayments,
      totalCash,
      totalOnline,
      cashCount,
      onlineCount,
      earnings,
    };
  }, [chromeFilteredRows]);

  const toggleKpiFilter = (key: KpiFilter) => {
    setKpiFilter((current) => (current === key ? "all" : key));
  };

  const handleDeleteBooking = async (bookingId: number, srNo: string) => {
    const confirmed = window.confirm(`Delete booking ${srNo}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(bookingId);
    try {
      await deleteEasyFlyBooking(bookingId);
      setBookings((current) => current.filter((booking) => booking.id !== bookingId));
      toast.success("Booking deleted successfully.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete booking.");
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = useCallback(() => {
    setSupplierFilter("all");
    setAirlineFilter("all");
    setDepFrom("");
    setDepTo("");
    setBookedFrom("");
    setBookedTo("");
    setPaymentChannelFilter("all");
  }, []);

  const activeFilterCount =
    (supplierFilter !== "all" ? 1 : 0) +
    (airlineFilter !== "all" ? 1 : 0) +
    (depFrom ? 1 : 0) +
    (depTo ? 1 : 0) +
    (bookedFrom ? 1 : 0) +
    (bookedTo ? 1 : 0) +
    (paymentChannelFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome({
    title: isStaffDashboard ? "My EasyFly Dashboard" : "EasyFly Bookings",
    icon: Plane,
    search: {
      value: search,
      onChange: setSearch,
      placeholder: "Search pax, PNR, SR No., invoice",
    },
    activeFilterCount,
    onClearFilters: clearFilters,
    syncKey: `${search}|${supplierFilter}|${airlineFilter}|${depFrom}|${depTo}|${bookedFrom}|${bookedTo}|${paymentChannelFilter}|${kpiFilter}|${loading}|${permissions?.can_create_booking ? 1 : 0}|${isStaffDashboard ? 1 : 0}`,
    actions: permissions?.can_create_booking ? (
      <button
        type="button"
        onClick={() => router.push("/admin/easyfly/new")}
        className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Booking
      </button>
    ) : undefined,
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Payment</span>
          <select
            value={paymentChannelFilter}
            onChange={(e) => setPaymentChannelFilter(e.target.value as PaymentChannelFilter)}
            className={filterFieldClass}
          >
            <option value="all">All (Cash + Online)</option>
            <option value="cash">Cash only</option>
            <option value="online">Online only (Card / Bank)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Supplier</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className={filterFieldClass}
          >
            <option value="all">All Suppliers</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Airline</span>
          <select
            value={airlineFilter}
            onChange={(e) => setAirlineFilter(e.target.value)}
            className={filterFieldClass}
          >
            <option value="all">All Airlines</option>
            {airlineOptions.map((airline) => (
              <option key={airline} value={airline}>
                {airline}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Dep from</span>
          <input
            type="date"
            value={depFrom}
            onChange={(e) => setDepFrom(e.target.value)}
            className={filterFieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Dep to</span>
          <input
            type="date"
            value={depTo}
            onChange={(e) => setDepTo(e.target.value)}
            className={filterFieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Booked from</span>
          <input
            type="date"
            value={bookedFrom}
            onChange={(e) => setBookedFrom(e.target.value)}
            className={filterFieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Booked to</span>
          <input
            type="date"
            value={bookedTo}
            onChange={(e) => setBookedTo(e.target.value)}
            className={filterFieldClass}
          />
        </label>
      </>
    ),
  });

  return (
    <div className="mx-auto max-w-[1560px] space-y-5 font-body">
      <section
        className={`grid gap-3 ${showFinancials ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" : "grid-cols-1 sm:grid-cols-2"}`}
      >
        <StatCard
          label="Total Bookings"
          value={String(stats.totalBookings)}
          active={kpiFilter === "bookings" || kpiFilter === "all"}
          onClick={() => toggleKpiFilter("bookings")}
        />
        {showFinancials ? (
          <>
            <StatCard
              label="Supplier Fees"
              value={formatInr(stats.amountPaid)}
              active={kpiFilter === "supplier_paid"}
              onClick={() => toggleKpiFilter("supplier_paid")}
            />
            <StatCard
              label="Paid"
              value={formatInr(stats.amountReceived)}
              active={kpiFilter === "client_received"}
              onClick={() => toggleKpiFilter("client_received")}
            />
            <StatCard
              label="Pending"
              value={formatInr(stats.pendingPayments)}
              accent="text-[#8D5E12]"
              active={kpiFilter === "client_pending"}
              onClick={() => toggleKpiFilter("client_pending")}
            />
            <StatCard
              label="Total Cash"
              value={formatInr(stats.totalCash)}
              accent="text-[#047857]"
              active={kpiFilter === "cash"}
              onClick={() => toggleKpiFilter("cash")}
            />
            <StatCard
              label="Online"
              value={formatInr(stats.totalOnline)}
              accent="text-[#1D4ED8]"
              active={kpiFilter === "online"}
              onClick={() => toggleKpiFilter("online")}
            />
            <StatCard
              label="Earnings"
              value={formatInr(stats.earnings)}
              accent="text-[#006F57]"
              active={kpiFilter === "earnings"}
              onClick={() => toggleKpiFilter("earnings")}
            />
          </>
        ) : null}
      </section>

      {kpiFilter !== "all" && kpiFilter !== "bookings" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#D9E1EA] bg-[#F8FAFC] px-4 py-2.5 text-xs text-[#486581]">
          <p>
            Showing <span className="font-semibold text-[#102A43]">{filteredRows.length}</span> of{" "}
            {chromeFilteredRows.length} bookings · click the same KPI again to clear
          </p>
          <button
            type="button"
            onClick={() => setKpiFilter("all")}
            className="font-semibold text-[#009877] hover:underline"
          >
            Clear KPI filter
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[14px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98] shadow-sm">
          Loading EasyFly bookings...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[14px] border border-[#F1A7A0]/45 bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">{error}</div>
      ) : null}

      <section className="rounded-[20px] border border-[#D9E1EA] bg-white shadow-[0_10px_24px_rgba(16,42,67,0.05)]">
        {/* Mobile cards */}
        <div className="space-y-3 p-4 lg:hidden">
          {filteredRows.map((booking) => {
            const paymentPending = getPaymentPending(booking);
            const earnings = getEarnings(booking);

            return (
              <article key={booking.id} className="rounded-[16px] border border-[#D9E1EA] bg-white p-4 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#102A43]">{booking.paxName}</h3>
                      <span className="rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-2 py-0.5 text-[11px] font-semibold text-[#486581]">{booking.pnr}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#627D98]">{booking.supplier} • {booking.airlineCode} • SR {booking.srNo}</p>
                  </div>
                  <BookingTag label={booking.refundStatus === "none" ? "No refund" : booking.refundStatus === "pending" ? "Refund pending" : "Credit note"} tone={statusTone(booking.refundStatus)} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Dep Date</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatDate(booking.depDate)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Booked</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatDate(booking.createdAt)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Supplier Fees</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatInr(booking.amountPaid)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Paid</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatInr(booking.amountReceived)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Pending</p>
                    <p className="mt-1 font-medium text-[#8D5E12]">{formatInr(paymentPending)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Pay Agreed</p>
                    <p className="mt-1 font-medium text-[#1E40AF]">{formatInr(booking.payAgreed || 0)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3 col-span-2">
                    <p className="text-xs text-[#627D98]">Earnings</p>
                    <p className="mt-1 font-medium text-[#006F57]">{formatInr(earnings)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={easyflyPaymentMethodBadgeClass(booking.paymentMode)}>
                    {paymentModeLabel(booking.paymentMode)}
                  </span>
                  <BookingTag label={booking.scheduleChange === "none" ? "No schedule change" : booking.scheduleChange === "minor" ? "Minor change" : "Major change"} tone={scheduleTone(booking.scheduleChange)} />
                  <div className="flex items-center gap-1.5">
                    <DocumentStatus icon={<FileText className="h-3.5 w-3.5" />} label="Invoice" uploaded={booking.docs.invoice} />
                    <DocumentStatus icon={<BadgeCheck className="h-3.5 w-3.5" />} label="ATOL" uploaded={booking.docs.atol} />
                    <DocumentStatus icon={<IdCard className="h-3.5 w-3.5" />} label="Passport" uploaded={booking.docs.passport} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton href={`/admin/easyfly/${booking.id}`} label="View" icon={<Eye className="h-4 w-4" />} />
                  {canEdit ? (
                    <ActionButton href={`/admin/easyfly/${booking.id}`} label="Edit" icon={<Pencil className="h-4 w-4" />} variant="primary" />
                  ) : null}
                  {canDelete ? (
                    <ActionButton
                      label={deletingId === booking.id ? "Deleting" : "Delete"}
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                      onClick={() => void handleDeleteBooking(booking.id, booking.srNo)}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}

          {!loading && filteredRows.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#B8C7D9] bg-[#FBFCFE] px-4 py-8 text-center text-sm text-[#7B8794]">
              No bookings match the selected filters.
            </div>
          ) : null}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[1360px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Booking</th>
                <th className="px-4 py-3 text-left font-semibold">Dates</th>
                <th className="px-4 py-3 text-left font-semibold">Amounts</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Docs</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {filteredRows.map((booking) => {
                const paymentPending = getPaymentPending(booking);
                const earnings = getEarnings(booking);

                return (
                  <tr key={booking.id} className="align-top transition-colors hover:bg-[#F8FCFF]">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#102A43]">{booking.paxName}</p>
                          <span className="rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-2 py-0.5 text-[11px] font-semibold text-[#486581]">{booking.pnr}</span>
                        </div>
                        <p className="text-xs text-[#627D98]">{booking.supplier} • {booking.airlineCode} • SR {booking.srNo} • Inv {booking.invoiceNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-[#102A43]">{formatDate(booking.depDate)} → {formatDate(booking.returnDate)}</p>
                        <p className="text-xs text-[#627D98]">Booked {formatDate(booking.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs">
                        <p>Pay agreed: <span className="font-semibold text-[#102A43]">{formatInr(booking.payAgreed || 0)}</span></p>
                        <p>Paid: <span className="font-semibold text-[#102A43]">{formatInr(booking.amountReceived)}</span></p>
                        <p>Pending: <span className="font-semibold text-[#8D5E12]">{formatInr(paymentPending)}</span></p>
                        <p>Supplier fees: <span className="font-semibold text-[#1E40AF]">{formatInr(booking.amountPaid)}</span></p>
                        <p>Earnings: <span className="font-semibold text-[#006F57]">{formatInr(earnings)}</span></p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={easyflyPaymentMethodBadgeClass(booking.paymentMode)}>
                        {paymentModeLabel(booking.paymentMode)}
                      </span>
                    </td>
                    <td className="px-4 py-4 space-y-2">
                      <BookingTag label={booking.refundStatus === "none" ? "No refund" : booking.refundStatus === "pending" ? "Refund pending" : "Credit note"} tone={statusTone(booking.refundStatus)} />
                      <div />
                      <BookingTag label={booking.scheduleChange === "none" ? "No schedule change" : booking.scheduleChange === "minor" ? "Minor change" : "Major change"} tone={scheduleTone(booking.scheduleChange)} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <DocumentStatus icon={<FileText className="h-3.5 w-3.5" />} label="Invoice" uploaded={booking.docs.invoice} />
                        <DocumentStatus icon={<BadgeCheck className="h-3.5 w-3.5" />} label="ATOL" uploaded={booking.docs.atol} />
                        <DocumentStatus icon={<IdCard className="h-3.5 w-3.5" />} label="Passport" uploaded={booking.docs.passport} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton href={`/admin/easyfly/${booking.id}`} label="View" icon={<Eye className="h-4 w-4" />} />
                        {canEdit ? (
                          <ActionButton href={`/admin/easyfly/${booking.id}`} label="Edit" icon={<Pencil className="h-4 w-4" />} variant="primary" />
                        ) : null}
                        {canDelete ? (
                          <ActionButton
                            label={deletingId === booking.id ? "Deleting" : "Delete"}
                            icon={<Trash2 className="h-4 w-4" />}
                            variant="danger"
                            onClick={() => void handleDeleteBooking(booking.id, booking.srNo)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#7B8794]">
                    No bookings match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
