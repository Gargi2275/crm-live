"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  createEasyFlyStaffRevenueEntry,
  listEasyFlyBookings,
  listEasyFlyStaffRevenueEntries,
  type EasyFlyBooking,
  type EasyFlyStaffRevenueEntry,
} from "@/lib/easyfly";
import { TrendingUp, Download, AlertCircle, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";

type RefundStatus = "none" | "pending" | "credit_note";
type ScheduleChange = "none" | "minor" | "major";
type PaymentMode = "card" | "bank_transfer" | "cash";
type DateRange = "week" | "month" | "year";

type BookingRow = EasyFlyBooking;

const formatInr = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;

const formatGbp = (amount: string | number) => `£${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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

function csvEscape(value: string | number | boolean | null) {
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

type StaffRevenueEntryForm = {
  bookingReference: string;
  customerName: string;
  supplier: string;
  amountPaid: string;
  amountReceived: string;
  paymentMode: PaymentMode;
  notes: string;
};

const emptyStaffRevenueEntry: StaffRevenueEntryForm = {
  bookingReference: "",
  customerName: "",
  supplier: "",
  amountPaid: "",
  amountReceived: "",
  paymentMode: "cash",
  notes: "",
};

const ADMIN_REVENUE_ROLES = new Set(["admin", "ops_manager"]);
const STAFF_ENTRY_ROLES = new Set(["case_processor", "support_agent", "reviewer"]);

const inputClass =
  "w-full rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none focus:border-[#33A1FD]";

type RevenueEntryFieldsProps = {
  form: StaffRevenueEntryForm;
  setForm: React.Dispatch<React.SetStateAction<StaffRevenueEntryForm>>;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
};

function RevenueEntryFields({ form, setForm, receiptFile, setReceiptFile }: RevenueEntryFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[#627D98]">Booking Reference / SR No.</span>
        <input
          type="text"
          value={form.bookingReference}
          onChange={(e) => setForm((c) => ({ ...c, bookingReference: e.target.value }))}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[#627D98]">Customer Name</span>
        <input
          type="text"
          value={form.customerName}
          onChange={(e) => setForm((c) => ({ ...c, customerName: e.target.value }))}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1.5 md:col-span-2">
        <span className="text-xs font-medium text-[#627D98]">Supplier</span>
        <input
          type="text"
          value={form.supplier}
          onChange={(e) => setForm((c) => ({ ...c, supplier: e.target.value }))}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[#627D98]">Ticket Amount / Amount Paid to Supplier (£)</span>
        <input
          type="number"
          min="0"
          step="1"
          value={form.amountPaid}
          onChange={(e) => setForm((c) => ({ ...c, amountPaid: e.target.value }))}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[#627D98]">Amount Received from Customer (£)</span>
        <input
          type="number"
          min="0"
          step="1"
          value={form.amountReceived}
          onChange={(e) => setForm((c) => ({ ...c, amountReceived: e.target.value }))}
          className={inputClass}
          required
        />
      </label>
      <label className="block space-y-1.5 md:col-span-2">
        <span className="text-xs font-medium text-[#627D98]">Mode of Payment</span>
        <select
          value={form.paymentMode}
          onChange={(e) => setForm((c) => ({ ...c, paymentMode: e.target.value as PaymentMode }))}
          className={inputClass}
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </label>
      <label className="block space-y-1.5 md:col-span-2">
        <span className="text-xs font-medium text-[#627D98]">Receipt / Screenshot</span>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none"
        />
        {receiptFile ? <span className="text-xs text-[#627D98]">{receiptFile.name}</span> : null}
      </label>
      <label className="block space-y-1.5 md:col-span-2">
        <span className="text-xs font-medium text-[#627D98]">Notes</span>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </label>
    </div>
  );
}

function EasyFlyStaffRevenueEntryForm() {
  const [form, setForm] = useState<StaffRevenueEntryForm>(emptyStaffRevenueEntry);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useSetAdminPageChrome({
    title: "Daily Revenue Entry",
    subtitle: `Submitting for ${today}`,
    icon: TrendingUp,
    syncKey: `${submitting ? 1 : 0}|${submitted ? 1 : 0}`,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createEasyFlyStaffRevenueEntry({
        bookingReference: form.bookingReference.trim(),
        customerName: form.customerName.trim(),
        supplier: form.supplier.trim(),
        amountPaid: form.amountPaid,
        amountReceived: form.amountReceived,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
        receiptFile,
      });
      toast.success("Revenue entry submitted. Awaiting admin review.");
      setForm(emptyStaffRevenueEntry);
      setReceiptFile(null);
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit revenue entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-body max-w-[720px] mx-auto">
      <div className="bg-[#F9DBAF]/35 text-[#8D5E12] border border-[#D4A84F]/40 rounded-[12px] px-4 py-3 text-sm space-y-1">
        <p className="font-semibold">Staff Revenue Entry Rules:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>You can only enter today&apos;s revenue</li>
          <li>Previous records are not visible to staff</li>
          <li>Entries are locked after submission</li>
          <li>If correction needed, contact admin</li>
        </ul>
      </div>

      {submitted ? (
        <div className="bg-[#009877]/12 text-[#006F57] border border-[#009877]/35 rounded-[12px] px-4 py-4 text-sm font-semibold">
          ✓ Entry submitted successfully. Add another entry below if needed.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 space-y-4">
        <RevenueEntryFields form={form} setForm={setForm} receiptFile={receiptFile} setReceiptFile={setReceiptFile} />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-[10px] bg-[#009877] px-5 py-2.5 text-sm font-heading font-semibold text-white hover:bg-[#007B61] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "Submit Entry"}
        </button>
      </form>
    </div>
  );
}

type RevenueRecordFilter = "all" | "bookings" | "pending" | "staff";
type StaffStatusFilter = "all" | "pending_review" | "approved" | "rejected";

type UnifiedRevenueRow = {
  key: string;
  type: "booking" | "staff";
  ref: string;
  name: string;
  pnr: string;
  supplier: string;
  paid: string;
  received: string;
  extra: string;
  dueOrEarnings: string;
  dueOrEarningsClass: string;
  paymentMode: string;
  primaryDate: string;
  dueDate: string | null;
  statusLabel: string;
  statusClass: string;
  submittedBy: string;
  receiptUrl: string;
  receiptName: string;
  notes: string;
  sortDate: string;
};

function staffEntryStatusLabel(status: EasyFlyStaffRevenueEntry["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending Review";
}

function staffEntryStatusClass(status: EasyFlyStaffRevenueEntry["status"]) {
  if (status === "approved") return "bg-[#009877]/12 text-[#006F57] border-[#009877]/35";
  if (status === "rejected") return "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]";
  return "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40";
}

function getPendingTier(booking: BookingRow): number {
  if (!booking.paymentDueDate) return 4;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${booking.paymentDueDate}T00:00:00`);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 0;
  if (diffDays === 0) return 1;
  if (diffDays === 1) return 2;
  if (diffDays <= 7) return 3;
  return 3;
}

