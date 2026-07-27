"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { createEasyFlyBooking } from "@/lib/easyfly";
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
  amountPaid: string;
  amountReceived: string;
  extraAmount: string;
  refundStatus: string;
  scheduleChange: string;
  paymentMode: string;
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
    amountPaid: "",
    amountReceived: "",
    extraAmount: "",
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

  const supplierPaid = Number(createForm.amountPaid || 0);
  const clientReceived = Number(createForm.amountReceived || 0);
  const extraCharges = Number(createForm.extraAmount || 0);
  const clientPending = Math.max(0, supplierPaid - clientReceived);
  const earnings = clientReceived - supplierPaid;

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
        amount_paid: supplierPaid,
        amount_received: clientReceived,
        amount_due: clientPending,
        extra_amount: extraCharges,
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
    syncKey: `${createSaving ? 1 : 0}|${adminUser?.username ?? ""}|${createForm.amountPaid}|${createForm.amountReceived}`,
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
          Supplier cost, client payment, pending balance, and any extra charges
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Supplier paid amount" hint="Amount paid to the supplier / ticket cost">
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.amountPaid}
              onChange={(e) => updateField("amountPaid", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
          <Field label="Client / customer received" hint="Amount received from the client">
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.amountReceived}
              onChange={(e) => updateField("amountReceived", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
          <Field
            label="Client amount pending"
            hint="Auto: supplier paid − client received"
          >
            <input
              type="text"
              readOnly
              value={formatInr(clientPending)}
              className={`${fieldClass} cursor-default bg-[#FFF8F0] text-[#8D5E12] font-semibold`}
              tabIndex={-1}
            />
          </Field>
          <Field
            label="Extra charges paid to"
            hint="Any extra paid to supplier, client, or anyone else"
          >
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.extraAmount}
              onChange={(e) => updateField("extraAmount", e.target.value)}
              className={fieldClass}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Supplier paid" value={formatInr(supplierPaid)} />
          <SummaryCard label="Client received" value={formatInr(clientReceived)} tone="ok" />
          <SummaryCard label="Client pending" value={formatInr(clientPending)} tone="warn" />
          <SummaryCard label="Extra charges" value={formatInr(extraCharges)} tone="info" />
        </div>
        <p className="mt-3 text-xs text-[#627D98]">
          Earnings preview:{" "}
          <span className={`font-semibold ${earnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}`}>
            {formatInr(earnings)}
          </span>
          <span className="text-[#829AB1]"> (client received − supplier paid)</span>
        </p>
      </section>

      <section className="rounded-[14px] border border-[#D9E1EA] bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.04)]">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Status & payment</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Field label="Payment mode">
            <select
              value={createForm.paymentMode}
              onChange={(e) => updateField("paymentMode", e.target.value)}
              className={fieldClass}
            >
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
          </Field>
        </div>
      </section>
    </div>
  );
}
