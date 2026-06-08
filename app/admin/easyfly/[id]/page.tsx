"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createEasyFlyPaymentLedgerEntry,
  createEasyFlyPaymentOrder,
  deleteEasyFlyBooking,
  deleteEasyFlyPaymentLedgerEntry,
  getEasyFlyBooking,
  listEasyFlyPaymentLedger,
  runEasyFlyAIVerify,
  updateEasyFlyBooking,
  updateEasyFlyPaymentLedgerEntry,
  uploadEasyFlyBookingDocuments,
  uploadEasyFlyPaymentProof,
  verifyEasyFlyPaymentLedgerEntry,
  type EasyFlyBooking,
  type EasyFlyPaymentLedgerEntry,
} from "@/lib/easyfly";
import { adminAuthenticatedFetch } from "@/lib/admin-auth";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  FileText,
  BadgeCheck,
  Upload,
  Plus,
  Eye,
} from "lucide-react";

type RefundStatus = "none" | "pending" | "credit_note";
type ScheduleChange = "none" | "minor" | "major";
type PaymentMode = "card" | "bank_transfer" | "cash";

type BookingFormState = {
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
  paymentDueDate: string;
  paymentMode: PaymentMode;
  depositType: "office" | "home";
  receiptReceived: boolean;
};
type PaymentLedgerEntry = {
  id: string;
  backendId: number | null;
  date: string;
  amount: string;
  method: "cash" | "card" | "bank_transfer" | "payment_link" | "other";
  proof: File | null;
  proofName: string;
  proofUrl: string;
  enteredBy: string;
  status: "unverified" | "verified";
};
type UploadField =
  | "invoice_file"
  | "atol_file"
  | "passport_file"
  | "age_screenshot_file"
  | "payment_screenshot_file"
  | "receipt_file"
  | "transfer_screenshot_file"
  | "ticket_file";

type BookingRow = EasyFlyBooking;

type PassengerEntry = {
  id: string;
  type: "adult" | "youth" | "child" | "infant";
  firstName: string;
  lastName: string;
  dob: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  passportUploaded: boolean;
  passportUrl?: string;
  passportFileName?: string;
};

const createDefaultAdultPassenger = (data: BookingRow): PassengerEntry => ({
  id: `${data.id}-passenger-0`,
  type: "adult",
  firstName: "",
  lastName: "",
  dob: "",
  passportNumber: "",
  passportExpiry: "",
  nationality: "",
  passportUploaded: data.docs.passport,
  passportUrl: data.attachments?.passport?.url,
  passportFileName: data.attachments?.passport?.name,
});

const mapPassengersFromBooking = (data: BookingRow): PassengerEntry[] => {
  const rawPassengers = (data as BookingRow & { passengers?: PassengerEntry[] }).passengers;
  if (Array.isArray(rawPassengers) && rawPassengers.length > 0) {
    return rawPassengers.map((passenger, index) => ({
      id: passenger.id || `${data.id}-passenger-${index}`,
      type: passenger.type || "adult",
      firstName: passenger.firstName || "",
      lastName: passenger.lastName || "",
      dob: passenger.dob || "",
      passportNumber: passenger.passportNumber || "",
      passportExpiry: passenger.passportExpiry || "",
      nationality: passenger.nationality || "",
      passportUploaded: Boolean(passenger.passportUploaded),
      passportUrl: passenger.passportUrl,
      passportFileName: passenger.passportFileName,
    }));
  }
  return [createDefaultAdultPassenger(data)];
};

const passengerFieldClassName =
  "w-full rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] outline-none focus:border-[#33A1FD]";

const mapBookingToForm = (data: BookingRow): BookingFormState => ({
  srNo: data.srNo,
  supplier: data.supplier,
  invoiceNumber: data.invoiceNumber,
  pnr: data.pnr,
  paxName: data.paxName,
  airlineCode: data.airlineCode,
  depDate: data.depDate,
  returnDate: data.returnDate,
  amountPaid: String(data.amountPaid),
  amountReceived: String(data.amountReceived),
  paymentDueDate: data.paymentDueDate || "",
  paymentMode: data.paymentMode,
  depositType: data.depositType,
  receiptReceived: data.receiptReceived,
});

