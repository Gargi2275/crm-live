"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  createEasyFlyBooking,
  EASYFLY_PAYMENT_MODE_OPTIONS,
  easyflyPaymentMethodChipClass,
  type PaymentMode,
} from "@/lib/easyfly";
import toast from "react-hot-toast";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ChevronLeft, Plus } from "lucide-react";

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fieldClass =
  "mt-1.5 w-full rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#009877] focus:ring-2 focus:ring-[#009877]/15";

const formatInr = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;

type CreateForm = {
  srNo: string;
  supplier: string;
  invoiceNumber: string;
  pnr: string;
  paxName: string;
  airlineCode: string;
  depDate: string;
  returnDate: string;
  payAgreed: string;
  paid: string;
  supplierFees: string;
  refundStatus: string;
  scheduleChange: string;
  paymentMode: PaymentMode;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#486581]">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-[#829AB1]">{hint}</span> : null}
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "ok" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "text-[#8D5E12]"
      : tone === "ok"
        ? "text-[#006F57]"
        : tone === "info"
          ? "text-[#1E40AF]"
          : "text-[#102A43]";
  return (
    <div className="rounded-[12px] border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#627D98]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function NewEasyFlyBookingPage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const todayDateValue = useMemo(() => toDateInputValue(new Date()), []);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    srNo: "",
    supplier: "",
    invoiceNumber: "",
    pnr: "",
    paxName: "",
    airlineCode: "",
    depDate: "",
    returnDate: "",
    payAgreed: "",
    paid: "",
    supplierFees: "",
    refundStatus: "none",
    scheduleChange: "none",
    paymentMode: "card",
  });

  const returnDateMin = useMemo(() => {
    if (!createForm.depDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return toDateInputValue(tomorrow);
    }
    const depDate = new Date(`${createForm.depDate}T00:00:00`);
    depDate.setDate(depDate.getDate() + 1);
    return toDateInputValue(depDate);
  }, [createForm.depDate]);

  const payAgreed = Number(createForm.payAgreed || 0);
  const paid = Number(createForm.paid || 0);
  const supplierFees = Number(createForm.supplierFees || 0);
  const pendingAmount = Math.max(0, payAgreed - paid);
  const earnings = paid - supplierFees;

  const updateField = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setCreateForm((current) => {
      if (key === "depDate") {
        const nextDep = String(value);
        const nextReturn =
          current.returnDate && current.returnDate < nextDep ? "" : current.returnDate;
        return { ...current, depDate: nextDep, returnDate: nextReturn };
      }
      return { ...current, [key]: value };
    });
  };

  const handleCreateBooking = async () => {
    if (!createForm.srNo || !createForm.supplier || !createForm.pnr || !createForm.paxName) {
      toast.error("SR No, supplier, PNR, and pax name are required.");
      return;
    }
    if (!createForm.depDate) {
      toast.error("Departure date is required.");
      return;
    }

    setCreateSaving(true);
    try {
      await createEasyFlyBooking({
        sr_no: createForm.srNo.trim(),
        supplier: createForm.supplier.trim(),
        invoice_number: createForm.invoiceNumber.trim() || createForm.srNo.trim(),
        pnr: createForm.pnr.trim(),
        pax_name: createForm.paxName.trim(),
        airline_code: createForm.airlineCode.trim() || "AI",
        dep_date: createForm.depDate,
        return_date: createForm.returnDate || createForm.depDate,
        amount_paid: supplierFees,
        amount_received: paid,
        pay_agreed: payAgreed,
        amount_due: pendingAmount,
        extra_amount: 0,
        refund_status: createForm.refundStatus,
        schedule_change: createForm.scheduleChange,
        payment_mode: createForm.paymentMode,
        docs_invoice: true,
        docs_atol: false,
        docs_passport: false,
        is_youth_category: false,
        deposit_type: "office",
        receipt_received: false,
        refund_received_from_supplier: false,
        given_to_customer: false,
        is_reissued: false,
      });

      toast.success("Booking created.");
      router.push("/admin/easyfly");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create booking.");
    } finally {
      setCreateSaving(false);
    }
  };

  useSetAdminPageChrome({
    title: "Add Booking",
    subtitle: "Supplier, client amounts & travel details",
    icon: Plus,
    syncKey: `${createSaving ? 1 : 0}|${adminUser?.username ?? ""}|${createForm.payAgreed}|${createForm.paid}|${createForm.supplierFees}`,
    actions: (
      <>
        <button
          type="button"
          onClick={() => router.push("/admin/easyfly")}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={() => void handleCreateBooking()}
          disabled={createSaving}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {createSaving ? "Saving…" : "Create booking"}
        </button>
      </>
    ),
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 font-body pb-8">
      <section className="rounded-[14px] border border-[#D9E1EA] bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Booking details</h2>
        <p className="mt-0.5 text-xs text-[#627D98]">Passenger, supplier and ticket identifiers</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="SR No.">
            <input
              type="text"
              value={createForm.srNo}
              onChange={(e) => updateField("srNo", e.target.value)}
              className={fieldClass}
              placeholder="e.g. EF-2026-001"
            />
          </Field>
          <Field label="Supplier">
            <input
              type="text"
              value={createForm.supplier}
              onChange={(e) => updateField("supplier", e.target.value)}
              className={fieldClass}
              placeholder="Supplier name"
            />
          </Field>
          <Field label="Invoice number">
            <input
              type="text"
              value={createForm.invoiceNumber}
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
              className={fieldClass}
              placeholder="Defaults to SR No. if empty"
            />
          </Field>
          <Field label="PNR">
            <input
              type="text"
              value={createForm.pnr}
              onChange={(e) => updateField("pnr", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Pax name">
            <input
              type="text"
              value={createForm.paxName}
              onChange={(e) => updateField("paxName", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Airline code">
            <input
              type="text"
              value={createForm.airlineCode}
              onChange={(e) => updateField("airlineCode", e.target.value)}
              className={fieldClass}
              placeholder="AI"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#D9E1EA] bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Travel dates</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Departure date">
            <input
              type="date"
              min={todayDateValue}
              value={createForm.depDate}
              onChange={(e) => updateField("depDate", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Return date">
            <input
              type="date"
              min={returnDateMin}
              value={createForm.returnDate}
              onChange={(e) => updateField("returnDate", e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#D9E1EA] bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Amounts</h2>
        <p className="mt-0.5 text-xs text-[#627D98]">
          Pay agreed, paid, pending balance, and supplier fees
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Pay Agreed" hint="Total amount agreed with the customer">
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.payAgreed}
              onChange={(e) => updateField("payAgreed", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
          <Field label="Paid" hint="Amount paid by the customer so far">
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.paid}
              onChange={(e) => updateField("paid", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
          <Field label="Pending amount" hint="Auto: pay agreed − paid">
            <input
              type="text"
              readOnly
              value={formatInr(pendingAmount)}
              className={`${fieldClass} cursor-default bg-[#FFF8F0] text-[#8D5E12] font-semibold`}
              tabIndex={-1}
            />
          </Field>
          <Field label="Supplier fees" hint="Fees / amount paid to the supplier">
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.supplierFees}
              onChange={(e) => updateField("supplierFees", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Pay agreed" value={formatInr(payAgreed)} />
          <SummaryCard label="Paid" value={formatInr(paid)} tone="ok" />
          <SummaryCard label="Pending" value={formatInr(pendingAmount)} tone="warn" />
          <SummaryCard label="Supplier fees" value={formatInr(supplierFees)} tone="info" />
        </div>
        <p className="mt-3 text-xs text-[#627D98]">
          Earnings preview:{" "}
          <span className={`font-semibold ${earnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}`}>
            {formatInr(earnings)}
          </span>
          <span className="text-[#829AB1]"> (paid − supplier fees)</span>
        </p>
      </section>

      <section className="rounded-[14px] border border-[#D9E1EA] bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Status & payment</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Refund status">
            <select
              value={createForm.refundStatus}
              onChange={(e) => updateField("refundStatus", e.target.value)}
              className={fieldClass}
            >
              <option value="none">None</option>
              <option value="pending">Pending</option>
              <option value="credit_note">Credit note</option>
            </select>
          </Field>
          <Field label="Schedule change">
            <select
              value={createForm.scheduleChange}
              onChange={(e) => updateField("scheduleChange", e.target.value)}
              className={fieldClass}
            >
              <option value="none">None</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </Field>
          <div className="sm:col-span-2 rounded-[12px] border border-[#D9E1EA] bg-[#F8FAFC] p-3">
            <span className="text-xs font-semibold text-[#486581]">Payment mode</span>
            <p className="mt-0.5 text-[11px] text-[#829AB1]">Choose how this booking was paid — shown in the bookings table.</p>
            <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Payment mode">
              {EASYFLY_PAYMENT_MODE_OPTIONS.map((option) => {
                const selected = createForm.paymentMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("paymentMode", option.value)}
                    className={easyflyPaymentMethodChipClass(option.value, selected)}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
