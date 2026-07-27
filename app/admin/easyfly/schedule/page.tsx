"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listEasyFlyBookings, type EasyFlyBooking } from "@/lib/easyfly";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { CalendarClock, Eye } from "lucide-react";

type BookingRow = EasyFlyBooking;

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function SectionTable({
  rows,
  type,
}: {
  rows: BookingRow[];
  type: "major" | "minor";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-[#F5F7FA] text-[#486581]">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">SR No.</th>
            <th className="px-3 py-2.5 text-left font-semibold">Pax Name</th>
            <th className="px-3 py-2.5 text-left font-semibold">PNR</th>
            <th className="px-3 py-2.5 text-left font-semibold">Airline</th>
            <th className="px-3 py-2.5 text-left font-semibold">Dep Date</th>
            <th className="px-3 py-2.5 text-left font-semibold">Supplier</th>
            <th className="px-3 py-2.5 text-left font-semibold">Re-issued?</th>
            <th className="px-3 py-2.5 text-left font-semibold">Action Needed</th>
            <th className="px-3 py-2.5 text-left font-semibold">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
          {rows.map((booking) => {
            const reissued = booking.isReissued;
            const showCreditNote = type === "major" && !reissued;
            return (
              <tr key={booking.id} className="hover:bg-[#F8FCFF]">
                <td className="px-3 py-2.5">{booking.srNo}</td>
                <td className="px-3 py-2.5">{booking.paxName}</td>
                <td className="px-3 py-2.5 font-medium text-[#102A43]">{booking.pnr}</td>
                <td className="px-3 py-2.5">{booking.airlineCode}</td>
                <td className="px-3 py-2.5">{formatDate(booking.depDate)}</td>
                <td className="px-3 py-2.5">{booking.supplier}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                      reissued
                        ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
                        : "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45"
                    }`}
                  >
                    {reissued ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {type === "major" ? (
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        showCreditNote
                          ? "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45"
                          : "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
                      }`}
                    >
                      {showCreditNote ? "Credit Note" : "Resolved"}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40">
                      Inform Customer
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/easyfly/${booking.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D9E1EA] text-[#486581] hover:bg-[#F5F7FA]"
                    aria-label={`View booking ${booking.pnr}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EasyFlySchedulePage() {
  const [search, setSearch] = useState("");
  const [changeFilter, setChangeFilter] = useState<"all" | "minor" | "major">("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const scheduleRows = useMemo(
    () => bookings.filter((booking) => booking.scheduleChange !== "none"),
    [bookings],
  );

  const supplierOptions = useMemo(
    () => Array.from(new Set(scheduleRows.map((booking) => booking.supplier))),
    [scheduleRows],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scheduleRows.filter((booking) => {
      const matchesSearch =
        !q || booking.paxName.toLowerCase().includes(q) || booking.pnr.toLowerCase().includes(q);
      const matchesType =
        changeFilter === "all" || booking.scheduleChange === changeFilter;
      const matchesSupplier = supplierFilter === "all" || booking.supplier === supplierFilter;
      return matchesSearch && matchesType && matchesSupplier;
    });
  }, [changeFilter, scheduleRows, search, supplierFilter]);

  const majorRows = useMemo(() => filteredRows.filter((booking) => booking.scheduleChange === "major"), [filteredRows]);
  const minorRows = useMemo(() => filteredRows.filter((booking) => booking.scheduleChange === "minor"), [filteredRows]);

  const majorCount = scheduleRows.filter((booking) => booking.scheduleChange === "major").length;
  const minorCount = scheduleRows.filter((booking) => booking.scheduleChange === "minor").length;

  const clearFilters = useCallback(() => {
    setChangeFilter("all");
    setSupplierFilter("all");
  }, []);

  const activeFilterCount =
    (changeFilter !== "all" ? 1 : 0) + (supplierFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome({
    title: "Schedule Changes",
    icon: CalendarClock,
    search: {
      value: search,
      onChange: setSearch,
      placeholder: "Search pax name, PNR",
    },
    activeFilterCount,
    onClearFilters: clearFilters,
    syncKey: `${search}|${changeFilter}|${supplierFilter}|${loading}|${scheduleRows.length}`,
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Change type</span>
          <select
            value={changeFilter}
            onChange={(e) => setChangeFilter(e.target.value as "all" | "minor" | "major")}
            className={filterFieldClass}
          >
            <option value="all">All</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
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
      </>
    ),
  });

  if (loading) {
    return (
      <div className="font-body max-w-[1200px] mx-auto">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-10 text-center text-sm text-[#627D98]">
          Loading EasyFly schedule changes...
        </div>
      </div>
    );
  }

  if (scheduleRows.length === 0) {
    return (
      <div className="font-body max-w-[1200px] mx-auto">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-10 text-center">
          <CalendarClock className="w-9 h-9 text-[#627D98] mx-auto" />
          <p className="mt-3 text-base font-heading font-semibold text-[#102A43]">No schedule changes found</p>
          <p className="mt-1 text-sm text-[#627D98]">All current bookings are stable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-body max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-3 py-1 text-xs font-semibold text-[#006F57]">
          Minor: {minorCount}
        </span>
        <span className="inline-flex rounded-full border border-[#F1A7A0]/45 bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-[#B42318]">
          Major: {majorCount}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Schedule Changes</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{scheduleRows.length}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Minor Changes</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#8D5E12]">{minorCount}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Major Changes</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#B42318]">{majorCount}</p>
        </div>
      </div>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden border-l-4 border-l-[#B42318]">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Major Changes</h2>
          <span className="text-xs text-[#B42318] font-semibold">{majorRows.length} booking(s)</span>
        </div>
        {majorRows.length > 0 ? (
          <SectionTable rows={majorRows} type="major" />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-[#7B8794]">No major changes for current filters.</div>
        )}
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden border-l-4 border-l-[#D4A84F]">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Minor Changes</h2>
          <span className="text-xs text-[#8D5E12] font-semibold">{minorRows.length} booking(s)</span>
        </div>
        {minorRows.length > 0 ? (
          <SectionTable rows={minorRows} type="minor" />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-[#7B8794]">No minor changes for current filters.</div>
        )}
      </section>
    </div>
  );
}