const buildBookingUpdatePayload = (
  form: BookingFormState,
  extras: {
    isYouthCategory: boolean;
    isRefund: boolean;
    refundReceivedFromSupplier: boolean;
    givenToCustomer: boolean;
    scheduleChange: ScheduleChange;
    isReissued: boolean;
  },
) => ({
  sr_no: form.srNo.trim(),
  supplier: form.supplier.trim(),
  invoice_number: form.invoiceNumber.trim(),
  pnr: form.pnr.trim(),
  pax_name: form.paxName.trim(),
  airline_code: form.airlineCode.trim(),
  dep_date: form.depDate,
  return_date: form.returnDate,
  amount_paid: Number.parseInt(form.amountPaid, 10) || 0,
  amount_received: Number.parseInt(form.amountReceived, 10) || 0,
  payment_due_date: form.paymentDueDate || null,
  payment_mode: form.paymentMode,
  deposit_type: form.depositType,
  receipt_received: form.receiptReceived,
  is_youth_category: extras.isYouthCategory,
  refund_status: extras.isRefund ? "credit_note" : "none",
  refund_received_from_supplier: extras.refundReceivedFromSupplier,
  given_to_customer: extras.givenToCustomer,
  schedule_change: extras.scheduleChange,
  is_reissued: extras.isReissued,
});

const createBlankLedgerEntry = (bookingId: number, enteredBy = "Staff"): PaymentLedgerEntry => ({
  id: `${bookingId}-payment-${Date.now()}`,
  backendId: null,
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  method: "cash",
  proof: null,
  proofName: "",
  proofUrl: "",
  enteredBy,
  status: "unverified",
});

const ledgerEntryToLocal = (entry: EasyFlyPaymentLedgerEntry): PaymentLedgerEntry => ({
  id: `${entry.booking}-payment-${entry.id}`,
  backendId: entry.id,
  date: entry.date,
  amount: entry.amount,
  method: entry.method,
  proof: null,
  proofName: entry.proofFileName,
  proofUrl: entry.proofUrl,
  enteredBy: entry.enteredBy,
  status: entry.status,
});

const mapPaymentLedgerFromApi = (
  entries: EasyFlyPaymentLedgerEntry[],
  bookingId: number,
  enteredBy = "Staff",
): PaymentLedgerEntry[] => {
  if (entries.length === 0) {
    return [createBlankLedgerEntry(bookingId, enteredBy)];
  }
  return entries.map(ledgerEntryToLocal);
};

