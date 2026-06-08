"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { deleteEasyFlyBooking, listEasyFlyBookings, type EasyFlyBooking } from "@/lib/easyfly";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  IdCard,
  Landmark,
  Pencil,
  Plane,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
} from "lucide-react";

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

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[16px] border border-[#D9E1EA] bg-white p-4 shadow-[0_8px_22px_rgba(16,42,67,0.04)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[#627D98]">{label}</p>
      <p className={`mt-2 text-[22px] font-heading font-semibold ${accent || "text-[#102A43]"}`}>{value}</p>
    </div>
  );
}

const getPaymentPending = (booking: EasyFlyBooking) => Math.max(0, booking.amountPaid - booking.amountReceived);

export default function EasyFlyBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { adminUser } = useAdminAuth();
  const [bookings, setBookings] = useState<EasyFlyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [depFrom, setDepFrom] = useState("");
  const [depTo, setDepTo] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEasyFlyBookings();
        if (!isMounted) return;
        setBookings(data);
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
  }, [adminUser?.role]);

  const isAdmin = adminUser?.role === "admin";
  const accessScope = adminUser?.access_scope ?? "all";
  const isEasyFlyOnlyScope = accessScope === "easyfly_only";
  const showFinancialStats = isAdmin || isEasyFlyOnlyScope;
  const baseRows = useMemo(() => {
    if (isAdmin) return bookings;

    const isStaff = ["case_processor", "reviewer"].includes(adminUser?.role || "");
    if (!isStaff) return bookings;

    const now = Date.now();
    const withinNext72Hours = (dateString: string) => {
      const target = new Date(dateString).getTime();
      if (Number.isNaN(target)) return false;
      const diff = target - now;
      return diff >= 0 && diff <= 72 * 60 * 60 * 1000;
    };

    return bookings.filter((booking) => {
      const row = booking as EasyFlyBooking & { assignedTo?: number | null; paymentPending?: number };
      const paymentPending = row.paymentPending ?? Math.max(0, booking.amountPaid - booking.amountReceived);

      return (
        row.assignedTo === adminUser?.id ||
        paymentPending > 0 ||
        withinNext72Hours(booking.depDate) ||
        withinNext72Hours(booking.returnDate)
      );
    });
  }, [adminUser?.id, adminUser?.role, bookings, isAdmin]);

  const supplierOptions = useMemo(() => Array.from(new Set(baseRows.map((booking) => booking.supplier))).filter(Boolean), [baseRows]);
  const airlineOptions = useMemo(() => Array.from(new Set(baseRows.map((booking) => booking.airlineCode))).filter(Boolean), [baseRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = baseRows.filter((booking) => {
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

      return matchesSearch && matchesSupplier && matchesAirline && matchesFrom && matchesTo;
    });

    if (searchParams.get("defaultTab") !== "pending") {
      return rows;
    }

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
  }, [airlineFilter, baseRows, depFrom, depTo, search, searchParams, supplierFilter]);

  const stats = useMemo(() => {
    const totalBookings = filteredRows.length;
    const amountPaid = filteredRows.reduce((sum, booking) => sum + booking.amountPaid, 0);
    const amountReceived = filteredRows.reduce((sum, booking) => sum + booking.amountReceived, 0);
    const pendingPayments = filteredRows.reduce((sum, booking) => sum + Math.max(0, booking.amountPaid - booking.amountReceived), 0);
    const earnings = filteredRows.reduce((sum, booking) => sum + Math.max(0, booking.amountReceived - booking.amountPaid), 0);
    return { totalBookings, amountPaid, amountReceived, pendingPayments, earnings };
  }, [filteredRows]);

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

  return (
    <div className="mx-auto max-w-[1560px] space-y-5 font-body">
      <section className="overflow-hidden rounded-[20px] border border-[#D9E1EA] bg-gradient-to-r from-[#FFFFFF] via-[#FBFDFF] to-[#F7FCFA] shadow-[0_12px_30px_rgba(16,42,67,0.06)]">
        <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#009877]/25 bg-[#009877]/10 px-3 py-1 text-xs font-semibold text-[#006F57]">
              <Plane className="h-3.5 w-3.5" />
              EasyFly Operations
            </div>
            <div>
              <h1 className="text-[28px] font-heading font-semibold leading-tight text-[#102A43]">
                {isEasyFlyOnlyScope ? "My EasyFly Dashboard" : "EasyFly Bookings"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[#627D98]">
                {isEasyFlyOnlyScope
                  ? "Your EasyFly workspace — bookings, documents, and payments for cases you manage."
                  : "Track bookings, review documents, and manage payments with a clean, responsive workspace."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/easyfly/new")}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#009877] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,152,119,0.22)] transition-colors hover:bg-[#007B61]"
          >
            <Plus className="h-4 w-4" />
            Add Booking
          </button>
        </div>
      </section>

      <section
        className={`grid gap-3 ${showFinancialStats ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2"}`}
      >
        <StatCard label="Total Bookings" value={String(stats.totalBookings)} />
        {showFinancialStats ? (
          <>
            <StatCard label="Amount Paid" value={formatInr(stats.amountPaid)} />
            <StatCard label="Amount Received" value={formatInr(stats.amountReceived)} />
            <StatCard label="Pending Payments" value={formatInr(stats.pendingPayments)} accent="text-[#8D5E12]" />
            <StatCard label="Earnings" value={formatInr(stats.earnings)} accent="text-[#006F57]" />
          </>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-[14px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98] shadow-sm">
          Loading EasyFly bookings...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[14px] border border-[#F1A7A0]/45 bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">{error}</div>
      ) : null}

      <section className="rounded-[20px] border border-[#D9E1EA] bg-white shadow-[0_10px_24px_rgba(16,42,67,0.05)]">
        <div className="border-b border-[#E5EAF0] bg-[#FBFCFE] px-4 py-4 md:px-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8794]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pax, PNR, SR No., invoice"
                className="w-full rounded-[12px] border border-[#D9E1EA] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
              />
            </label>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
            >
              <option value="all">All Suppliers</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>

            <select
              value={airlineFilter}
              onChange={(e) => setAirlineFilter(e.target.value)}
              className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
            >
              <option value="all">All Airlines</option>
              {airlineOptions.map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 xl:col-span-1">
              <input
                type="date"
                value={depFrom}
                onChange={(e) => setDepFrom(e.target.value)}
                className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
                title="Departure from"
              />
              <input
                type="date"
                value={depTo}
                onChange={(e) => setDepTo(e.target.value)}
                className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
                title="Departure to"
              />
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-4 lg:hidden">
          {filteredRows.map((booking) => {
            const paymentPending = Math.max(0, booking.amountPaid - booking.amountReceived);
            const earnings = Math.max(0, booking.amountReceived - booking.amountPaid);

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
                    <p className="text-xs text-[#627D98]">Return</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatDate(booking.returnDate)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Paid</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatInr(booking.amountPaid)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Received</p>
                    <p className="mt-1 font-medium text-[#102A43]">{formatInr(booking.amountReceived)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Pending</p>
                    <p className="mt-1 font-medium text-[#8D5E12]">{formatInr(paymentPending)}</p>
                  </div>
                  <div className="rounded-[12px] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#627D98]">Earnings</p>
                    <p className="mt-1 font-medium text-[#006F57]">{formatInr(earnings)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <BookingTag label={booking.scheduleChange === "none" ? "No schedule change" : booking.scheduleChange === "minor" ? "Minor change" : "Major change"} tone={scheduleTone(booking.scheduleChange)} />
                  <div className="flex items-center gap-1.5">
                    <DocumentStatus icon={<FileText className="h-3.5 w-3.5" />} label="Invoice" uploaded={booking.docs.invoice} />
                    <DocumentStatus icon={<BadgeCheck className="h-3.5 w-3.5" />} label="ATOL" uploaded={booking.docs.atol} />
                    <DocumentStatus icon={<IdCard className="h-3.5 w-3.5" />} label="Passport" uploaded={booking.docs.passport} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton href={`/admin/easyfly/${booking.id}`} label="View" icon={<Eye className="h-4 w-4" />} />
                  <ActionButton href={`/admin/easyfly/${booking.id}`} label="Edit" icon={<Pencil className="h-4 w-4" />} variant="primary" />
                  {isAdmin ? (
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
          <table className="w-full min-w-[1260px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Booking</th>
                <th className="px-4 py-3 text-left font-semibold">Dates</th>
                <th className="px-4 py-3 text-left font-semibold">Amounts</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Docs</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {filteredRows.map((booking) => {
                const paymentPending = Math.max(0, booking.amountPaid - booking.amountReceived);
                const earnings = Math.max(0, booking.amountReceived - booking.amountPaid);

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
                        <p className="text-xs text-[#627D98]">Departure / Return</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs">
                        <p>Paid: <span className="font-semibold text-[#102A43]">{formatInr(booking.amountPaid)}</span></p>
                        <p>Received: <span className="font-semibold text-[#102A43]">{formatInr(booking.amountReceived)}</span></p>
                        <p>Pending: <span className="font-semibold text-[#8D5E12]">{formatInr(paymentPending)}</span></p>
                        <p>Earnings: <span className="font-semibold text-[#006F57]">{formatInr(earnings)}</span></p>
                      </div>
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
                        <ActionButton href={`/admin/easyfly/${booking.id}`} label="Edit" icon={<Pencil className="h-4 w-4" />} variant="primary" />
                        {isAdmin ? (
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#7B8794]">
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
