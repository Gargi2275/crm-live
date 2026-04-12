import { authenticatedFetch } from "./api";

type ApiEnvelope<TData> = {
  status: string;
  message: string;
  data: TData;
  timestamp: string;
};

export type EVisaRegisterPayload = {
  email: string;
  confirm_email: string;
  mobile_number: string;
  full_name: string;
  nationality: string;
  country_of_residence: string;
  purpose_of_visit: "Tourism" | "Business" | "Medical" | "Conference" | "Other";
  visa_duration: "1-Year" | "5-Year";
  consent: boolean;
};

export type EVisaUpdateRegistrationPayload = EVisaRegisterPayload & {
  case_number: string;
};

export type EVisaRegisterResponse = ApiEnvelope<{
  case_number: string;
  masked_email: string;
  next_step: "confirm_email";
  confirm_url: string;
  application_id: number;
  otp_expires_in_minutes: number;
  resend_cooldown_minutes?: number;
  resend_cooldown_seconds: number;
  max_resends: number;
}>;

export type EVisaConfirmEmailResponse = ApiEnvelope<{
  case_number: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
  next_step: "payment";
  payment_url: string;
}>;

export type EVisaResendEmailResponse = ApiEnvelope<{
  case_number: string;
  resends_remaining: number;
  next_resend_available_at: string | null;
  otp_expires_in_minutes: number;
  resend_cooldown_minutes?: number;
  resend_cooldown_seconds: number;
  max_resends: number;
}>;

export type EVisaConfigResponse = ApiEnvelope<{
  otp_expires_in_minutes: number;
  resend_cooldown_minutes?: number;
  resend_cooldown_seconds: number;
  max_resends: number;
}>;

export type EVisaMagicLinkResponse = ApiEnvelope<{
  case_number: string;
  masked_email: string;
  expires_in_minutes: number;
  message: string;
}>;

export type EVisaResumeResponse = ApiEnvelope<{
  case_number: string;
  next_step: string;
  resume_url: string;
  application_data: {
    case_number: string;
    application_status: string;
    current_stage: string;
    service_name: string;
    service_type?: string;
    application_date: string | null;
    created_at: string;
    updated_at: string;
    email_confirmed: boolean;
    payment_confirmed: boolean;
    consent_captured: boolean;
    audit_result?: "pending" | "green" | "amber" | "red";
    auditor_notes?: string;
    flagged_documents?: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      required_action?: string;
      status?: string;
    }>;
    correction_requested?: boolean;
    correction_requested_at?: string | null;
    correction_resubmitted_at?: string | null;
    upload_url?: string;
  };
  registration_prefill: {
    visaDuration: "1-Year" | "5-Year";
    email: string;
    confirmEmail: string;
    countryCode: string;
    phone: string;
    fullName: string;
    nationality: string;
    countryOfResidence: string;
    purposeOfVisit: "Tourism" | "Business" | "Medical" | "Conference" | "Other" | "";
    consent: boolean;
    minimalPrefillOnly?: boolean;
  };
}>;

export type EVisaUpdateRegistrationResponse = ApiEnvelope<{
  case_number: string;
  next_step: string;
  resume_url: string;
  application_data: {
    case_number: string;
    application_status: string;
    current_stage: string;
    service_name: string;
    application_date: string | null;
    created_at: string;
    updated_at: string;
    email_confirmed: boolean;
    payment_confirmed: boolean;
    consent_captured: boolean;
  };
  registration_prefill: {
    visaDuration: "1-Year" | "5-Year";
    email: string;
    confirmEmail: string;
    countryCode: string;
    phone: string;
    fullName: string;
    nationality: string;
    countryOfResidence: string;
    purposeOfVisit: "Tourism" | "Business" | "Medical" | "Conference" | "Other" | "";
    consent: boolean;
    minimalPrefillOnly?: boolean;
  };
}>;

export type EVisaPaymentConfirmResponse = ApiEnvelope<{
  case_number: string;
  order_id: number;
  payment_reference?: string;
  payment_gateway?: string;
  next_step: "upload_documents";
  upload_url: string;
}>;

export type EVisaCreatePaymentOrderResponse = ApiEnvelope<{
  case_number: string;
  razorpay_key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: number;
  name: string;
  description: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
}>;

