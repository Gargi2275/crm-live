import { adminAuthenticatedFetch } from "@/lib/admin-auth";

export type RefundStatus = "none" | "pending" | "credit_note";
export type ScheduleChange = "none" | "minor" | "major";
export type PaymentMode = "card" | "bank_transfer" | "cash";
export type EasyFlyLedgerMethod = "cash" | "card" | "bank_transfer" | "payment_link" | "other";

export const EASYFLY_PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
];

export const EASYFLY_LEDGER_METHOD_OPTIONS: { value: EasyFlyLedgerMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "payment_link", label: "Payment Link" },
  { value: "other", label: "Other" },
];

/** Color chips for EasyFly payment method selectors / badges. */
export function easyflyPaymentMethodChipClass(method: string, selected = false): string {
  const base =
    "inline-flex items-center justify-center rounded-[10px] border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
  const map: Record<string, { idle: string; active: string; ring: string }> = {
    card: {
      idle: "border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]",
      active: "border-[#2563EB] bg-[#2563EB] text-white shadow-sm",
      ring: "focus-visible:ring-[#93C5FD]",
    },
    bank_transfer: {
      idle: "border-[#C4B5FD] bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE]",
      active: "border-[#7C3AED] bg-[#7C3AED] text-white shadow-sm",
      ring: "focus-visible:ring-[#C4B5FD]",
    },
    cash: {
      idle: "border-[#6EE7B7] bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]",
      active: "border-[#059669] bg-[#059669] text-white shadow-sm",
      ring: "focus-visible:ring-[#6EE7B7]",
    },
    payment_link: {
      idle: "border-[#FCD34D] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]",
      active: "border-[#D97706] bg-[#D97706] text-white shadow-sm",
      ring: "focus-visible:ring-[#FCD34D]",
    },
    other: {
      idle: "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]",
      active: "border-[#475569] bg-[#475569] text-white shadow-sm",
      ring: "focus-visible:ring-[#CBD5E1]",
    },
  };
  const style = map[method] || map.other;
  return `${base} ${selected ? style.active : style.idle} ${style.ring}`;
}

