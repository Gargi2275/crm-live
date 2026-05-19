import { adminAuthenticatedFetch } from "@/lib/admin-auth";

export type RefundStatus = "none" | "pending" | "credit_note";
export type ScheduleChange = "none" | "minor" | "major";
export type PaymentMode = "card" | "bank_transfer" | "cash";

export type EasyFlyAttachmentKey =
  | "invoice"
  | "atol"
  | "passport"
  | "age_screenshot"
  | "payment_screenshot"
  | "receipt"
  | "transfer_screenshot";

export type EasyFlyAttachmentState = {
  uploaded: boolean;
  url: string;
  name: string;
};

export type EasyFlyAttachments = Record<EasyFlyAttachmentKey, EasyFlyAttachmentState>;

export type EasyFlyBooking = {
  id: number;
  srNo: string;
  supplier: string;
  invoiceNumber: string;
  pnr: string;
  paxName: string;
  airlineCode: string;
  depDate: string;
  returnDate: string;
  amountPaid: number;
  amountReceived: number;
  amountDue: number;
  refundStatus: RefundStatus;
  scheduleChange: ScheduleChange;
  paymentMode: PaymentMode;
  docs: {
    invoice: boolean;
    atol: boolean;
    passport: boolean;
  };
  attachments?: EasyFlyAttachments;
  createdBy: number | null;
  isYouthCategory: boolean;
  depositType: "office" | "home";
  receiptReceived: boolean;
  refundReceivedFromSupplier: boolean;
  givenToCustomer: boolean;
  isReissued: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentStatus?: "pending" | "created" | "paid" | "failed";
  earnings: number;
  createdAt: string;
  updatedAt: string;
};

type EasyFlyBookingApi = {
  id: number;
  sr_no: string;
  supplier: string;
  invoice_number: string;
  pnr: string;
  pax_name: string;
  airline_code: string;
  dep_date: string;
  return_date: string;
  amount_paid: number;
  amount_received: number;
  amount_due: number;
  refund_status: RefundStatus;
  schedule_change: ScheduleChange;
  payment_mode: PaymentMode;
  docs: {
    invoice: boolean;
    atol: boolean;
    passport: boolean;
  };
  attachments?: EasyFlyAttachments;
  created_by_staff_id: number | null;
  is_youth_category: boolean;
  deposit_type: "office" | "home";
  receipt_received: boolean;
  refund_received_from_supplier: boolean;
  given_to_customer: boolean;
  is_reissued: boolean;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  payment_status?: "pending" | "created" | "paid" | "failed";
  earnings: number;
  created_at: string;
  updated_at: string;
};

interface ApiEnvelope<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  error?: { code?: string; message?: unknown };
}

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("Invalid server response.");
  }

  if (!response.ok || payload.status === "error") {
    const message =
      (typeof payload.error?.message === "string" ? payload.error.message : null) ||
      (typeof payload.message === "string" ? payload.message : null) ||
      "Request failed.";
    throw new Error(message);
  }

  if (typeof payload.data === "undefined") {
    throw new Error("Missing response payload.");
  }

  return payload.data;
};

const toBooking = (booking: EasyFlyBookingApi): EasyFlyBooking => ({
  id: booking.id,
  srNo: booking.sr_no,
  supplier: booking.supplier,
  invoiceNumber: booking.invoice_number,
  pnr: booking.pnr,
  paxName: booking.pax_name,
  airlineCode: booking.airline_code,
  depDate: booking.dep_date,
  returnDate: booking.return_date,
  amountPaid: booking.amount_paid,
  amountReceived: booking.amount_received,
  amountDue: booking.amount_due,
  refundStatus: booking.refund_status,
  scheduleChange: booking.schedule_change,
  paymentMode: booking.payment_mode,
  docs: booking.docs,
  attachments: booking.attachments,
  createdBy: booking.created_by_staff_id,
  isYouthCategory: booking.is_youth_category,
  depositType: booking.deposit_type,
  receiptReceived: booking.receipt_received,
  refundReceivedFromSupplier: booking.refund_received_from_supplier,
  givenToCustomer: booking.given_to_customer,
  isReissued: booking.is_reissued,
  razorpayOrderId: booking.razorpay_order_id,
  razorpayPaymentId: booking.razorpay_payment_id,
  razorpaySignature: booking.razorpay_signature,
  paymentStatus: booking.payment_status,
  earnings: booking.earnings,
  createdAt: booking.created_at,
  updatedAt: booking.updated_at,
});

export type EasyFlyBookingFilters = {
  search?: string;
  supplier?: string;
  airline?: string;
  depFrom?: string;
  depTo?: string;
  scheduleChange?: string;
  createdBy?: number | null;
};

export const listEasyFlyBookings = async (filters: EasyFlyBookingFilters = {}) => {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.supplier) query.set("supplier", filters.supplier);
  if (filters.airline) query.set("airline", filters.airline);
  if (filters.depFrom) query.set("dep_from", filters.depFrom);
  if (filters.depTo) query.set("dep_to", filters.depTo);
  if (filters.scheduleChange) query.set("schedule_change", filters.scheduleChange);
  if (typeof filters.createdBy === "number") query.set("created_by", String(filters.createdBy));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${suffix}`, { method: "GET" });
  const data = await parseApiResponse<EasyFlyBookingApi[]>(response);
  return data.map(toBooking);
};

export const getEasyFlyBooking = async (bookingId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/`, { method: "GET" });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};

export const updateEasyFlyBooking = async (bookingId: number, body: Partial<Record<string, unknown>>) => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};

export const deleteEasyFlyBooking = async (bookingId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/`, {
    method: "DELETE",
  });
  return parseApiResponse<{ booking_id: number }>(response);
};

export const uploadEasyFlyBookingDocuments = async (
  bookingId: number,
  files: Partial<Record<"invoice_file" | "atol_file" | "passport_file" | "age_screenshot_file" | "payment_screenshot_file" | "receipt_file" | "transfer_screenshot_file", File>>,
) => {
  const formData = new FormData();
  Object.entries(files).forEach(([key, file]) => {
    if (file) formData.append(key, file);
  });

  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/`, {
    method: "PATCH",
    body: formData,
  });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};

export const createEasyFlyPaymentOrder = async (bookingId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/payment/create-order/`, {
    method: "POST",
  });
  return parseApiResponse<{
    booking_id: number;
    razorpay_key_id: string;
    razorpay_order_id: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
  }>(response);
};

export const confirmEasyFlyPayment = async (
  bookingId: number,
  body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/payment/confirm/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};

export const createEasyFlyBooking = async (body: Partial<Record<string, unknown>>) => {
  const response = await adminAuthenticatedFetch("/admin/easyfly/bookings/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};
