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
  | "transfer_screenshot"
  | "ticket";

export type EasyFlyAttachmentState = {
  uploaded: boolean;
  url: string;
  name: string;
};

export type EasyFlyAttachments = Record<EasyFlyAttachmentKey, EasyFlyAttachmentState>;

export type EasyFlyPaymentLedgerEntry = {
  id: number;
  booking: number;
  date: string;
  amount: string;
  method: "cash" | "card" | "bank_transfer" | "payment_link" | "other";
  proofUploaded: boolean;
  proofUrl: string;
  proofFileName: string;
  enteredBy: string;
  enteredByStaffId: number | null;
  status: "unverified" | "verified";
  verifiedBy: string;
  verifiedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type EasyFlyPaymentLedgerEntryApi = {
  id: number;
  booking: number;
  date: string;
  amount: string;
  method: "cash" | "card" | "bank_transfer" | "payment_link" | "other";
  proof_uploaded: boolean;
  proof_url: string;
  proof_file_name: string;
  entered_by: string;
  entered_by_staff_id: number | null;
  status: "unverified" | "verified";
  verified_by: string;
  verified_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

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
  paymentDueDate: string | null;
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
  paymentLedger?: EasyFlyPaymentLedgerEntry[];
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
  payment_due_date: string | null;
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
  payment_ledger?: EasyFlyPaymentLedgerEntryApi[];
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

const toLedgerEntry = (entry: EasyFlyPaymentLedgerEntryApi): EasyFlyPaymentLedgerEntry => ({
  id: entry.id,
  booking: entry.booking,
  date: entry.date,
  amount: String(entry.amount),
  method: entry.method,
  proofUploaded: entry.proof_uploaded,
  proofUrl: entry.proof_url,
  proofFileName: entry.proof_file_name,
  enteredBy: entry.entered_by,
  enteredByStaffId: entry.entered_by_staff_id,
  status: entry.status,
  verifiedBy: entry.verified_by,
  verifiedAt: entry.verified_at,
  notes: entry.notes,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
});

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
  paymentDueDate: booking.payment_due_date ?? null,
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
  paymentLedger: booking.payment_ledger?.map(toLedgerEntry),
  createdAt: booking.created_at,
  updatedAt: booking.updated_at,
});

export type EasyFlyPermissions = {
  can_view_all_bookings: boolean;
  can_create_booking: boolean;
  can_edit_booking: boolean;
  can_delete_booking: boolean;
  can_edit_revenue: boolean;
  can_view_revenue: boolean;
  can_verify_payment: boolean;
  can_override_ai: boolean;
  can_export_data: boolean;
  is_read_only: boolean;
  is_staff: boolean;
};

export type EasyFlyBookingListResponse = {
  bookings: EasyFlyBooking[];
  total: number;
  permissions: EasyFlyPermissions;
};

export type EasyFlyBookingFilters = {
  search?: string;
  supplier?: string;
  airline?: string;
  depFrom?: string;
  depTo?: string;
  scheduleChange?: string;
  createdBy?: number | null;
};

