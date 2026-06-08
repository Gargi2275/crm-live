import { API_BASE_URL } from "./config";

export type StaffRole = "admin" | "ops_manager" | "case_processor" | "reviewer" | "support_agent" | (string & {});
export type AccessScope = "all" | "easyfly_only" | "exclude_easyfly";

/** FlyOCI console (cases, kanban, OCI revenue) — `all` or FlyOCI-only scope. */
export function hasFlyOciConsoleAccess(scope: AccessScope = "all"): boolean {
  return scope === "all" || scope === "exclude_easyfly";
}

/** EasyFly console (bookings) — `all` or EasyFly-only scope. */
export function hasEasyFlyConsoleAccess(scope: AccessScope = "all"): boolean {
  return scope === "all" || scope === "easyfly_only";
}

/** Default landing route after login, by access scope. */
export function getConsoleHomePath(scope: AccessScope = "all"): string {
  return scope === "easyfly_only" ? "/admin/easyfly" : "/admin";
}

const ACTION_DASHBOARD_ROLES = new Set<StaffRole>([
  "ops_manager",
  "reviewer",
  "case_processor",
  "support_agent",
]);

export function getPostLoginPath(role: StaffRole | string, scope: AccessScope): string {
  if (ACTION_DASHBOARD_ROLES.has(role as StaffRole)) {
    return "/admin/easyfly/action";
  }
  return getConsoleHomePath(scope);
}

export function getConsoleDashboardLabel(scope: AccessScope = "all"): string {
  return scope === "easyfly_only" ? "EasyFly Dashboard" : "Dashboard";
}

/** Roles that see only their own attributed revenue on the dashboard (not company-wide). */
export const STAFF_OWN_REVENUE_ROLES: readonly StaffRole[] = [
  "case_processor",
  "reviewer",
  "support_agent",
];

/** Roles that can open My Active Cases (assigned tasks). */
export const MY_ACTIVE_CASES_ROLES: readonly StaffRole[] = [
  "case_processor",
  "reviewer",
  "support_agent",
  "ops_manager",
];

export function hasMyActiveCasesAccess(role?: StaffRole | string | null): boolean {
  return Boolean(role && MY_ACTIVE_CASES_ROLES.includes(role as StaffRole));
}

export function staffIdsMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

export function isAdminStaffRole(role?: string | null): boolean {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin";
}

export function isStaffOwnRevenueDashboard(
  data: AdminDashboardOverview | null | undefined,
  role?: StaffRole | string | null,
): boolean {
  if (data?.view_mode === "staff") return true;
  return Boolean(role && STAFF_OWN_REVENUE_ROLES.includes(role as StaffRole));
}

export interface StaffRevenueKpi {
  revenue_today: number;
  revenue_30d: number;
  revenue_total: number;
  order_revenue: number;
  audit_revenue: number;
  full_revenue: number;
  paid_cases_total: number;
  paid_cases_30d: number;
}

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
  view_mode?: "staff" | "admin";
  my_revenue?: {
    kpi_snapshot: StaffRevenueKpi;
    daily_revenue: Array<{ day: string; expected: number; actual: number }>;
    monthly_revenue: Array<{ month: string; revenue: number }>;
    service_revenue_breakdown: Array<{ name: string; value: number; amount?: number }>;
    attribution_note?: string;
  };
  kpi_snapshot: {
    total_leads?: number;
    todays_leads?: number;
    converted?: number;
    conversion?: string;
    revenue_today: number;
    revenue_30d?: number;
    revenue_total?: number;
    order_revenue_today?: number;
    audit_revenue_today?: number;
    full_payment_revenue_today?: number;
    order_revenue?: number;
    audit_revenue?: number;
    full_revenue?: number;
    paid_cases_total?: number;
    paid_cases_30d?: number;
    pending_payments?: number;
    avg_ticket_size?: number;
  };
  daily_revenue: Array<{ day: string; expected: number; actual: number }>;
  monthly_revenue: Array<{ month: string; revenue: number }>;
  service_revenue_breakdown: Array<{ name: string; value: number; amount?: number }>;
  pipeline_overview: Array<{ stage: string; openCases: number; avgAge: string; breached: number }>;
  health_metrics?: {
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
  revenue_insights?: Array<{ label: string; value: string; note: string; icon: string }>;
  team_performance?: {
    period: "day" | "week" | "month" | "all";
    label: string;
    window_days?: number | null;
  };
  staff_members: Array<{
    id: number;
    name: string;
    initials: string;
    role: string;
    role_key?: StaffRole | string;
    cases_generated?: number;
    cases_completed?: number;
    assigned: number;
    completed: number;
    pending: number;
    avgTime: string;
    slaBreach: number;
    accuracy: number;
    auditsPassed: number;
    auditsFailed: number;
    loadStatus: string;
    revenue_total?: number;
    revenue_30d?: number;
    order_revenue?: number;
    audit_revenue?: number;
    full_revenue?: number;
    paid_cases_total?: number;
    paid_cases_30d?: number;
  }>;
  staff_revenue_summary?: {
    window_days?: number | null;
    unattributed_revenue_total?: number;
    unattributed_revenue_window?: number;
    attribution_note?: string;
  };
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
    | "task_assigned"
    | "task_activity"
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
  application_id?: number | null;
  task_id?: number | null;
  assignee_name?: string | null;
  task_label?: string | null;
  file_number?: string | null;
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
  source: "staff_login_attempt" | "staff_audit_log" | "activity_log" | "email_delivery_log";
  event_type: "login" | "failed_attempt" | "website_visit" | "event" | "email";
  event: string;
  name: string;
  ip_address: string;
  website_visit_page: string;
  target: string;
  timestamp: string | null;
  // email-specific fields (only present when source === "email_delivery_log")
  email_subject?: string;
  email_status?: "sent" | "failed";
  email_recipient_type?: "staff" | "user" | "other";
  email_context_label?: string;
  email_application_reference?: string;
  email_triggered_by?: string;
  email_error?: string;
}

