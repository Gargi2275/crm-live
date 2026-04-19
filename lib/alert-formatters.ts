const ALERT_TYPE_LABEL_MAP: Record<string, string> = {
  changed_status: "Stage Change",
  login: "Staff Login",
  admin_alert_status_updated: "Alert Update",
  payment_received: "Payment",
  document_uploaded: "Document Upload",
  correction_requested: "Correction",
  sla_breach: "SLA Breach",
  audit_completed: "Audit Done",
  security_breach: "Security Breach",
  follow_up_required: "Follow Up Required",
  lead_converted: "Lead Converted",
  staff_idle: "Staff Idle",
};

const ALERT_TYPE_SEVERITY_MAP: Record<string, "CRITICAL" | "MEDIUM" | "LOW"> = {
  security_breach: "CRITICAL",
  follow_up_required: "MEDIUM",
  lead_converted: "LOW",
  staff_idle: "MEDIUM",
};

const ALERT_TYPE_BADGE_CLASS_MAP: Record<string, string> = {
  security_breach: "bg-red-100 text-red-700 border border-red-200",
  follow_up_required: "bg-amber-100 text-amber-700 border border-amber-200",
  lead_converted: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  staff_idle: "bg-orange-100 text-orange-700 border border-orange-200",
};

export function getAlertTypeLabel(actionType?: string | null): string {
  const normalized = String(actionType ?? "").trim().toLowerCase();
  return ALERT_TYPE_LABEL_MAP[normalized] ?? "System Activity";
}

export function getAlertSeverityLabel(actionType?: string | null): "CRITICAL" | "MEDIUM" | "LOW" {
  const normalized = String(actionType ?? "").trim().toLowerCase();
  return ALERT_TYPE_SEVERITY_MAP[normalized] ?? "LOW";
}

export function getAlertBadgeClassName(actionType?: string | null): string {
  const normalized = String(actionType ?? "").trim().toLowerCase();
  return ALERT_TYPE_BADGE_CLASS_MAP[normalized] ?? "bg-slate-100 text-slate-700 border border-slate-200";
}