const TIER_LABELS: Record<number, { label: string; chipClass: string }> = {
  0: { label: "Overdue", chipClass: "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]" },
  1: { label: "Due Today", chipClass: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" },
  2: { label: "Due Tomorrow", chipClass: "bg-[#FEF9C3] text-[#713F12] border-[#FEF08A]" },
  3: { label: "Within 7 Days", chipClass: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]" },
  4: { label: "No Due Date", chipClass: "bg-[#FEE2E2] text-[#B42318] border-[#FECACA]" },
};

function isInDateRange(dateString: string, range: DateRange) {
  const now = new Date();
  const start = getRangeStart(now, range);
  const date = new Date(`${dateString}T00:00:00`);
  return date >= start && date <= now;
}

function EasyFlyAdminRevenueView() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [recordFilter, setRecordFilter] = useState<RevenueRecordFilter>("all");
  const [staffStatusFilter, setStaffStatusFilter] = useState<StaffStatusFilter>("all");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [staffEntries, setStaffEntries] = useState<EasyFlyStaffRevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<StaffRevenueEntryForm>(emptyStaffRevenueEntry);
  const [addReceipt, setAddReceipt] = useState<File | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingResult, entries] = await Promise.all([
        listEasyFlyBookings(),
        listEasyFlyStaffRevenueEntries(),
      ]);
      setBookings(bookingResult.bookings);
      setStaffEntries(entries);
    } catch {
      setBookings([]);
      setStaffEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetAddForm = () => {
    setAddForm(emptyStaffRevenueEntry);
    setAddReceipt(null);
  };

  const handleAddRevenue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddSubmitting(true);
    try {
      await createEasyFlyStaffRevenueEntry({
        bookingReference: addForm.bookingReference.trim(),
        customerName: addForm.customerName.trim(),
        supplier: addForm.supplier.trim(),
        amountPaid: addForm.amountPaid,
        amountReceived: addForm.amountReceived,
        paymentMode: addForm.paymentMode,
        notes: addForm.notes.trim(),
        receiptFile: addReceipt,
      });
      toast.success("Revenue entry added.");
      resetAddForm();
      setAddOpen(false);
      const entries = await listEasyFlyStaffRevenueEntries();
      setStaffEntries(entries);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add revenue entry.");
    } finally {
      setAddSubmitting(false);
    }
  };

  const rangeBookings = useMemo(
    () => bookings.filter((b) => isInDateRange((b.createdAt || "").slice(0, 10) || b.depDate, dateRange)),
    [bookings, dateRange],
  );

  const rangeStaffEntries = useMemo(
    () =>
      staffEntries
        .filter((entry) => isInDateRange(entry.entryDate, dateRange))
        .filter((entry) => staffStatusFilter === "all" || entry.status === staffStatusFilter),
    [staffEntries, dateRange, staffStatusFilter],
  );

  const kpiBookings = useMemo(() => {
    if (recordFilter === "staff") return [];
    if (recordFilter === "pending") return rangeBookings.filter((b) => (b.amountDue || 0) > 0);
    return rangeBookings;
  }, [rangeBookings, recordFilter]);

  const kpiStaffEntries = useMemo(() => {
    if (recordFilter === "bookings" || recordFilter === "pending") return [];
    return rangeStaffEntries;
  }, [rangeStaffEntries, recordFilter]);

  const bookingRows = useMemo((): UnifiedRevenueRow[] => {
    const source =
      recordFilter === "pending"
        ? rangeBookings.filter((b) => b.amountDue > 0)
        : rangeBookings;

    return source.map((booking) => {
      const tier = getPendingTier(booking);
      const earnings = booking.amountReceived - booking.amountPaid;
      const isPending = booking.amountDue > 0;
      const bookedOn = (booking.createdAt || "").slice(0, 10) || booking.depDate;
      return {
        key: `booking-${booking.id}`,
        type: "booking",
        ref: booking.srNo,
        name: booking.paxName,
        pnr: booking.pnr,
        supplier: booking.supplier,
        paid: formatInr(booking.amountPaid),
        received: formatInr(booking.amountReceived),
        extra: formatInr(booking.extraAmount || 0),
        dueOrEarnings: isPending ? formatInr(booking.amountDue) : formatInr(earnings),
        dueOrEarningsClass: isPending
          ? "text-[#B42318] font-semibold"
          : earnings >= 0
            ? "text-[#006F57] font-semibold"
            : "text-[#B42318] font-semibold",
        paymentMode: formatPaymentMode(booking.paymentMode),
        primaryDate: bookedOn,
        dueDate: booking.paymentDueDate,
        statusLabel: isPending ? TIER_LABELS[tier].label : "Settled",
        statusClass: isPending
          ? TIER_LABELS[tier].chipClass
          : "bg-[#009877]/12 text-[#006F57] border-[#009877]/35",
        submittedBy: "",
        receiptUrl: "",
        receiptName: "",
        notes: "",
        sortDate: bookedOn,
      };
    });
  }, [rangeBookings, recordFilter]);

  const staffRows = useMemo((): UnifiedRevenueRow[] => {
    return rangeStaffEntries.map((entry) => {
        const earnings = Number(entry.amountReceived) - Number(entry.amountPaid);
        return {
          key: `staff-${entry.id}`,
          type: "staff",
          ref: entry.bookingReference,
          name: entry.customerName,
          pnr: "—",
          supplier: entry.supplier,
          paid: formatGbp(entry.amountPaid),
          received: formatGbp(entry.amountReceived),
          extra: "—",
          dueOrEarnings: formatGbp(earnings),
          dueOrEarningsClass: earnings >= 0 ? "text-[#006F57] font-semibold" : "text-[#B42318] font-semibold",
          paymentMode: formatPaymentMode(entry.paymentMode),
          primaryDate: entry.entryDate,
          dueDate: null,
          statusLabel: staffEntryStatusLabel(entry.status),
          statusClass: staffEntryStatusClass(entry.status),
          submittedBy: entry.enteredBy || "—",
          receiptUrl: entry.receiptUrl,
          receiptName: entry.receiptFileName,
          notes: entry.notes,
          sortDate: entry.entryDate,
        };
      });
  }, [rangeStaffEntries]);

  const displayRows = useMemo(() => {
    let rows: UnifiedRevenueRow[] = [];
    if (recordFilter === "all") rows = [...bookingRows, ...staffRows];
    else if (recordFilter === "staff") rows = staffRows;
    else rows = bookingRows;

    return rows.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [bookingRows, staffRows, recordFilter]);

  const stats = useMemo(() => {
    const totalBookings = kpiBookings.length;
    const totalPaid = kpiBookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalReceived = kpiBookings.reduce((sum, b) => sum + b.amountReceived, 0);
    const totalPending = kpiBookings.reduce((sum, b) => sum + Math.max(0, b.amountDue), 0);
    const totalExtra = kpiBookings.reduce((sum, b) => sum + (b.extraAmount || 0), 0);
    const totalEarnings = totalReceived - totalPaid;
    const pendingCount = kpiBookings.filter((b) => b.amountDue > 0).length;
    const staffPending = kpiStaffEntries.filter((e) => e.status === "pending_review").length;
    const staffCount = kpiStaffEntries.length;
    return {
      totalBookings,
      totalPaid,
      totalReceived,
      totalPending,
      totalExtra,
      totalEarnings,
      pendingCount,
      staffPending,
      staffCount,
    };
  }, [kpiBookings, kpiStaffEntries]);

  const handleExportCsv = () => {
    const headers = [
      "type",
      "ref",
      "name",
      "pnr",
      "supplier",
      "paid",
      "received",
      "extra",
      "dueOrEarnings",
      "paymentMode",
      "bookingDate",
      "dueDate",
      "status",
      "submittedBy",
      "notes",
    ];
    const rows = displayRows.map((row) => [
      row.type,
      row.ref,
      row.name,
      row.pnr,
      row.supplier,
      row.paid,
      row.received,
      row.extra,
      row.dueOrEarnings,
      row.paymentMode,
      row.primaryDate,
      row.dueDate ?? "",
      row.statusLabel,
      row.submittedBy,
      row.notes,
    ]);
    const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `easyfly-revenue-${recordFilter}-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectClass =
    "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

  const clearFilters = useCallback(() => {
    setRecordFilter("all");
    setDateRange("month");
    setStaffStatusFilter("all");
  }, []);

  const activeFilterCount =
    (recordFilter !== "all" ? 1 : 0) +
    (dateRange !== "month" ? 1 : 0) +
    ((recordFilter === "all" || recordFilter === "staff") && staffStatusFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome({
    title: "EasyFly Revenue",
    icon: TrendingUp,
    activeFilterCount,
    onClearFilters: clearFilters,
    syncKey: `${recordFilter}|${dateRange}|${staffStatusFilter}|${loading}|${addOpen ? 1 : 0}|${displayRows.length}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Revenue
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </>
    ),
    filtersContent: (
      <>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Show</span>
          <select
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value as RevenueRecordFilter)}
            className={selectClass}
          >
            <option value="all">All Records</option>
            <option value="bookings">Bookings Only</option>
            <option value="pending">Pending Payments</option>
            <option value="staff">Staff Submissions</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-[#486581]">Period (booking date)</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className={selectClass}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </label>
        {(recordFilter === "all" || recordFilter === "staff") && (
          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">Staff Status</span>
            <select
              value={staffStatusFilter}
              onChange={(e) => setStaffStatusFilter(e.target.value as StaffStatusFilter)}
              className={selectClass}
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        )}
      </>
    ),
  });

  return (
    <div className="space-y-4 font-body max-w-[1500px] mx-auto">
      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102A43]/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-revenue-title"
            className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[12px] bg-white border border-[#D9E1EA] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5EAF0] px-5 py-4">
              <div>
                <h2 id="add-revenue-title" className="text-lg font-heading font-semibold text-[#102A43]">
                  Add Revenue Entry
                </h2>
                <p className="mt-0.5 text-xs text-[#627D98]">Admin entries are saved as approved for today</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
                className="rounded-[8px] p-1.5 text-[#627D98] hover:bg-[#F5F7FA] hover:text-[#102A43]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRevenue} className="p-5 space-y-4">
              <RevenueEntryFields
                form={addForm}
                setForm={setAddForm}
                receiptFile={addReceipt}
                setReceiptFile={setAddReceipt}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    resetAddForm();
                  }}
                  className="rounded-[10px] border border-[#D9E1EA] px-4 py-2.5 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="inline-flex items-center justify-center rounded-[10px] bg-[#009877] px-5 py-2.5 text-sm font-heading font-semibold text-white hover:bg-[#007B61] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {addSubmitting ? "Saving…" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loading && (
        <div className="rounded-[12px] border border-dashed border-[#B8C7D9] bg-white px-4 py-8 text-sm text-[#627D98]">
          Loading EasyFly data...
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {[
              { label: "Bookings", value: String(stats.totalBookings), color: "text-[#102A43]" },
              { label: "Supplier Paid", value: formatInr(stats.totalPaid), color: "text-[#B42318]" },
              { label: "Client Received", value: formatInr(stats.totalReceived), color: "text-[#006F57]" },
              { label: "Client Pending", value: formatInr(stats.totalPending), color: "text-[#8D5E12]" },
              { label: "Extra Paid", value: formatInr(stats.totalExtra), color: "text-[#1E40AF]" },
              { label: "Earnings", value: formatInr(stats.totalEarnings), color: stats.totalEarnings >= 0 ? "text-[#006F57]" : "text-[#B42318]" },
              { label: "Staff Pending", value: String(stats.staffPending), color: "text-[#8D5E12]" },
            ].map((s) => (
              <div key={s.label} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
                <p className="text-xs text-[#627D98]">{s.label}</p>
                <p className={`mt-1 text-lg font-heading font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-[#102A43]">Revenue Records</h2>
              <span className="text-xs text-[#627D98]">{displayRows.length} record{displayRows.length === 1 ? "" : "s"}</span>
            </div>
            {displayRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#627D98]">No records match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px] text-sm">
                  <thead className="bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Ref / SR</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold">PNR</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Supplier</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Supplier Paid</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Client Received</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Extra</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Pending / Earnings</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Payment</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Booking Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Due Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Submitted By</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Receipt</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
                    {displayRows.map((row) => (
                      <tr key={row.key} className="hover:bg-[#F8FCFF]">
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                              row.type === "staff"
                                ? "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40"
                                : "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]"
                            }`}
                          >
                            {row.type === "staff" ? "Staff" : "Booking"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#102A43]">{row.ref}</td>
                        <td className="px-3 py-2.5">{row.name}</td>
                        <td className="px-3 py-2.5">{row.pnr}</td>
                        <td className="px-3 py-2.5">{row.supplier}</td>
                        <td className="px-3 py-2.5">{row.paid}</td>
                        <td className="px-3 py-2.5">{row.received}</td>
                        <td className="px-3 py-2.5">{row.extra}</td>
                        <td className={`px-3 py-2.5 ${row.dueOrEarningsClass}`}>{row.dueOrEarnings}</td>
                        <td className="px-3 py-2.5">{row.paymentMode}</td>
                        <td className="px-3 py-2.5">{formatDate(row.primaryDate)}</td>
                        <td className="px-3 py-2.5">
                          {row.dueDate ? (
                            formatDate(row.dueDate)
                          ) : row.type === "booking" && row.statusLabel !== "Settled" ? (
                            <span className="inline-flex items-center gap-1 text-[#B42318] font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Not set
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${row.statusClass}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{row.submittedBy || "—"}</td>
                        <td className="px-3 py-2.5">
                          {row.receiptUrl ? (
                            <a
                              href={row.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#009877] font-medium hover:underline"
                            >
                              {row.receiptName || "View"}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px] truncate" title={row.notes}>
                          {row.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function EasyFlyRevenuePage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role ?? "";

  useEffect(() => {
    if (!adminUser) return;
    if (!ADMIN_REVENUE_ROLES.has(role) && !STAFF_ENTRY_ROLES.has(role)) {
      router.replace("/admin/easyfly");
    }
  }, [adminUser, role, router]);

  if (!adminUser) return null;
  if (!ADMIN_REVENUE_ROLES.has(role) && !STAFF_ENTRY_ROLES.has(role)) return null;

  if (ADMIN_REVENUE_ROLES.has(role)) {
    return <EasyFlyAdminRevenueView />;
  }

  if (STAFF_ENTRY_ROLES.has(role)) {
    return <EasyFlyStaffRevenueEntryForm />;
  }

  return null;
}
