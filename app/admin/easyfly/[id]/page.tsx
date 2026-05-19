"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createEasyFlyPaymentOrder,
  deleteEasyFlyBooking,
  getEasyFlyBooking,
  updateEasyFlyBooking,
  uploadEasyFlyBookingDocuments,
  type EasyFlyBooking,
} from "@/lib/easyfly";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  FileText,
  BadgeCheck,
  IdCard,
  Upload,
  Plus,
  Eye,
} from "lucide-react";

type RefundStatus = "none" | "pending" | "credit_note";
type ScheduleChange = "none" | "minor" | "major";
type ModeOfPayment = "card" | "bank_transfer" | "cash";
type DepositType = "office" | "home";
type UploadField =
  | "invoice_file"
  | "atol_file"
  | "passport_file"
  | "age_screenshot_file"
  | "payment_screenshot_file"
  | "receipt_file"
  | "transfer_screenshot_file";

type BookingRow = EasyFlyBooking;

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

  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isYouthCategory, setIsYouthCategory] = useState(false);
  const [modeOfPayment, setModeOfPayment] = useState<ModeOfPayment>("card");
  const [depositType, setDepositType] = useState<DepositType>("office");
  const [receiptReceived, setReceiptReceived] = useState(false);

  const [isRefund, setIsRefund] = useState(false);
  const [refundReceivedFromSupplier, setRefundReceivedFromSupplier] = useState(false);
  const [givenToCustomer, setGivenToCustomer] = useState(false);

  const [scheduleChange, setScheduleChange] = useState<ScheduleChange>(booking?.scheduleChange || "none");
  const [isReissued, setIsReissued] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEasyFlyBooking(bookingId);
        if (!isMounted) return;
        setBooking(data);
        setIsYouthCategory(data.isYouthCategory);
        setModeOfPayment(data.paymentMode);
        setDepositType(data.depositType);
        setReceiptReceived(data.receiptReceived);
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
  }, [bookingId]);

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

  const totalPayment = booking.amountPaid + booking.amountReceived;
  const paymentPending = booking.amountPaid - booking.amountReceived;
  const earnings = booking.amountReceived - booking.amountPaid;
  const pendingRazorpayAmount = Math.max(0, paymentPending);

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

  const handleSave = async () => {
    try {
      const updated = await updateEasyFlyBooking(booking.id, {
        is_youth_category: isYouthCategory,
        payment_mode: modeOfPayment,
        deposit_type: depositType,
        receipt_received: receiptReceived,
        refund_status: isRefund ? "credit_note" : "none",
        refund_received_from_supplier: refundReceivedFromSupplier,
        given_to_customer: givenToCustomer,
        schedule_change: scheduleChange,
        is_reissued: isReissued,
      });
      setBooking(updated);
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
              {booking.pnr}
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
            Edit
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

      <section className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-sm font-heading font-semibold text-[#102A43] mb-3">Booking Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelValue label="Supplier" value={booking.supplier} />
          <LabelValue label="Invoice Number" value={booking.invoiceNumber} />
          <LabelValue label="PNR" value={booking.pnr} />
          <LabelValue label="Pax Name" value={booking.paxName} />
          <LabelValue label="Airline Code" value={booking.airlineCode} />
          <LabelValue label="Dep Date" value={formatDate(booking.depDate)} />
          <LabelValue label="Return Date" value={formatDate(booking.returnDate)} />
          <LabelValue label="Amount Paid" value={formatInr(booking.amountPaid)} />
          <LabelValue label="Amount Received" value={formatInr(booking.amountReceived)} />
          <LabelValue label="Total Payment" value={formatInr(totalPayment)} />
          <LabelValue label="Payment Pending" value={formatInr(Math.max(0, paymentPending))} valueClassName="text-[#8D5E12]" />
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
          <DocumentCard
            title="Customer Passport"
            uploaded={booking.docs.passport}
            viewUrl={booking.attachments?.passport?.url || ""}
            fileName={booking.attachments?.passport?.name || ""}
            onUpload={(file) => void handleUpload("passport_file", file)}
            icon={<IdCard className="h-4 w-4 text-[#009877]" />}
          />
        </div>
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
        <h2 className="text-sm font-heading font-semibold text-[#102A43]">Mode of Payment</h2>
        <select
          value={modeOfPayment}
          onChange={(e) => setModeOfPayment(e.target.value as ModeOfPayment)}
          className="w-full md:w-[260px] rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] outline-none focus:border-[#33A1FD]"
        >
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
        </select>

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

        {modeOfPayment === "card" || modeOfPayment === "bank_transfer" ? (
          <UploadStatusCard
            title="Payment screenshot"
            description="Upload the card or bank-transfer payment proof."
            uploaded={booking.attachments?.payment_screenshot?.uploaded || false}
            fileName={booking.attachments?.payment_screenshot?.name || ""}
            viewUrl={booking.attachments?.payment_screenshot?.url || ""}
            onUpload={(file) => void handleUpload("payment_screenshot_file", file)}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDepositType("office")}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold border ${
                  depositType === "office"
                    ? "bg-[#009877] border-[#009877] text-white"
                    : "bg-white border-[#D9E1EA] text-[#486581]"
                }`}
              >
                Office
              </button>
              <button
                type="button"
                onClick={() => setDepositType("home")}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold border ${
                  depositType === "home"
                    ? "bg-[#009877] border-[#009877] text-white"
                    : "bg-white border-[#D9E1EA] text-[#486581]"
                }`}
              >
                Home Deposit
              </button>
            </div>

            {depositType === "home" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#486581]">Receipt received?</span>
                  <div className="inline-flex rounded-[10px] border border-[#D9E1EA] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setReceiptReceived(true)}
                      className={`px-3 py-1.5 text-xs font-semibold ${receiptReceived ? "bg-[#009877] text-white" : "bg-white text-[#486581]"}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptReceived(false)}
                      className={`px-3 py-1.5 text-xs font-semibold ${!receiptReceived ? "bg-[#B42318] text-white" : "bg-white text-[#486581]"}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {receiptReceived ? (
                  <div className="space-y-2">
                    <span className="inline-flex rounded-full border border-[#009877]/35 bg-[#009877]/12 px-2.5 py-1 text-xs font-medium text-[#006F57]">
                      Receipt received
                    </span>
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA]">
                        <Upload className="h-3.5 w-3.5" />
                        Upload Receipt
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleUpload("receipt_file", file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex rounded-full border border-[#F1A7A0]/45 bg-[#FDECEC] px-2.5 py-1 text-xs font-medium text-[#B42318]">
                    Receipt not received
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}
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
