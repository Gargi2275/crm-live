export type KanbanStage =
  | "NEW_LEAD"
  | "ASSESSMENT_PENDING"
  | "ASSESSMENT_COMPLETED"
  | "DOCUMENTS_REQUIRED"
  | "PAYMENT_PENDING"
  | "DOCUMENT_UPLOAD_PENDING"
  | "FORM_FILLING"
  | "REVIEW_PENDING"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTED"
  | "DELIVERED";

/** Coarse filter buckets used by the working-portal service dropdown. */
export type ServiceCategory = "OCI" | "Passport Renewal" | "E-Visa" | "Apostille";
/** Display label — prefer catalog `service_name` (e.g. Birth Registration), not a coarse bucket. */
export type ServiceType = string;
export type PaymentStatus = "Paid" | "Pending" | "Prepaid";

const PASSPORT_RENEWAL_TYPES = new Set([
  "passport_renewal",
  "passport_services",
  "uk_passport_renewal",
]);

/** True only for real passport-renewal flows — not birth_reg / link-passport / etc. */
export function isPassportRenewalService(serviceType?: string | null, serviceName?: string | null): boolean {
  const normalized = String(serviceType || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (PASSPORT_RENEWAL_TYPES.has(normalized)) return true;
  if (normalized) return false;
  const name = String(serviceName || "").trim().toLowerCase();
  return name.includes("passport renewal") || name === "indian passport renewal";
}

export function normalizeServiceCategory(
  serviceType?: string | null,
  caseType?: string | null,
  serviceName?: string | null,
): ServiceCategory {
  const type = String(serviceType || "").toLowerCase();
  const caseHint = String(caseType || "").toLowerCase();
  const name = String(serviceName || "").toLowerCase();
  const blob = `${type} ${caseHint} ${name}`;
  if (caseHint.includes("apostille") || blob.includes("apostille")) return "Apostille";
  if (isPassportRenewalService(serviceType, serviceName)) return "Passport Renewal";
  if (
    blob.includes("evisa") ||
    blob.includes("e-visa") ||
    blob.includes("e visa") ||
    /\bvisa\b/.test(blob)
  ) {
    return "E-Visa";
  }
  return "OCI";
}

/** Prefer catalog service_name so Birth Registration is not shown as Passport Renewal. */
export function displayServiceLabel(item: {
  service_name?: string | null;
  service_type?: string | null;
  case_type?: string | null;
}): string {
  const name = String(item.service_name || "").trim();
  if (name) return name;
  return normalizeServiceCategory(item.service_type, item.case_type, item.service_name);
}

export function matchesServiceFilter(
  category: ServiceCategory,
  displayLabel: string,
  filter: string,
): boolean {
  if (!filter || filter === "All") return true;
  if (category === filter) return true;
  return displayLabel === filter;
}

/** After payment, never keep / move a case into Payment Pending. */
export function stageAfterPayment(
  preferred?: string | null,
  hasDocuments = false,
): KanbanStage {
  const raw = String(preferred || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (["SUBMITTED", "DELIVERED", "REVIEW_PENDING", "READY_FOR_SUBMISSION", "FORM_FILLING"].includes(raw)) {
    return raw as KanbanStage;
  }
  if (raw === "DOCUMENT_UPLOAD_PENDING" && !hasDocuments) {
    return "DOCUMENT_UPLOAD_PENDING";
  }
  return hasDocuments ? "FORM_FILLING" : "DOCUMENT_UPLOAD_PENDING";
}

/** Full service payment only — assessment/audit fee alone is not "Paid". */
export function isApplicationFullyPaid(item: {
  payment_confirmed?: boolean | null;
  full_payment_status?: string | null;
  application_status?: string | null;
  amount_due_pence?: number | null;
  service_total_pence?: number | null;
}): boolean {
  const fullPaymentStatus = String(item.full_payment_status || "").trim().toLowerCase();
  const applicationStatus = String(item.application_status || "").trim().toLowerCase();
  if (
    Boolean(item.payment_confirmed) ||
    fullPaymentStatus === "paid" ||
    ["captured", "success", "completed", "settled"].includes(fullPaymentStatus) ||
    applicationStatus === "paid" ||
    applicationStatus === "payment_received"
  ) {
    return true;
  }
  const amountDue = Number(item.amount_due_pence || 0);
  const serviceTotal = Number(item.service_total_pence || 0);
  return amountDue <= 0 && serviceTotal > 0;
}

export function resolvePipelinePaymentStatus(item: {
  payment_confirmed?: boolean | null;
  full_payment_status?: string | null;
  application_status?: string | null;
  audit_payment_status?: string | null;
  amount_due_pence?: number | null;
  service_total_pence?: number | null;
}): PaymentStatus {
  if (isApplicationFullyPaid(item)) {
    return "Paid";
  }
  const auditPaymentStatus = String(item.audit_payment_status || "").trim().toLowerCase();
  const fullPaymentStatus = String(item.full_payment_status || "").trim().toLowerCase();
  if (auditPaymentStatus === "created" || fullPaymentStatus === "created") {
    return "Prepaid";
  }
  return "Pending";
}

export interface PipelineCase {
  id: string;
  applicationId?: number | string;
  customer: string;
  /** Human-readable catalog name (or coarse fallback). */
  serviceType: ServiceType;
  /** Coarse bucket for All / OCI / Passport / E-Visa / Apostille filters. */
  serviceCategory?: ServiceCategory;
  country: string;
  flag: string;
  amount: number;
  paymentStatus: PaymentStatus;
  stage: KanbanStage;
  assignedTo: string | null;
  slaTimer: string;
  slaBreached: boolean;
  /** Customer paid Express fee plan — treat as urgent. */
  isExpress?: boolean;
}

export interface KanbanColumnDefinition {
  id: KanbanStage;
  title: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumnDefinition[] = [
  { id: "NEW_LEAD", title: "NEW LEAD", color: "bg-sky-100 text-sky-700 border-sky-200" },
  {
    id: "ASSESSMENT_PENDING",
    title: "ASSESSMENT PENDING",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    id: "ASSESSMENT_COMPLETED",
    title: "ASSESSMENT COMPLETED",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  { id: "DOCUMENTS_REQUIRED", title: "DOCUMENTS REQUIRED", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "PAYMENT_PENDING", title: "PAYMENT PENDING", color: "bg-red-100 text-red-700 border-red-200" },
  {
    id: "DOCUMENT_UPLOAD_PENDING",
    title: "DOCUMENT UPLOAD PENDING",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  { id: "FORM_FILLING", title: "FORM FILLING", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "REVIEW_PENDING", title: "REVIEW PENDING", color: "bg-amber-100 text-amber-700 border-amber-200" },
  {
    id: "READY_FOR_SUBMISSION",
    title: "READY FOR SUBMISSION",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  { id: "SUBMITTED", title: "SUBMITTED", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "DELIVERED", title: "DELIVERED", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

/** Map legacy / alias stage ids onto live kanban columns. */
export function aliasKanbanStage(stage: string): KanbanStage {
  const normalized = (stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "PASSPORT_QUOTE_PENDING") return "PAYMENT_PENDING";
  if (normalized === "UPLOAD_PENDING") return "DOCUMENT_UPLOAD_PENDING";
  // Legacy audit column names → assessment
  if (normalized === "AUDIT_PENDING") return "ASSESSMENT_PENDING";
  if (normalized === "AUDIT_COMPLETED") return "ASSESSMENT_COMPLETED";
  if (KANBAN_COLUMNS.some((col) => col.id === normalized)) {
    return normalized as KanbanStage;
  }
  return "NEW_LEAD";
}
