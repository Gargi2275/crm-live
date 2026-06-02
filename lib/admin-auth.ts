import { API_BASE_URL } from "./config";

export type StaffRole = "admin" | "ops_manager" | "case_processor" | "reviewer" | "support_agent";
export type AccessScope = "all" | "easyfly_only" | "exclude_easyfly";

export interface AdminStaffUser {
  id: number;
  full_name: string;
  username: string;
  email?: string | null;
  phone?: string;
  role: StaffRole;
  access_scope: AccessScope;
  is_active?: boolean;
  is_locked?: boolean;
  failed_login_attempts?: number;
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
    order_revenue_today?: number;
    audit_revenue_today?: number;
    full_payment_revenue_today?: number;
    pending_payments: number;
    avg_ticket_size: number;
  };
  daily_revenue: Array<{ day: string; expected: number; actual: number }>;
  monthly_revenue: Array<{ month: string; revenue: number }>;
  service_revenue_breakdown: Array<{ name: string; value: number; amount?: number }>;
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
  alerts_summary?: {
    open: number;
    acknowledged: number;
    critical: number;
  };
}

export interface StaffAccuracyRow {
  staff_id: number;
  staff_name: string;
  staff_role: StaffRole;
  rank: number;
  audit_accuracy: number;
  form_fill_accuracy: number;
  sla_compliance: number;
  correction_rate_score: number;
  overall_accuracy: number;
  badge: "Excellent" | "Good" | "Needs Improvement";
  period: {
    from: string;
    to: string;
  };
}

export interface StaffAccuracyAllResponse {
  period: {
    from: string;
    to: string;
  };
  total_staff: number;
  results: StaffAccuracyRow[];
}

export interface StaffPerformanceBadge {
  staff_id: number;
  badge: "Excellent" | "Good" | "Needs Improvement";
}

export interface AdminAlert {
  id: number;
  key: string;
  alert_type:
    | "sla_breach"
    | "payment_pending"
    | "security"
    | "security_breach"
    | "correction"
    | "follow_up_required"
    | "lead_converted"
    | "staff_idle"
    | "system";
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  title: string;
  message: string;
  formatted_message?: string;
  alert_type_label?: string;
  source_reference?: string;
  metadata?: Record<string, unknown>;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  resolved_by_name?: string;
}

export interface AdminNotification {
  id: number | string;
  type: string;
  type_label?: string;
  message: string;
  timestamp: string;
  is_read?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  actor?: string;
  task_ids?: Array<{
    id: number;
    priority: string;
    task_type: string;
    deadline: string;
    application__reference_number: string | null;
  }>;
}

export interface AdminAlertsResponse {
  alerts: AdminAlert[];
  notifications: AdminNotification[];
  summary: {
    open: number;
    acknowledged: number;
    critical: number;
    unread?: number;
  };
}

export interface AdminLogItem {
  id: string;
  record_id: number;
  source: "staff_login_attempt" | "staff_audit_log" | "activity_log";
  event_type: "login" | "failed_attempt" | "website_visit" | "event";
  event: string;
  name: string;
  ip_address: string;
  website_visit_page: string;
  target: string;
  timestamp: string | null;
}

