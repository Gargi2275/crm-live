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
  if (scope === "exclude_easyfly") {
    return "/admin";
  }
  if (scope === "easyfly_only") {
    return ACTION_DASHBOARD_ROLES.has(role as StaffRole)
      ? "/admin/easyfly/action"
      : "/admin/easyfly";
  }
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
    access_scope?: AccessScope;
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
  admin_messages?: Array<{
    created_at: string;
    subject: string;
    message: string;
    sender?: "team" | "customer" | string;
    message_id?: string;
  }>;
  audit_logs?: Array<{
    action: string;
    timestamp: string;
    actor: string;
    metadata?: Record<string, unknown>;
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
  audit_fee_paid?: boolean;
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
  quote_amount_pence?: number;
  quote_currency?: string | null;
  review_note?: string;
  internal_admin_notes?: string;
  payment_confirmed?: boolean;
  final_submission_completed?: boolean;
  full_payment_id?: string | null;
  fee_plan_code?: string | null;
  fee_plan_fee_pence?: number | null;
  is_express?: boolean;
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
  sender: "team" | "customer" | string;
  message_body: string;
  subject?: string;
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

/** User-facing task status label. Internal value `blocked` means waiting / on hold. */
export function formatTaskStatusLabel(status: string | null | undefined): string {
  const key = String(status || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    new: "New",
    in_progress: "In progress",
    completed: "Completed",
    blocked: "Waiting",
    cancelled: "Cancelled",
  };
  if (labels[key]) return labels[key];
  return key ? key.replace(/_/g, " ") : "New";
}

/** Color classes for workload task status badges. */
export function taskStatusBadgeClass(status: string | null | undefined): string {
  const key = String(status || "").trim().toLowerCase();
  const map: Record<string, string> = {
    new: "border-[#93C5FD] bg-[#DBEAFE] text-[#1E40AF]",
    in_progress: "border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]",
    completed: "border-[#6EE7B7] bg-[#D1FAE5] text-[#065F46]",
    blocked: "border-[#C4B5FD] bg-[#EDE9FE] text-[#5B21B6]",
    cancelled: "border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]",
  };
  return (
    map[key] ||
    "border-[#D9E1EA] bg-[#F5F7FA] text-[#486581]"
  );
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

export const loginAdmin = async (username: string, password: string, captchaToken: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, captcha_token: captchaToken }),
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
  const method = String(options.method || "GET").toUpperCase();
  // Avoid forcing JSON Content-Type on binary GETs (document download/view).
  const shouldSetJsonContentType = !isFormData && method !== "GET" && method !== "HEAD";

  const headers = {
    ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
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
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
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
  activeOnly?: boolean;
  status?: "all" | "active" | "inactive";
}): Promise<AdminStaffListResponse> => {
  const params = new URLSearchParams();
  if (options?.excludeAdmin) params.set("exclude_admin", "1");
  if (options?.activeOnly) params.set("active_only", "1");
  if (options?.status && options.status !== "all") params.set("status", options.status);
  const query = params.toString() ? `?${params.toString()}` : "";
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
  // Assignees / pickers should only see active staff.
  const payload = await listStaffUsersWithSummary({ activeOnly: true });
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

export const changeStaffPassword = async (currentPassword: string, newPassword: string) => {
  const response = await adminAuthenticatedFetch("/admin/change-password/", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  await parseApiResponse(response);
};

export const unlockStaffUser = async (staffId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/staff/${staffId}/unlock/`, {
    method: "POST",
  });
  await parseApiResponse(response);
};

export type AdminService = {
  id: number;
  service_name: string;
  description: string;
  base_fee: string | number;
  government_fee: string | number;
  total_fee: string | number;
  audit_fee: string | number;
  service_type: string;
  category: string;
  processing_time_days: number | null;
  is_active: boolean;
  show_on_homepage?: boolean;
  created_at?: string;
  updated_at?: string;
  code_keyed?: boolean;
  code_keyed_warning?: string;
};

export type AdminServiceMeta = {
  service_types: Array<{ id: string; label: string }>;
  categories: Array<{ id: string; label: string }>;
  code_keyed_types: string[];
};

export type AdminServiceListResponse = {
  services: AdminService[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  meta: AdminServiceMeta;
};

export const listAdminServices = async (params?: {
  search?: string;
  service_type?: string;
  category?: string;
  active?: "all" | "true" | "false";
  page?: number;
  page_size?: number;
}): Promise<AdminServiceListResponse> => {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.service_type) query.set("service_type", params.service_type);
  if (params?.category) query.set("category", params.category);
  if (params?.active && params.active !== "all") query.set("active", params.active);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  const response = await adminAuthenticatedFetch(qs ? `/admin/services/?${qs}` : "/admin/services/", {
    method: "GET",
  });
  const payload = await parseApiResponse<AdminServiceListResponse>(response);
  return (
    payload.data || {
      services: [],
      pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
      meta: { service_types: [], categories: [], code_keyed_types: [] },
    }
  );
};

export const createAdminService = async (body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch("/admin/services/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ service: AdminService }>(response);
  return payload.data?.service;
};

export const getAdminService = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/`, {
    method: "GET",
  });
  const payload = await parseApiResponse<{ service: AdminService }>(response);
  return payload.data?.service ?? null;
};

export const updateAdminService = async (serviceId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ service: AdminService }>(response);
  return payload.data?.service;
};

