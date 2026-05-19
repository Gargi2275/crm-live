"use client";

import { useEffect, useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { listEasyFlyBookings, type EasyFlyBooking } from "@/lib/easyfly";
import { TrendingUp, Download } from "lucide-react";

type RefundStatus = "none" | "pending" | "credit_note";
type ScheduleChange = "none" | "minor" | "major";
type PaymentMode = "card" | "bank_transfer" | "cash";
type DateRange = "week" | "month" | "year";

type BookingRow = EasyFlyBooking;

const formatInr = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function refundBadgeClass(status: RefundStatus) {
  if (status === "none") return "bg-[#009877]/12 text-[#006F57] border-[#009877]/35";
  if (status === "pending") return "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40";
  return "bg-[#EDE4FF] text-[#5F3DC4] border-[#B197FC]/40";
}

function formatPaymentMode(mode: PaymentMode) {
  if (mode === "bank_transfer") return "Bank Transfer";
  if (mode === "cash") return "Cash";
  return "Card";
}

function csvEscape(value: string | number | boolean) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getRangeStart(now: Date, range: DateRange) {
  const date = new Date(now);
  if (range === "week") {
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  if (range === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  return new Date(date.getFullYear(), 0, 1);
}

export default function EasyFlyRevenuePage() {
  const { adminUser } = useAdminAuth();
  if (adminUser?.role !== "admin") redirect("/admin/easyfly");

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setLoading(true);
      try {
        const data = await listEasyFlyBookings();
        if (!isMounted) return;
        setBookings(data);
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

  const rangeRows = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(now, dateRange);
    return bookings.filter((booking) => {
      const dep = new Date(`${booking.depDate}T00:00:00`);
      return dep >= start && dep <= now;
    });
  }, [bookings, dateRange]);

  const tableRows = useMemo(
    () => [...rangeRows].sort((a, b) => (b.amountReceived - b.amountPaid) - (a.amountReceived - a.amountPaid)),
    [rangeRows],
  );

  const stats = useMemo(() => {
    const totalBookings = rangeRows.length;
    const totalPaid = rangeRows.reduce((sum, booking) => sum + booking.amountPaid, 0);
    const totalReceived = rangeRows.reduce((sum, booking) => sum + booking.amountReceived, 0);
    const totalPending = rangeRows.reduce(
      (sum, booking) => sum + Math.max(0, booking.amountPaid - booking.amountReceived),
      0,
    );
    const totalEarnings = totalReceived - totalPaid;
    return { totalBookings, totalPaid, totalReceived, totalPending, totalEarnings };
  }, [rangeRows]);

  const supplierRows = useMemo(() => {
    const grouped = new Map<string, { count: number; paid: number; received: number }>();

    rangeRows.forEach((booking) => {
      const current = grouped.get(booking.supplier) || { count: 0, paid: 0, received: 0 };
      current.count += 1;
      current.paid += booking.amountPaid;
      current.received += booking.amountReceived;
      grouped.set(booking.supplier, current);
    });

    return Array.from(grouped.entries()).map(([supplier, values]) => ({
      supplier,
      totalBookings: values.count,
      totalPaid: values.paid,
      totalReceived: values.received,
      netEarnings: values.received - values.paid,
    }));
  }, [rangeRows]);

  const paymentModeRows = useMemo(() => {
    const grouped = new Map<PaymentMode, { count: number; totalAmount: number }>();

    rangeRows.forEach((booking) => {
      const current = grouped.get(booking.paymentMode) || { count: 0, totalAmount: 0 };
      current.count += 1;
      current.totalAmount += booking.amountReceived;
      grouped.set(booking.paymentMode, current);
    });

    return (Array.from(grouped.entries()) as Array<[PaymentMode, { count: number; totalAmount: number }]>).map(
      ([mode, values]) => ({
        mode,
        count: values.count,
        totalAmount: values.totalAmount,
      }),
    );
  }, [rangeRows]);

  const handleExportCsv = () => {
    const headers = [
      "id",
      "srNo",
      "supplier",
      "invoiceNumber",
      "pnr",
      "paxName",
      "airlineCode",
      "depDate",
      "returnDate",
      "amountPaid",
      "amountReceived",
      "amountDue",
      "earnings",
      "refundStatus",
      "scheduleChange",
      "paymentMode",
      "docInvoice",
      "docAtol",
      "docPassport",
      "createdBy",
    ];

    const rows = tableRows.map((booking) => [
      booking.id,
      booking.srNo,
      booking.supplier,
      booking.invoiceNumber,
      booking.pnr,
      booking.paxName,
      booking.airlineCode,
      booking.depDate,
      booking.returnDate,
      booking.amountPaid,
      booking.amountReceived,
      booking.amountDue,
      booking.amountReceived - booking.amountPaid,
      booking.refundStatus,
      booking.scheduleChange,
      booking.paymentMode,
      booking.docs.invoice,
      booking.docs.atol,
      booking.docs.passport,
      booking.createdBy,
    ]);

    const csv = [
      headers.map((h) => csvEscape(h)).join(","),
      ...rows.map((line) => line.map((value) => csvEscape(value)).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `easyfly-revenue-${dateRange}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-body max-w-[1500px] mx-auto">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43] inline-flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#009877]" />
            EasyFly Revenue
          </h1>
          <p className="mt-1 text-sm text-[#627D98]">Financial overview of all flight bookings</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
            <button
              type="button"
              onClick={() => setDateRange("week")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                dateRange === "week" ? "bg-[#009877] text-white" : "text-[#486581]"
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setDateRange("month")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                dateRange === "month" ? "bg-[#009877] text-white" : "text-[#486581]"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateRange("year")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                dateRange === "year" ? "bg-[#009877] text-white" : "text-[#486581]"
              }`}
            >
              This Year
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#009877] px-3.5 py-2 text-sm font-heading font-semibold text-white hover:bg-[#007B61]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Bookings</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{stats.totalBookings}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Amount Paid to Suppliers</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#B42318]">{formatInr(stats.totalPaid)}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Amount Received from Customers</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#006F57]">{formatInr(stats.totalReceived)}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Pending Payments</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#8D5E12]">{formatInr(stats.totalPending)}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Total Earnings</p>
          <p className={`mt-1 text-lg font-heading font-semibold ${stats.totalEarnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}`}>
            {formatInr(stats.totalEarnings)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98]">
          Loading EasyFly revenue data...
        </div>
      ) : null}

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0]">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Revenue Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">SR No.</th>
                <th className="px-3 py-2.5 text-left font-semibold">Pax Name</th>
                <th className="px-3 py-2.5 text-left font-semibold">PNR</th>
                <th className="px-3 py-2.5 text-left font-semibold">Supplier</th>
                <th className="px-3 py-2.5 text-left font-semibold">Airline</th>
                <th className="px-3 py-2.5 text-left font-semibold">Dep Date</th>
                <th className="px-3 py-2.5 text-left font-semibold">Amount Paid</th>
                <th className="px-3 py-2.5 text-left font-semibold">Amount Received</th>
                <th className="px-3 py-2.5 text-left font-semibold">Earnings</th>
                <th className="px-3 py-2.5 text-left font-semibold">Payment Mode</th>
                <th className="px-3 py-2.5 text-left font-semibold">Refund Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {tableRows.map((booking) => {
                const earnings = booking.amountReceived - booking.amountPaid;
                return (
                  <tr key={booking.id} className="hover:bg-[#F8FCFF]">
                    <td className="px-3 py-2.5">{booking.srNo}</td>
                    <td className="px-3 py-2.5">{booking.paxName}</td>
                    <td className="px-3 py-2.5 font-medium text-[#102A43]">{booking.pnr}</td>
                    <td className="px-3 py-2.5">{booking.supplier}</td>
                    <td className="px-3 py-2.5">{booking.airlineCode}</td>
                    <td className="px-3 py-2.5">{formatDate(booking.depDate)}</td>
                    <td className="px-3 py-2.5">{formatInr(booking.amountPaid)}</td>
                    <td className="px-3 py-2.5">{formatInr(booking.amountReceived)}</td>
                    <td className={`px-3 py-2.5 font-semibold ${earnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}`}>
                      {formatInr(earnings)}
                    </td>
                    <td className="px-3 py-2.5">{formatPaymentMode(booking.paymentMode)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${refundBadgeClass(booking.refundStatus)}`}>
                        {booking.refundStatus === "none"
                          ? "None"
                          : booking.refundStatus === "pending"
                            ? "Pending"
                            : "Credit Note"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0]">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Supplier Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Supplier Name</th>
                <th className="px-3 py-2.5 text-left font-semibold">Total Bookings</th>
                <th className="px-3 py-2.5 text-left font-semibold">Total Paid</th>
                <th className="px-3 py-2.5 text-left font-semibold">Total Received</th>
                <th className="px-3 py-2.5 text-left font-semibold">Net Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {supplierRows.map((row) => (
                <tr key={row.supplier} className="hover:bg-[#F8FCFF]">
                  <td className="px-3 py-2.5">{row.supplier}</td>
                  <td className="px-3 py-2.5">{row.totalBookings}</td>
                  <td className="px-3 py-2.5">{formatInr(row.totalPaid)}</td>
                  <td className="px-3 py-2.5">{formatInr(row.totalReceived)}</td>
                  <td className={`px-3 py-2.5 font-semibold ${row.netEarnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}`}>
                    {formatInr(row.netEarnings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Payment Mode Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {paymentModeRows.map((row) => (
            <div key={row.mode} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
              <p className="text-xs text-[#627D98]">Payment Mode</p>
              <p className="mt-1 text-base font-heading font-semibold text-[#102A43]">{row.mode}</p>
              <p className="mt-2 text-xs text-[#627D98]">Count</p>
              <p className="text-sm font-semibold text-[#102A43]">{row.count}</p>
              <p className="mt-2 text-xs text-[#627D98]">Total Amount</p>
              <p className="text-sm font-semibold text-[#006F57]">{formatInr(row.totalAmount)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
