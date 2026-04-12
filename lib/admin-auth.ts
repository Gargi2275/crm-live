import { API_BASE_URL } from "./config";

export type StaffRole = "admin" | "ops_manager" | "case_processor" | "reviewer" | "support_agent";

export interface AdminStaffUser {
  id: number;
  full_name: string;
  username: string;
  email?: string | null;
  phone?: string;
  role: StaffRole;
  is_active?: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface AdminDashboardOverview {
  kpi_snapshot: {
    total_leads: number;
    todays_leads: number;
    converted: number;
    conversion: string;
    revenue_today: number;
    pending_payments: number;
    avg_ticket_size: number;
  };
  daily_revenue: Array<{ day: string; expected: number; actual: number }>;
  monthly_revenue: Array<{ month: string; revenue: number }>;
  service_revenue_breakdown: Array<{ name: string; value: number }>;
  pipeline_overview: Array<{ stage: string; openCases: number; avgAge: string; breached: number }>;
  health_metrics: {
    total_leads: number;
    leads_converted: number;
    conversion: string;
    revenue_per_service: string;
    pending_payments: number;
    refunds_disputes: number;
    audits_requested: number;
    audit_success_ratio: string;
    avg_processing_time: string;
    customer_satisfaction: string;
  };
  revenue_insights: Array<{ label: string; value: string; note: string; icon: string }>;
  staff_members: Array<{
    id: number;
    name: string;
    initials: string;
    role: string;
    assigned: number;
    completed: number;
    pending: number;
    avgTime: string;
    slaBreach: number;
    accuracy: number;
    auditsPassed: number;
    auditsFailed: number;
    loadStatus: string;
  }>;
  failed_logins: number;
  access_logs: Array<{ staff: string; file: string; time: string }>;
}

export interface AdminApplication {
  id: number;
  reference_number: string;
  service?: number;
  service_name?: string;
  service_type?: string;
  stage?: string;
  current_stage?: string;
  customer_name?: string;
  assigned_staff?: string;
  application_status?: string;
  application_date?: string | null;
  submission_date?: string | null;
  approval_date?: string | null;
  completion_date?: string | null;
  notes?: string;
  document_count?: number;
  audit_result?: "pending" | "green" | "amber" | "red";
  auditor_notes?: string;
  correction_requested_at?: string | null;
  correction_resubmitted_at?: string | null;
  audit_logs?: Array<{ action: string; timestamp: string; actor: string }>;
  flagged_documents?: Array<{
    document_type?: string;
    document_name?: string;
    issue_reason?: string;
    required_action?: string;
    status?: string;
    reuploaded?: boolean;
    reuploaded_at?: string | null;
  }>;
  kanban_stage?: string | null;
  audit_fee_pence?: number;
  audit_credit_pence?: number;
  service_total_pence?: number;
  amount_due_pence?: number;
  latest_audit_findings?: Array<{
    id: number;
    document_type: string;
    document_name?: string;
    finding_description: string;
    required_action: string;
    priority: "high" | "medium" | "low";
  }>;
  audit_payment_status?: string;
  full_payment_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminApplicationDocument {
  id: number;
  document_type: string;
  document_name: string;
  upload_date?: string;
  original_filename?: string;
  stored_filename?: string;
  file_path?: string;
  verification_status?: string;
  verification_notes?: string;
  finding_type?: string;
  required_action?: string;
  priority?: "high" | "medium" | "low" | string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminAuditFindingInput {
  document_type: string;
  finding_description: string;
  required_action: string;
  priority: "high" | "medium" | "low";
}

export interface AdminAuditResultPayload {
  reference_number: string;
  audit_result: "green" | "amber" | "red";
  overall_status: "pass" | "needs_correction" | "incomplete";
  auditor_notes: string;
  findings: AdminAuditFindingInput[];
}

interface ApiEnvelope<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  error?: { code?: string; message?: string };
}

const ADMIN_ACCESS_KEY = "flyoci_admin_access_token";
const ADMIN_REFRESH_KEY = "flyoci_admin_refresh_token";
const ADMIN_USER_KEY = "flyoci_admin_staff_user";

let adminRefreshPromise: Promise<string | null> | null = null;

const parseApiResponse = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("Invalid server response.");
  }