export const deleteAdminService = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/`, {
    method: "DELETE",
  });
  const payload = await parseApiResponse<{
    deleted?: boolean;
    archived?: boolean;
    application_count?: number;
    service?: AdminService;
  }>(response);
  return payload.data || { deleted: true, archived: false };
};

export type AdminDocumentRequirement = {
  id: number;
  service_id: number;
  code: string;
  name: string;
  description: string;
  mistakes?: string;
  sample?: string;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  show_when_question_code?: string;
  show_when_value?: string;
};

export const listAdminServiceDocuments = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/documents/`, { method: "GET" });
  const payload = await parseApiResponse<{ requirements: AdminDocumentRequirement[] }>(response);
  return payload.data?.requirements || [];
};

export const createAdminServiceDocument = async (serviceId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/documents/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ requirement: AdminDocumentRequirement }>(response);
  return payload.data?.requirement;
};

export const updateAdminServiceDocument = async (
  serviceId: number,
  requirementId: number,
  body: Record<string, unknown>,
) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/documents/${requirementId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ requirement: AdminDocumentRequirement }>(response);
  return payload.data?.requirement;
};

export const deleteAdminServiceDocument = async (serviceId: number, requirementId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/documents/${requirementId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const reorderAdminServiceDocuments = async (serviceId: number, orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/documents/reorder/`, {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ requirements: AdminDocumentRequirement[] }>(response);
  return payload.data?.requirements || [];
};

export type AdminServiceQuestion = {
  id: number;
  service_id: number;
  code: string;
  label: string;
  question_type: string;
  options: string[];
  depends_on_code?: string;
  options_by_answer?: Record<string, string[]>;
  help_text?: string;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
};

export const listAdminServiceQuestions = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/questions/`, { method: "GET" });
  const payload = await parseApiResponse<{ questions: AdminServiceQuestion[] }>(response);
  return payload.data?.questions || [];
};

export const createAdminServiceQuestion = async (serviceId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/questions/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ question: AdminServiceQuestion }>(response);
  return payload.data?.question;
};

export const updateAdminServiceQuestion = async (
  serviceId: number,
  questionId: number,
  body: Record<string, unknown>,
) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/questions/${questionId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ question: AdminServiceQuestion }>(response);
  return payload.data?.question;
};

export const deleteAdminServiceQuestion = async (serviceId: number, questionId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/questions/${questionId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const reorderAdminServiceQuestions = async (serviceId: number, orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/questions/reorder/`, {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ questions: AdminServiceQuestion[] }>(response);
  return payload.data?.questions || [];
};

export type AdminServiceReminder = {
  id: number;
  service_id: number;
  title: string;
  delay_days: number;
  email_subject: string;
  email_body: string;
  is_active: boolean;
  display_order: number;
};

export const listAdminServiceReminders = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/reminders/`, { method: "GET" });
  const payload = await parseApiResponse<{ reminders: AdminServiceReminder[] }>(response);
  return payload.data?.reminders || [];
};

export const createAdminServiceReminder = async (serviceId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/reminders/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ reminder: AdminServiceReminder }>(response);
  return payload.data?.reminder;
};