export const listEasyFlyBookings = async (
  filters: EasyFlyBookingFilters = {},
): Promise<EasyFlyBookingListResponse> => {
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
  const data = await parseApiResponse<{
    bookings: EasyFlyBookingApi[];
    total: number;
    permissions: EasyFlyPermissions;
  }>(response);

  return {
    bookings: data.bookings.map(toBooking),
    total: data.total,
    permissions: data.permissions,
  };
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
  files: Partial<
    Record<
      | "invoice_file"
      | "atol_file"
      | "passport_file"
      | "age_screenshot_file"
      | "payment_screenshot_file"
      | "receipt_file"
      | "transfer_screenshot_file"
      | "ticket_file",
      File
    >
  >,
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

export const listEasyFlyPaymentLedger = async (bookingId: number): Promise<EasyFlyPaymentLedgerEntry[]> => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/payment-ledger/`, {
    method: "GET",
  });
  const data = await parseApiResponse<EasyFlyPaymentLedgerEntryApi[]>(response);
  return data.map(toLedgerEntry);
};

export const createEasyFlyPaymentLedgerEntry = async (
  bookingId: number,
  body: { date: string; amount: string; method: string; notes?: string },
): Promise<EasyFlyPaymentLedgerEntry> => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/payment-ledger/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse<EasyFlyPaymentLedgerEntryApi>(response);
  return toLedgerEntry(data);
};

export const updateEasyFlyPaymentLedgerEntry = async (
  bookingId: number,
  entryId: number,
  body: Partial<Record<string, unknown>>,
): Promise<EasyFlyPaymentLedgerEntry> => {
  const response = await adminAuthenticatedFetch(
    `/admin/easyfly/bookings/${bookingId}/payment-ledger/${entryId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  const data = await parseApiResponse<EasyFlyPaymentLedgerEntryApi>(response);
  return toLedgerEntry(data);
};

export const uploadEasyFlyPaymentProof = async (
  bookingId: number,
  entryId: number,
  file: File,
): Promise<EasyFlyPaymentLedgerEntry> => {
  const formData = new FormData();
  formData.append("proof_file", file);

  const response = await adminAuthenticatedFetch(
    `/admin/easyfly/bookings/${bookingId}/payment-ledger/${entryId}/`,
    {
      method: "PATCH",
      body: formData,
    },
  );
  const data = await parseApiResponse<EasyFlyPaymentLedgerEntryApi>(response);
  return toLedgerEntry(data);
};

export const verifyEasyFlyPaymentLedgerEntry = async (
  bookingId: number,
  entryId: number,
): Promise<EasyFlyPaymentLedgerEntry> => {
  const response = await adminAuthenticatedFetch(
    `/admin/easyfly/bookings/${bookingId}/payment-ledger/${entryId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "verified" }),
    },
  );
  const data = await parseApiResponse<EasyFlyPaymentLedgerEntryApi>(response);
  return toLedgerEntry(data);
};

export const deleteEasyFlyPaymentLedgerEntry = async (bookingId: number, entryId: number): Promise<void> => {
  const response = await adminAuthenticatedFetch(
    `/admin/easyfly/bookings/${bookingId}/payment-ledger/${entryId}/`,
    {
      method: "DELETE",
    },
  );
  await parseApiResponse<{ entry_id: number }>(response);
};

export const runEasyFlyAIVerify = async (
  bookingId: number,
): Promise<{
  risk_score: "green" | "amber" | "red";
  checks: Array<{ check: string; result: "pass" | "warning" | "fail" | "missing" }>;
}> => {
  const response = await adminAuthenticatedFetch(`/admin/easyfly/bookings/${bookingId}/ai-verify/`, {
    method: "POST",
  });
  return parseApiResponse(response);
};

export type EasyFlyStaffRevenueEntry = {
  id: number;
  bookingReference: string;
  customerName: string;
  supplier: string;
  amountPaid: string;
  amountReceived: string;
  paymentMode: PaymentMode;
  receiptUploaded: boolean;
  receiptUrl: string;
  receiptFileName: string;
  notes: string;
  entryDate: string;
  status: "pending_review" | "approved" | "rejected";
  enteredBy: string;
  enteredByStaffId: number | null;
  createdAt: string;
  updatedAt: string;
};

type EasyFlyStaffRevenueEntryApi = {
  id: number;
  booking_reference: string;
  customer_name: string;
  supplier: string;
  amount_paid: string;
  amount_received: string;
  payment_mode: PaymentMode;
  receipt_uploaded: boolean;
  receipt_url: string;
  receipt_file_name: string;
  notes: string;
  entry_date: string;
  status: "pending_review" | "approved" | "rejected";
  entered_by: string;
  entered_by_staff_id: number | null;
  created_at: string;
  updated_at: string;
};

const toStaffRevenueEntry = (entry: EasyFlyStaffRevenueEntryApi): EasyFlyStaffRevenueEntry => ({
  id: entry.id,
  bookingReference: entry.booking_reference,
  customerName: entry.customer_name,
  supplier: entry.supplier,
  amountPaid: entry.amount_paid,
  amountReceived: entry.amount_received,
  paymentMode: entry.payment_mode,
  receiptUploaded: entry.receipt_uploaded,
  receiptUrl: entry.receipt_url,
  receiptFileName: entry.receipt_file_name,
  notes: entry.notes,
  entryDate: entry.entry_date,
  status: entry.status,
  enteredBy: entry.entered_by,
  enteredByStaffId: entry.entered_by_staff_id,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
});

export const createEasyFlyStaffRevenueEntry = async (body: {
  bookingReference: string;
  customerName: string;
  supplier: string;
  amountPaid: string;
  amountReceived: string;
  paymentMode: PaymentMode;
  notes?: string;
  receiptFile?: File | null;
}): Promise<EasyFlyStaffRevenueEntry> => {
  const formData = new FormData();
  formData.append("booking_reference", body.bookingReference);
  formData.append("customer_name", body.customerName);
  formData.append("supplier", body.supplier);
  formData.append("amount_paid", body.amountPaid);
  formData.append("amount_received", body.amountReceived);
  formData.append("payment_mode", body.paymentMode);
  if (body.notes) formData.append("notes", body.notes);
  if (body.receiptFile) formData.append("receipt_file", body.receiptFile);

  const response = await adminAuthenticatedFetch("/admin/easyfly/revenue-entries/", {
    method: "POST",
    body: formData,
  });
  const data = await parseApiResponse<EasyFlyStaffRevenueEntryApi>(response);
  return toStaffRevenueEntry(data);
};

export const listEasyFlyStaffRevenueEntries = async (filters?: {
  status?: string;
  entryDate?: string;
}): Promise<EasyFlyStaffRevenueEntry[]> => {
  const query = new URLSearchParams();
  if (filters?.status) query.set("status", filters.status);
  if (filters?.entryDate) query.set("entry_date", filters.entryDate);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await adminAuthenticatedFetch(`/admin/easyfly/revenue-entries/${suffix}`, {
    method: "GET",
  });
  const data = await parseApiResponse<EasyFlyStaffRevenueEntryApi[]>(response);
  return data.map(toStaffRevenueEntry);
};

export const createEasyFlyBooking = async (body: Partial<Record<string, unknown>>) => {
  const response = await adminAuthenticatedFetch("/admin/easyfly/bookings/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse<EasyFlyBookingApi>(response);
  return toBooking(data);
};