export type EVisaPaymentConfirmPayload = {
  payment_reference?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export type EVisaUploadResponse = ApiEnvelope<{
  case_number: string;
  current_stage: string;
  next_step: string;
}>;

export type TrackRequestOtpResponse = ApiEnvelope<{
  case_number: string;
  masked_email: string;
  expires_in_minutes: number;
  otp_expires_in_minutes: number;
  resend_cooldown_seconds: number;
}>;

export type TrackVerifyOtpResponse = ApiEnvelope<{
  case_number: string;
  tracking_token_hint: string;
  otp: string;
}>;

export type TrackTimelineStep = {
  key: string;
  label: string;
  timestamp: string | null;
  state: "done" | "active" | "pending";
};

export type TrackApplicationResponse = ApiEnvelope<{
  reference_number: string;
  file_number: string;
  applicant_name: string;
  service: string;
  status: string;
  unified_status?: string;
  internal_status: string;
  kanban_stage?: string;
  audit_result?: "pending" | "green" | "amber" | "red";
  auditor_notes?: string;
  findings?: Array<{
    id: number;
    document_type: string;
    document_name?: string;
    finding_description: string;
    required_action: string;
    priority: "high" | "medium" | "low";
  }>;
  correction_requested_at?: string | null;
  amount_due_pence?: number;
  amount_due_major?: string;
  government_reference?: string | null;
  user_facing_status: string;
  latest_update: string;
  timeline: TrackTimelineStep[];
  actions: {
    can_upload_missing_documents: boolean;
    upload_url: string;
    download_acknowledgement_available: boolean;
    acknowledgement_url: string | null;
    can_pay_now?: boolean;
    payment_url?: string;
    support_email: string;
    support_whatsapp: string;
  };
  updated_at: string;
}>;

export type TrackTimelineResponse = ApiEnvelope<TrackTimelineStep[]>;

export type TrackDocumentsResponse = ApiEnvelope<Array<{
  id: number;
  document_type: string;
  verification_status: string;
  upload_date: string | null;
  updated_at: string;
}>>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (json as { message?: string }).message || "Request failed";
    throw new Error(message);
  }

  return json as TResponse;
}

export const eVisaApi = {
  async getConfig(): Promise<EVisaConfigResponse> {
    const response = await fetch(`${API_BASE_URL}/indian-e-visa/config/`, {
      method: "GET",
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }

    return json as EVisaConfigResponse;
  },

  register(payload: EVisaRegisterPayload): Promise<EVisaRegisterResponse> {
    return postJson<EVisaRegisterResponse>("/indian-e-visa/register/", payload);
  },

  async updateRegistration(payload: EVisaUpdateRegistrationPayload): Promise<EVisaUpdateRegistrationResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/indian-e-visa/registration/update/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }

    return json as EVisaUpdateRegistrationResponse;
  },

  confirmEmail(caseNumber: string, otp: string): Promise<EVisaConfirmEmailResponse> {
    return postJson<EVisaConfirmEmailResponse>("/indian-e-visa/confirm-email/", {
      case_number: caseNumber,
      otp,
    });
  },

  resendEmail(caseNumber: string): Promise<EVisaResendEmailResponse> {
    return postJson<EVisaResendEmailResponse>("/indian-e-visa/resend-email/", {
      case_number: caseNumber,
    });
  },

  requestMagicLink(caseNumber: string, email?: string): Promise<EVisaMagicLinkResponse> {
    return postJson<EVisaMagicLinkResponse>("/auth/magic-link/request/", {
      case_number: caseNumber,
      ...(email ? { email } : {}),
    });
  },

  async getResume(caseNumber: string): Promise<EVisaResumeResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/indian-e-visa/resume/?case=${encodeURIComponent(caseNumber)}`,
      { method: "GET" },
    );

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }

    return json as EVisaResumeResponse;
  },

  createPaymentOrder(caseNumber: string): Promise<EVisaCreatePaymentOrderResponse> {
    return postJson<EVisaCreatePaymentOrderResponse>("/indian-e-visa/payment/create-order/", {
      case_number: caseNumber,
    });
  },

  paymentConfirm(
    caseNumber: string,
    payment: string | EVisaPaymentConfirmPayload,
  ): Promise<EVisaPaymentConfirmResponse> {
    const payload =
      typeof payment === "string"
        ? { payment_reference: payment }
        : payment;

    return postJson<EVisaPaymentConfirmResponse>("/indian-e-visa/payment/confirm/", {
      case_number: caseNumber,
      ...payload,
    });
  },

  async uploadDocuments(formData: FormData): Promise<EVisaUploadResponse> {
    const response = await fetch(`${API_BASE_URL}/indian-e-visa/upload/`, {
      method: "POST",
      body: formData,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }

    return json as EVisaUploadResponse;
  },

  trackRequestOtp(caseNumber: string, payload: { email?: string; phone?: string }): Promise<TrackRequestOtpResponse> {
    return postJson<TrackRequestOtpResponse>("/track/request-otp/", {
      case_number: caseNumber,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.phone ? { phone: payload.phone } : {}),
    });
  },

  trackVerifyOtp(caseNumber: string, otp: string): Promise<TrackVerifyOtpResponse> {
    return postJson<TrackVerifyOtpResponse>("/track/verify-otp/", {
      case_number: caseNumber,
      otp,
    });
  },

  async getTrackApplication(referenceNumber: string, otp: string): Promise<TrackApplicationResponse> {
    const response = await fetch(`${API_BASE_URL}/track/${encodeURIComponent(referenceNumber)}/?otp=${encodeURIComponent(otp)}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }
    return json as TrackApplicationResponse;
  },

  async getTrackTimeline(referenceNumber: string, otp: string): Promise<TrackTimelineResponse> {
    const response = await fetch(`${API_BASE_URL}/track/${encodeURIComponent(referenceNumber)}/timeline/?otp=${encodeURIComponent(otp)}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }
    return json as TrackTimelineResponse;
  },

  async getTrackDocuments(referenceNumber: string, otp: string): Promise<TrackDocumentsResponse> {
    const response = await fetch(`${API_BASE_URL}/track/${encodeURIComponent(referenceNumber)}/documents/?otp=${encodeURIComponent(otp)}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (json as { message?: string }).message || "Request failed";
      throw new Error(message);
    }
    return json as TrackDocumentsResponse;
  },
};