  if (!response.ok || payload.status === "error") {
    throw new Error(payload.error?.message || payload.message || "Request failed.");
  }

  return payload;
};

export const getAdminTokens = () => {
  if (typeof window === "undefined") {
    return { access: null as string | null, refresh: null as string | null };
  }
  return {
    access: localStorage.getItem(ADMIN_ACCESS_KEY),
    refresh: localStorage.getItem(ADMIN_REFRESH_KEY),
  };
};

export const setAdminSession = (access: string, refresh: string, staffUser: AdminStaffUser) => {
  localStorage.setItem(ADMIN_ACCESS_KEY, access);
  localStorage.setItem(ADMIN_REFRESH_KEY, refresh);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(staffUser));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_ACCESS_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

const refreshAdminAccessToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const refresh = localStorage.getItem(ADMIN_REFRESH_KEY);
  if (!refresh) {
    return null;
  }

  if (!adminRefreshPromise) {
    adminRefreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { access?: string };
      if (!payload.access) {
        return null;
      }

      localStorage.setItem(ADMIN_ACCESS_KEY, payload.access);
      return payload.access;
    })()
      .catch(() => null)
      .finally(() => {
        adminRefreshPromise = null;
      });
  }

  return adminRefreshPromise;
};

export const getStoredAdminUser = (): AdminStaffUser | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminStaffUser;
  } catch {
    return null;
  }
};

export const loginAdmin = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await parseApiResponse<{
    staff_user: AdminStaffUser;
    tokens: { access: string; refresh: string };
  }>(response);

  if (!payload.data) {
    throw new Error("Missing authentication payload.");
  }

  setAdminSession(payload.data.tokens.access, payload.data.tokens.refresh, payload.data.staff_user);
  return payload.data.staff_user;
};

export const adminAuthenticatedFetch = async (path: string, options: RequestInit = {}) => {
  const { access } = getAdminTokens();
  if (!access) {
    throw new Error("Admin session expired. Please login again.");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${access}`,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    const nextAccess = await refreshAdminAccessToken();
    if (!nextAccess) {
      clearAdminSession();
      throw new Error("Admin session expired. Please login again.");
    }

    const retryHeaders = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${nextAccess}`,
    };

    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: retryHeaders,
    });

    if (retryResponse.status === 401) {
      clearAdminSession();
      throw new Error("Admin session expired. Please login again.");
    }

    return retryResponse;
  }

  return response;
};

export const listStaffUsers = async () => {
  const response = await adminAuthenticatedFetch("/admin/staff/list/", { method: "GET" });
  const payload = await parseApiResponse<AdminStaffUser[]>(response);
  return payload.data || [];
};

export const createStaffUser = async (body: { full_name: string; username: string; email?: string; phone?: string; role: StaffRole }) => {
  const response = await adminAuthenticatedFetch("/admin/staff/create/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ staff_user: AdminStaffUser }>(response);
  return payload.data?.staff_user;
};

export const createStaffUserWithPassword = async (body: { full_name: string; username: string; email?: string; phone?: string; password: string; role: StaffRole }) => {
  const response = await adminAuthenticatedFetch("/admin/staff/create/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ staff_user: AdminStaffUser }>(response);
  return payload.data?.staff_user;
};

export const updateStaffUser = async (staffId: number, body: Partial<{ role: StaffRole; is_active: boolean }>) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/update/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ staff_user: AdminStaffUser }>(response);
  return payload.data?.staff_user;
};

