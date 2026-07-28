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

export type ServiceType = "OCI" | "Passport Renewal" | "E-Visa" | "Apostille";
export type PaymentStatus = "Paid" | "Pending" | "Prepaid";

export interface PipelineCase {
  id: string;
  applicationId?: number | string;
  customer: string;
  serviceType: ServiceType;
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