const formatInr = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function LabelValue({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[10px] border border-[#D9E1EA] p-3 bg-white">
      <p className="text-xs text-[#627D98]">{label}</p>
      <p className={`mt-1 text-sm font-medium text-[#102A43] ${valueClassName || ""}`}>{value}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 rounded-[10px] border border-[#D9E1EA] p-3 bg-white">
      <span className="text-xs text-[#627D98]">{label}</span>
      {children}
    </label>
  );
}

function DocumentCard({
  title,
  uploaded,
  icon,
  viewUrl,
  fileName,
  onUpload,
}: {
  title: string;
  uploaded: boolean;
  icon: ReactNode;
  viewUrl?: string;
  fileName?: string;
  onUpload?: (file: File) => void;
}) {
  return (
    <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-[#102A43] font-heading font-semibold text-sm">
          {icon}
          {title}
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
            uploaded
              ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
              : "bg-[#F5F7FA] text-[#627D98] border-[#D9E1EA]"
          }`}
        >
          {uploaded ? "Uploaded" : "Missing"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
          <Upload className="h-3.5 w-3.5" />
          Upload
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && onUpload) {
                onUpload(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </label>

        {uploaded ? (
          <button
            type="button"
            onClick={() => {
              if (viewUrl) {
                window.open(viewUrl, "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        ) : null}
      </div>

      {uploaded && fileName ? (
        <p className="text-xs text-[#627D98] truncate" title={fileName}>
          {fileName}
        </p>
      ) : null}
    </div>
  );
}

function UploadStatusCard({
  title,
  description,
  uploaded,
  fileName,
  viewUrl,
  onUpload,
}: {
  title: string;
  description: string;
  uploaded: boolean;
  fileName?: string;
  viewUrl?: string;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#B8C7D9] bg-[#F8FAFC] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#102A43]">{title}</p>
          <p className="text-xs text-[#486581]">{description}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
            uploaded
              ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
              : "bg-[#F5F7FA] text-[#627D98] border-[#D9E1EA]"
          }`}
        >
          {uploaded ? "Uploaded" : "Missing"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
          <Upload className="h-3.5 w-3.5" />
          Upload
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </label>

        {uploaded ? (
          <button
            type="button"
            onClick={() => {
              if (viewUrl) {
                window.open(viewUrl, "_blank", "noopener,noreferrer");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        ) : null}
      </div>

      {uploaded && fileName ? (
        <p className="text-xs text-[#627D98] truncate" title={fileName}>
          {fileName}
        </p>
      ) : null}
    </div>
  );
}

export default function EasyFlyBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = Number(params?.id);
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const isAdmin = adminUser?.role === "admin";

  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [form, setForm] = useState<BookingFormState>({
    srNo: "",
    supplier: "",
    invoiceNumber: "",
    pnr: "",
    paxName: "",
    airlineCode: "",
    depDate: "",
    returnDate: "",
    amountPaid: "0",
    amountReceived: "0",
    paymentDueDate: "",
    paymentMode: "card",
    depositType: "office",
    receiptReceived: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isYouthCategory, setIsYouthCategory] = useState(false);

  const [isRefund, setIsRefund] = useState(false);
  const [refundReceivedFromSupplier, setRefundReceivedFromSupplier] = useState(false);
  const [givenToCustomer, setGivenToCustomer] = useState(false);

  const [scheduleChange, setScheduleChange] = useState<ScheduleChange>(booking?.scheduleChange || "none");
  const [isReissued, setIsReissued] = useState(false);
  const [passengers, setPassengers] = useState<PassengerEntry[]>([]);
  const [extractingPassengerId, setExtractingPassengerId] = useState<string | null>(null);
  const [paymentLedger, setPaymentLedger] = useState<PaymentLedgerEntry[]>([]);
  const [ticketRiskScore, setTicketRiskScore] = useState<"green" | "amber" | "red" | null>(null);
  const [aiChecks, setAiChecks] = useState<
    Array<{
      check: string;
      result: "pass" | "warning" | "fail" | "missing";
    }>
  >([]);

  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const enteredBy = adminUser?.full_name || adminUser?.username || "Staff";
        const data = await getEasyFlyBooking(bookingId);
        const ledger = await listEasyFlyPaymentLedger(bookingId);
        if (!isMounted) return;
        setBooking(data);
        setForm(mapBookingToForm(data));
        setPassengers(mapPassengersFromBooking(data));
        setPaymentLedger(mapPaymentLedgerFromApi(ledger, bookingId, enteredBy));
        setIsYouthCategory(data.isYouthCategory);
        setIsRefund(data.refundStatus !== "none");
        setRefundReceivedFromSupplier(data.refundReceivedFromSupplier);
        setGivenToCustomer(data.givenToCustomer);
        setScheduleChange(data.scheduleChange);
        setIsReissued(data.isReissued);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Booking not found.");
        setBooking(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadBooking();

    return () => {
      isMounted = false;
    };
  }, [adminUser?.full_name, adminUser?.username, bookingId]);

  if (loading) {
    return (
      <div className="font-body max-w-[1100px] mx-auto space-y-4">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 text-sm text-[#627D98]">
          Loading booking details...
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="font-body max-w-[1100px] mx-auto space-y-4">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5">
          <p className="text-sm text-[#627D98]">{error || "Booking not found."}</p>
          <Link
            href="/admin/easyfly"
            className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const amountPaid = Number.parseInt(form.amountPaid, 10) || 0;
  const amountReceived = Number.parseInt(form.amountReceived, 10) || 0;
  const totalPayment = amountPaid + amountReceived;
  const paymentPending = amountPaid - amountReceived;
  const earnings = amountReceived - amountPaid;

  const updateForm = (patch: Partial<BookingFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };
  const pendingRazorpayAmount = Math.max(0, paymentPending);
  const totalLedgerReceived = paymentLedger.reduce((sum, entry) => sum + (Number.parseFloat(entry.amount) || 0), 0);
  const balancePending = amountPaid - totalLedgerReceived;
  const isFullyPaid = balancePending <= 0;

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete booking ${booking.srNo}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteEasyFlyBooking(booking.id);
      toast.success("Booking deleted successfully.");
      router.push("/admin/easyfly");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete booking.");
    }
  };

  const handleUpload = async (field: UploadField, file: File) => {
    try {
      const updated = await uploadEasyFlyBookingDocuments(booking.id, { [field]: file } as Partial<Record<UploadField, File>>);
      setBooking(updated);
      toast.success("File uploaded successfully.");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Failed to upload file.");
    }
  };

  const handleAddPassenger = () => {
    setPassengers((current) => [
      ...current,
      {
        id: `${booking.id}-passenger-${Date.now()}`,
        type: "adult",
        firstName: "",
        lastName: "",
        dob: "",
        passportNumber: "",
        passportExpiry: "",
        nationality: "",
        passportUploaded: false,
      },
    ]);
  };

  const handleRemovePassenger = (passengerId: string) => {
    setPassengers((current) => current.filter((passenger) => passenger.id !== passengerId));
  };

  const updatePassenger = (passengerId: string, patch: Partial<PassengerEntry>) => {
    setPassengers((current) =>
      current.map((passenger) => (passenger.id === passengerId ? { ...passenger, ...patch } : passenger)),
    );
  };

  const extractPassportDetails = async (file: File, passengerId: string) => {
    setExtractingPassengerId(passengerId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminAuthenticatedFetch("/extract-passport/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }

      const data = await res.json();

      updatePassenger(passengerId, {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        dob: data.dob || "",
        passportNumber: data.passportNumber || "",
        passportExpiry: data.expiry || "",
        nationality: data.nationality || "",
        type: data.passengerType || "adult",
      });

      toast.success("Passport details extracted automatically.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read passport. Please fill in manually.");
    } finally {
      setExtractingPassengerId(null);
    }
  };

  const handlePassportUpload = async (passengerIndex: number, file: File) => {
    try {
      const updated = await uploadEasyFlyBookingDocuments(booking.id, { passport_file: file });
      setBooking(updated);
      setPassengers((current) =>
        current.map((passenger, index) =>
          index === passengerIndex
            ? {
                ...passenger,
                passportUploaded: true,
                passportUrl: updated.attachments?.passport?.url,
                passportFileName: updated.attachments?.passport?.name || file.name,
              }
            : passenger,
        ),
      );
      toast.success("Passport uploaded.");
      const pid = passengers[passengerIndex]?.id;
      if (pid) void extractPassportDetails(file, pid);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Failed to upload passport.");
    }
  };

  const handleRunAiCheck = async () => {
    try {
      const result = await runEasyFlyAIVerify(booking.id);
      setAiChecks(result.checks);
      setTicketRiskScore(result.risk_score);
      toast.success("AI verification complete.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI verification failed.");
    }
  };

  const handleTicketUpload = async (file: File) => {
    await handleUpload("ticket_file", file);
    await handleRunAiCheck();
  };

  const handleCreatePaymentOrder = async () => {
    try {
      const order = await createEasyFlyPaymentOrder(booking.id);
      setBooking((current) =>
        current
          ? {
              ...current,
              paymentStatus: "created",
              razorpayOrderId: order.razorpay_order_id,
            }
          : current,
      );
      toast.success(`Razorpay order created: ${order.razorpay_order_id}`);
    } catch (paymentError) {
      toast.error(paymentError instanceof Error ? paymentError.message : "Failed to create Razorpay order.");
    }
  };

  const handleAddPayment = async () => {
    try {
      const created = await createEasyFlyPaymentLedgerEntry(booking.id, {
        date: new Date().toISOString().slice(0, 10),
        amount: "0",
        method: "cash",
      });
      setPaymentLedger((current) => [...current, ledgerEntryToLocal(created)]);
      toast.success("Payment entry added.");
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : "Failed to add payment entry.");
    }
  };

  const handleRemovePayment = async (entryId: string) => {
    const entry = paymentLedger.find((item) => item.id === entryId);
    if (!entry) return;

    try {
      if (entry.backendId) {
        await deleteEasyFlyPaymentLedgerEntry(booking.id, entry.backendId);
      }
      setPaymentLedger((current) => {
        const next = current.filter((item) => item.id !== entryId);
        if (next.length === 0) {
          return [createBlankLedgerEntry(booking.id, adminUser?.full_name || adminUser?.username || "Staff")];
        }
        return next;
      });
      toast.success("Payment entry removed.");
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : "Failed to remove payment entry.");
    }
  };

  const updatePaymentLedgerEntry = (entryId: string, patch: Partial<PaymentLedgerEntry>) => {
    setPaymentLedger((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    );
  };

  const handleSaveLedgerEntry = async (entryId: string) => {
    const entry = paymentLedger.find((item) => item.id === entryId);
    if (!entry) return;

    try {
      if (entry.backendId) {
        const updated = await updateEasyFlyPaymentLedgerEntry(booking.id, entry.backendId, {
          date: entry.date,
          amount: entry.amount || "0",
          method: entry.method,
        });
        updatePaymentLedgerEntry(entryId, {
          date: updated.date,
          amount: updated.amount,
          method: updated.method,
          proofName: updated.proofFileName,
          proofUrl: updated.proofUrl,
          status: updated.status,
          backendId: updated.id,
        });
      } else {
        const created = await createEasyFlyPaymentLedgerEntry(booking.id, {
          date: entry.date,
          amount: entry.amount || "0",
          method: entry.method,
        });
        updatePaymentLedgerEntry(entryId, ledgerEntryToLocal(created));
      }
      toast.success("Payment entry saved.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save payment entry.");
    }
  };

  const handleLedgerProofUpload = async (entryId: string, file: File) => {
    updatePaymentLedgerEntry(entryId, {
      proof: file,
      proofName: file.name,
    });

    const entry = paymentLedger.find((item) => item.id === entryId);
    if (!entry?.backendId) {
      toast.error("Save the payment entry before uploading proof.");
      return;
    }

    try {
      const updated = await uploadEasyFlyPaymentProof(booking.id, entry.backendId, file);
      updatePaymentLedgerEntry(entryId, {
        proof: null,
        proofName: updated.proofFileName,
        proofUrl: updated.proofUrl,
      });
      toast.success("Receipt uploaded.");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Failed to upload receipt.");
    }
  };

  const handleMarkPaymentVerified = async (entryId: string) => {
    const entry = paymentLedger.find((item) => item.id === entryId);
    if (!entry?.backendId) return;

    try {
      const updated = await verifyEasyFlyPaymentLedgerEntry(booking.id, entry.backendId);
      updatePaymentLedgerEntry(entryId, { status: updated.status });
      toast.success("Payment marked as verified.");
    } catch (verifyError) {
      toast.error(verifyError instanceof Error ? verifyError.message : "Failed to verify payment.");
    }
  };

  const ticketAttachment = booking.attachments?.ticket;

  const bookingUpdatePayload = buildBookingUpdatePayload(form, {
    isYouthCategory,
    isRefund,
    refundReceivedFromSupplier,
    givenToCustomer,
    scheduleChange,
    isReissued,
  });

  const handleSave = async () => {
    if (ticketRiskScore === "red" && !isAdmin) {
      toast.error("Cannot save — critical verification issues found. Contact admin to override.");
      return;
    }

    try {
      if (ticketRiskScore === "red" && isAdmin) {
        const reason = window.prompt("AI check has red issues. Enter override reason to proceed:");
        if (!reason?.trim()) {
          toast.error("Override reason is required to save with red issues.");
          return;
        }
        const updated = await updateEasyFlyBooking(booking.id, {
          ...bookingUpdatePayload,
          ai_override_reason: reason.trim(),
        });
        setBooking(updated);
        setForm(mapBookingToForm(updated));
        toast.success("Booking saved with admin override.");
        return;
      }

      const updated = await updateEasyFlyBooking(booking.id, bookingUpdatePayload);
      setBooking(updated);
      setForm(mapBookingToForm(updated));
      toast.success("Booking details saved successfully.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save booking.");
    }
  };

  return (
    <div className="space-y-4 font-body max-w-[1300px] mx-auto pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Link
            href="/admin/easyfly"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-sm text-[#486581] hover:bg-[#F5F7FA]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Booking Detail</h1>
            <span className="rounded-full bg-[#F5F7FA] border border-[#D9E1EA] px-3 py-1 text-xs text-[#486581] font-semibold">
              {form.pnr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA]"
          >
            <Pencil className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#B42318] px-3 py-2 text-sm font-semibold text-white hover:bg-[#9E1C13]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-4">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Booking Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="SR No.">
            <input
              type="text"
              value={form.srNo}
              onChange={(event) => updateForm({ srNo: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Supplier">
            <input
              type="text"
              value={form.supplier}
              onChange={(event) => updateForm({ supplier: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Invoice Number">
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={(event) => updateForm({ invoiceNumber: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="PNR">
            <input
              type="text"
              value={form.pnr}
              onChange={(event) => updateForm({ pnr: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Pax Name">
            <input
              type="text"
              value={form.paxName}
              onChange={(event) => updateForm({ paxName: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Airline Code">
            <input
              type="text"
              value={form.airlineCode}
              onChange={(event) => updateForm({ airlineCode: event.target.value.toUpperCase() })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Dep Date">
            <input
              type="date"
              value={form.depDate}
              onChange={(event) => updateForm({ depDate: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Return Date">
            <input
              type="date"
              value={form.returnDate}
              onChange={(event) => updateForm({ returnDate: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Amount Paid">
            <input
              type="number"
              min="0"
              step="1"
              value={form.amountPaid}
              onChange={(event) => updateForm({ amountPaid: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Amount Received">
            <input
              type="number"
              min="0"
              step="1"
              value={form.amountReceived}
              onChange={(event) => updateForm({ amountReceived: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Payment Due Date">
            <input
              type="date"
              value={form.paymentDueDate}
              onChange={(event) => updateForm({ paymentDueDate: event.target.value })}
              className={passengerFieldClassName}
            />
          </FormField>
          <FormField label="Payment Mode">
            <select
              value={form.paymentMode}
              onChange={(event) => updateForm({ paymentMode: event.target.value as PaymentMode })}
              className={passengerFieldClassName}
            >
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </FormField>
          <FormField label="Deposit Type">
            <select
              value={form.depositType}
              onChange={(event) => updateForm({ depositType: event.target.value as BookingFormState["depositType"] })}
              className={passengerFieldClassName}
            >
              <option value="office">Office</option>
              <option value="home">Home Deposit</option>
            </select>
          </FormField>
          <FormField label="Receipt Received">
            <select
              value={form.receiptReceived ? "yes" : "no"}
              onChange={(event) => updateForm({ receiptReceived: event.target.value === "yes" })}
              className={passengerFieldClassName}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelValue label="Total Payment" value={formatInr(totalPayment)} />
          <LabelValue
            label="Payment Pending"
            value={formatInr(Math.max(0, paymentPending))}
            valueClassName="text-[#8D5E12]"
          />
          <LabelValue
            label="Earnings"
            value={formatInr(earnings)}
            valueClassName={earnings >= 0 ? "text-[#006F57]" : "text-[#B42318]"}
          />
        </div>
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-sm font-heading font-semibold text-[#102A43] mb-3">Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DocumentCard
            title="Invoice"
            uploaded={booking.docs.invoice}
            viewUrl={booking.attachments?.invoice?.url || ""}
            fileName={booking.attachments?.invoice?.name || ""}
            onUpload={(file) => void handleUpload("invoice_file", file)}
            icon={<FileText className="h-4 w-4 text-[#009877]" />}
          />
          <DocumentCard
            title="ATOL"
            uploaded={booking.docs.atol}
            viewUrl={booking.attachments?.atol?.url || ""}
            fileName={booking.attachments?.atol?.name || ""}
            onUpload={(file) => void handleUpload("atol_file", file)}
            icon={<BadgeCheck className="h-4 w-4 text-[#009877]" />}
          />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-heading font-semibold text-[#102A43]">Passengers & Passports</h3>
            <button
              type="button"
              onClick={handleAddPassenger}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Passenger
            </button>
          </div>

          {passengers.map((passenger, index) => (
            <div key={passenger.id} className="rounded-[12px] border border-[#D9E1EA] bg-[#F8FAFC] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">Type</span>
                  <select
                    value={passenger.type}
                    onChange={(event) =>
                      updatePassenger(passenger.id, { type: event.target.value as PassengerEntry["type"] })
                    }
                    className={passengerFieldClassName}
                  >
                    <option value="adult">Adult</option>
                    <option value="youth">Youth</option>
                    <option value="child">Child</option>
                    <option value="infant">Infant</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">First Name</span>
                  <input
                    type="text"
                    value={passenger.firstName}
                    onChange={(event) => updatePassenger(passenger.id, { firstName: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">Last Name</span>
                  <input
                    type="text"
                    value={passenger.lastName}
                    onChange={(event) => updatePassenger(passenger.id, { lastName: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">DOB</span>
                  <input
                    type="date"
                    value={passenger.dob}
                    onChange={(event) => updatePassenger(passenger.id, { dob: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">Passport Number</span>
                  <input
                    type="text"
                    value={passenger.passportNumber}
                    onChange={(event) => updatePassenger(passenger.id, { passportNumber: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">Passport Expiry</span>
                  <input
                    type="date"
                    value={passenger.passportExpiry}
                    onChange={(event) => updatePassenger(passenger.id, { passportExpiry: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[#627D98]">Nationality</span>
                  <input
                    type="text"
                    value={passenger.nationality}
                    onChange={(event) => updatePassenger(passenger.id, { nationality: event.target.value })}
                    className={passengerFieldClassName}
                  />
                </label>
              </div>

              <UploadStatusCard
                title={`Passport — ${passenger.firstName || passenger.lastName ? `${passenger.firstName} ${passenger.lastName}`.trim() : `Passenger ${index + 1}`}`}
                description="Upload this passenger's passport copy."
                uploaded={passenger.passportUploaded}
                fileName={passenger.passportFileName || ""}
                viewUrl={passenger.passportUrl || ""}
                onUpload={(file) => void handlePassportUpload(index, file)}
              />

              {extractingPassengerId === passenger.id ? (
                <p className="text-xs text-[#0B69B7] animate-pulse flex items-center gap-1.5">
                  <span>✦</span> Reading passport details...
                </p>
              ) : null}

              {passengers.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => handleRemovePassenger(passenger.id)}
                  className="text-xs font-semibold text-[#B42318] hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Ticket & AI Verification</h2>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex-1">
            <UploadStatusCard
              title="Flight Ticket"
              description="Upload ticket PDF or image. AI will extract and verify passenger details automatically."
              uploaded={ticketAttachment?.uploaded || false}
              fileName={ticketAttachment?.name || ""}
              viewUrl={ticketAttachment?.url || ""}
              onUpload={(file) => void handleTicketUpload(file)}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleRunAiCheck()}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#33A1FD]/35 bg-[#33A1FD]/10 px-3 py-1.5 text-xs font-semibold text-[#0B69B7] hover:bg-[#33A1FD]/18"
          >
            Run AI Verification
          </button>
        </div>

        {aiChecks.length > 0 ? (
          <div className="space-y-2">
            {aiChecks.map((item) => (
              <div
                key={item.check}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5"
              >
                <span className="text-sm text-[#102A43]">{item.check}</span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                    item.result === "pass"
                      ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
                      : item.result === "warning"
                        ? "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40"
                        : item.result === "fail"
                          ? "bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45"
                          : "bg-[#F5F7FA] text-[#486581] border-[#D9E1EA]"
                  }`}
                >
                  {item.result === "pass"
                    ? "Pass ✓"
                    : item.result === "warning"
                      ? "Warning ⚠"
                      : item.result === "fail"
                        ? "Fail ✗"
                        : "Missing"}
                </span>
              </div>
            ))}

            {ticketRiskScore === "green" ? (
              <div className="rounded-[10px] border px-4 py-3 text-sm font-semibold w-full mt-2 bg-[#009877]/12 text-[#006F57] border-[#009877]/35">
                ✓ All checks passed — Booking is low risk
              </div>
            ) : null}
            {ticketRiskScore === "amber" ? (
              <div className="rounded-[10px] border px-4 py-3 text-sm font-semibold w-full mt-2 bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40">
                ⚠ Minor issues found — Review before closing
              </div>
            ) : null}
            {ticketRiskScore === "red" ? (
              <div className="rounded-[10px] border px-4 py-3 text-sm font-semibold w-full mt-2 bg-[#FDECEC] text-[#B42318] border-[#F1A7A0]/45">
                ✗ Critical issues — Do not close this booking
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Child / Infant / Youth</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#486581]">Is passenger a child/infant/youth?</span>
          <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsYouthCategory(true)}
              className={`px-3 py-1.5 text-xs font-semibold ${isYouthCategory ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setIsYouthCategory(false)}
              className={`px-3 py-1.5 text-xs font-semibold ${!isYouthCategory ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
            >
              No
            </button>
          </div>
        </div>

        {isYouthCategory ? (
          <UploadStatusCard
            title="Age calculator screenshot"
            description="Upload the youth/age proof screenshot."
            uploaded={booking.attachments?.age_screenshot?.uploaded || false}
            fileName={booking.attachments?.age_screenshot?.name || ""}
            viewUrl={booking.attachments?.age_screenshot?.url || ""}
            onUpload={(file) => void handleUpload("age_screenshot_file", file)}
          />
        ) : (
          <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-2.5 py-1 text-xs font-medium text-[#006F57]">
            Not applicable
          </span>
        )}
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Payment Ledger</h2>
          <button
            type="button"
            onClick={() => void handleAddPayment()}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Payment
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold bg-[#009877]/12 text-[#006F57] border-[#009877]/35">
            Total Received: {formatInr(totalLedgerReceived)}
          </span>
          <span className="inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40">
            Balance Pending: {formatInr(Math.max(0, balancePending))}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isFullyPaid
                ? "bg-[#009877]/12 text-[#006F57] border-[#009877]/35"
                : "bg-[#F9DBAF]/35 text-[#8D5E12] border-[#D4A84F]/40"
            }`}
          >
            {isFullyPaid ? "Fully Paid" : "Partially Paid"}
          </span>
        </div>

        {pendingRazorpayAmount > 0 ? (
          <button
            type="button"
            onClick={handleCreatePaymentOrder}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA]"
          >
            <Plus className="h-4 w-4" />
            Create Razorpay Order
          </button>
        ) : null}

        {paymentLedger.map((entry) => (
          <div key={entry.id} className="rounded-[12px] border border-[#D9E1EA] bg-[#F8FAFC] p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-[#627D98]">Date</span>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(event) => updatePaymentLedgerEntry(entry.id, { date: event.target.value })}
                  className={passengerFieldClassName}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[#627D98]">Amount £</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entry.amount}
                  onChange={(event) => updatePaymentLedgerEntry(entry.id, { amount: event.target.value })}
                  className={passengerFieldClassName}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[#627D98]">Method</span>
                <select
                  value={entry.method}
                  onChange={(event) =>
                    updatePaymentLedgerEntry(entry.id, {
                      method: event.target.value as PaymentLedgerEntry["method"],
                    })
                  }
                  className={passengerFieldClassName}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="payment_link">Payment Link</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
                <Upload className="h-3.5 w-3.5" />
                Upload Receipt/Screenshot
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleLedgerProofUpload(entry.id, file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {entry.proofName ? (
                <p className="mt-1 text-xs text-[#627D98] truncate" title={entry.proofName}>
                  {entry.proofName}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {entry.status === "verified" ? (
                <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-[#009877]/12 text-[#006F57] border-[#009877]/35">
                  Verified
                </span>
              ) : (
                <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-[#F5F7FA] text-[#486581] border-[#D9E1EA]">
                  Unverified
                </span>
              )}
              {isAdmin && entry.status === "unverified" ? (
                <button
                  type="button"
                  onClick={() => void handleMarkPaymentVerified(entry.id)}
                  className="text-xs bg-[#009877]/12 text-[#006F57] border border-[#009877]/35 px-2 py-1 rounded-full font-semibold hover:bg-[#009877]/18"
                >
                  Mark Verified
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleSaveLedgerEntry(entry.id)}
                className="text-xs bg-[#33A1FD]/10 text-[#0B69B7] border border-[#33A1FD]/35 px-2 py-1 rounded-full font-semibold hover:bg-[#33A1FD]/18"
              >
                Save
              </button>
            </div>

            {paymentLedger.length >= 2 && (isAdmin || entry.status !== "verified") ? (
              <button
                type="button"
                onClick={() => void handleRemovePayment(entry.id)}
                className="text-xs font-semibold text-[#B42318] hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Refund</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#486581]">Refund?</span>
          <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsRefund(true)}
              className={`px-3 py-1.5 text-xs font-semibold ${isRefund ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setIsRefund(false)}
              className={`px-3 py-1.5 text-xs font-semibold ${!isRefund ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
            >
              No
            </button>
          </div>
        </div>

        {!isRefund ? (
          <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-2.5 py-1 text-xs font-medium text-[#006F57]">
            No refund
          </span>
        ) : (
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-[#B197FC]/40 bg-[#EDE4FF] px-2.5 py-1 text-xs font-medium text-[#5F3DC4]">
              Credit Note
            </span>

            <div className="flex items-center gap-3">
              <span className="text-sm text-[#486581]">Refund received from supplier?</span>
              <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRefundReceivedFromSupplier(true)}
                  className={`px-3 py-1.5 text-xs font-semibold ${refundReceivedFromSupplier ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setRefundReceivedFromSupplier(false)}
                  className={`px-3 py-1.5 text-xs font-semibold ${!refundReceivedFromSupplier ? "bg-[#B42318] text-white" : "bg-white text-[#486581]"}`}
                >
                  No
                </button>
              </div>
            </div>

            {refundReceivedFromSupplier ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#486581]">Given to customer?</span>
                  <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setGivenToCustomer(true)}
                      className={`px-3 py-1.5 text-xs font-semibold ${givenToCustomer ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setGivenToCustomer(false)}
                      className={`px-3 py-1.5 text-xs font-semibold ${!givenToCustomer ? "bg-[#B87333] text-white" : "bg-white text-[#486581]"}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {givenToCustomer ? (
                  <div className="rounded-[10px] border border-dashed border-[#B8C7D9] bg-[#F8FAFC] p-4">
                    <p className="text-sm text-[#486581]">Upload transfer screenshot</p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
                      <Upload className="h-3.5 w-3.5" />
                      Upload SS
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleUpload("transfer_screenshot_file", file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <span className="inline-flex rounded-full border border-[#D4A84F]/40 bg-[#F9DBAF]/35 px-2.5 py-1 text-xs font-medium text-[#8D5E12]">
                    Pending
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex rounded-full border border-[#F1A7A0]/45 bg-[#FDECEC] px-2.5 py-1 text-xs font-medium text-[#B42318]">
                Chasing supplier
              </span>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 space-y-3">
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Schedule Change</h2>
        <select
          value={scheduleChange}
          onChange={(e) => setScheduleChange(e.target.value as ScheduleChange)}
          className="w-full md:w-[260px] rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] outline-none focus:border-[#33A1FD]"
        >
          <option value="none">None</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
        </select>

        {scheduleChange === "minor" ? (
          <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-2.5 py-1 text-xs font-medium text-[#006F57]">
            Inform customer
          </span>
        ) : null}

        {scheduleChange === "major" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#486581]">Re-issued?</span>
              <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsReissued(true)}
                  className={`px-3 py-1.5 text-xs font-semibold ${isReissued ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsReissued(false)}
                  className={`px-3 py-1.5 text-xs font-semibold ${!isReissued ? "bg-[#5F3DC4] text-white" : "bg-white text-[#486581]"}`}
                >
                  No
                </button>
              </div>
            </div>

            {isReissued ? (
              <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-2.5 py-1 text-xs font-medium text-[#006F57]">
                Re-issued
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-[#B197FC]/40 bg-[#EDE4FF] px-2.5 py-1 text-xs font-medium text-[#5F3DC4]">
                Credit Note
              </span>
            )}
          </div>
        ) : null}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 bg-[#009877] text-white px-5 py-2.5 rounded-[10px] text-sm font-heading font-semibold hover:bg-[#007B61]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
