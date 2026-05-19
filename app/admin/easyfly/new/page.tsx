"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { createEasyFlyBooking } from "@/lib/easyfly";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { ChevronLeft } from "lucide-react";

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function NewEasyFlyBookingPage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const todayDateValue = useMemo(() => toDateInputValue(new Date()), []);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
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

  const handleCreateBooking = async () => {
    if (!createForm.srNo || !createForm.supplier || !createForm.pnr || !createForm.paxName) {
      toast.error("SR No, supplier, PNR, and pax name are required.");
      return;
    }

    setCreateSaving(true);
    try {
      await createEasyFlyBooking({
        sr_no: createForm.srNo,
        supplier: createForm.supplier,
        invoice_number: createForm.invoiceNumber || createForm.srNo,
        pnr: createForm.pnr,
        pax_name: createForm.paxName,
        airline_code: createForm.airlineCode || "AI",
        dep_date: createForm.depDate,
        return_date: createForm.returnDate || createForm.depDate,
        amount_paid: Number(createForm.amountPaid || 0),
        amount_received: Number(createForm.amountReceived || 0),
        amount_due: Math.max(0, Number(createForm.amountPaid || 0) - Number(createForm.amountReceived || 0)),
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

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 font-body">
      <section className="overflow-hidden rounded-[20px] border border-[#D9E1EA] bg-gradient-to-r from-[#FFFFFF] via-[#FBFDFF] to-[#F7FCFA] shadow-[0_12px_30px_rgba(16,42,67,0.06)]">
        <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="space-y-2">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full border border-[#D9E1EA] bg-white px-3 py-1 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div>
              <h1 className="text-[28px] font-heading font-semibold leading-tight text-[#102A43]">Add EasyFly Booking</h1>
              <p className="mt-1 max-w-2xl text-sm text-[#627D98]">Create a booking in a clean, step-free form designed for quick entry and fewer mistakes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* <div className="rounded-[20px] border border-[#D9E1EA] bg-white p-5 shadow-[0_10px_24px_rgba(16,42,67,0.05)] md:p-6"> */}
      <div className="rounded-[20px] border border-[#D9E1EA] bg-white shadow-[0_10px_24px_rgba(16,42,67,0.05)] overflow-hidden">
  <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-5 md:p-6 scrollbar-none">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["srNo", "SR No.", "text"],
            ["supplier", "Supplier", "text"],
            ["invoiceNumber", "Invoice Number", "text"],
            ["pnr", "PNR", "text"],
            ["paxName", "Pax Name", "text"],
            ["airlineCode", "Airline Code", "text"],
            ["depDate", "Dep Date", "date"],
            ["returnDate", "Return Date", "date"],
            ["amountPaid", "Amount Paid", "number"],
            ["amountReceived", "Amount Received", "number"],
          ].map(([key, label, inputType]) => (
            <label key={String(key)} className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-[#627D98]">{label}</span>
              <input
                type={String(inputType)}
                min={String(key) === "depDate" ? todayDateValue : String(key) === "returnDate" ? returnDateMin : undefined}
                value={(createForm as any)[String(key)]}
                onChange={(e) =>
                  setCreateForm((current) => {
                    if (String(key) === "depDate") {
                      const nextReturnDate = (current as any).returnDate && (current as any).returnDate < e.target.value ? "" : (current as any).returnDate;
                      return { ...(current as any), depDate: e.target.value, returnDate: nextReturnDate } as any;
                    }
                    return { ...(current as any), [String(key)]: e.target.value } as any;
                  })
                }
                className="w-full rounded-[12px] border border-[#D9E1EA] bg-[#FBFCFE] px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[16px] border border-[#E5EAF0] bg-[#FBFCFE] p-4">
          <select value={createForm.refundStatus} onChange={(e) => setCreateForm((c) => ({ ...(c as any), refundStatus: e.target.value }))} className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]">
            <option value="none">Refund: None</option>
            <option value="pending">Refund: Pending</option>
            <option value="credit_note">Refund: Credit Note</option>
          </select>

          <select value={createForm.scheduleChange} onChange={(e) => setCreateForm((c) => ({ ...(c as any), scheduleChange: e.target.value }))} className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]">
            <option value="none">Schedule: None</option>
            <option value="minor">Schedule: Minor</option>
            <option value="major">Schedule: Major</option>
          </select>

          <select value={createForm.paymentMode} onChange={(e) => setCreateForm((c) => ({ ...(c as any), paymentMode: e.target.value }))} className="rounded-[12px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-colors focus:border-[#33A1FD]">
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
          </select>

          <button onClick={handleCreateBooking} disabled={createSaving} className="inline-flex items-center gap-2 rounded-[12px] bg-[#009877] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,152,119,0.18)] transition-colors hover:bg-[#007B61] disabled:opacity-60">
            <Plus className="w-4 h-4" />
            {createSaving ? "Saving..." : "Create Booking"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
