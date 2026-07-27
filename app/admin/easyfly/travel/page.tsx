"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listEasyFlyBookings, type EasyFlyBooking } from "@/lib/easyfly";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { Eye, Plane } from "lucide-react";

type DepartureFilter = "24h" | "48h" | "72h" | "5days" | "custom" | "all";
type ReturnFilter = "24h" | "48h" | "72h" | "5days" | "all";
type BookingRow = EasyFlyBooking;

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const WINDOW_MS: Record<Exclude<DepartureFilter, "custom" | "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
  "5days": 5 * 24 * 60 * 60 * 1000,
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getPaymentPending = (booking: BookingRow) => Math.max(0, booking.amountPaid - booking.amountReceived);

function isDateInWindow(dateString: string, filter: DepartureFilter | ReturnFilter, customFrom: string, customTo: string) {
  if (filter === "all") return false;

  if (filter === "custom") {
    if (customFrom && dateString < customFrom) return false;
    if (customTo && dateString > customTo) return false;
    return Boolean(customFrom || customTo);
  }

  const target = new Date(`${dateString}T00:00:00`).getTime();
  if (Number.isNaN(target)) return false;

  const now = Date.now();
  const windowMs = WINDOW_MS[filter as keyof typeof WINDOW_MS];
  return target >= now && target <= now + windowMs;
}