export function easyflyPaymentMethodBadgeClass(method: string): string {
  const map: Record<string, string> = {
    card: "border-[#93C5FD] bg-[#DBEAFE] text-[#1E40AF]",
    bank_transfer: "border-[#C4B5FD] bg-[#EDE9FE] text-[#5B21B6]",
    cash: "border-[#6EE7B7] bg-[#D1FAE5] text-[#065F46]",
    payment_link: "border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]",
    other: "border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]",
  };
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[method] || map.other}`;
}

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
  method: EasyFlyLedgerMethod;
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
  method: EasyFlyLedgerMethod;
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
  fromAirport: string;
  toAirport: string;
  depDate: string;
  returnDate: string;
  amountPaid: number;
  amountReceived: number;
  payAgreed: number;
  amountDue: number;
  extraAmount: number;
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
  stripeSessionId?: string;
  stripePaymentId?: string;
  stripeSignature?: string;
  paymentStatus?: "pending" | "created" | "paid" | "failed";
  earnings: number;
  paymentLedger?: EasyFlyPaymentLedgerEntry[];
  passengers?: EasyFlyPassenger[];
  createdAt: string;
  updatedAt: string;
};

export type EasyFlyPassenger = {
  id: number;
  type: "adult" | "youth" | "child" | "infant";
  firstName: string;
  lastName: string;
  dob: string;
  passportExpiry: string;
  passportUploaded: boolean;
  passportUrl: string;
  passportFileName: string;
};

type EasyFlyPassengerApi = {
  id: number;
  passenger_type?: string;
  first_name?: string;
  last_name?: string;
  dob?: string | null;
  passport_expiry?: string | null;
  passport_uploaded?: boolean;
  passport_url?: string;
  passport_file_name?: string;
};

type EasyFlyBookingApi = {
  id: number;
  sr_no: string;
  supplier: string;
  invoice_number: string;
  pnr: string;
  pax_name: string;
  airline_code: string;
  from_airport?: string;
  to_airport?: string;
  dep_date: string;
  return_date: string;
  amount_paid: number;
  amount_received: number;
  pay_agreed?: number;
  amount_due: number;
  extra_amount?: number;
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
  passengers?: EasyFlyPassengerApi[];
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

const toPassenger = (passenger: EasyFlyPassengerApi): EasyFlyPassenger => {
  const typeRaw = String(passenger.passenger_type || "adult").toLowerCase();
  const type =
    typeRaw === "youth" || typeRaw === "child" || typeRaw === "infant" ? typeRaw : "adult";
  return {
    id: passenger.id,
    type,
    firstName: passenger.first_name || "",
    lastName: passenger.last_name || "",
    dob: passenger.dob || "",
    passportExpiry: passenger.passport_expiry || "",
    passportUploaded: Boolean(passenger.passport_uploaded),
    passportUrl: passenger.passport_url || "",
    passportFileName: passenger.passport_file_name || "",
  };
};

const toBooking = (booking: EasyFlyBookingApi): EasyFlyBooking => ({
  id: booking.id,
  srNo: booking.sr_no,
  supplier: booking.supplier,
  invoiceNumber: booking.invoice_number,
  pnr: booking.pnr,
  paxName: booking.pax_name,
  airlineCode: booking.airline_code,
  fromAirport: booking.from_airport || "",
  toAirport: booking.to_airport || "",
  depDate: booking.dep_date,
  returnDate: booking.return_date,
  amountPaid: booking.amount_paid,
  amountReceived: booking.amount_received,
  payAgreed: Number(booking.pay_agreed ?? 0),
  amountDue: booking.amount_due,
  extraAmount: Number(booking.extra_amount ?? 0),
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
  stripeSessionId: booking.razorpay_order_id,
  stripePaymentId: booking.razorpay_payment_id,
  stripeSignature: booking.razorpay_signature,
  paymentStatus: booking.payment_status,
  earnings: booking.earnings,
  paymentLedger: booking.payment_ledger?.map(toLedgerEntry),
  passengers: booking.passengers?.map(toPassenger),
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
  bookedFrom?: string;
  bookedTo?: string;
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
  if (filters.bookedFrom) query.set("booked_from", filters.bookedFrom);
  if (filters.bookedTo) query.set("booked_to", filters.bookedTo);
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
  extras?: { passengerId?: number },
) => {
  const formData = new FormData();
  Object.entries(files).forEach(([key, file]) => {
    if (file) formData.append(key, file);
  });
  if (extras?.passengerId) {
    formData.append("passenger_id", String(extras.passengerId));
  }

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
    stripe_publishable_key?: string;
    stripe_session_id?: string;
    checkout_url?: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
  }>(response);
};

export const confirmEasyFlyPayment = async (
  bookingId: number,
  body: {
    stripe_session_id: string;
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

export type EasyFlyExtractedTicketPassenger = {
  firstName: string;
  lastName: string;
  fullName: string;
  passengerType: "adult" | "youth" | "child" | "infant";
};

export type EasyFlyExtractedTicket = {
  pnr: string;
  airlineCode: string;
  paxName: string;
  depDate: string;
  returnDate: string;
  fromAirport: string;
  toAirport: string;
  route: string;
  passengers: EasyFlyExtractedTicketPassenger[];
  source: string;
  fieldsFound: number;
};

type EasyFlyExtractedTicketApi = {
  pnr?: string;
  airline_code?: string;
  pax_name?: string;
  dep_date?: string;
  return_date?: string;
  from_airport?: string;
  to_airport?: string;
  route?: string;
  passengers?: Array<{
    first_name?: string;
    last_name?: string;
    full_name?: string;
    passenger_type?: string;
  }>;
  source?: string;
  fields_found?: number;
};

export const extractEasyFlyTicket = async (file: File): Promise<EasyFlyExtractedTicket> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await adminAuthenticatedFetch("/admin/easyfly/extract-ticket/", {
    method: "POST",
    body: formData,
  });
  const data = await parseApiResponse<EasyFlyExtractedTicketApi>(response);
  const passengers: EasyFlyExtractedTicketPassenger[] = (data.passengers || []).map((passenger) => {
    const typeRaw = String(passenger.passenger_type || "adult").toLowerCase();
    const passengerType =
      typeRaw === "youth" || typeRaw === "child" || typeRaw === "infant" ? typeRaw : "adult";
    return {
      firstName: passenger.first_name || "",
      lastName: passenger.last_name || "",
      fullName: passenger.full_name || `${passenger.first_name || ""} ${passenger.last_name || ""}`.trim(),
      passengerType,
    };
  });

  return {
    pnr: data.pnr || "",
    airlineCode: data.airline_code || "",
    paxName: data.pax_name || "",
    depDate: data.dep_date || "",
    returnDate: data.return_date || "",
    fromAirport: data.from_airport || "",
    toAirport: data.to_airport || "",
    route: data.route || "",
    passengers,
    source: data.source || "generic",
    fieldsFound: Number(data.fields_found || 0),
  };
};

export type EasyFlyStaffRevenueEntry = {
  id: number;
  bookingReference: string;
  customerName: string;
  supplier: string;
  amountPaid: string;
  amountReceived: string;
  payAgreed: string;
  govtFees: string;
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
  pay_agreed?: string;
  govt_fees?: string;
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
  payAgreed: entry.pay_agreed ?? "0",
  govtFees: entry.govt_fees ?? "0",
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
  payAgreed?: string;
  govtFees?: string;
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
  formData.append("pay_agreed", body.payAgreed ?? "0");
  formData.append("govt_fees", body.govtFees ?? "0");
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