export const deactivateStaffUser = async (staffId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/deactivate/`, {
    method: "DELETE",
  });
  await parseApiResponse<{ staff_user_id: number; is_active: boolean }>(response);
};

export const deleteStaffUser = async (staffId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/delete/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const resetStaffUserPassword = async (staffId: number, newPassword: string) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/reset-password/`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
  await parseApiResponse(response);
};

export const requestStaffForgotPassword = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/forgot-password/request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  await parseApiResponse(response);
};

export const confirmStaffForgotPassword = async (token: string, newPassword: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/forgot-password/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  await parseApiResponse(response);
};

export const getAdminDashboardOverview = async () => {
  const response = await adminAuthenticatedFetch("/admin/dashboard/overview/", { method: "GET" });
  const payload = await parseApiResponse<AdminDashboardOverview>(response);
  if (!payload.data) {
    throw new Error("Missing dashboard overview payload.");
  }
  return payload.data;
};

export const listAdminApplications = async () => {
  const response = await adminAuthenticatedFetch("/applications/", { method: "GET" });
  const payload = await parseApiResponse<AdminApplication[]>(response);
  return payload.data || [];
};

export const getAdminApplicationDetails = async (applicationId: number) => {
  const response = await adminAuthenticatedFetch(`/applications/${applicationId}/`, { method: "GET" });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application details missing.");
  }
  return payload.data;
};

export const getAdminApplicationDocuments = async (referenceNumber: string) => {
  const response = await adminAuthenticatedFetch(`/applications/${encodeURIComponent(referenceNumber)}/documents/`, {
    method: "GET",
  });
  const payload = await parseApiResponse<AdminApplicationDocument[]>(response);
  return payload.data || [];
};

export const updateAdminApplicationStage = async (applicationId: number, stage: string) => {
  const response = await adminAuthenticatedFetch(`/applications/${applicationId}/`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application update response missing.");
  }
  return payload.data;
};

export const patchAdminApplication = async (applicationId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/applications/${applicationId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application update response missing.");
  }
  return payload.data;
};

export const updateAdminApplicationNotes = async (applicationId: number, notes: string) => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${applicationId}/notes/`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application notes update response missing.");
  }
  return payload.data;
};

export const updateAdminDocumentStatus = async (
  documentId: number,
  verificationStatus: "approved" | "rejected" | "needs_correction",
  verificationNotes: string,
) => {
  const response = await adminAuthenticatedFetch(`/admin/documents/${documentId}/status/`, {
    method: "PATCH",
    body: JSON.stringify({
      verification_status: verificationStatus,
      verification_notes: verificationNotes,
    }),
  });
  const payload = await parseApiResponse<AdminApplicationDocument>(response);
  if (!payload.data) {
    throw new Error("Document status update response missing.");
  }
  return payload.data;
};

export const sendAdminApplicationReminder = async (applicationId: number, type: "payment" | "upload") => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${applicationId}/reminder/`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  return parseApiResponse<{ reference_number: string; type: string }>(response);
};

export const sendAdminCustomerMessage = async (payloadBody: {
  reference_number: string;
  subject?: string;
  description: string;
}) => {
  const response = await adminAuthenticatedFetch("/support/tickets/", {
    method: "POST",
    body: JSON.stringify({
      ticket_number: `STAFF-${Date.now()}`,
      subject: payloadBody.subject || `Staff message for ${payloadBody.reference_number}`,
      description: payloadBody.description,
      category: "status_update",
      priority: "medium",
      ticket_status: "open",
    }),
  });
  return parseApiResponse(response);
};

export const reopenAdminApplication = async (applicationId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${applicationId}/reopen/`, {
    method: "POST",
  });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application reopen response missing.");
  }
  return payload.data;
};

export const submitAdminAuditResult = async (payloadBody: AdminAuditResultPayload) => {
  const response = await adminAuthenticatedFetch("/admin/audit/result/", {
    method: "POST",
    body: JSON.stringify(payloadBody),
  });
  return parseApiResponse(response);
};