export interface AdminIpSecurityPayload {
  daily_request_threshold: number;
  alerts_enabled: boolean;
  blocked_ips: Array<{
    id: number;
    ip_address: string;
    reason: string;
    blocked_at: string | null;
    blocked_by: string | null;
  }>;
  ip_counts_today: Array<{
    ip_address: string;
    count_today: number;
    over_threshold: boolean;
    is_blocked: boolean;
  }>;
}

export interface AdminLogsResponse {
  results: AdminLogItem[];
  summary: {
    total: number;
    login_count: number;
    failed_attempt_count: number;
    website_visit_count: number;
    event_count: number;
    email_total: number;
    email_to_staff: number;
    email_to_user: number;
    email_failed: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  ip_security?: AdminIpSecurityPayload;
}

export interface AdminLogsDeleteResponse {
  deleted: {
    staff_login_attempt: number;
    staff_audit_log: number;
    activity_log: number;
    email_delivery_log: number;
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
  quoted_fee?: string | number | null;
  quote_currency?: string | null;
  review_note?: string;
  internal_admin_notes?: string;
  payment_confirmed?: boolean;
  final_submission_completed?: boolean;
  full_payment_id?: string | null;
  delivery?: {
    delivery_name?: string;
    delivery_address_line1?: string;
    delivery_address_line2?: string;
    delivery_city?: string;
    delivery_postcode?: string;
    delivery_country?: string;
    delivery_special_instructions?: string;
  };
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
  description?: string | null;
  status: string;
  effective_status?: string;
  application_stage?: string | null;
  application_status?: string | null;
  priority: string;
  deadline?: string | null;
  created_at?: string;
  updated_at?: string | null;
  completed_at?: string | null;
  completion_notes?: string | null;
}

const PENDING_TASK_STATUSES = new Set(["new", "in_progress", "blocked"]);

export function getTaskEffectiveStatus(task: AdminTaskItem): string {
  const effective = String(task.effective_status || task.status || "new").toLowerCase();
  return effective;
}

export function isTaskPending(task: AdminTaskItem): boolean {
  return PENDING_TASK_STATUSES.has(getTaskEffectiveStatus(task));
}

export function isTaskCompleted(task: AdminTaskItem): boolean {
  return getTaskEffectiveStatus(task) === "completed";
}

export function isTaskClosedOut(task: AdminTaskItem): boolean {
  const status = getTaskEffectiveStatus(task);
  return status === "completed" || status === "cancelled";
}

export interface TaskAutoAssignResult {
  assigned_count: number;
  staff_assignments: Record<string, number>;
  unassigned_pending_count?: number;
  eligible_staff_count?: number;
  reason?: string;
  message?: string;
}

export interface AdminRoleOverview {
  id: string;
  label: string;
  description: string;
  active_staff_count: number;
  is_system?: boolean;
}

export interface AdminPermissionStaffOption {
  id: number;
  name: string;
  email: string;
  role: string;
  role_label: string;
}

export interface AdminPermissionModuleRow {
  module_key: string;
  module: string;
  allowed: boolean;
  role_default: boolean | null;
}

export interface AdminPermissionCatalogItem {
  key: string;
  label: string;
  is_system?: boolean;
}

export interface AdminPermissionRoleOption {
  id: string;
  label: string;
  description?: string;
  is_system?: boolean;
}

export interface AdminPermissionsResponse {
  modules: Array<{ key: string; label: string }>;
  permission_catalog?: AdminPermissionCatalogItem[];
  staff: AdminPermissionStaffOption[];
  roles?: AdminPermissionRoleOption[];
  selected_staff: AdminPermissionStaffOption | null;
  selected_role?: AdminPermissionRoleOption | null;
  permissions: Record<string, boolean>;
  module_rows: AdminPermissionModuleRow[];
  role_defaults: Record<string, boolean>;
}

export interface AdminNotificationModuleItem {
  key: string;
  label: string;
  description: string;
  is_system?: boolean;
  is_active?: boolean;
  admin_default_enabled?: boolean;
  alert_types?: string[];
}

export interface AdminNotificationModulePref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  alert_types?: string[];
}

export interface AdminNotificationPreferencesResponse {
  modules: AdminNotificationModulePref[];
  preferences: Record<string, boolean>;
  role: string;
  role_defaults: Record<string, boolean>;
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

export interface AdminStaffListSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface AdminStaffListResponse {
  staff_users: AdminStaffUser[];
  summary: AdminStaffListSummary;
}

export const listStaffUsersWithSummary = async (options?: {
  excludeAdmin?: boolean;
}): Promise<AdminStaffListResponse> => {
  const query = options?.excludeAdmin ? "?exclude_admin=1" : "";
  const response = await adminAuthenticatedFetch(`/admin/staff/list/${query}`, { method: "GET" });
  const payload = await parseApiResponse<AdminStaffListResponse | AdminStaffUser[]>(response);
  const data = payload.data;
  if (Array.isArray(data)) {
    const active = data.filter((row) => row.is_active !== false).length;
    return {
      staff_users: data,
      summary: { total: data.length, active, inactive: data.length - active },
    };
  }
  return {
    staff_users: data?.staff_users || [],
    summary: data?.summary || { total: 0, active: 0, inactive: 0 },
  };
};

export const listStaffUsers = async () => {
  const payload = await listStaffUsersWithSummary();
  return payload.staff_users;
};

export const createStaffUser = async (body: {
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
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
  role: string;
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
  body: Partial<{
    full_name: string;
    username: string;
    email: string | null;
    phone: string;
    role: string;
    is_active: boolean;
    access_scope: AccessScope;
  }>,
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

export type TeamPerformancePeriod = "day" | "week" | "month" | "all";

export const getAdminDashboardOverview = async (options?: { teamPeriod?: TeamPerformancePeriod }) => {
  const params = new URLSearchParams();
  if (options?.teamPeriod) {
    params.set("team_period", options.teamPeriod);
  }
  const query = params.toString();
  const path = query ? `/admin/dashboard/overview/?${query}` : "/admin/dashboard/overview/";
  const response = await adminAuthenticatedFetch(path, { method: "GET" });
  const payload = await parseApiResponse<AdminDashboardOverview>(response);
  if (!payload.data) {
    throw new Error("Missing dashboard overview payload.");
  }
  return payload.data;
};

export const getAdminRolesOverview = async () => {
  const response = await adminAuthenticatedFetch("/admin/roles/", { method: "GET" });
  const payload = await parseApiResponse<{ roles: AdminRoleOverview[] }>(response);
  return payload.data?.roles || [];
};

export const createAdminRole = async (body: { label: string; slug?: string; description?: string }) => {
  const response = await adminAuthenticatedFetch("/admin/roles/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ role: AdminRoleOverview }>(response);
  if (!payload.data?.role) {
    throw new Error("Missing role in response.");
  }
  return payload.data.role;
};

export const updateAdminRole = async (
  roleId: string,
  body: { label?: string; description?: string },
) => {
  const response = await adminAuthenticatedFetch(`/admin/roles/${encodeURIComponent(roleId)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ role: AdminRoleOverview }>(response);
  if (!payload.data?.role) {
    throw new Error("Missing role in response.");
  }
  return payload.data.role;
};

export const deleteAdminRole = async (roleId: string) => {
  const response = await adminAuthenticatedFetch(`/admin/roles/${encodeURIComponent(roleId)}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const getAdminStaffPermissions = async (staffId?: number) => {
  const query = staffId != null ? `?staff_id=${staffId}` : "";
  const response = await adminAuthenticatedFetch(`/admin/permissions/${query}`, { method: "GET" });
  const payload = await parseApiResponse<AdminPermissionsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing permissions payload.");
  }
  return payload.data;
};

export const getAdminRolePermissions = async (roleId: string) => {
  const response = await adminAuthenticatedFetch(
    `/admin/permissions/?role_id=${encodeURIComponent(roleId)}`,
    { method: "GET" },
  );
  const payload = await parseApiResponse<AdminPermissionsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing permissions payload.");
  }
  return payload.data;
};

export const getAdminMyPermissions = async () => {
  const response = await adminAuthenticatedFetch("/admin/permissions/me/", { method: "GET" });
  const payload = await parseApiResponse<{
    staff_id: number;
    role: string;
    permissions: Record<string, boolean>;
    modules: Array<{ key: string; label: string }>;
  }>(response);
  if (!payload.data) {
    throw new Error("Missing permissions payload.");
  }
  return payload.data;
};

export const createAdminPermissionModule = async (body: { label: string; key?: string }) => {
  const response = await adminAuthenticatedFetch("/admin/permissions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ module: { key: string; label: string } }>(response);
  if (!payload.data?.module) {
    throw new Error("Missing module in response.");
  }
  return payload.data.module;
};

export const updateAdminPermissionModule = async (moduleKey: string, body: { label: string }) => {
  const response = await adminAuthenticatedFetch(
    `/admin/permissions/modules/${encodeURIComponent(moduleKey)}/`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  const payload = await parseApiResponse<{ module: { key: string; label: string } }>(response);
  if (!payload.data?.module) {
    throw new Error("Missing module in response.");
  }
  return payload.data.module;
};

export const deleteAdminPermissionModule = async (moduleKey: string) => {
  const response = await adminAuthenticatedFetch(
    `/admin/permissions/modules/${encodeURIComponent(moduleKey)}/`,
    { method: "DELETE" },
  );
  await parseApiResponse(response);
};

export const getAdminNotificationModules = async () => {
  const response = await adminAuthenticatedFetch("/admin/notifications/modules/", { method: "GET" });
  const payload = await parseApiResponse<{ modules: AdminNotificationModuleItem[] }>(response);
  return payload.data?.modules || [];
};

export const createAdminNotificationModule = async (body: {
  label: string;
  key?: string;
  description?: string;
  admin_default_enabled?: boolean;
}) => {
  const response = await adminAuthenticatedFetch("/admin/notifications/modules/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ module: AdminNotificationModuleItem }>(response);
  if (!payload.data?.module) {
    throw new Error("Missing module in response.");
  }
  return payload.data.module;
};

export const updateAdminNotificationModule = async (
  moduleKey: string,
  body: { label?: string; description?: string; admin_default_enabled?: boolean },
) => {
  const response = await adminAuthenticatedFetch(
    `/admin/notifications/modules/${encodeURIComponent(moduleKey)}/`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  const payload = await parseApiResponse<{ module: AdminNotificationModuleItem }>(response);
  if (!payload.data?.module) {
    throw new Error("Missing module in response.");
  }
  return payload.data.module;
};

export const deleteAdminNotificationModule = async (moduleKey: string) => {
  const response = await adminAuthenticatedFetch(
    `/admin/notifications/modules/${encodeURIComponent(moduleKey)}/`,
    { method: "DELETE" },
  );
  await parseApiResponse(response);
};

export const updateAdminStaffPermissions = async (
  staffId: number,
  permissions: Record<string, boolean>,
) => {
  const response = await adminAuthenticatedFetch("/admin/permissions/", {
    method: "PATCH",
    body: JSON.stringify({ staff_id: staffId, permissions }),
  });
  const payload = await parseApiResponse<AdminPermissionsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing permissions payload.");
  }
  return payload.data;
};

export const updateAdminRolePermissions = async (
  roleId: string,
  permissions: Record<string, boolean>,
) => {
  const response = await adminAuthenticatedFetch("/admin/permissions/", {
    method: "PATCH",
    body: JSON.stringify({ role_id: roleId, permissions }),
  });
  const payload = await parseApiResponse<AdminPermissionsResponse>(response);
  if (!payload.data) {
    throw new Error("Missing permissions payload.");
  }
  return payload.data;
};

export const getAdminNotificationPreferences = async () => {
  const response = await adminAuthenticatedFetch("/admin/notifications/preferences/", { method: "GET" });
  const payload = await parseApiResponse<AdminNotificationPreferencesResponse>(response);
  if (!payload.data) {
    throw new Error("Missing notification preferences payload.");
  }
  return payload.data;
};

export const updateAdminNotificationPreferences = async (preferences: Record<string, boolean>) => {
  const response = await adminAuthenticatedFetch("/admin/notifications/preferences/", {
    method: "PATCH",
    body: JSON.stringify({ preferences }),
  });
  const payload = await parseApiResponse<AdminNotificationPreferencesResponse>(response);
  if (!payload.data) {
    throw new Error("Missing notification preferences payload.");
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

export const updateAdminIpSecurity = async (body: {
  daily_request_threshold?: number;
  alerts_enabled?: boolean;
}) => {
  const response = await adminAuthenticatedFetch("/admin/logs/ip-security/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<AdminIpSecurityPayload>(response);
  if (!payload.data) {
    throw new Error("Missing IP security payload.");
  }
  return payload.data;
};

export const manageAdminIpBlock = async (body: {
  action: "block" | "unblock";
  ip_address: string;
  reason?: string;
}) => {
  const response = await adminAuthenticatedFetch("/admin/logs/ip-security/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<AdminIpSecurityPayload>(response);
  if (!payload.data) {
    throw new Error("Missing IP security payload.");
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
  return { ...payload.data, message: payload.message };
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

export type AdminStaffInternalMessage = {
  id: number;
  application_id: number;
  application_reference: string;
  customer_name?: string;
  sender_id: number | null;
  sender_name: string;
  recipient_id: number | null;
  recipient_name: string;
  message_text: string;
  created_at: string;
};

export const getAdminApplicationInternalMessages = async (applicationId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${applicationId}/internal-messages/`, {
    method: "GET",
  });
  const payload = await parseApiResponse<AdminStaffInternalMessage[]>(response);
  return payload.data || [];
};

export const sendAdminApplicationInternalMessage = async (
  applicationId: number,
  body: { message_text: string; recipient_staff_id?: number | "all" | null },
) => {
  const response = await adminAuthenticatedFetch(`/admin/applications/${applicationId}/internal-messages/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<AdminStaffInternalMessage>(response);
  if (!payload.data) {
    throw new Error("Internal message send response missing.");
  }
  return payload.data;
};

export const getAdminInternalMessagesFeed = async (limit = 30) => {
  const response = await adminAuthenticatedFetch(`/admin/internal-messages/feed/?limit=${limit}`, {
    method: "GET",
  });
  const payload = await parseApiResponse<AdminStaffInternalMessage[]>(response);
  return payload.data || [];
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

export type AdminDocumentStorageFile = {
  id: number;
  document_type: string;
  display_name: string;
  stored_filename: string;
  uploaded_at: string | null;
};

export type AdminDocumentStorageApplication = {
  application_id: string;
  application_pk: number;
  file_number: string;
  reference_number: string;
  customer_name: string;
  customer_email: string;
  service_name: string;
  case_type: string;
  application_status: string;
  application_status_label: string;
  current_stage: string;
  current_stage_label: string;
  created_at: string | null;
  latest_upload_at: string | null;
  document_count: number;
  documents_deleted: boolean;
  documents_deleted_at: string | null;
  folder_ids: string[];
  folder_exists: boolean;
  documents: AdminDocumentStorageFile[];
};

export const listAdminDocumentStorageApplications = async (): Promise<AdminDocumentStorageApplication[]> => {
  const response = await adminAuthenticatedFetch("/admin/docs/", { method: "GET" });
  const payload = await parseApiResponse<AdminDocumentStorageApplication[]>(response);
  return payload.data || [];
};

export const deleteAdminDocumentStorage = async (
  applicationId: string,
): Promise<{
  application_id: string;
  deleted_folders: string[];
  removed_document_records: number;
  documents_deleted: boolean;
  documents_deleted_at: string;
}> => {
  const response = await adminAuthenticatedFetch(`/admin/docs/${encodeURIComponent(applicationId)}/`, {
    method: "DELETE",
  });
  const payload = await parseApiResponse<{
    application_id: string;
    deleted_folders: string[];
    removed_document_records: number;
    documents_deleted: boolean;
    documents_deleted_at: string;
  }>(response);
  if (!payload.data) {
    throw new Error("Missing delete response.");
  }
  return payload.data;
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
