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
    console.log('[API Debug] Reusing in-flight refresh request');
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const { refresh } = getTokens();

    console.log('[API Debug] Starting token refresh', {
      hasRefresh: !!refresh,
      refreshPrefix: refresh?.substring(0, 20) + '...',
      API_BASE_URL,
    });

    if (!refresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      console.log('[API Debug] Refresh response status:', response.status);

      const text = await response.clone().text();
      console.log('[API Debug] Refresh response body:', text);

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

      console.log('[API Debug] Parsed tokens:', {
        hasAccess: !!newAccessToken,
        accessPrefix: newAccessToken?.substring(0, 20) + '...',
        hasRefresh: !!newRefreshToken,
      });

      if (newAccessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }
        return newAccessToken;
      }

      return null;
    } catch (error) {
      console.error('[API Debug] Token refresh failed:', error);
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
    console.log('[API Debug] Reusing in-flight request:', { requestKey });
    const inFlightResponse = await authenticatedFetchInFlight.get(requestKey)!;
    return inFlightResponse.clone();
  }

  const fetchPromise = (async () => {
    let { access } = getTokens();

    console.log('[API Debug] Preparing request', {
      url,
      method,
      requestKey,
      hasAccess: !!access,
      accessPrefix: access?.substring(0, 20) + '...',
      API_BASE_URL,
    });

    if (!access) {
      console.log('[API Debug] No access token, attempting refresh...');
      const refreshedToken = await refreshAccessToken();

      if (!refreshedToken) {
        console.error('[API Debug] No token after refresh');
        throw new Error("Session expired. Please log in.");
      }

      access = refreshedToken;
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${access}`);

    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    console.log('[API Debug] Sending request', {
      url,
      method,
      headers: Object.fromEntries(headers.entries()),
      body: requestBody,
    });

    let response = await fetch(url, { ...options, headers });

    console.log('[API Debug] Response status:', response.status);

    const responseText = await response.clone().text();
    console.log('[API Debug] Response body:', responseText);

    if (response.status === 401) {
      console.warn('[API Debug] 401 received, attempting refresh...', {
        url,
        method,
      });

      const newAccessToken = await refreshAccessToken();

      if (!newAccessToken) {
        console.error('[API Debug] Refresh failed after 401');
        throw new Error("Session expired. Please log in.");
      }

      headers.set("Authorization", `Bearer ${newAccessToken}`);

      console.log('[API Debug] Retrying request with new token');

      response = await fetch(url, { ...options, headers });

      console.log('[API Debug] Retry response status:', response.status);

      const retryText = await response.clone().text();
      console.log('[API Debug] Retry response body:', retryText);

      if (response.status === 401) {
        console.error('[API Debug] Still 401 after retry');
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
  };
  amount_pence?: number;
  currency: string;
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
  };
  amount_pence?: number;
  currency: string;
  key_id: string;
};

export type VerifyFullPaymentResponse = {
  success: boolean;
  message: string;
  next_step: string;
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

export type ApplicationDetailResponse = {
  id: number;
  reference_number: string;
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
};

export type ApplicationDocumentResponse = {
  id: number;
  document_type?: string;
  document_name?: string;
  verification_status?: string;
  verification_notes?: string;
  finding_type?: string;
  required_action?: string;
  priority?: string;
};


const extractErrorMessage = async (response: Response): Promise<string> => {
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
  auditId: number,
  checklistItemId: string | number,
  file: File,
  referenceNumber: string,
  documentType?: string
): Promise<UploadDocumentResponse> => {
  try {
    const formData = new FormData();
    formData.append('audit_id', String(auditId));
    formData.append('checklist_item_id', String(checklistItemId));
    formData.append('reference_number', referenceNumber);
    if (documentType && documentType.trim()) {
      formData.append('document_type', documentType.trim());
    }
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
    const response = await fetch(`${API_BASE_URL}/audit/upload-document/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
 * Creates a Razorpay order for audit fee payment.
 */
export const createAuditPaymentOrder = async (
  referenceNumber: string
): Promise<CreateAuditPaymentOrderResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/payment/create-order/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
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
  orderId: string,
  paymentId: string,
  signature: string
): Promise<VerifyAuditPaymentResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/payment/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
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
  referenceNumber: string
): Promise<SkipAuditResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/skip/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        disclaimer_accepted: true,
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
 * Creates a Razorpay order for full service payment.
 */
export const createFullPaymentOrder = async (
  referenceNumber: string
): Promise<CreateFullPaymentOrderResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment/full/create-order/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
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

/**
 * Verifies the completed full service payment.
 */
export const verifyFullPayment = async (
  referenceNumber: string,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<VerifyFullPaymentResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/payment/full/verify/`, {
      method: 'POST',
      body: JSON.stringify({
        reference_number: referenceNumber,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
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
