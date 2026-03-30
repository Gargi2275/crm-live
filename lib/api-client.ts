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

export type EVisaRegisterResponse = ApiEnvelope<{
  case_number: string;
  masked_email: string;
  next_step: "confirm_email";
  confirm_url: string;
  application_id: number;
}>;

export type EVisaConfirmEmailResponse = ApiEnvelope<{
  case_number: string;
  next_step: "payment";
  payment_url: string;
}>;

export type EVisaResendEmailResponse = ApiEnvelope<{
  case_number: string;
  resends_remaining: number;
  next_resend_available_at: string | null;
}>;

export type EVisaPaymentConfirmResponse = ApiEnvelope<{
  case_number: string;
  order_id: number;
  next_step: "upload_documents";
  upload_url: string;
}>;

export type EVisaUploadResponse = ApiEnvelope<{
  case_number: string;
  current_stage: string;
  next_step: string;
}>;

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
  register(payload: EVisaRegisterPayload): Promise<EVisaRegisterResponse> {
    return postJson<EVisaRegisterResponse>("/indian-e-visa/register/", payload);
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

  paymentConfirm(caseNumber: string, paymentReference: string): Promise<EVisaPaymentConfirmResponse> {
    return postJson<EVisaPaymentConfirmResponse>("/indian-e-visa/payment/confirm/", {
      case_number: caseNumber,
      payment_reference: paymentReference,
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
};