export interface AdminLogsResponse {
  results: AdminLogItem[];
  summary: {
    total: number;
    login_count: number;
    failed_attempt_count: number;
    website_visit_count: number;
    event_count: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface AdminLogsDeleteResponse {
  deleted: {
    staff_login_attempt: number;
    staff_audit_log: number;
    activity_log: number;
  };
  total_deleted: number;
}

export interface AdminApplication {
  id: number;
  reference_number: string;
  file_number?: string | null;
  case_type?: string;
  service?: number;
  service_name?: string;
  service_type?: string;
  stage?: string;
  current_stage?: string;
  customer_name?: string;
  assigned_staff?: string | number | null;
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
  admin_messages?: Array<{
    created_at: string;
    subject: string;
    message: string;
  }>;
  reupload_requests?: Array<{
    created_at: string;
    note: string;
    flagged_documents: Array<any>;
  }>;
  flagged_documents?: Array<{
    document_type?: string;
    document_name?: string;
    issue_reason?: string;
    required_action?: string;
    status?: string;
    reuploaded?: boolean;
    reuploaded_at?: string | null;
  }>;
  document_overview?: {
    requested_documents?: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      required_action?: string;
      status?: string;
    }>;
    uploaded_documents?: Array<{
      document_type?: string;
      document_name?: string;
      verification_status?: string;
      uploaded_at?: string | null;
      is_requested?: boolean;
      is_reupload?: boolean;
    }>;
  };
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
  quote_status?: string;
  quote_set_at?: string | null;
  quote_expires_at?: string | null;
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

export interface AdminApplicationThreadMessage {
  id: string;
  sender: "team" | "customer";
  message_body: string;
  created_at: string;
  is_read?: boolean;
}

export interface AdminApplicationMessagesResponse {
  threads: Array<{
    id: string;
    subject: string;
    unread?: boolean;
    latest_message_preview?: string;
    latest_message_at?: string;
    messages: AdminApplicationThreadMessage[];
  }>;
  unread_count?: number;
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

export interface AdminPassportSetQuotePayload {
  quote_amount_pence: number;
  quote_notes?: string;
  valid_days?: number;
}

export interface AdminTaskItem {
  id: number;
  application: number;
  application_reference: string;
  assigned_staff: number | null;
  assigned_staff_name?: string | null;
  assigned_staff_role?: StaffRole | string | null;
  customer_name?: string;
  task_type: string;
  status: string;
  priority: string;
  deadline?: string | null;
  created_at?: string;
}

export interface TaskAutoAssignResult {
  assigned_count: number;
  staff_assignments: Record<string, number>;
}

interface ApiEnvelope<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  error?: { code?: string; message?: string };
}

export const normalizeAdminStaffUser = (user: Partial<AdminStaffUser>): AdminStaffUser => ({
  id: user.id ?? 0,
  full_name: user.full_name ?? "",
  username: user.username ?? "",
  email: user.email ?? null,
  phone: user.phone,
  role: user.role ?? "support_agent",
  access_scope: user.access_scope ?? "all",
  is_active: user.is_active,
  is_locked: user.is_locked,
  failed_login_attempts: user.failed_login_attempts,
  created_at: user.created_at,
  last_login: user.last_login,
});

const ADMIN_ACCESS_KEY = "flyoci_admin_access_token";
const ADMIN_REFRESH_KEY = "flyoci_admin_refresh_token";
const ADMIN_USER_KEY = "flyoci_admin_staff_user";

let adminRefreshPromise: Promise<string | null> | null = null;

const extractErrorMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractErrorMessage(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    for (const [, nestedValue] of entries) {
      const nested = extractErrorMessage(nestedValue);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const parseApiResponse = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("Invalid server response.");
  }

  if (!response.ok || payload.status === "error") {
    const message =
      extractErrorMessage(payload.error?.message) ||
      extractErrorMessage(payload.message) ||
      "Request failed.";
    throw new Error(message);
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
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(normalizeAdminStaffUser(staffUser)));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_ACCESS_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};


export interface AdminSearchResult {
  cases: Array<{ id: number; reference_number: string; customer_name?: string; application_status?: string; service_name?: string; created_at: string }>;
  customers: Array<{ id: number; full_name: string; email?: string; phone?: string }>;
  leads: Array<{ id: number; reference_number: string; customer_name?: string; stage?: string; created_at: string }>;
}

export const adminSearch = async (query: string): Promise<AdminSearchResult> => {
  const { access } = getAdminTokens();
  const q = encodeURIComponent(query.trim());
  const response = await adminAuthenticatedFetch(`/admin/search/?q=${q}`, { method: "GET" });
  const payload = await parseApiResponse<AdminSearchResult>(response);
  if (!payload.data) throw new Error("Missing search results.");
  return payload.data;
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

      const payload = (await response.json()) as { access?: string; refresh?: string };
      if (!payload.access) {
        return null;
      }

      localStorage.setItem(ADMIN_ACCESS_KEY, payload.access);
      // SIMPLE_JWT rotates refresh tokens; persist the new refresh when present.
      if (payload.refresh) {
        localStorage.setItem(ADMIN_REFRESH_KEY, payload.refresh);
      }
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
    return normalizeAdminStaffUser(JSON.parse(raw) as Partial<AdminStaffUser>);
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

  const staffUser = normalizeAdminStaffUser(payload.data.staff_user);
  setAdminSession(payload.data.tokens.access, payload.data.tokens.refresh, staffUser);
  return staffUser;
};

export const adminAuthenticatedFetch = async (path: string, options: RequestInit = {}) => {
  const { access } = getAdminTokens();
  if (!access) {
    throw new Error("Admin session expired. Please login again.");
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

export const createStaffUser = async (body: {
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  access_scope?: AccessScope;
}) => {
  const response = await adminAuthenticatedFetch("/admin/staff/create/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ staff_user: AdminStaffUser }>(response);
  return payload.data?.staff_user;
};

export const createStaffUserWithPassword = async (body: {
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  role: StaffRole;
  access_scope?: AccessScope;
}) => {
  const response = await adminAuthenticatedFetch("/admin/staff/create/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ staff_user: AdminStaffUser }>(response);
  return payload.data?.staff_user;
};

export const updateStaffUser = async (
  staffId: number,
  body: Partial<{ role: StaffRole; is_active: boolean; access_scope: AccessScope }>,
) => {
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

export const unlockStaffUser = async (staffId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/unlock/`, {
    method: "POST",
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

export const getAdminAlerts = async (markRead: boolean = false) => {
  const suffix = markRead ? "?mark_read=1" : "";
  const response = await adminAuthenticatedFetch(`/admin/alerts/${suffix}`, { method: "GET" });
  const payload = await parseApiResponse<AdminAlertsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing admin alerts payload.");
  }
  return payload.data;
};

export const updateAdminAlertStatus = async (
  alertId: number,
  status: "acknowledged" | "resolved" | "dismissed",
) => {
  const response = await adminAuthenticatedFetch(`/admin/alerts/${alertId}/status/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const payload = await parseApiResponse<AdminAlert>(response);
  if (!payload.data) {
    throw new Error("Missing updated alert payload.");
  }
  return payload.data;
};

export const getAdminLogs = async (params?: {
  search?: string;
  eventType?: "all" | "login" | "failed_attempt" | "website_visit" | "event";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.eventType && params.eventType !== "all") {
    query.set("event_type", params.eventType);
  }
  if (params?.dateFrom) {
    query.set("date_from", params.dateFrom);
  }
  if (params?.dateTo) {
    query.set("date_to", params.dateTo);
  }
  if (typeof params?.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number") {
    query.set("offset", String(params.offset));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await adminAuthenticatedFetch(`/admin/logs/${suffix}`, { method: "GET" });
  const payload = await parseApiResponse<AdminLogsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing admin logs payload.");
  }
  return payload.data;
};

export const deleteAdminLogs = async (items: Array<{ source: AdminLogItem["source"]; record_id: number }>) => {
  const response = await adminAuthenticatedFetch("/admin/logs/", {
    method: "DELETE",
    body: JSON.stringify({ items }),
  });
  const payload = await parseApiResponse<AdminLogsDeleteResponse>(response);
  if (!payload.data) {
    throw new Error("Missing delete logs payload.");
  }
  return payload.data;
};

export const listAdminApplications = async () => {
  const response = await adminAuthenticatedFetch("/applications/", { method: "GET" });
  const payload = await parseApiResponse<AdminApplication[]>(response);
  return payload.data || [];
};

export const listAdminTasks = async (params?: { limit?: number; status?: string; assignedStaffId?: number | null }) => {
  const query = new URLSearchParams();
  if (typeof params?.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (params?.status) {
    query.set("status", params.status);
  }
  if (typeof params?.assignedStaffId === "number") {
    query.set("assigned_staff_id", String(params.assignedStaffId));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await adminAuthenticatedFetch(`/tasks/${suffix}`, { method: "GET" });
  const payload = await parseApiResponse<AdminTaskItem[]>(response);
  return payload.data || [];
};

export const assignAdminTask = async (taskId: number, staffId: number) => {
  const response = await adminAuthenticatedFetch("/tasks/assign/", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, staff_id: staffId }),
  });
  const payload = await parseApiResponse<AdminTaskItem>(response);
  if (!payload.data) {
    throw new Error("Task assignment response missing.");
  }
  return payload.data;
};

export const adminDirectAssignTask = async (taskId: number, staffId: number) => {
  const response = await adminAuthenticatedFetch("/admin/tasks/assign-direct/", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, staff_id: staffId }),
  });
  const payload = await parseApiResponse<AdminTaskItem>(response);
  if (!payload.data) {
    throw new Error("Task assignment response missing.");
  }
  return payload.data;
};

export const autoAssignAdminTasks = async () => {
  const response = await adminAuthenticatedFetch("/tasks/auto-assign/", { method: "POST" });
  const payload = await parseApiResponse<TaskAutoAssignResult>(response);
  if (!payload.data) {
    throw new Error("Auto-assign response missing.");
  }
  return payload.data;
};


export const patchAdminTask = async (taskId: number, body: { status?: string; priority?: string; completion_notes?: string }) => {
  const response = await adminAuthenticatedFetch(`/tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<AdminTaskItem>(response);
  if (!payload.data) {
    throw new Error("Task update response missing.");
  }
  return payload.data;
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

export const getAdminApplicationMessages = async (applicationId: number) => {
  const response = await adminAuthenticatedFetch(`/applications/${applicationId}/messages/`, {
    method: "GET",
  });
  const payload = await parseApiResponse<AdminApplicationMessagesResponse>(response);
  if (!payload.data) {
    return { threads: [], unread_count: 0 } as AdminApplicationMessagesResponse;
  }
  return payload.data;
};

export const updateAdminApplicationStage = async (
  applicationId: number,
  stage: string,
  options?: { correctionCause?: "staff_error" | "customer_error" },
) => {
  const payloadBody: Record<string, unknown> = { stage };
  if (options?.correctionCause) {
    payloadBody.correction_cause = options.correctionCause;
  }

  const response = await adminAuthenticatedFetch(`/applications/${applicationId}/`, {
    method: "PATCH",
    body: JSON.stringify(payloadBody),
  });
  const payload = await parseApiResponse<AdminApplication>(response);
  if (!payload.data) {
    throw new Error("Application update response missing.");
  }
  return payload.data;
};

export const getStaffAccuracyAll = async (fromDate: string, toDate: string) => {
  const query = new URLSearchParams({ from: fromDate, to: toDate }).toString();
  const response = await adminAuthenticatedFetch(`/staff/accuracy/all/?${query}`, { method: "GET" });
  const payload = await parseApiResponse<StaffAccuracyAllResponse>(response);
  if (!payload.data) {
    throw new Error("Missing staff accuracy payload.");
  }
  return payload.data;
};

export const getStaffPerformanceBadge = async () => {
  const response = await adminAuthenticatedFetch("/staff/me/performance-badge/", { method: "GET" });
  const payload = await parseApiResponse<StaffPerformanceBadge>(response);
  if (!payload.data) {
    throw new Error("Missing staff performance badge payload.");
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

export const setAdminPassportRenewalQuote = async (
  applicationId: number,
  payloadBody: AdminPassportSetQuotePayload,
) => {
  const response = await adminAuthenticatedFetch(`/admin/passport-renewal/${applicationId}/set-quote/`, {
    method: "POST",
    body: JSON.stringify(payloadBody),
  });
  return parseApiResponse<{ success: boolean; quote_set: boolean }>(response);
};

export const sendAdminCustomerMessage = async (payloadBody: {
  application_id: number;
  reference_number: string;
  subject?: string;
  description: string;
}) => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${payloadBody.application_id}/message/`, {
    method: "POST",
    body: JSON.stringify({
      subject: payloadBody.subject || `Staff message for ${payloadBody.reference_number}`,
      description: payloadBody.description,
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

export type AdminApostilleListRow = {
  file_number: string | null;
  reference_number: string;
  email: string;
  full_name: string;
  status: string;
  quoted_fee: string | null;
  created_at: string | null;
};

export const listAdminApostilleCases = async (status?: string) => {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await adminAuthenticatedFetch(`/admin/apostille/${q}`, { method: "GET" });
  const payload = await parseApiResponse<{ results: AdminApostilleListRow[] }>(response);
  return payload.data?.results || [];
};

export const getAdminApostilleDetail = async (fileNumber: string) => {
  const response = await adminAuthenticatedFetch(`/admin/apostille/${encodeURIComponent(fileNumber)}/`, { method: "GET" });
  const payload = await parseApiResponse<Record<string, unknown>>(response);
  return (payload.data || {}) as Record<string, unknown>;
};

export const patchAdminApostilleCase = async (fileNumber: string, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/apostille/${encodeURIComponent(fileNumber)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<Record<string, unknown>>(response);
  return (payload.data || {}) as Record<string, unknown>;
};

export const downloadAdminApostilleDocumentBlob = async (docId: number): Promise<Blob> => {
  const response = await adminAuthenticatedFetch(`/admin/apostille/document/${docId}/`, { method: "GET" });
  if (!response.ok) {
    const message = await response.text().catch(() => "Download failed");
    throw new Error(message || "Download failed");
  }
  return response.blob();
};

export const sendAdminApostilleThreadMessage = async (fileNumber: string, subject: string, message: string) => {
  const response = await adminAuthenticatedFetch("/admin/apostille/message/", {
    method: "POST",
    body: JSON.stringify({ file_number: fileNumber, subject, message }),
  });
  return parseApiResponse(response);
};
