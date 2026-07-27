import { API_BASE_URL } from './config';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
let refreshInFlight: Promise<string | null> | null = null;
const authenticatedFetchInFlight: Map<string, Promise<Response>> = new Map();

// Get tokens from localStorage
export const getTokens = () => {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem(ACCESS_TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
};

// Set tokens in localStorage
export const setTokens = (access: string, refresh?: string | null) => {
  if (typeof window === 'undefined') return;
  const normalizedAccess = typeof access === 'string' ? access.trim() : '';
  const normalizedRefresh = typeof refresh === 'string' ? refresh.trim() : '';

  if (normalizedAccess && normalizedAccess !== 'undefined' && normalizedAccess !== 'null') {
    localStorage.setItem(ACCESS_TOKEN_KEY, normalizedAccess);
  }

  if (normalizedRefresh && normalizedRefresh !== 'undefined' && normalizedRefresh !== 'null') {
    localStorage.setItem(REFRESH_TOKEN_KEY, normalizedRefresh);
  }
};

// Clear tokens from localStorage
export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Refresh access token using refresh token
export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const { refresh } = getTokens();

    if (!refresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      const newAccessToken =
        data.data?.tokens?.access ||
        data.data?.access ||
        data.tokens?.access ||
        data.access ||
        null;

      const newRefreshToken =
        data.data?.tokens?.refresh ||
        data.data?.refresh ||
        data.tokens?.refresh ||
        data.refresh ||
        null;
      if (newAccessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }
        return newAccessToken;
      }

      return null;
    } catch (error) {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

// Authenticated fetch wrapper with automatic token refresh
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const method = (options.method || 'GET').toUpperCase();
  const requestBody =
    typeof options.body === 'string'
      ? options.body
      : options.body instanceof FormData
      ? '[formdata]'
      : options.body
      ? '[non-string-body]'
      : '';

  const requestKey = `${url}|${method}|${requestBody}`;

  if (authenticatedFetchInFlight.has(requestKey)) {
    const inFlightResponse = await authenticatedFetchInFlight.get(requestKey)!;
    return inFlightResponse.clone();
  }

  const fetchPromise = (async () => {
    let { access } = getTokens();

    if (!access) {
      const refreshedToken = await refreshAccessToken();

      if (!refreshedToken) {
        throw new Error("Session expired. Please log in.");
      }

      access = refreshedToken;
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${access}`);

    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const newAccessToken = await refreshAccessToken();

      if (!newAccessToken) {
        throw new Error("Session expired. Please log in.");
      }

      headers.set("Authorization", `Bearer ${newAccessToken}`);

      response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        throw new Error("Session expired. Please log in.");
      }
    }

    return response;
  })();

  authenticatedFetchInFlight.set(requestKey, fetchPromise);

  try {
    const response = await fetchPromise;
    return response.clone();
  } finally {
    authenticatedFetchInFlight.delete(requestKey);
  }
};


// Regular fetch wrapper for non-authenticated endpoints
export const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
};


export type AuthHeaders = {
  'Content-Type': 'application/json';
  Authorization: string;
};

export type StartAuditResponse = {
  id?: number;
  audit_id?: number;
  checklist_items?: unknown[];
  checklist?: unknown[];
};

export type UploadDocumentResponse = {
  success: boolean;
  item_id: number;
  status: string;
  completion_percentage: number;
};

export type AuditStatusResponse = {
  id: number;
  status: string;
  notes?: string;
  checklist?: unknown[];
  [key: string]: unknown;
};

export type CreateAuditPaymentOrderResponse = {
  order: {
    id: string;
    amount: number;
    currency: string;
    url?: string;
  };
  checkout_url?: string;
  amount_pence?: number;
  currency: string;
  publishable_key?: string;
  key_id: string;
};

export type VerifyAuditPaymentResponse = {
  success: boolean;
  message: string;
  audit_status: string;
};

export type SkipAuditResponse = {
  id: number;
  reference_number: string;
  application_status: string;
  unified_status?: string;
  audit_skipped?: boolean;
  audit_skip_disclaimer_accepted?: boolean;
  audit_credit_pence?: number;
  amount_due_pence?: number;
};

export type CreateFullPaymentOrderResponse = {
  order: {
    id: string;
    amount: number;
    currency: string;
    url?: string;
  };
  checkout_url?: string;
  amount_pence?: number;
  currency: string;
  publishable_key?: string;
  key_id: string;
};

export type VerifyFullPaymentResponse = {
  success: boolean;
  message: string;
  next_step: string;
};

export type PassportRenewalRequestSubmitResponse = {
  reference_number: string;
  file_number?: string | null;
  case_reference: string;
  masked_email: string;
  quote_status: string;
};

export type PassportRenewalQuoteDetailResponse = {
  reference_number: string;
  file_number?: string | null;
  case_reference: string;
  quote_amount_pence: number | null;
  quoted_fee: string | null;
  quote_status: string;
  quote_notes?: string;
  quote_set_at?: string | null;
  quote_expires_at?: string | null;
  masked_email: string;
  validity_days: number;
};

export type PassportCaseQuoteDetailResponse = {
  reference_number: string;
  file_number?: string | null;
  quoted_fee: string | null;
  quote_status: string;
};

export type PassportRenewalQuoteOrderResponse = {
  order: {
    id: string;
    amount: number;
    currency: string;
    url?: string;
  };
  checkout_url?: string;
  key_id: string;
  publishable_key?: string;
  currency: string;
  amount_pence: number;
  amount_major: string;
  reference_number: string;
  case_reference: string;
};

export type PassportRenewalQuoteVerifyResponse = {
  reference_number: string;
  quote_status: string;
  application_status: string;
  current_stage: string;
};

export type ResubmitForReviewResponse = {
  id: number;
  reference_number: string;
  current_stage?: string;
  application_status?: string;
  correction_resubmitted_at?: string;
};

export type CreateApplicationResponse = {
  application_id: string;
  status: string;
  reference_number?: string;
};

export type ApostillePreCheckPayload = {
  full_name: string;
  email: string;
  phone_number?: string;
  country?: string;
  document_type?: string;
  document_issued_in?: string;
  purpose?: string;
  notes?: string;
};

export type ApostillePreCheckResponse = {
  application_id: number;
  reference_number: string;
  status: string;
  resume_url: string;
  file_number?: string;
  success?: boolean;
  message?: string;
};

export type ApostilleTrackMessage = {
  sender: string;
  subject?: string;
  message: string;
  created_at: string;
  is_read?: boolean;
};

export type ApostilleTrackStatusLog = {
  action: string;
  timestamp: string;
  actor: string;
  metadata: Record<string, unknown>;
};

export type ApostilleFlaggedDocument = {
  document_type?: string;
  document_name?: string;
  issue_reason?: string;
  required_action?: string;
  status?: string;
  reuploaded?: boolean;
};

export type ApostilleCaseSummary = {
  reference_number?: string;
  file_number?: string;
  document_type?: string;
  status?: string;
  stage_label?: string;
  current_stage?: string;
  kanban_stage?: string;
  precheck_submitted_at?: string | null;
  payment_paid_at?: string | null;
  payment_amount?: string | null;
  payment_currency?: string;
  payment_verified?: boolean;
  final_submission_at?: string | null;
  government_submitted_at?: string | null;
  government_reference?: string | null;
  expected_delivery_at?: string | null;
  delivered_at?: string | null;
  review_note?: string | null;
};

export type ApostilleTrackDocument = {
  id: number;
  name: string;
  document_type?: string;
  document_type_label?: string;
  uploaded_at?: string | null;
  downloadable?: boolean;
};

export type ApostilleTrackCaseResponse = {
  file_number: string;
  reference_number?: string;
  full_name: string;
  document_type: string;
  status: string;
  review_note: string;
  quoted_fee: string | null;
  quote_currency: string;
  payment_verified: boolean;
  final_submission_completed: boolean;
  case_summary?: ApostilleCaseSummary;
  delivery?: {
    delivery_name?: string;
    delivery_address_line1?: string;
    delivery_address_line2?: string;
    delivery_city?: string;
    delivery_postcode?: string;
    delivery_country?: string;
    delivery_special_instructions?: string;
  };
  correction_requested_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  messages: ApostilleTrackMessage[];
  status_logs: ApostilleTrackStatusLog[];
  documents: ApostilleTrackDocument[];
  flagged_documents?: ApostilleFlaggedDocument[];
  pending_documents?: ApostilleFlaggedDocument[];
  reuploaded_documents?: ApostilleFlaggedDocument[];
  document_overview?: {
    requested_documents?: ApostilleFlaggedDocument[];
    uploaded_documents?: Array<{
      document_type?: string;
      document_name?: string;
      original_filename?: string;
      is_reupload?: boolean;
      is_requested?: boolean;
    }>;
  };
  all_corrections_submitted?: boolean;
};

/** Legacy GET track by reference in URL path */
export type ApostilleTrackResponse = ApostilleTrackCaseResponse;

export type ApplicationDetailResponse = {
  id: number;
  latest_audit_id?: number | null;
  reference_number: string;
  file_number?: string;
  service_type?: string;
  service_name?: string;
  application_status: string;
  audit_fee_pence?: number;
  audit_fee_paid?: boolean;
  audit_payment_status?: string;
  audit_skipped?: boolean;
  audit_skip_disclaimer_accepted?: boolean;
  audit_result?: string;
  audit_credit_pence?: number;
  amount_due_pence?: number;
  service_total_pence?: number;
  fee_plan_code?: string;
  fee_plan_fee_pence?: number;
  quote_status?: string;
  quoted_fee?: string;
  full_payment_status?: string;
  payment_confirmed?: boolean;
  current_stage?: string;
  updated_at?: string;
  auditor_notes?: string;
  flagged_documents?: Array<{
    doc_id?: string;
    doc_name?: string;
    issue?: string;
    action_required?: string;
  }>;
  latest_audit_findings?: Array<{
    id?: number;
    document_type?: string;
    document_name?: string;
    finding_description?: string;
    required_action?: string;
    priority?: string;
  }>;
  latest_audit_findings_payload?: {
    findings?: Array<{
      id?: number;
      document_type?: string;
      document_name?: string;
      finding_description?: string;
      required_action?: string;
      priority?: string;
    }>;
    flagged_documents?: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      required_action?: string;
      status?: string;
    }>;
  };
  correction_requested_at?: string;
  correction_resubmitted_at?: string;
  audit_logs?: Array<{
    action?: string;
    timestamp?: string;
    actor?: string;
    metadata?: Record<string, unknown>;
  }>;
  admin_messages?: Array<{
    created_at?: string;
    subject?: string;
    message?: string;
  }>;
};

export type ApplicationDocumentResponse = {
  id: number;
  document_type?: string;
  document_name?: string;
  original_filename?: string;
  file_path?: string;
  verification_status?: string;
  verification_notes?: string;
  finding_type?: string;
  required_action?: string;
  priority?: string;
};

export const openApplicationDocument = async (
  documentId: number,
  options?: { fileUrl?: string; previewUrl?: string },
): Promise<void> => {
  if (options?.previewUrl) {
    window.open(options.previewUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const url = (options?.fileUrl || "").trim() || `${API_BASE_URL}/documents/${documentId}/file/`;
  const response = await authenticatedFetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error("Unable to open document.");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

export type PublicTestimonial = {
  id: number;
  application_reference?: string;
  author_name?: string;
  testimonial_text: string;
  service_type?: string;
  rating: number;
  created_at?: string;
};

export type PublicTestimonialsResponse = {
  success?: boolean;
  data?: PublicTestimonial[];
  message?: string;
};

export type SubmitTestimonialPayload = {
  author_name?: string;
  testimonial_text: string;
  service_type?: string;
  rating: number;
  application_reference?: string;
};

export type SubmitTestimonialResponse = {
  success?: boolean;
  data?: PublicTestimonial;
  message?: string;
};


export const extractErrorMessage = async (response: Response): Promise<string> => {
  const fallback = 'Request failed';
  try {
    const data = await response.json();
    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      data?.data?.message ||
      fallback
    );
  } catch {
    return fallback;
  }
};

/**
 * Returns JSON auth headers using the JWT from localStorage.
 */
export const getAuthHeaders = (): AuthHeaders => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const createApplication = async (serviceType: string): Promise<CreateApplicationResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/create/`, {
      method: 'POST',
      body: JSON.stringify({
        service_type: serviceType,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as CreateApplicationResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Could not start your application. Please try again.');
  }
}

export const createApostillePreCheck = async (payload: ApostillePreCheckPayload): Promise<ApostillePreCheckResponse> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/apostille/pre-check/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as ApostillePreCheckResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to submit apostille pre-check');
  }
};

/** Multipart public pre-check (main_document required). */
export const submitApostillePreCheck = async (formData: FormData): Promise<ApostillePreCheckResponse> => {
  const response = await fetch(`${API_BASE_URL}/apostille/pre-check/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as ApostillePreCheckResponse;
};

export const trackApostilleCase = async (fileNumber: string, email: string): Promise<ApostilleTrackCaseResponse> => {
  const response = await apiCall(`${API_BASE_URL}/apostille/track/`, {
    method: 'POST',
    body: JSON.stringify({ file_number: fileNumber, email }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as ApostilleTrackCaseResponse;
};

export const trackApostilleLegacy = async (
  referenceNumber: string,
  email: string
): Promise<ApostilleTrackCaseResponse> => {
  const response = await apiCall(
    `${API_BASE_URL}/apostille/track/${encodeURIComponent(referenceNumber)}/?email=${encodeURIComponent(email)}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as ApostilleTrackCaseResponse;
};

export const createApostillePaymentOrder = async (
  fileNumber: string,
  email: string
): Promise<{ order_id: string; stripe_session_id?: string; checkout_url?: string; amount: number; currency: string; key_id: string }> => {
  const response = await apiCall(`${API_BASE_URL}/apostille/payment/create-order/`, {
    method: 'POST',
    body: JSON.stringify({ file_number: fileNumber, email }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as { order_id: string; stripe_session_id?: string; checkout_url?: string; amount: number; currency: string; key_id: string };
};

export const verifyApostillePayment = async (
  fileNumber: string,
  email: string,
  stripeSessionId: string
): Promise<{ status: string }> => {
  const response = await apiCall(`${API_BASE_URL}/apostille/payment/verify/`, {
    method: 'POST',
    body: JSON.stringify({
      file_number: fileNumber,
      email,
      stripe_session_id: stripeSessionId,
    }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as { status: string };
};

export const submitApostilleCorrectionUpload = async (formData: FormData): Promise<ApostilleTrackCaseResponse> => {
  const response = await fetch(`${API_BASE_URL}/apostille/correction-upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as ApostilleTrackCaseResponse;
};

export const submitApostilleFinalDetails = async (formData: FormData): Promise<{ status: string }> => {
  const response = await fetch(`${API_BASE_URL}/apostille/final-submission/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  return (raw?.data || raw) as { status: string };
};

export const sendApostilleCustomerMessage = async (
  fileNumber: string,
  email: string,
  message: string
): Promise<void> => {
  const response = await apiCall(`${API_BASE_URL}/apostille/message/`, {
    method: 'POST',
    body: JSON.stringify({ file_number: fileNumber, email, message }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
};

export const downloadApostilleDocument = async (
  fileNumber: string,
  email: string,
  documentId: number,
  fallbackName?: string,
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/apostille/document/download/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_number: fileNumber, email, document_id: documentId }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = decodeURIComponent(utfMatch?.[1] || plainMatch?.[1] || fallbackName || `document-${documentId}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const getApplicationByReference = async (referenceNumber: string): Promise<ApplicationDetailResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(referenceNumber)}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as ApplicationDetailResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load application');
  }
}

export const getApplicationDocuments = async (referenceNumber: string): Promise<ApplicationDocumentResponse[]> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(referenceNumber)}/documents/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as ApplicationDocumentResponse[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load application documents');
  }
}

export const getPublicTestimonials = async (): Promise<PublicTestimonial[]> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/public/testimonials/`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw: PublicTestimonialsResponse = await response.json();
    return raw?.data || [];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load testimonials');
  }
}

export type PublicBlogCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
};

export type PublicBlogFaq = {
  question: string;
  answer: string;
};

export type PublicBlogPost = {
  id: number;
  title: string;
  slug: string;
  category: PublicBlogCategory | null;
  category_id?: number | null;
  excerpt: string;
  featured_image_url?: string;
  author_name?: string;
  author_title?: string;
  author_bio?: string;
  author_image_url?: string;
  read_time_minutes?: number;
  cta_title?: string;
  cta_body?: string;
  cta_button_text?: string;
  cta_button_url?: string;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
  show_on_homepage?: boolean;
  display_order?: number;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  content?: string;
  faqs?: PublicBlogFaq[];
};

export type PublicBlogListResponse = {
  success?: boolean;
  message?: string;
  data?: {
    posts: PublicBlogPost[];
    categories: PublicBlogCategory[];
  };
};

export type PublicBlogDetailResponse = {
  success?: boolean;
  message?: string;
  data?: {
    post: PublicBlogPost;
    related: PublicBlogPost[];
  };
};

export type GetPublicBlogPostsParams = {
  homepage?: boolean;
  limit?: number;
  category?: string;
};

export type PublicOriginCountryFaq = {
  question: string;
  answer: string;
};

export type PublicOriginCountryVisaOption = {
  id: number;
  service_id: number;
  service_type: string;
  service_name: string;
  label: string;
  fee: string;
  entries: string;
  max_stay: string;
  validity: string;
  travel_purpose: string;
  display_order: number;
  is_active: boolean;
  cta_href: string;
  duration: string;
};

export type PublicOriginCountry = {
  id: number;
  country_code: string;
  name: string;
  slug: string;
  destination_code: string;
  badge: string;
  service_label: string;
  href: string;
  cta_href?: string;
  secondary_label?: string;
  secondary_href?: string;
  image_url: string;
  page_title?: string;
  page_subtitle?: string;
  faqs?: PublicOriginCountryFaq[];
  visa_options?: PublicOriginCountryVisaOption[];
  service_id?: number | null;
  display_order?: number;
  is_active?: boolean;
};

export type PublicOriginCountriesPayload = {
  title: string;
  subtitle: string;
  countries: PublicOriginCountry[];
};

export type PublicHomepageModule = {
  id: number;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export const getPublicHomepageModules = async (): Promise<PublicHomepageModule[]> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/public/homepage-modules/`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    const raw = await response.json();
    const modules = raw?.data?.modules;
    return Array.isArray(modules) ? modules : [];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load homepage modules");
  }
};

export type PublicOriginCountryDetailPayload = {
  country: PublicOriginCountry;
  other_countries: PublicOriginCountry[];
};

export const getPublicOriginCountries = async (): Promise<PublicOriginCountriesPayload> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/public/origin-countries/`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    const data = (raw?.data || {}) as Partial<PublicOriginCountriesPayload>;
    return {
      title: data.title || 'Apply for an Indian Visa from These Countries',
      subtitle:
        data.subtitle ||
        'Apply for Indian visas from the USA, UK, Canada, Australia, and other countries with FlyOCI.',
      countries: Array.isArray(data.countries) ? data.countries : [],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load origin countries');
  }
};

export const getPublicOriginCountry = async (
  slug: string,
): Promise<PublicOriginCountryDetailPayload> => {
  try {
    const response = await apiCall(
      `${API_BASE_URL}/public/origin-countries/${encodeURIComponent(slug)}/`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    const data = (raw?.data || {}) as Partial<PublicOriginCountryDetailPayload>;
    if (!data.country) {
      throw new Error('Country not found');
    }
    return {
      country: data.country,
      other_countries: Array.isArray(data.other_countries) ? data.other_countries : [],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load country page');
  }
};

export type HubCitySummary = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  display_order?: number;
};

export type HubCountrySummary = {
  id: number;
  name: string;
  slug: string;
  currency_code: string;
  currency_symbol: string;
  is_active?: boolean;
  display_order?: number;
  cities?: HubCitySummary[];
};

export type HubServiceDocument = {
  name: string;
  description: string;
  is_mandatory: boolean;
  display_order: number;
};

export type HubOffering = {
  service: {
    id: number;
    service_name: string;
    service_type: string;
    description: string;
    category: { id: number; name: string; slug: string } | null;
    documents: HubServiceDocument[];
  };
  govt_fee: string | null;
  service_fee: string;
  total_fee: string;
  processing_time: string;
  validity: string;
  is_popular: boolean;
  display_order: number;
  fee_source: "country" | "city" | string;
};

export type HubCountryServicesPayload = {
  country: HubCountrySummary;
  cities: HubCitySummary[];
  offerings: HubOffering[];
};

export type HubCityServicesPayload = {
  country: HubCountrySummary;
  city: HubCitySummary & { country_slug?: string };
  offerings: HubOffering[];
};

export const getHubCountries = async (): Promise<HubCountrySummary[]> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/countries/`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    const raw = await response.json();
    const data = raw?.data || {};
    return Array.isArray(data.countries) ? data.countries : [];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load hub countries");
  }
};

export const getCountryHubServices = async (
  countrySlug: string,
): Promise<HubCountryServicesPayload> => {
  const response = await apiCall(
    `${API_BASE_URL}/countries/${encodeURIComponent(countrySlug)}/services/`,
    { method: "GET", cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  const data = (raw?.data || {}) as Partial<HubCountryServicesPayload>;
  if (!data.country) {
    throw new Error("Country not found");
  }
  return {
    country: data.country,
    cities: Array.isArray(data.cities) ? data.cities : [],
    offerings: Array.isArray(data.offerings) ? data.offerings : [],
  };
};

export const getCityHubServices = async (
  countrySlug: string,
  citySlug: string,
): Promise<HubCityServicesPayload> => {
  const response = await apiCall(
    `${API_BASE_URL}/countries/${encodeURIComponent(countrySlug)}/cities/${encodeURIComponent(citySlug)}/services/`,
    { method: "GET", cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const raw = await response.json();
  const data = (raw?.data || {}) as Partial<HubCityServicesPayload>;
  if (!data.country || !data.city) {
    throw new Error("City not found");
  }
  return {
    country: data.country,
    city: data.city,
    offerings: Array.isArray(data.offerings) ? data.offerings : [],
  };
};

export const getPublicBlogPosts = async (
  params: GetPublicBlogPostsParams = {}
): Promise<{ posts: PublicBlogPost[]; categories: PublicBlogCategory[] }> => {
  try {
    const query = new URLSearchParams();
    if (params.homepage) query.set('homepage', 'true');
    if (params.limit != null) query.set('limit', String(params.limit));
    if (params.category) query.set('category', params.category);

    const qs = query.toString();
    const url = qs
      ? `${API_BASE_URL}/public/blog/?${qs}`
      : `${API_BASE_URL}/public/blog/`;
    const response = await apiCall(url, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw: PublicBlogListResponse = await response.json();
    return {
      posts: raw?.data?.posts || [],
      categories: raw?.data?.categories || [],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load blog posts');
  }
};

export const getPublicBlogPost = async (
  slug: string
): Promise<{ post: PublicBlogPost; related: PublicBlogPost[] }> => {
  try {
    const response = await apiCall(
      `${API_BASE_URL}/public/blog/${encodeURIComponent(slug)}/`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw: PublicBlogDetailResponse = await response.json();
    if (!raw?.data?.post) {
      throw new Error('Post not found');
    }

    return {
      post: raw.data.post,
      related: raw.data.related || [],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load blog post');
  }
};

export const submitTestimonial = async (payload: SubmitTestimonialPayload): Promise<PublicTestimonial> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/public/testimonials/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw: SubmitTestimonialResponse = await response.json();
    return raw?.data as PublicTestimonial;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to submit review');
  }
}

export const resubmitApplicationForReview = async (referenceNumber: string): Promise<ResubmitForReviewResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(referenceNumber)}/resubmit-for-review/`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as ResubmitForReviewResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to resubmit for review');
  }
}

/**
 * Starts an audit and returns the created audit id with checklist.
 */
export const startAudit = async (
  applicationId: number,
  serviceType: string,
  questionnaireAnswers: Record<string, unknown>,
  referenceNumber?: string | null
): Promise<StartAuditResponse> => {
  try {
    const payload: Record<string, unknown> = {
      application_id: applicationId,
      service_type: serviceType,
      questionnaire_answers: questionnaireAnswers,
    };

    if (referenceNumber) {
      payload.reference_number = referenceNumber;
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/audit/start/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    return (await response.json()) as StartAuditResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to start audit');
  }
};

/**
 * Uploads a checklist document file for an audit item.
 */
export const uploadDocument = async (
  auditId: number | null | undefined,
  checklistItemId: string | number,
  file: File,
  referenceNumber: string,
  documentType?: string,
  documentName?: string
): Promise<UploadDocumentResponse> => {
  try {
    const formData = new FormData();
    if (auditId != null && Number.isFinite(auditId) && auditId > 0) {
      formData.append('audit_id', String(auditId));
    }
    formData.append('checklist_item_id', String(checklistItemId));
    formData.append('reference_number', referenceNumber);
    if (documentType && documentType.trim()) {
      formData.append('document_type', documentType.trim());
    }
    if (documentName && documentName.trim()) {
      formData.append('document_name', documentName.trim());
    }
    formData.append('file', file);

    const response = await authenticatedFetch(`${API_BASE_URL}/audit/upload-document/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    return (await response.json()) as UploadDocumentResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to upload document');
  }
};

/**
 * Gets the latest audit status including checklist and notes.
 */
export const getAuditStatus = async (auditId: number): Promise<AuditStatusResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/status/${auditId}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    return (await response.json()) as AuditStatusResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch audit status');
  }
};

/**
 * Creates a Stripe Checkout session for audit fee payment.
 */
export const createAuditPaymentOrder = async (
  referenceNumber: string,
  notes?: string
): Promise<CreateAuditPaymentOrderResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/payment/create-order/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        notes: notes?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as CreateAuditPaymentOrderResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create audit payment order');
  }
};

/**
 * Verifies the completed audit fee payment.
 */
export const verifyAuditPayment = async (
  referenceNumber: string,
  stripeSessionId: string
): Promise<VerifyAuditPaymentResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/payment/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        stripe_session_id: stripeSessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as VerifyAuditPaymentResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to verify audit payment');
  }
};

/**
 * Skip audit after acknowledging risk disclaimer.
 */
export const skipAuditWithDisclaimer = async (
  referenceNumber: string,
  notes?: string
): Promise<SkipAuditResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/skip/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        disclaimer_accepted: true,
        notes: notes?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as SkipAuditResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to skip audit');
  }
};

/**
 * Creates a Stripe Checkout session for full service payment.
 */
export const createFullPaymentOrder = async (
  referenceNumber: string,
  feePlanCode?: string,
): Promise<CreateFullPaymentOrderResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment/full/create-order/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        ...(feePlanCode ? { fee_plan_code: feePlanCode } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as CreateFullPaymentOrderResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create full payment order');
  }
};

export type SelectFullPaymentPlanResponse = {
  reference_number: string;
  fee_plan_code: string;
  fee_plan_label?: string;
  service_total_pence: number;
  audit_credit_pence: number;
  amount_due_pence: number;
};

/** Select standard/express fee plan before full payment; returns updated amounts. */
export const selectFullPaymentPlan = async (
  referenceNumber: string,
  feePlanCode: string,
): Promise<SelectFullPaymentPlanResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment/full/select-plan/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        fee_plan_code: feePlanCode,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as SelectFullPaymentPlanResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update payment plan');
  }
};

/**
 * Verifies the completed full service payment.
 */
export const verifyFullPayment = async (
  referenceNumber: string,
  stripeSessionId: string
): Promise<VerifyFullPaymentResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment/full/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        stripe_session_id: stripeSessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as VerifyFullPaymentResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to verify full payment');
  }
};

export const submitPassportRenewalRequest = async (
  referenceNumber: string
): Promise<PassportRenewalRequestSubmitResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/passport-renewal/request/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as PassportRenewalRequestSubmitResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to submit passport renewal request');
  }
};

export const getPassportRenewalQuoteDetail = async (
  referenceNumber: string
): Promise<PassportRenewalQuoteDetailResponse> => {
  const params = new URLSearchParams({ reference_number: referenceNumber });
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/passport-renewal/pay/?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as PassportRenewalQuoteDetailResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load passport renewal quote details');
  }
};

export const createPassportRenewalQuoteOrder = async (
  referenceNumber: string
): Promise<PassportRenewalQuoteOrderResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/passport-renewal/pay/create-order/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as PassportRenewalQuoteOrderResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create passport renewal payment order');
  }
};

export const verifyPassportRenewalQuotePayment = async (
  referenceNumber: string,
  stripeSessionId: string
): Promise<PassportRenewalQuoteVerifyResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/passport-renewal/pay/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        stripe_session_id: stripeSessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as PassportRenewalQuoteVerifyResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to verify passport renewal payment');
  }
};

export const getPassportCaseQuoteDetail = async (
  fileNumber: string
): Promise<PassportCaseQuoteDetailResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/cases/${encodeURIComponent(fileNumber)}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const raw = await response.json();
    return (raw?.data || raw) as PassportCaseQuoteDetailResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to load case quote details');
  }
};