function matchesTravelFilters(
  booking: BookingRow,
  departureFilter: DepartureFilter,
  returnFilter: ReturnFilter,
  customFrom: string,
  customTo: string,
) {
  const depActive = departureFilter !== "all";
  const retActive = returnFilter !== "all";

  if (!depActive && !retActive) return true;

  const depMatch = depActive && isDateInWindow(booking.depDate, departureFilter, customFrom, customTo);
  const retMatch = retActive && isDateInWindow(booking.returnDate, returnFilter, "", "");

  return depMatch || retMatch;
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-[#009877] text-white" : "text-[#486581] hover:bg-[#F5F7FA]"
      }`}
    >
      {label}
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

function ActionButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#486581] transition-colors hover:bg-[#F5F7FA]"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export default function EasyFlyTravelPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [departureFilter, setDepartureFilter] = useState<DepartureFilter>("72h");
  const [returnFilter, setReturnFilter] = useState<ReturnFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const [staffFilter, setStaffFilter] = useState<"all" | "assigned" | "unassigned">("all");

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setLoading(true);
      try {
        const result = await listEasyFlyBookings();
        if (!isMounted) return;
        setBookings(result.bookings);
      } catch {
        if (!isMounted) return;
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

  const airlineOptions = useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.airlineCode))).filter(Boolean),
    [bookings],
  );

  const supplierOptions = useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.supplier))).filter(Boolean),
    [bookings],
  );

  const filteredRows = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesDate = matchesTravelFilters(booking, departureFilter, returnFilter, customFrom, customTo);
      const matchesAirline = airlineFilter === "all" || booking.airlineCode === airlineFilter;
      const matchesSupplier = supplierFilter === "all" || booking.supplier === supplierFilter;
      const matchesPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" && getPaymentPending(booking) === 0) ||
        (paymentFilter === "pending" && getPaymentPending(booking) > 0);
      const matchesStaff =
        staffFilter === "all" ||
        (staffFilter === "assigned" && booking.createdBy !== null) ||
        (staffFilter === "unassigned" && booking.createdBy === null);
      return matchesDate && matchesAirline && matchesSupplier && matchesPayment && matchesStaff;
    });
  }, [airlineFilter, bookings, customFrom, customTo, departureFilter, paymentFilter, returnFilter, staffFilter, supplierFilter]);

  const stats = useMemo(() => {
    const totalUpcoming = filteredRows.length;
    const departingSoon = filteredRows.filter((booking) =>
      isDateInWindow(booking.depDate, departureFilter === "all" ? "72h" : departureFilter, customFrom, customTo),
    ).length;
    const returningSoon = filteredRows.filter((booking) =>
      isDateInWindow(booking.returnDate, returnFilter === "all" ? "72h" : returnFilter, "", ""),
    ).length;
    const paymentPendingCount = filteredRows.filter((booking) => getPaymentPending(booking) > 0).length;
    return { totalUpcoming, departingSoon, returningSoon, paymentPendingCount };
  }, [customFrom, customTo, departureFilter, filteredRows, returnFilter]);

  const clearFilters = useCallback(() => {
    setDepartureFilter("72h");
    setReturnFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setAirlineFilter("all");
    setSupplierFilter("all");
    setPaymentFilter("all");
    setStaffFilter("all");
  }, []);

  const activeFilterCount =
    (departureFilter !== "72h" ? 1 : 0) +
    (returnFilter !== "all" ? 1 : 0) +
    (airlineFilter !== "all" ? 1 : 0) +
    (supplierFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (staffFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome({
    title: "Travel Monitoring",
    icon: Plane,
    activeFilterCount,
    onClearFilters: clearFilters,
    syncKey: `${departureFilter}|${returnFilter}|${customFrom}|${customTo}|${airlineFilter}|${supplierFilter}|${paymentFilter}|${staffFilter}|${loading}`,
    filtersContent: (
      <>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Departure window</p>
          <div className="inline-flex flex-wrap gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            <FilterButton label="24h" active={departureFilter === "24h"} onClick={() => setDepartureFilter("24h")} />
            <FilterButton label="48h" active={departureFilter === "48h"} onClick={() => setDepartureFilter("48h")} />
            <FilterButton label="72h" active={departureFilter === "72h"} onClick={() => setDepartureFilter("72h")} />
            <FilterButton label="5 days" active={departureFilter === "5days"} onClick={() => setDepartureFilter("5days")} />
            <FilterButton label="Custom" active={departureFilter === "custom"} onClick={() => setDepartureFilter("custom")} />
            <FilterButton label="All" active={departureFilter === "all"} onClick={() => setDepartureFilter("all")} />
          </div>
          {departureFilter === "custom" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className={filterFieldClass}
                title="From date"
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className={filterFieldClass}
                title="To date"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#627D98]">Return window</p>
          <div className="inline-flex flex-wrap gap-1 rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            <FilterButton label="24h" active={returnFilter === "24h"} onClick={() => setReturnFilter("24h")} />
            <FilterButton label="48h" active={returnFilter === "48h"} onClick={() => setReturnFilter("48h")} />
            <FilterButton label="72h" active={returnFilter === "72h"} onClick={() => setReturnFilter("72h")} />
            <FilterButton label="5 days" active={returnFilter === "5days"} onClick={() => setReturnFilter("5days")} />
            <FilterButton label="All" active={returnFilter === "all"} onClick={() => setReturnFilter("all")} />
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Airline</span>
          <select value={airlineFilter} onChange={(event) => setAirlineFilter(event.target.value)} className={filterFieldClass}>
            <option value="all">All Airlines</option>
            {airlineOptions.map((airline) => (
              <option key={airline} value={airline}>
                {airline}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Supplier</span>
          <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className={filterFieldClass}>
            <option value="all">All Suppliers</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Payment</span>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as "all" | "paid" | "pending")}
            className={filterFieldClass}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Payment Pending</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Staff</span>
          <select
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value as "all" | "assigned" | "unassigned")}
            className={filterFieldClass}
          >
            <option value="all">All Staff</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
      </>
    ),
  });

  return (
    <div className="space-y-4 font-body max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Total upcoming" value={String(stats.totalUpcoming)} />
        <StatCard label="Departing soon" value={String(stats.departingSoon)} accent="text-[#0B69B7]" />
        <StatCard label="Returning soon" value={String(stats.returningSoon)} accent="text-[#006F57]" />
        <StatCard label="Payment pending" value={String(stats.paymentPendingCount)} accent="text-[#8D5E12]" />
      </div>

      {loading ? (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98]">
          Loading travel monitoring data...
        </div>
      ) : null}

      <section className="rounded-[20px] border border-[#D9E1EA] bg-white shadow-[0_10px_24px_rgba(16,42,67,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer Name</th>
                <th className="px-4 py-3 text-left font-semibold">PNR</th>
                <th className="px-4 py-3 text-left font-semibold">Airline</th>
                <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold">Departure Date</th>
                <th className="px-4 py-3 text-left font-semibold">Return Date</th>
                <th className="px-4 py-3 text-left font-semibold">Payment Status</th>
                <th className="px-4 py-3 text-left font-semibold">Ticket Uploaded</th>
                <th className="px-4 py-3 text-left font-semibold">Passport Uploaded</th>
                <th className="px-4 py-3 text-left font-semibold">Schedule Change</th>
                <th className="px-4 py-3 text-left font-semibold">Last Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Staff Assigned</th>
                <th className="px-4 py-3 text-right font-semibold">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {filteredRows.map((booking) => {
                const paymentPending = getPaymentPending(booking);
                const assignedTo = booking.createdBy;
                const ticketUploaded = booking.docs.invoice;

                return (
                  <tr key={booking.id} className="align-top transition-colors hover:bg-[#F8FCFF]">
                    <td className="px-4 py-4 font-medium text-[#102A43]">{booking.paxName}</td>
                    <td className="px-4 py-4">{booking.pnr}</td>
                    <td className="px-4 py-4">{booking.airlineCode}</td>
                    <td className="px-4 py-4">{booking.supplier}</td>
                    <td className="px-4 py-4">{formatDate(booking.depDate)}</td>
                    <td className="px-4 py-4">{formatDate(booking.returnDate)}</td>
                    <td className="px-4 py-4">
                      {paymentPending > 0 ? (
                        <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-[#009877]/12 text-[#006F57] border-[#009877]/35">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold ${ticketUploaded ? "text-[#006F57]" : "text-[#B42318]"}`}>
                        {ticketUploaded ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold ${booking.docs.passport ? "text-[#006F57]" : "text-[#B42318]"}`}>
                        {booking.docs.passport ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          booking.scheduleChange === "none"
                            ? "bg-[#F5F7FA] text-[#486581] border-[#D9E1EA]"
                            : booking.scheduleChange === "minor"
                              ? "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40"
                              : "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45"
                        }`}
                      >
                        {booking.scheduleChange === "none"
                          ? "None"
                          : booking.scheduleChange === "minor"
                            ? "Minor"
                            : "Major"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#486581]">
                      {formatDate(booking.updatedAt)}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#486581]">
                      {assignedTo ? `Staff #${assignedTo}` : "Unassigned"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <ActionButton href={`/admin/easyfly/${booking.id}`} label="View" icon={<Eye className="h-4 w-4" />} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-sm text-[#7B8794]">
                    No bookings match the selected travel filters.
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