export const updateAdminServiceReminder = async (
  serviceId: number,
  reminderId: number,
  body: Record<string, unknown>,
) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/reminders/${reminderId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ reminder: AdminServiceReminder }>(response);
  return payload.data?.reminder;
};

export const deleteAdminServiceReminder = async (serviceId: number, reminderId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/reminders/${reminderId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
};

export const listAdminCategories = async () => {
  const response = await adminAuthenticatedFetch("/admin/categories/", { method: "GET" });
  const payload = await parseApiResponse<{ categories: AdminCategory[] }>(response);
  return payload.data?.categories || [];
};

export const createAdminCategory = async (body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch("/admin/categories/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ category: AdminCategory }>(response);
  return payload.data?.category;
};

export const updateAdminCategory = async (categoryId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/categories/${categoryId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ category: AdminCategory }>(response);
  return payload.data?.category;
};

export const deleteAdminCategory = async (categoryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/categories/${categoryId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const reorderAdminCategories = async (orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch("/admin/categories/reorder/", {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ categories: AdminCategory[] }>(response);
  return payload.data?.categories || [];
};

export type AdminOriginCountryFaq = {
  question: string;
  answer: string;
};

export type AdminOriginCountryVisaOption = {
  id?: number;
  service_id: number;
  service_type?: string;
  service_name?: string;
  label: string;
  fee: string | number;
  entries?: string;
  max_stay?: string;
  validity?: string;
  travel_purpose?: string;
  display_order?: number;
  is_active?: boolean;
  cta_href?: string;
  duration?: string;
};

export type AdminOriginCountry = {
  id: number;
  country_code: string;
  name: string;
  slug: string;
  destination_code: string;
  badge: string;
  service_label: string;
  href: string;
  cta_href?: string;
  secondary_label: string;
  secondary_href: string;
  image_url: string;
  page_title?: string;
  page_subtitle?: string;
  faqs?: AdminOriginCountryFaq[];
  visa_options?: AdminOriginCountryVisaOption[];
  service_id: number | null;
  service_name?: string;
  stored_href?: string;
  has_uploaded_image?: boolean;
  display_order: number;
  is_active: boolean;
};

export type AdminOriginCountryInput = {
  country_code?: string;
  name?: string;
  slug?: string;
  destination_code?: string;
  service_label?: string;
  href?: string;
  secondary_label?: string;
  secondary_href?: string;
  page_title?: string;
  page_subtitle?: string;
  faqs?: AdminOriginCountryFaq[];
  visa_options?: AdminOriginCountryVisaOption[];
  service_id?: number | null;
  is_active?: boolean;
  image?: File | null;
  clear_image?: boolean;
};

const buildAdminOriginCountryBody = (input: AdminOriginCountryInput): BodyInit => {
  const form = new FormData();
  const append = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) {
      form.append(key, "");
      return;
    }
    if (typeof value === "boolean") {
      form.append(key, value ? "true" : "false");
      return;
    }
    if (typeof value === "number") {
      form.append(key, String(value));
      return;
    }
    if (Array.isArray(value)) {
      form.append(key, JSON.stringify(value));
      return;
    }
    form.append(key, String(value));
  };

  append("country_code", input.country_code);
  append("name", input.name);
  append("slug", input.slug);
  append("destination_code", input.destination_code);
  append("service_label", input.service_label);
  append("href", input.href);
  append("secondary_label", input.secondary_label);
  append("secondary_href", input.secondary_href);
  append("page_title", input.page_title);
  append("page_subtitle", input.page_subtitle);
  append("faqs", input.faqs);
  append("visa_options", input.visa_options);
  append("service_id", input.service_id);
  append("is_active", input.is_active);
  append("clear_image", input.clear_image);

  if (input.image instanceof File) {
    form.append("image", input.image);
  }
  return form;
};

export const listAdminOriginCountries = async () => {
  const response = await adminAuthenticatedFetch("/admin/origin-countries/", { method: "GET" });
  const payload = await parseApiResponse<{ countries: AdminOriginCountry[] }>(response);
  return payload.data?.countries || [];
};

export const getAdminOriginCountry = async (countryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/origin-countries/${countryId}/`, { method: "GET" });
  const payload = await parseApiResponse<{ country: AdminOriginCountry }>(response);
  return payload.data?.country;
};

export const createAdminOriginCountry = async (input: AdminOriginCountryInput) => {
  const response = await adminAuthenticatedFetch("/admin/origin-countries/", {
    method: "POST",
    body: buildAdminOriginCountryBody(input),
  });
  const payload = await parseApiResponse<{ country: AdminOriginCountry }>(response);
  return payload.data?.country;
};

export const updateAdminOriginCountry = async (countryId: number, input: AdminOriginCountryInput) => {
  const response = await adminAuthenticatedFetch(`/admin/origin-countries/${countryId}/`, {
    method: "PATCH",
    body: buildAdminOriginCountryBody(input),
  });
  const payload = await parseApiResponse<{ country: AdminOriginCountry }>(response);
  return payload.data?.country;
};

export const deleteAdminOriginCountry = async (countryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/origin-countries/${countryId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export type AdminHubCity = {
  id?: number;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
  offerings?: AdminHubOffering[];
};

export type AdminHubOffering = {
  id?: number;
  service_id: number;
  service_name?: string;
  service_type?: string;
  govt_fee: string | null;
  service_fee: string;
  processing_time: string;
  validity: string;
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
};

export type AdminHubCountry = {
  id: number;
  name: string;
  slug: string;
  currency_code: string;
  currency_symbol: string;
  is_active: boolean;
  display_order: number;
  cities: AdminHubCity[];
  offerings: AdminHubOffering[];
  city_count?: number;
};

export type AdminHubCountryInput = {
  name?: string;
  slug?: string;
  currency_code?: string;
  currency_symbol?: string;
  is_active?: boolean;
  display_order?: number;
  cities?: AdminHubCity[];
  offerings?: AdminHubOffering[];
};

export const listAdminHubCountries = async () => {
  const response = await adminAuthenticatedFetch("/admin/service-hubs/", { method: "GET" });
  const payload = await parseApiResponse<{ countries: AdminHubCountry[] }>(response);
  return payload.data?.countries || [];
};

export const getAdminHubCountry = async (countryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/service-hubs/${countryId}/`, { method: "GET" });
  const payload = await parseApiResponse<{ country: AdminHubCountry }>(response);
  return payload.data?.country;
};

export const createAdminHubCountry = async (input: AdminHubCountryInput) => {
  const response = await adminAuthenticatedFetch("/admin/service-hubs/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ country: AdminHubCountry }>(response);
  return payload.data?.country;
};

export const updateAdminHubCountry = async (countryId: number, input: AdminHubCountryInput) => {
  const response = await adminAuthenticatedFetch(`/admin/service-hubs/${countryId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ country: AdminHubCountry }>(response);
  return payload.data?.country;
};

export const deleteAdminHubCountry = async (countryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/service-hubs/${countryId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const reorderAdminHubCountries = async (orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch("/admin/service-hubs/reorder/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ countries: AdminHubCountry[] }>(response);
  return payload.data?.countries || [];
};

export const reorderAdminOriginCountries = async (orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch("/admin/origin-countries/reorder/", {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ countries: AdminOriginCountry[] }>(response);
  return payload.data?.countries || [];
};

export type AdminHomepageModule = {
  id: number;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
  updated_at?: string | null;
};

export type AdminHomepageSettings = {
  pricing_preview_count: number;
  pricing_title: string;
  pricing_subtitle: string;
  updated_at?: string | null;
};

export const listAdminHomepageModules = async () => {
  const response = await adminAuthenticatedFetch("/admin/homepage-modules/", { method: "GET" });
  const payload = await parseApiResponse<{ modules: AdminHomepageModule[] }>(response);
  return payload.data?.modules || [];
};

export const getAdminHomepageSettings = async () => {
  const response = await adminAuthenticatedFetch("/admin/homepage-settings/", { method: "GET" });
  const payload = await parseApiResponse<{ settings: AdminHomepageSettings }>(response);
  return payload.data?.settings || null;
};

export const updateAdminHomepageSettings = async (input: {
  pricing_preview_count?: number;
  pricing_title?: string;
  pricing_subtitle?: string;
}) => {
  const response = await adminAuthenticatedFetch("/admin/homepage-settings/", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ settings: AdminHomepageSettings }>(response);
  return payload.data?.settings || null;
};

export type AdminMailCredential = {
  id: number;
  label: string;
  email: string;
  smtp_host: string;
  smtp_port: number | null;
  routing_key: string;
  routing_label: string;
  is_default: boolean;
  is_active: boolean;
  has_password: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export const listAdminMailCredentials = async () => {
  const response = await adminAuthenticatedFetch("/admin/mail-credentials/", { method: "GET" });
  const payload = await parseApiResponse<{ credentials: AdminMailCredential[] }>(response);
  return payload.data?.credentials || [];
};

export const createAdminMailCredential = async (input: {
  label?: string;
  email: string;
  smtp_host?: string;
  smtp_port?: number | null;
  password: string;
  routing_key?: string;
  is_default?: boolean;
  is_active?: boolean;
}) => {
  const response = await adminAuthenticatedFetch("/admin/mail-credentials/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ credential: AdminMailCredential }>(response);
  return payload.data?.credential || null;
};

export const updateAdminMailCredential = async (
  credentialId: number,
  input: {
    label?: string;
    email?: string;
    smtp_host?: string;
    smtp_port?: number | null;
    password?: string;
    routing_key?: string;
    is_default?: boolean;
    is_active?: boolean;
  },
) => {
  const response = await adminAuthenticatedFetch(`/admin/mail-credentials/${credentialId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ credential: AdminMailCredential }>(response);
  return payload.data?.credential || null;
};

export const deleteAdminMailCredential = async (credentialId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/mail-credentials/${credentialId}/`, {
    method: "DELETE",
  });
  await parseApiResponse<{ deleted: boolean }>(response);
};

export const setDefaultAdminMailCredential = async (credentialId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/mail-credentials/${credentialId}/set-default/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const payload = await parseApiResponse<{ credential: AdminMailCredential }>(response);
  return payload.data?.credential || null;
};

export const reorderAdminHomepageModules = async (orderedIds: number[]) => {
  const response = await adminAuthenticatedFetch("/admin/homepage-modules/reorder/", {
    method: "POST",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  const payload = await parseApiResponse<{ modules: AdminHomepageModule[] }>(response);
  return payload.data?.modules || [];
};

export const updateAdminHomepageModule = async (
  moduleId: number,
  input: { label?: string; is_active?: boolean; display_order?: number },
) => {
  const response = await adminAuthenticatedFetch(`/admin/homepage-modules/${moduleId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseApiResponse<{ module: AdminHomepageModule }>(response);
  return payload.data?.module;
};

export type AdminFeePlan = {
  id: number;
  service_id: number;
  plan_code: string;
  label: string;
  fee: string | number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
};

export const listAdminServiceFeePlans = async (serviceId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/fee-plans/`, { method: "GET" });
  const payload = await parseApiResponse<{ plans: AdminFeePlan[] }>(response);
  return payload.data?.plans || [];
};

export const createAdminServiceFeePlan = async (serviceId: number, body: Record<string, unknown>) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/fee-plans/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ plan: AdminFeePlan }>(response);
  return payload.data?.plan;
};

export const updateAdminServiceFeePlan = async (
  serviceId: number,
  planId: number,
  body: Record<string, unknown>,
) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/fee-plans/${planId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ plan: AdminFeePlan }>(response);
  return payload.data?.plan;
};

export const deleteAdminServiceFeePlan = async (serviceId: number, planId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/services/${serviceId}/fee-plans/${planId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const requestStaffForgotPassword = async (email: string, captchaToken: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/forgot-password/request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, captcha_token: captchaToken }),
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
  eventType?: "all" | "login" | "failed_attempt" | "website_visit" | "event" | "email";
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

export type AdminDocumentDeletionRequest = {
  id: number;
  application_id: number;
  status: "pending" | "approved" | "rejected" | "executed" | "cancelled" | string;
  reason: string;
  reference_number: string;
  file_number: string;
  customer_email: string;
  service_name: string;
  service_type: string;
  requested_at: string | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  executed_at: string | null;
  executed_by: string;
  documents_deleted: boolean;
  updated_at: string | null;
};

export type AdminDocumentDeletionListParams = {
  status?: string;
  date_from?: string;
  date_to?: string;
  service?: string;
  q?: string;
  limit?: number;
};

export const listAdminDocumentDeletionRequests = async (
  params: AdminDocumentDeletionListParams = {},
): Promise<{ requests: AdminDocumentDeletionRequest[]; count: number }> => {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.service) query.set("service", params.service);
  if (params.q) query.set("q", params.q);
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await adminAuthenticatedFetch(`/admin/document-deletion-requests/${suffix}`, {
    method: "GET",
  });
  const payload = await parseApiResponse<{ requests: AdminDocumentDeletionRequest[]; count: number }>(response);
  return {
    requests: payload.data?.requests || [],
    count: payload.data?.count || 0,
  };
};

export const approveAdminDocumentDeletionRequest = async (
  requestId: number,
  notes = "",
): Promise<AdminDocumentDeletionRequest> => {
  const response = await adminAuthenticatedFetch(
    `/admin/document-deletion-requests/${requestId}/approve/`,
    {
      method: "POST",
      body: JSON.stringify({ review_notes: notes }),
    },
  );
  const payload = await parseApiResponse<{ request: AdminDocumentDeletionRequest }>(response);
  if (!payload.data?.request) {
    throw new Error("Missing approve response.");
  }
  return payload.data.request;
};

export const rejectAdminDocumentDeletionRequest = async (
  requestId: number,
  notes = "",
): Promise<AdminDocumentDeletionRequest> => {
  const response = await adminAuthenticatedFetch(
    `/admin/document-deletion-requests/${requestId}/reject/`,
    {
      method: "POST",
      body: JSON.stringify({ review_notes: notes }),
    },
  );
  const payload = await parseApiResponse<{ request: AdminDocumentDeletionRequest }>(response);
  if (!payload.data?.request) {
    throw new Error("Missing reject response.");
  }
  return payload.data.request;
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

export type AdminBlogFaq = {
  question: string;
  answer: string;
};

export type AdminBlogCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminBlogPost = {
  id: number;
  title: string;
  slug: string;
  category: AdminBlogCategory | null;
  category_id: number | null;
  excerpt: string;
  content?: string;
  featured_image_url: string;
  author_name: string;
  author_title: string;
  author_bio?: string;
  author_image_url: string;
  read_time_minutes: number;
  faqs?: AdminBlogFaq[];
  cta_title: string;
  cta_body: string;
  cta_button_text: string;
  cta_button_url: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  show_on_homepage: boolean;
  display_order: number;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
  featured_image_url_raw?: string;
  author_image_url_raw?: string;
};

export type AdminBlogPostInput = {
  title?: string;
  slug?: string;
  category_id?: number | null;
  excerpt?: string;
  content?: string;
  featured_image_url?: string;
  featured_image?: File | null;
  author_name?: string;
  author_title?: string;
  author_bio?: string;
  author_image_url?: string;
  author_image?: File | null;
  read_time_minutes?: number;
  faqs?: AdminBlogFaq[];
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
};

const buildAdminBlogPostBody = (input: AdminBlogPostInput): BodyInit => {
  const hasFile =
    (typeof File !== "undefined" && input.featured_image instanceof File) ||
    (typeof File !== "undefined" && input.author_image instanceof File);

  if (hasFile) {
    const form = new FormData();
    const append = (key: string, value: unknown) => {
      if (value === undefined) return;
      if (value === null) {
        form.append(key, "");
        return;
      }
      if (typeof value === "boolean") {
        form.append(key, value ? "true" : "false");
        return;
      }
      if (typeof value === "number") {
        form.append(key, String(value));
        return;
      }
      if (Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
        return;
      }
      form.append(key, String(value));
    };

    append("title", input.title);
    append("slug", input.slug);
    append("category_id", input.category_id);
    append("excerpt", input.excerpt);
    append("content", input.content);
    append("featured_image_url", input.featured_image_url);
    append("author_name", input.author_name);
    append("author_title", input.author_title);
    append("author_bio", input.author_bio);
    append("author_image_url", input.author_image_url);
    append("read_time_minutes", input.read_time_minutes);
    append("faqs", input.faqs);
    append("cta_title", input.cta_title);
    append("cta_body", input.cta_body);
    append("cta_button_text", input.cta_button_text);
    append("cta_button_url", input.cta_button_url);
    append("meta_title", input.meta_title);
    append("meta_description", input.meta_description);
    append("is_published", input.is_published);
    append("show_on_homepage", input.show_on_homepage);
    append("display_order", input.display_order);
    append("published_at", input.published_at);

    if (input.featured_image instanceof File) {
      form.append("featured_image", input.featured_image);
    }
    if (input.author_image instanceof File) {
      form.append("author_image", input.author_image);
    }
    return form;
  }

  const json: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) json[key] = value;
  };
  set("title", input.title);
  set("slug", input.slug);
  set("category_id", input.category_id);
  set("excerpt", input.excerpt);
  set("content", input.content);
  set("featured_image_url", input.featured_image_url);
  set("author_name", input.author_name);
  set("author_title", input.author_title);
  set("author_bio", input.author_bio);
  set("author_image_url", input.author_image_url);
  set("read_time_minutes", input.read_time_minutes);
  set("faqs", input.faqs);
  set("cta_title", input.cta_title);
  set("cta_body", input.cta_body);
  set("cta_button_text", input.cta_button_text);
  set("cta_button_url", input.cta_button_url);
  set("meta_title", input.meta_title);
  set("meta_description", input.meta_description);
  set("is_published", input.is_published);
  set("show_on_homepage", input.show_on_homepage);
  set("display_order", input.display_order);
  set("published_at", input.published_at);
  return JSON.stringify(json);
};

export const listAdminBlogCategories = async (): Promise<AdminBlogCategory[]> => {
  const response = await adminAuthenticatedFetch("/admin/blog/categories/", { method: "GET" });
  const payload = await parseApiResponse<{ categories: AdminBlogCategory[] }>(response);
  return payload.data?.categories || [];
};

export const createAdminBlogCategory = async (body: {
  name: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}) => {
  const response = await adminAuthenticatedFetch("/admin/blog/categories/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ category: AdminBlogCategory }>(response);
  return payload.data?.category;
};

export const updateAdminBlogCategory = async (
  categoryId: number,
  body: Partial<{
    name: string;
    slug: string;
    description: string;
    display_order: number;
    is_active: boolean;
  }>,
) => {
  const response = await adminAuthenticatedFetch(`/admin/blog/categories/${categoryId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse<{ category: AdminBlogCategory }>(response);
  return payload.data?.category;
};

export const deleteAdminBlogCategory = async (categoryId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/blog/categories/${categoryId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};

export const listAdminBlogPosts = async (params?: {
  search?: string;
  published?: "all" | "true" | "false" | boolean;
}): Promise<AdminBlogPost[]> => {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  if (params?.published === true || params?.published === "true") qs.set("published", "true");
  if (params?.published === false || params?.published === "false") qs.set("published", "false");
  const query = qs.toString();
  const response = await adminAuthenticatedFetch(query ? `/admin/blog/posts/?${query}` : "/admin/blog/posts/", {
    method: "GET",
  });
  const payload = await parseApiResponse<{ posts: AdminBlogPost[] }>(response);
  return payload.data?.posts || [];
};

export const getAdminBlogPost = async (postId: number): Promise<AdminBlogPost> => {
  const response = await adminAuthenticatedFetch(`/admin/blog/posts/${postId}/`, { method: "GET" });
  const payload = await parseApiResponse<{ post: AdminBlogPost }>(response);
  if (!payload.data?.post) {
    throw new Error("Missing blog post payload.");
  }
  return payload.data.post;
};

export const createAdminBlogPost = async (input: AdminBlogPostInput): Promise<AdminBlogPost | undefined> => {
  const response = await adminAuthenticatedFetch("/admin/blog/posts/", {
    method: "POST",
    body: buildAdminBlogPostBody(input),
  });
  const payload = await parseApiResponse<{ post: AdminBlogPost }>(response);
  return payload.data?.post;
};

export const updateAdminBlogPost = async (
  postId: number,
  input: AdminBlogPostInput,
): Promise<AdminBlogPost | undefined> => {
  const response = await adminAuthenticatedFetch(`/admin/blog/posts/${postId}/`, {
    method: "PATCH",
    body: buildAdminBlogPostBody(input),
  });
  const payload = await parseApiResponse<{ post: AdminBlogPost }>(response);
  return payload.data?.post;
};

export const deleteAdminBlogPost = async (postId: number) => {
  const response = await adminAuthenticatedFetch(`/admin/blog/posts/${postId}/`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
};
