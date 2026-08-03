"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Eye, HelpCircle, MessageSquare, RefreshCcw, Star, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConsentCheckboxes } from "@/components/ConsentCheckboxes";
import { InlineSmartQuestions } from "@/components/checkout/InlineSmartQuestions";
import { StartOrderPanel, type StartOrderApplicant, type StartOrderCartEntry } from "@/components/dashboard/StartOrderPanel";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {
  authenticatedFetch,
  createApplication,
  createAuditPaymentOrder,
  createCartFullPaymentOrder,
  createFullPaymentOrder,
  selectFullPaymentPlan,
  createDocumentDeletionRequest,
  executeDocumentDeletionRequest,
  getApplicationByReference,
  getApplicationDocuments,
  getAuditStatus,
  getDocumentDeletionRequests,
  getPublicTestimonials,
  openApplicationDocument,
  resubmitApplicationForReview,
  skipAuditWithDisclaimer,
  startAudit,
  submitTestimonial,
  uploadDocument,
  verifyAuditPayment,
  verifyCartFullPayment,
  verifyPassportRenewalQuotePayment,
  verifyFullPayment,
  type DocumentDeletionRequestsPayload,
} from "@/lib/api";
import { mergeHydratedDocuments, buildChecklistUploadIdMap, documentsFromAuditChecklistItems, inferBackendDocumentTypeFromChecklistId, looksLikeUploadedFileName, resolveChecklistDisplayTitle, type StoredDocumentState } from "@/lib/document-upload-ui";
import {
  fetchDocumentRequirements,
  mapRequirementToChecklistItem,
  toBackendServiceType,
} from "@/lib/document-requirements";
import { formatGbp, getAssessmentFeeGbp, priceDisplay, type CatalogService } from "@/lib/public-pricing";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  clearDependentAnswers,
  fetchServiceQuestions,
  isQuestionVisible,
  mapQuestionToJourneyItem,
  requirementMatchesAnswers,
  resolveServiceChecklist,
  type JourneyQuestion,
} from "@/lib/questionnaire";
import { countryStateAnswerKey, fetchStatesForCountry } from "@/lib/country-states";
import { clearStripeReturnParams, getStripeCheckoutUrl, readStripeReturnParams, redirectToStripeCheckout } from "@/lib/stripe-checkout";
import { useRouter } from "next/navigation";
/** Known journey keys plus live catalog types (e.g. e-oci, oci-link-passport). */
type ServiceId =
  | "new-oci"
  | "oci-renewal"
  | "oci-update"
  | "passport-renewal"
  | "apostille"
  | "undecided"
  | (string & {});
type FlowStage = "service" | "questions" | "checklist" | "upload" | "summary" | "audit-pending" | "audit-result" | "full-payment" | "processing" | "completed";

type OrderCartApp = {
  applicantName: string;
  applicantEmail: string;
  applicantMobile?: string;
  applyingFrom?: string;
  service: ServiceId;
  applicationId: number;
  referenceNumber: string;
  docsComplete: boolean;
};
type QuestionId = string;
type DocumentStatus = "not_uploaded" | "uploaded" | "pending_reupload";
type AuditOutcome = "green" | "amber" | "red";

interface AuditResult {
  status: "green" | "amber" | "red";
  auditor_notes: string;
  flagged_documents: Array<{
    doc_id: string;
    doc_name: string;
    issue: string;
    action_required: "re-upload" | "obtain" | "apostille" | "affidavit";
    status?: string;
    reuploaded?: boolean;
    reuploaded_at?: string | null;
  }>;
  reviewed_at: string;
}

type PaymentSummary = {
  service_label: string;
  service_fee: number;
  audit_credit: number;
  addons: Array<{ label: string; amount: number }>;
  total_due: number;
  currency: "GBP";
};

type DocumentItem = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  mistakes: string;
  sample: string;
  sampleUrl?: string | null;
  commonMistakes?: string[];
  specialRequirement?: "apostille" | "bilingual" | "affidavit" | null;
};

type GeneratedChecklistResponse = {
  checklist: Array<{
    doc_id: string;
    doc_name: string;
    description: string;
    sample_url: string | null;
    common_mistakes: string[];
    special_requirement: "apostille" | "bilingual" | "affidavit" | null;
    required: boolean;
  }>;
};

type DocumentState = StoredDocumentState;

type JourneyStorage = {
  stage: FlowStage;
  selectedService: ServiceId | null;
  questionIndex: number;
  answers: Answers;
  documents: Record<string, DocumentState>;
  supportUploads: Record<string, string>;
  supportNotes: string;
  addOns: string[];
  auditOutcome: AuditOutcome | null;
  auditSubmitted: boolean;
  reviewRound: number;
  processingStep: number;
  auditId?: number | null;
  applicationId?: number | null;
};

type JourneyDraftStorage = {
  stage: FlowStage;
  selectedService: ServiceId | null;
  questionIndex: number;
  answers: Answers;
  supportNotes: string;
  addOns: string[];
  generatedChecklist: DocumentItem[];
  lastChecklistAnswers: Answers | null;
};

type ApplicationRecord = {
  id: number;
  latest_audit_id?: number | null;
  reference_number: string;
  file_number?: string;
  application_status: string;
  quoted_fee?: string | null;
  quote_amount_pence?: number | null;
  quote_notes?: string | null;
  quote_set_at?: string | null;
  quote_expires_at?: string | null;
  quote_status?: string;
  service_type?: string;
  service_name?: string;
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
  full_payment_status?: string;
  payment_confirmed?: boolean;
  current_stage?: string;
  document_count?: number;
  updated_at?: string;
  auditor_notes?: string;
  flagged_documents?: Array<{
    document_type?: string;
    document_name?: string;
    issue_reason?: string;
    required_action?: string;
    status?: string;
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
    priority?: "high" | "medium" | "low" | string;
  }>;
  correction_requested_at?: string;
  correction_resubmitted_at?: string;
  submission_date?: string;
  notes?: string;
  approval_date?: string;
  completion_date?: string;
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

type AuditChecklistItem = {
  id?: number;
  checklist_item_id?: number;
  item_id?: number;
  doc_id?: string;
  document_type?: string;
  document_name?: string;
  title?: string;
  description?: string;
  common_mistakes?: string[] | string;
  required?: boolean;
  sample_url?: string | null;
  special_requirement?: "apostille" | "bilingual" | "affidavit" | null;
};

/** Catalog-only: no hardcoded questionnaire fallback. */

type Answers = Record<string, string>;

const emptyAnswersFromQuestions = (questions: JourneyQuestion[]): Answers => {
  const next: Answers = {};
  for (const question of questions) {
    next[question.id] = "";
  }
  return next;
};

const SERVICES: Array<{
  id: ServiceId;
  name: string;
  description: string;
  price: string;
  backendId: number;
}> = [
  { id: "new-oci", name: "New OCI Card", description: "First-time OCI application support", price: "£88", backendId: 4 },
  { id: "oci-renewal", name: "OCI Renewal / Transfer", description: "Passport change and renewal checks", price: "£78", backendId: 5 },
  { id: "oci-update", name: "OCI Update (Gratis)", description: "Mandatory update and portal handling", price: "£50", backendId: 6 },
  {
    id: "passport-renewal",
    name: "Indian Passport Renewal",
    description: "Renewal support for UK or US residents",
    // Overridden at runtime from usePublicPricing when catalog fee is available.
    price: "See fee at checkout",
    backendId: 7,
  },
];

const ADD_ONS = [
  { id: "apostille", label: "Apostille handling", fee: 35 },
  { id: "affidavit", label: "Drafting affidavits", fee: 25 },
  { id: "translation", label: "Translation / bilingual certificates", fee: 40 },
];

const PROCESS_ITEMS = [
  { title: "Documents Checked", description: "Your document check is complete and the case is moving forward." },
  { title: "Form Filling in Progress", description: "FlyOCI is preparing the submission pack." },
  { title: "Submitted to Embassy / VFS", description: "Your application has been sent to the relevant authority." },
  { title: "Under Process", description: "Awaiting official review and further updates." },
  { title: "Decision / Dispatched / Collected", description: "Final outcome, dispatch, or collection status." },
];

const emptyAnswers: Answers = {};

const answerText = (answers: Answers | Record<string, string> | null | undefined, key: string): string =>
  String(answers?.[key] ?? "").trim();

const isApostilleService = (service: ServiceId | null | undefined): boolean => {
  const key = String(service || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return key === "apostille" || key.startsWith("apostille_");
};

const resolveDocuments = async (service: ServiceId | null, answers: Answers): Promise<DocumentItem[]> => {
  if (!service) return [];
  const backendType = toBackendServiceType(service);
  // No hardcoded checklist — only admin-configured DocumentRequirement / resolve-checklist.
  if (!backendType) return [];

  const resolved = await resolveServiceChecklist(backendType, answers);
  if (resolved.checklist.length) {
    return resolved.checklist as DocumentItem[];
  }

  const rows = await fetchDocumentRequirements(backendType);
  if (!rows.length) {
    console.warn(
      `[document-requirements] No DocumentRequirement rows for ${backendType} — checklist left empty (no hardcoded fallback).`,
    );
    return [];
  }

  const hasCatalogConditions = rows.some((row) => Boolean(String(row.show_when_question_code || "").trim()));
  const matched = hasCatalogConditions
    ? rows.filter((row) => requirementMatchesAnswers(row, answers))
    : rows;
  return matched.map(mapRequirementToChecklistItem) as DocumentItem[];
};

const serviceFeeMap: Record<ServiceId, number | null> = {
  "new-oci": 88,
  "oci-renewal": 78,
  "oci-update": 50,
  "passport-renewal": 85,
  apostille: 65,
  undecided: 88,
};

const serviceLabelMap: Record<string, string> = {
  "new-oci": "New OCI Card",
  "oci-renewal": "OCI Renewal / Transfer",
  "oci-update": "OCI Update (Gratis)",
  "passport-renewal": "Indian Passport Renewal",
  apostille: "Apostille Services",
  undecided: "Undecided - we will recommend a service",
  "e-oci": "e-OCI",
  e_oci: "e-OCI",
  "oci-through-spouse": "OCI through spouse",
  oci_through_spouse: "OCI through spouse",
};

const labelForService = (service?: ServiceId | null, fallback?: string): string => {
  if (!service) return fallback || "Selected service";
  return (
    serviceLabelMap[service] ||
    serviceLabelMap[service.replace(/-/g, "_")] ||
    serviceLabelMap[service.replace(/_/g, "-")] ||
    fallback ||
    service.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const mapCatalogServiceType = (value?: string | null): ServiceId | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized.startsWith("evisa") || normalized === "document_audit" || normalized === "morocco_turkey_evisa") {
    return null;
  }
  if (normalized.includes("passport") && normalized.includes("renewal")) return "passport-renewal";
  // Exact apostille only — do not collapse apostille_birth etc. (navbar must select that row).
  if (normalized === "apostille") return "apostille";
  if (normalized === "new_oci" || normalized === "first_time_oci") return "new-oci";
  // Keep OCI through spouse as its own service — do NOT collapse to new-oci
  // (that made both checkboxes appear selected in Start Order).
  if (normalized === "oci_renewal" || normalized === "oci_transfer") return "oci-renewal";
  if (normalized === "oci_update" || normalized === "oci_gratis") return "oci-update";
  // Live catalog types (e_oci, oci_through_spouse, apostille_birth, …) keep their own id.
  if (normalized) return normalized.replace(/_/g, "-");
  return null;
};

const emptyDocStatus = (): Record<string, DocumentState> => ({});
const OCI_AUDIT_DRAFT_KEY_PREFIX = "flyoci:oci-audit-draft-v2";
const OCI_AUDIT_DRAFT_KEY_LEGACY = "flyoci:oci-audit-draft-v1";
const AUDIT_CREDIT_VALIDITY_DAYS = 30;
const OCI_DRAFT_ALLOWED_STAGES: FlowStage[] = ["service", "questions", "summary", "full-payment", "checklist", "upload"];
const VALID_AUDIT_DOCUMENT_TYPES = new Set([
  "passport",
  "proof_of_address",
  "old_oci",
  "birth_certificate",
  "marriage_certificate",
  "divorce_decree",
  "photograph",
  "signature",
  "affidavit",
  "apostille",
  "other",
]);

const getAuditDraftKey = (reference?: string | null): string => {
  const normalizedReference = (reference || "").trim().toUpperCase();
  const suffix = normalizedReference || "active";
  return `${OCI_AUDIT_DRAFT_KEY_PREFIX}:${suffix}`;
};

/**
 * Assessment offered iff the selected service has assessment fee defined (>0).
 * Uses that service's catalog `auditFee` (and app snapshot). Does NOT apply the
 * global Fresh-OCI Assessment product to other services (e.g. death certificate at £0).
 */
function resolveAssessmentFeePence(opts: {
  service?: string | null;
  applicationRecord?: {
    audit_fee_pence?: number;
    audit_fee_paid?: boolean;
    service_type?: string | null;
  } | null;
  catalogServices?: CatalogService[] | null;
  assessmentFeeHook?: number | null;
  auditFeePenceProp?: number | null;
}): number {
  const serviceTypeKey = String(opts.service || opts.applicationRecord?.service_type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const appPence = Number(opts.applicationRecord?.audit_fee_pence || 0);
  if (opts.applicationRecord?.audit_fee_paid) {
    return Math.max(appPence, 0);
  }

  // No service selected yet — do not invent a fee from the global hook.
  if (!serviceTypeKey) {
    return Math.max(Number(opts.auditFeePenceProp || 0), 0);
  }

  const fromCatalog = Math.round(
    (getAssessmentFeeGbp(opts.catalogServices, serviceTypeKey) || 0) * 100,
  );

  // Global hook is only a Fresh OCI fallback (same as getAssessmentFeeGbp).
  const isFreshOci =
    serviceTypeKey === "new_oci" ||
    serviceTypeKey === "first_time_oci" ||
    serviceTypeKey === "document_audit";
  const fromHook =
    isFreshOci && opts.assessmentFeeHook != null && opts.assessmentFeeHook > 0
      ? Math.round(opts.assessmentFeeHook * 100)
      : 0;

  return Math.max(appPence, fromCatalog, fromHook, Number(opts.auditFeePenceProp || 0), 0);
}

type DocumentAuditJourneyProps = {
  userEmail?: string;
  applicationId?: number;
  serviceType?: string;
  resumeReference?: string;
  startFresh?: boolean;
  auditResult?: string;
  amountDuePence?: number;
  auditFeePence?: number;
  showPersistentTracker?: boolean; // deprecated: tracker UI removed
  onUnreadCountChange?: (count: number) => void;
};



const DRAFT_STAGE_RANK: Record<FlowStage, number> = {
  service: 0,
  questions: 1,
  summary: 2,
  "full-payment": 3,
  checklist: 4,
  upload: 5,
  "audit-pending": 6,
  "audit-result": 7,
  processing: 8,
  completed: 9,
};

const listReferenceDraftCandidates = (): Array<{ suffix: string; raw: string; stage: FlowStage | null }> => {
  if (typeof window === "undefined") {
    return [];
  }

  const prefix = `${OCI_AUDIT_DRAFT_KEY_PREFIX}:`;
  const candidates: Array<{ suffix: string; raw: string; stage: FlowStage | null }> = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) {
      continue;
    }

    const suffix = key.slice(prefix.length).trim();
    if (!suffix || suffix.toUpperCase() === "ACTIVE") {
      continue;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<JourneyDraftStorage>;
      const stage = parsed.stage && OCI_DRAFT_ALLOWED_STAGES.includes(parsed.stage) ? parsed.stage : null;
      candidates.push({ suffix, raw, stage });
    } catch {
      // Ignore malformed drafts.
    }
  }

  return candidates.sort((left, right) => (DRAFT_STAGE_RANK[right.stage || "service"] || 0) - (DRAFT_STAGE_RANK[left.stage || "service"] || 0));
};

type DocumentUploadControlsProps = {
  docState?: DocumentState;
  isUploaded: boolean;
  isSubmittedUnderReview: boolean;
  isUploading: boolean;
  uploadLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onView: () => void;
};

function DocumentUploadControls({
  docState,
  isUploaded,
  isSubmittedUnderReview,
  isUploading,
  uploadLabel = "Upload PDF/JPEG/PNG",
  disabled = false,
  disabledReason = "Document upload is temporarily unavailable.",
  onFileSelect,
  onView,
}: DocumentUploadControlsProps) {
  const fileName = docState?.fileName || "";
  const canView = Boolean(docState?.previewUrl || docState?.documentId || docState?.fileUrl);

  if (isSubmittedUnderReview && isUploaded) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Submitted for review
        </div>
        {fileName ? (
          <p className="max-w-full truncate text-xs text-slate-600" title={fileName}>
            {fileName}
          </p>
        ) : null}
        {canView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-bg-blue"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
          </button>
        ) : null}
      </div>
    );
  }

  if (isUploaded) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Uploaded
        </div>
        {fileName ? (
          <p className="max-w-[240px] truncate text-xs text-slate-600" title={fileName}>
            {fileName}
          </p>
        ) : null}
        {canView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-bg-blue"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
          </button>
        ) : null}
        {!disabled ? (
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-bg-blue">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Upload again
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onFileSelect} />
          </label>
        ) : null}
        {isUploading ? <span className="text-sm text-slate-500">Uploading...</span> : null}
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[#D9E1EA] bg-[#F8FAFC] px-4 py-3 text-sm text-[#627D98]">
        {disabledReason}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-bg-blue">
        <Upload className="mr-2 h-4 w-4" /> {uploadLabel}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onFileSelect} />
      </label>
      {isUploading ? <span className="text-sm text-slate-500">Uploading...</span> : null}
    </div>
  );
}

export function DocumentAuditJourney({ userEmail, applicationId: applicationIdProp, serviceType: serviceTypeProp, resumeReference, startFresh = false, auditResult: auditResultProp, amountDuePence: amountDuePenceProp, auditFeePence: auditFeePenceProp, showPersistentTracker: _showPersistentTracker = false, onUnreadCountChange }: DocumentAuditJourneyProps) {
  const router = useRouter();
  const { assessmentFee, services: catalogServices, loading: pricingLoading } = usePublicPricing();
  const { user } = useAuth();
  void applicationIdProp;
  void onUnreadCountChange;

  const journeyServices = useMemo(() => {
    return SERVICES.map((svc) => {
      if (svc.id !== "passport-renewal") return svc;
      const row = catalogServices.find(
        (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === "passport_renewal",
      );
      if (row && typeof row.totalFee === "number" && row.totalFee > 0) {
        return { ...svc, price: formatGbp(row.totalFee) };
      }
      return svc;
    });
  }, [catalogServices]);

  const stageRef = useRef<FlowStage>("service");
  const refreshRedirectHandledRef = useRef(false);
  const autoServiceStartAppliedRef = useRef<string | null>(null);
  const preferredFeePlanRef = useRef("");
  const [loaded, setLoaded] = useState(false);
  const [resumeHydrated, setResumeHydrated] = useState(() => !resumeReference);
  const [stage, setStage] = useState<FlowStage>("service");
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(true);
  const [primaryApplicant, setPrimaryApplicant] = useState<StartOrderApplicant>(() => ({
    id: "applicant-1",
    fullName: "",
    email: userEmail || "",
    mobile: "",
    applyingFrom: "United Kingdom",
    emailVerified: Boolean(userEmail),
    emailVerificationToken: "",
  }));
  const [extraApplicants, setExtraApplicants] = useState<StartOrderApplicant[]>([]);
  const [orderCartApps, setOrderCartApps] = useState<OrderCartApp[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("flyoci:order-cart-apps");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed?.apps)) return [];
      return parsed.apps
        .map((row: Partial<OrderCartApp>) => ({
          applicantName: String(row.applicantName || ""),
          applicantEmail: String(row.applicantEmail || ""),
          applicantMobile: String(row.applicantMobile || ""),
          applyingFrom: String(row.applyingFrom || ""),
          service: row.service as ServiceId,
          applicationId: Number(row.applicationId || 0),
          referenceNumber: String(row.referenceNumber || ""),
          docsComplete: Boolean(row.docsComplete),
        }))
        .filter((row: OrderCartApp) => row.referenceNumber && row.applicationId > 0 && row.service);
    } catch {
      return [];
    }
  });
  const [orderCartIndex, setOrderCartIndex] = useState(0);
  const [cartSkipAssessmentAccepted, setCartSkipAssessmentAccepted] = useState(false);
  /** Per-application fee plan for multi-app checkout (e.g. standard / express). */
  const [cartFeePlanByRef, setCartFeePlanByRef] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<JourneyQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [documents, setDocuments] = useState<Record<string, DocumentState>>(emptyDocStatus);
  const [supportUploads, setSupportUploads] = useState<Record<string, string>>({});
  const [supportNotes, setSupportNotes] = useState("");
  const [openMistakesId, setOpenMistakesId] = useState<string | null>(null);
  const [expandedChecklistDocIds, setExpandedChecklistDocIds] = useState<Record<string, boolean>>({});
  const [addOns, setAddOns] = useState<string[]>([]);
  const [auditOutcome, setAuditOutcome] = useState<AuditOutcome | null>(null);
  const [auditSubmitted, setAuditSubmitted] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [bannerMessage, setBannerMessage] = useState("Start a new application and follow the full checklist flow.");
  const [auditId, setAuditId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [applicationRecord, setApplicationRecord] = useState<ApplicationRecord | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  /** After Stripe return: verify + redirect to dashboard without flashing the confirmation screen. */
  const [postPaymentRedirecting, setPostPaymentRedirecting] = useState(() => {
    if (typeof window === "undefined") return false;
    const { sessionId, paymentKind } = readStripeReturnParams();
    if (
      sessionId &&
      (paymentKind === "full" || paymentKind === "cart_full" || paymentKind === "passport-quote")
    ) {
      return true;
    }
    try {
      return new URLSearchParams(window.location.search).get("payment") === "success";
    } catch {
      return false;
    }
  });
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [checklistItemIdByDocId, setChecklistItemIdByDocId] = useState<Record<string, string | number>>({});
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [generatedChecklist, setGeneratedChecklist] = useState<DocumentItem[]>([]);
  const [checklistGenerationError, setChecklistGenerationError] = useState<string | null>(null);
  const [lastChecklistAnswers, setLastChecklistAnswers] = useState<Answers | null>(null);
  const [auditResultData, setAuditResultData] = useState<AuditResult | null>(null);
  const [auditResultLoading, setAuditResultLoading] = useState(false);
  const [auditResultError, setAuditResultError] = useState<string | null>(null);
  const [flaggedReuploads, setFlaggedReuploads] = useState<Record<string, boolean>>({});
  const [reuploadOnlyFlagged, setReuploadOnlyFlagged] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);
  const [paymentSummaryError, setPaymentSummaryError] = useState<string | null>(null);
  const [selectedFeePlanCode, setSelectedFeePlanCode] = useState<string>("");
  const [feePlanUpdating, setFeePlanUpdating] = useState(false);
  const [skipAuditDisclaimerAccepted, setSkipAuditDisclaimerAccepted] = useState(false);
  const [assessmentCardExpanded, setAssessmentCardExpanded] = useState<"docs" | "take" | "skip" | null>("take");
  const [assessmentCardHovered, setAssessmentCardHovered] = useState<"docs" | "take" | "skip" | null>(null);
  const [messageRequestedDocIds, setMessageRequestedDocIds] = useState<string[]>([]);
  const [applicationStartError, setApplicationStartError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraftProgress, setHasDraftProgress] = useState(false);
  const [reviewAuthorName, setReviewAuthorName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [docDeletion, setDocDeletion] = useState<DocumentDeletionRequestsPayload | null>(null);
  const [docDeletionLoading, setDocDeletionLoading] = useState(false);
  const [docDeletionBusy, setDocDeletionBusy] = useState(false);
  const [docDeleteConfirmOpen, setDocDeleteConfirmOpen] = useState(false);
  const [docDeletionReason, setDocDeletionReason] = useState("");
  const [caseSummaryOpen, setCaseSummaryOpen] = useState(false);
  const [paymentConsentsAccepted, setPaymentConsentsAccepted] = useState(false);
  const [uploadConsentsAccepted, setUploadConsentsAccepted] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    preferredFeePlanRef.current = selectedFeePlanCode;
  }, [selectedFeePlanCode]);

  // Opening / refreshing an existing application — never flash the start-order picker.
  useEffect(() => {
    if (resumeReference) {
      setResumeHydrated(false);
      setLoaded(false);
      return;
    }
    setResumeHydrated(true);
  }, [resumeReference]);

  useEffect(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    const email = (userEmail || user?.email || "").trim();
    if (!fullName && !email) return;
    setPrimaryApplicant((current) => {
      const nextEmail = current.email || email;
      const sameAccount =
        Boolean(email) && nextEmail.trim().toLowerCase() === email.trim().toLowerCase();
      return {
        ...current,
        fullName: current.fullName || fullName,
        email: nextEmail,
        emailVerified: current.emailVerified || sameAccount,
      };
    });
  }, [user?.first_name, user?.last_name, user?.email, userEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Coming from navbar / service cards (?start=1&service=...) — preselect that service.
    if (!startFresh) return;
    if (resumeReference) return;

    const requestedService =
      serviceTypeProp || new URLSearchParams(window.location.search).get("service");
    const resolved = mapCatalogServiceType(requestedService);
    if (!resolved) return;

    const requestKey = String(requestedService || resolved).trim().toLowerCase();
    if (autoServiceStartAppliedRef.current === requestKey) return;
    autoServiceStartAppliedRef.current = requestKey;

    // Fresh start from nav/hero must not restore a previous service draft.
    clearDraftStorage(null);
    setSelectedService(resolved);
    setShowServicePicker(false);
    setStage("service");
    setBannerMessage(`${labelForService(resolved)} selected. Enter applicant details to continue.`);
    void loadQuestionsForService(resolved);
  }, [serviceTypeProp, startFresh, resumeReference]);

  useEffect(() => {
    if (stage !== "completed") {
      return;
    }

    const resolvedReference = String(applicationRecord?.reference_number || referenceNumber || "").trim();
    if (!resolvedReference) {
      return;
    }

    let cancelled = false;

    const loadSubmittedReview = async () => {
      try {
        const testimonials = await getPublicTestimonials();
        const match = testimonials.find((testimonial) => String(testimonial.application_reference || "").trim().toLowerCase() === resolvedReference.toLowerCase());

        if (cancelled || !match) {
          return;
        }

        setReviewSubmitted(true);
        setReviewAuthorName(match.author_name || "");
        setReviewText(match.testimonial_text || "");
        setReviewRating(Math.max(1, Math.min(5, Math.round(Number(match.rating || 5)))));
      } catch {
        // Keep the local form available if the lookup fails.
      }
    };

    const loadDocDeletion = async () => {
      setDocDeletionLoading(true);
      try {
        const payload = await getDocumentDeletionRequests(resolvedReference);
        if (!cancelled) {
          setDocDeletion(payload);
        }
      } catch {
        if (!cancelled) {
          setDocDeletion(null);
        }
      } finally {
        if (!cancelled) {
          setDocDeletionLoading(false);
        }
      }
    };

    void loadSubmittedReview();
    void loadDocDeletion();

    return () => {
      cancelled = true;
    };
  }, [applicationRecord?.reference_number, referenceNumber, stage]);

  const currentQuestion = activeQuestions[questionIndex];
  const checklist = generatedChecklist;
  const flaggedReuploadDocs = useMemo<DocumentItem[]>(() => {
    if (!reuploadOnlyFlagged || !auditResultData?.flagged_documents?.length) {
      return checklist;
    }

    const normalize = (value: string | number | undefined | null) => String(value || "").trim().toLowerCase();

    return auditResultData.flagged_documents.map((flagged, index) => {
      const match = checklist.find(
        (doc) =>
          normalize(doc.id) === normalize(flagged.doc_id) ||
          normalize(doc.title) === normalize(flagged.doc_name)
      );

      if (match) {
        return match;
      }

      return {
        id: flagged.doc_id || `flagged-${index + 1}`,
        title: flagged.doc_name || "Flagged document",
        description: flagged.issue || "Document flagged by auditor. Please update and re-upload.",
        required: true,
        mistakes: flagged.issue || "Please follow auditor instructions before re-uploading.",
        sample: "Review the auditor issue and upload a corrected version.",
      } as DocumentItem;
    });
  }, [auditResultData, checklist, reuploadOnlyFlagged]);
  const visibleChecklist = reuploadOnlyFlagged ? flaggedReuploadDocs : checklist;
  const messageRequestedDocs = useMemo<DocumentItem[]>(() => {
    if (!messageRequestedDocIds.length) return visibleChecklist;

    const normalize = (value: string | number | undefined | null) => String(value || "").trim().toLowerCase();
    const matched = visibleChecklist.filter((doc) =>
      messageRequestedDocIds.some((requestedId) => normalize(requestedId) === normalize(doc.id))
    );

    if (matched.length > 0) return matched;

    return messageRequestedDocIds.map((docId, index) => ({
      id: docId || `requested-${index + 1}`,
      title: `Requested document (${docId})`,
      description: "Requested by FlyOCI team. Upload the requested document here.",
      required: true,
      mistakes: "Please follow the message thread instructions for this request.",
      sample: "Use a clear and complete file for this requested document.",
    }) as DocumentItem);
  }, [messageRequestedDocIds, visibleChecklist]);
  const uploadChecklist = messageRequestedDocIds.length > 0 ? messageRequestedDocs : visibleChecklist;
  const flaggedDocAliasMap: Record<string, string> = {
    photograph: "photo",
    photo: "photo",
    passport_photo: "photo",
    passportphoto: "photo",
    passport_bio_page: "passport",
    passport_bio: "passport",
    passport: "passport",
    proof_of_address: "address",
    address_proof: "address",
    birth_certificate: "proof-origin",
  };

  const normalizeChecklistKey = (value: string | number | null | undefined): string => {
    const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    return flaggedDocAliasMap[raw] || raw;
  };

  const looksLikeFileName = (value: string) => /\.(pdf|jpg|jpeg|png|webp|heic)$/i.test(value.trim());

  const formatDocumentTypeLabel = (value: string | number | null | undefined): string => {
    const raw = String(value || "").trim();
    if (!raw || looksLikeFileName(raw)) {
      return "";
    }
    return raw
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const resolveFlaggedDocumentLabel = (item: any, matchedDoc?: DocumentItem | null): string => {
    const fromType = formatDocumentTypeLabel(item?.document_type);
    if (fromType) {
      return fromType;
    }
    if (matchedDoc?.title) {
      return matchedDoc.title;
    }
    const fromDocId = formatDocumentTypeLabel(item?.doc_id);
    if (fromDocId) {
      return fromDocId;
    }
    return "Document";
  };

  const flaggedDocumentsLookup = useMemo(() => {
    const lookup = new Map<string, {
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      required_action?: string;
      status?: string;
      reuploaded?: boolean;
    }>();

    const backendFlagged = (auditResultData?.flagged_documents?.length
      ? auditResultData.flagged_documents
      : applicationRecord?.flagged_documents) || [];

    backendFlagged.forEach((item: any) => {
      const sourceKey = normalizeChecklistKey(item?.document_type || item?.doc_id || item?.document_name || item?.doc_name);
      if (!sourceKey || lookup.has(sourceKey)) {
        return;
      }

      lookup.set(sourceKey, {
        document_type: formatDocumentTypeLabel(item?.document_type || item?.doc_id) || String(item?.document_type || item?.doc_id || "").trim(),
        document_name: String(item?.document_name || item?.doc_name || "").trim(),
        issue_reason: String(item?.issue_reason || item?.issue || item?.finding_description || "").trim(),
        required_action: String(item?.required_action || item?.action_required || "").trim(),
        status: String(item?.status || "").trim(),
        reuploaded: Boolean(item?.reuploaded) || String(item?.status || "").toLowerCase() === "reuploaded",
      });
    });

    return lookup;
  }, [auditResultData?.flagged_documents, applicationRecord?.flagged_documents]);

  const requiredDocs = uploadChecklist.filter((item) => item.required);
  const optionalDocs = uploadChecklist.filter((item) => !item.required);
  const isDocUploaded = (docId: string): boolean => {
    const row = documents[docId];
    if (!row) return false;
    if (row.status === "uploaded") return true;
    if (row.status === "pending_reupload") return false;
    return Boolean(row.fileName || row.fileUrl || row.documentId);
  };
  const requiredComplete = requiredDocs.every((doc) => isDocUploaded(doc.id));
  const uploadedDocs = uploadChecklist.filter((doc) => isDocUploaded(doc.id));
  const uploadedRequiredDocs = requiredDocs.filter((doc) => isDocUploaded(doc.id));
  const missingRequiredDocs = requiredDocs.filter((doc) => !isDocUploaded(doc.id));
  const uploadChecklistKey = useMemo(
    () => uploadChecklist.map((doc) => doc.id).join("|"),
    [uploadChecklist],
  );

  useEffect(() => {
    const ref = String(applicationRecord?.reference_number || referenceNumber || "").trim();
    if (!ref || uploadChecklist.length === 0) return;
    if (!["checklist", "summary", "audit-result"].includes(stage)) return;

    let cancelled = false;
    void (async () => {
      try {
        const docsRaw = await getApplicationDocuments(ref);
        if (cancelled) return;
        const payload = normalizePayload<any>(docsRaw);
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.documents)
            ? payload.documents
            : [];
        setDocuments((current) => {
          // Backend docs for THIS application are the source of truth.
          // Do not keep uploads from a previous cart app / service (merge-only left stale "Uploaded" UI).
          const fromBackend = mergeHydratedDocuments({}, list, uploadChecklist);
          const next: typeof current = { ...fromBackend };
          for (const id of Object.keys(fromBackend)) {
            const prev = current[id];
            if (prev?.previewUrl) {
              next[id] = { ...next[id], previewUrl: prev.previewUrl };
            }
          }
          return next;
        });
      } catch {
        // Non-fatal if documents cannot be refreshed yet.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally key by uploadChecklistKey so a new array identity does not wipe uploads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationRecord?.reference_number, referenceNumber, stage, uploadChecklistKey]);

  const auditStatus = (auditResultData?.status || auditOutcome || null) as AuditOutcome | null;
  const flaggedSource = useMemo(
    () => (auditResultData?.flagged_documents?.length ? auditResultData.flagged_documents : applicationRecord?.flagged_documents || []),
    [auditResultData?.flagged_documents, applicationRecord?.flagged_documents]
  );
  const flaggedItems = useMemo(
    () =>
      flaggedSource.map((item: any, index) => {
        const normalize = (value: string | number | undefined | null) => String(value || "").trim().toLowerCase();
        const matchedDoc = checklist.find(
          (doc) => normalize(doc.id) === normalize(item?.doc_id) || normalize(doc.title) === normalize(item?.doc_name || item?.document_name)
        );
        const resolvedDocId = String(matchedDoc?.id || item?.doc_id || item?.document_type || "");
        const requiredDocumentName = resolveFlaggedDocumentLabel(item, matchedDoc);
        const uploadedFileLabel = String(item?.document_name || item?.doc_name || "").trim();
        const statusFromBackend = normalize(item?.status);
        const backendMarkedUploaded = Boolean(item?.reuploaded) || statusFromBackend === "reuploaded";

        return {
          key: `${resolvedDocId || item?.doc_name || item?.document_name || "flag"}-${index}`,
          documentId: resolvedDocId,
          documentName: requiredDocumentName,
          reason: String(item?.issue || item?.issue_reason || "Issue details not provided."),
          actionRequired: (item?.action_required || item?.required_action || "re-upload") as "re-upload" | "obtain" | "apostille" | "affidavit",
          canUploadInline: Boolean(resolvedDocId),
          isUploaded: backendMarkedUploaded || (resolvedDocId ? Boolean(flaggedReuploads[resolvedDocId]) : false),
          uploadedFileName: resolvedDocId ? documents[resolvedDocId]?.fileName || uploadedFileLabel : uploadedFileLabel,
          docRecord: resolvedDocId ? documents[resolvedDocId] : undefined,
        };
      }),
    [flaggedSource, checklist, documents, flaggedReuploads]
  );
  const isActionRequired = auditStatus === "amber" || auditStatus === "red";
  const allFlaggedUploadsComplete = flaggedItems.length > 0 && flaggedItems.every((item) => item.isUploaded);
  const canResubmitNow = isActionRequired && allFlaggedUploadsComplete;
  const auditNotes = String(auditResultData?.auditor_notes || "").trim();
  const auditTimeline = useMemo(
    () => (applicationRecord?.audit_logs || []).slice().sort((a, b) => {
      const aTs = new Date(String(a.timestamp || "")).getTime();
      const bTs = new Date(String(b.timestamp || "")).getTime();
      return bTs - aTs;
    }),
    [applicationRecord?.audit_logs]
  );
  const customerMessages = useMemo(() => {
    type Msg = { created_at: string; subject: string; message: string; sender: "team" | "customer" };
    const merged: Msg[] = [];
    const pushUnique = (item: Msg) => {
      const message = item.message.trim();
      if (!message) return;
      const exists = merged.some(
        (candidate) =>
          candidate.sender === item.sender &&
          candidate.message === message &&
          String(candidate.created_at || "").slice(0, 19) === String(item.created_at || "").slice(0, 19),
      );
      if (!exists) merged.push({ ...item, message });
    };

    if (Array.isArray(applicationRecord?.admin_messages)) {
      for (const item of applicationRecord.admin_messages) {
        const senderRaw = String((item as { sender?: string })?.sender || "").trim().toLowerCase();
        const sender: "team" | "customer" = senderRaw === "customer" ? "customer" : "team";
        pushUnique({
          created_at: String(item?.created_at || "").trim(),
          subject:
            String(item?.subject || "").trim() ||
            (sender === "customer" ? "Your message to FlyOCI Team" : "Message from FlyOCI Team"),
          message: String(item?.message || "").trim(),
          sender,
        });
      }
    }

    for (const log of applicationRecord?.audit_logs || []) {
      const action = String(log?.action || "").trim().toLowerCase();
      const metadata = log?.metadata && typeof log.metadata === "object" ? (log.metadata as Record<string, unknown>) : {};
      if (action === "application_message") {
        const message = String(metadata.message_body || metadata.description || "").trim();
        const sender: "team" | "customer" =
          String(metadata.sender || "").trim().toLowerCase() === "customer" ? "customer" : "team";
        pushUnique({
          created_at: String(log?.timestamp || "").trim(),
          subject:
            String(metadata.subject || "").trim() ||
            (sender === "customer" ? "Your message to FlyOCI Team" : "Message from FlyOCI Team"),
          message,
          sender,
        });
      } else if (action === "admin_customer_message") {
        pushUnique({
          created_at: String(log?.timestamp || "").trim(),
          subject: String(metadata.subject || "FlyOCI update").trim() || "FlyOCI update",
          message: String(metadata.description || metadata.message || "").trim(),
          sender: "team",
        });
      }
    }

    return merged.sort((a, b) => {
      const aTs = new Date(String(a.created_at || "")).getTime();
      const bTs = new Date(String(b.created_at || "")).getTime();
      return bTs - aTs;
    });
  }, [applicationRecord?.admin_messages, applicationRecord?.audit_logs]);
  const selectedServiceRecord = journeyServices.find((item) => item.id === selectedService) || null;
  const complexityScore = [answers.journeyType, answers.nameChanged, answers.birthOutsideCore].filter((item) => item === "Yes" || item === "I Already Have One / Conversion").length;
  // Simple rule: assessment fee defined (>0) → show assessment; else → skip to full payment.
  // Prefer backend audit_fee_pence; fall back to catalog for the selected service.
  const auditFeePenceResolved = resolveAssessmentFeePence({
    service: selectedService || applicationRecord?.service_type,
    applicationRecord,
    catalogServices,
    assessmentFeeHook: assessmentFee,
    auditFeePenceProp,
  });
  const auditFee = auditFeePenceResolved / 100;
  const assessmentOffered = auditFeePenceResolved > 0;
  const assessmentEligibilityPending = pricingLoading && !assessmentOffered && !applicationRecord;
  const assessmentPaidOrSkipped = Boolean(
    applicationRecord?.audit_fee_paid ||
      String(applicationRecord?.audit_payment_status || "").toLowerCase() === "paid" ||
      (applicationRecord?.audit_skipped && applicationRecord?.audit_skip_disclaimer_accepted),
  );
  const fullServicePaid = Boolean(
    applicationRecord?.payment_confirmed ||
      String(applicationRecord?.full_payment_status || "").toLowerCase() === "paid" ||
      String(applicationRecord?.application_status || "").toLowerCase() === "paid",
  );
  const catalogMatchedFee = (() => {
    if (!selectedService) return null;
    const st = selectedService.replace(/-/g, "_");
    const row = catalogServices.find(
      (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === st,
    );
    if (row && typeof row.totalFee === "number" && row.totalFee > 0) return row.totalFee;
    return null;
  })();
  const serviceFee = catalogMatchedFee ?? (selectedService ? serviceFeeMap[selectedService] : 88);
  const serviceFeeForMath = typeof serviceFee === "number" ? serviceFee : 0;
  const addOnTotal = addOns.reduce((sum, id) => sum + (ADD_ONS.find((item) => item.id === id)?.fee || 0), 0);
  const finalAmount = Math.max(serviceFeeForMath - auditFee + addOnTotal, 0);

  const normalizePayload = <T,>(response: unknown): T => {
    if (response && typeof response === "object" && "data" in (response as Record<string, unknown>)) {
      return ((response as { data: T }).data || response) as T;
    }
    return response as T;
  };

  const requireReferenceNumber = (): string => {
    const ref = applicationRecord?.reference_number || referenceNumber;
    if (!ref || !ref.trim()) {
      throw new Error("Application reference number is missing.");
    }
    return ref.trim();
  };

  const deriveStageFromApplication = (record: ApplicationRecord): FlowStage | null => {
    const auditResult = String(record.audit_result || "").toLowerCase();
    const auditPaymentStatus = String(record.audit_payment_status || "").toLowerCase();
    const fullPaymentStatus = String(record.full_payment_status || "").toLowerCase();
    const applicationStatus = String(record.application_status || "").toLowerCase();
    const currentStage = String(record.current_stage || "").toLowerCase();
    const quoteStatus = String(record.quote_status || "").toUpperCase();
    const isResumingExistingCase = Boolean(resumeReference);
    const isPassportService = String(record.service_type || "").toLowerCase().includes("passport");

    // Correction loops must take priority over quote/payment states for passport cases.
    if (["correction_requested", "reuploaded_pending_review"].includes(applicationStatus)) {
      return "audit-result";
    }

    // Rejected/red-audit cases must never render as completed.
    if (applicationStatus === "rejected" || auditResult === "red") {
      return "audit-result";
    }

    const hasTerminalDate = Boolean(String(record.approval_date || "").trim() || String(record.completion_date || "").trim());
    const isTerminalStage = ["decision_received", "closed", "delivered", "dispatched", "collected"].includes(currentStage);
    const isTerminalStatus = ["approved", "completed", "closed", "delivered", "dispatched", "collected", "decision_received"].includes(applicationStatus);

    if (isTerminalStage || isTerminalStatus || hasTerminalDate) {
      return "completed";
    }

    if (["registered", "draft"].includes(currentStage) || ["draft", "registered"].includes(applicationStatus)) {
      return isResumingExistingCase ? null : "service";
    }

    if (currentStage === "submitted" || applicationStatus === "submitted") {
      return "processing";
    }

    // Paid quote (legacy) or full payment → docs if missing, else in-progress processing screen.
    // (Embassy/VFS submitted messaging is gated separately inside the processing UI.)
    if (
      fullPaymentStatus === "paid" ||
      record.payment_confirmed ||
      applicationStatus === "paid" ||
      quoteStatus === "PAID" ||
      quoteStatus === "QUOTE_ACCEPTED"
    ) {
      const docCount = Number(record.document_count || 0);
      if (docCount <= 0) {
        return "checklist";
      }
      return "processing";
    }

    // Legacy passport quote-pending states now use the same full-payment path as OCI.
    // Do not use PENDING_QUOTE alone — that is the default on new records.
    const passportLegacyQuoteInFlight =
      isPassportService &&
      (currentStage === "initial_review" ||
        ["pending_quote", "quoted"].includes(applicationStatus) ||
        ["QUOTED", "EXPIRED"].includes(quoteStatus));

    if (passportLegacyQuoteInFlight) {
      return "full-payment";
    }

    if (record.audit_skipped && record.audit_skip_disclaimer_accepted) {
      return "full-payment";
    }

    // Assessment approved → payment pending (full service payment).
    if (
      auditResult === "green" &&
      fullPaymentStatus !== "paid" &&
      !record.payment_confirmed &&
      applicationStatus !== "paid"
    ) {
      return "full-payment";
    }

    if (["payment_pending"].includes(applicationStatus) || currentStage === "payment_pending") {
      const needsAssessment = Number(record.audit_fee_pence || 0) > 0;
      const assessmentDone =
        auditResult === "green" ||
        Boolean(record.audit_skipped && record.audit_skip_disclaimer_accepted);
      if (!needsAssessment || assessmentDone) {
        return "full-payment";
      }
    }

    // Amber / red stay on the result screen for corrections or rejection.
    if (auditResult === "amber" || auditResult === "red") {
      return "audit-result";
    }

    // Assessment paid: unlock uploads, then assessment review after docs.
    if (record.audit_fee_paid || auditPaymentStatus === "paid") {
      const docCount = Number(record.document_count || 0);
      if (docCount <= 0) {
        return "checklist";
      }
      return "audit-pending";
    }

    if (["under_review", "submitted", "audit_pending", "approved"].includes(applicationStatus)) {
      return "audit-pending";
    }

    // Assessment configured but unpaid → assessment payment first.
    if (Number(record.audit_fee_pence || 0) > 0 && !record.audit_fee_paid) {
      const skipped = Boolean(record.audit_skipped && record.audit_skip_disclaimer_accepted);
      if (skipped) return "full-payment";
      return "summary";
    }

    // No assessment / unpaid full fee → pay before docs.
    if (
      fullPaymentStatus !== "paid" &&
      !record.payment_confirmed &&
      applicationStatus !== "paid"
    ) {
      return "full-payment";
    }

    return null;
  };

  const syncApplicationFromBackend = async (
    referenceHint?: string | null,
    options?: { skipStageSync?: boolean }
  ): Promise<ApplicationRecord> => {
    const refNum = referenceHint && referenceHint.trim()
      ? referenceHint.trim()
      : requireReferenceNumber();

    const response = await getApplicationByReference(refNum);
    const backendApplicationId = Number(response.id || 0);

    if (!Number.isFinite(backendApplicationId) || backendApplicationId <= 0) {
      throw new Error("Invalid application returned by backend.");
    }



    const resolvedLatestAuditId = Number((response as { latest_audit_id?: number | null }).latest_audit_id || 0);
    if (Number.isFinite(resolvedLatestAuditId) && resolvedLatestAuditId > 0) {
      setAuditId(resolvedLatestAuditId);
    }

    const nextRecord: ApplicationRecord = {
      id: backendApplicationId,
      latest_audit_id: resolvedLatestAuditId > 0 ? resolvedLatestAuditId : null,
      reference_number: response.reference_number || refNum,
      application_status: response.application_status || "draft",
      service_type: response.service_type,
      service_name: response.service_name,
      file_number: (response as any).file_number,
      audit_fee_pence: response.audit_fee_pence,
      audit_fee_paid: response.audit_fee_paid,
      audit_payment_status: response.audit_payment_status,
      audit_skipped: (response as any).audit_skipped,
      audit_skip_disclaimer_accepted: (response as any).audit_skip_disclaimer_accepted,
      audit_result: response.audit_result,
      audit_credit_pence: response.audit_credit_pence,
      amount_due_pence: response.amount_due_pence,
      quote_amount_pence: (response as any).quote_amount_pence,
      quote_status: (response as any).quote_status,
      quote_notes: (response as any).quote_notes,
      quote_set_at: (response as any).quote_set_at,
      quote_expires_at: (response as any).quote_expires_at,
      service_total_pence: response.service_total_pence,
      fee_plan_code: String((response as { fee_plan_code?: string }).fee_plan_code || ""),
      full_payment_status: response.full_payment_status,
      payment_confirmed: response.payment_confirmed,
      current_stage: response.current_stage,
      document_count: Number((response as { document_count?: number }).document_count || 0),
      updated_at: response.updated_at,
      auditor_notes: (response as any).auditor_notes,
      flagged_documents: (response as any).flagged_documents,
      latest_audit_findings: (response as any).latest_audit_findings,
      correction_requested_at: (response as any).correction_requested_at,
      correction_resubmitted_at: (response as any).correction_resubmitted_at,
      submission_date: (response as any).submission_date,
      notes: (response as any).notes,
      approval_date: (response as any).approval_date,
      completion_date: (response as any).completion_date,
      audit_logs: (response as any).audit_logs,
      admin_messages: (response as any).admin_messages,
    };

    setApplicationRecord(nextRecord);
    setApplicationId(backendApplicationId);
    setReferenceNumber(nextRecord.reference_number);

    const backendStage = deriveStageFromApplication(nextRecord);
    if (!options?.skipStageSync) {
      if (backendStage) {
        const progressiveStages = ["summary", "full-payment", "checklist", "upload", "audit-pending", "audit-result", "processing", "completed"];
        const currentStageIsProgressive = progressiveStages.includes(stageRef.current);
        const backendWouldRegress = backendStage === "service" || backendStage === "questions";

        if (!(currentStageIsProgressive && backendWouldRegress)) {
          setStage(backendStage);
        }
      }
    }

    return nextRecord;
  };

  const serviceType = (selectedService || "undecided").replace(/-/g, "_");

  const mapApplicationServiceType = (service: ServiceId): string => {
    if (service === "new-oci") return "new-oci";
    if (service === "oci-renewal") return "oci-renewal";
    if (service === "oci-update") return "oci-update";
    if (service === "passport-renewal") return "passport-renewal";
    if (service === "apostille") return "apostille";
    // Catalog-only types (e-oci, etc.) — backend resolves via service pk when provided.
    return String(service).replace(/_/g, "-");
  };

  const mapBackendServiceType = (value?: string | null): ServiceId | null => {
    return mapCatalogServiceType(value);
  };

  const clearDraftStorage = (reference?: string | null) => {
    if (typeof window === "undefined") return;

    const keys = new Set<string>([
      getAuditDraftKey(null),
      getAuditDraftKey(reference || null),
      OCI_AUDIT_DRAFT_KEY_LEGACY,
    ]);

    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

const startApplicationIfNeeded = async (
  serviceOverride?: ServiceId | null,
  forceCreate = false
): Promise<{ id: number; referenceNumber: string }> => {
  if (!forceCreate && applicationRecord?.id) {
    return {
      id: applicationRecord.id,
      referenceNumber: applicationRecord.reference_number || referenceNumber || "",
    };
  }

  const resolvedService = serviceOverride ?? selectedService;
  if (!resolvedService) {
    throw new Error("Could not start your application. Please try again.");
  }

  // Fix 1 (root cause): wipe stale drafts before creating a new application.
  if (forceCreate) {
    clearDraftStorage(resumeReference || referenceNumber || null);
  }

  const payload = await createApplication(mapApplicationServiceType(resolvedService));
  const createdApplicationId = Number(payload.application_id || 0);

  if (!Number.isFinite(createdApplicationId) || createdApplicationId <= 0) {
    throw new Error("Could not start your application. Please try again.");
  }

  setApplicationId(createdApplicationId);
  setReferenceNumber(payload.reference_number || null);

  const refreshedApplication = await syncApplicationFromBackend(
    payload.reference_number || null
  );
  return {
    id: refreshedApplication.id || createdApplicationId,
    referenceNumber: refreshedApplication.reference_number || payload.reference_number || "",
  };
};

const saveState = (_next: Partial<JourneyStorage>) => {
  if (typeof window === "undefined") return;

  const draftKey = getAuditDraftKey(resumeReference || referenceNumber || null);

  if (!OCI_DRAFT_ALLOWED_STAGES.includes(stage)) {
    localStorage.removeItem(draftKey);
    return;
  }

  const draft: JourneyDraftStorage = {
    stage,
    selectedService,
    questionIndex,
    answers,
    supportNotes,
    addOns,
    generatedChecklist,
    lastChecklistAnswers,
  };

  localStorage.setItem(draftKey, JSON.stringify(draft));
};

  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem(storageKey);
  //     if (!raw) {
  //       setLoaded(true);
  //       return;
  //     }
  //     const parsed = JSON.parse(raw) as JourneyStorage;
  //     setStage(parsed.stage || "service");
  //     setSelectedService(parsed.selectedService || null);
  //     setQuestionIndex(parsed.questionIndex || 0);
  //     setAnswers({ ...emptyAnswers, ...(parsed.answers || {}) });
  //     setDocuments(parsed.documents || emptyDocStatus());
  //     setSupportUploads(parsed.supportUploads || {});
  //     setSupportNotes(parsed.supportNotes || "");
  //     setAddOns(parsed.addOns || []);
  //     setAuditOutcome(parsed.auditOutcome || null);
  //     setAuditSubmitted(Boolean(parsed.auditSubmitted));
  //     setReviewRound(parsed.reviewRound || 0);
  //     setProcessingStep(parsed.processingStep || 0);
  //     setAuditId(typeof parsed.auditId === "number" ? parsed.auditId : null);
  //     setApplicationId(typeof parsed.applicationId === "number" ? parsed.applicationId : null);
  //     if (parsed.selectedService) {
  //       setBannerMessage(`Resuming your ${serviceLabelMap[parsed.selectedService]} audit journey.`);
  //     }
  //   } catch {
  //     localStorage.removeItem(storageKey);
  //   } finally {
  //     setLoaded(true);
  //   }
  // }, [storageKey]);


useEffect(() => {
  if (typeof window === "undefined") return;

  let cancelled = false;

  const restoreDraft = async () => {
  try {
    // Navbar / hero fresh starts must keep the requested service — skip draft restore.
    if (startFresh && !resumeReference) {
      setHasDraftProgress(false);
      return;
    }

    const resumeKey = getAuditDraftKey(resumeReference || null);
    const activeKey = getAuditDraftKey(null);
    const targetKey = resumeReference ? resumeKey : activeKey;
    let raw = localStorage.getItem(targetKey) ||
      (resumeReference ? localStorage.getItem(activeKey) : null) ||
      localStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY) ||
      sessionStorage.getItem(targetKey) ||
      (resumeReference ? sessionStorage.getItem(activeKey) : null) ||
      sessionStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY);

    if (!raw && !resumeReference && !startFresh) {
      const referenceDraft = listReferenceDraftCandidates().find((candidate) => candidate.stage && candidate.stage !== "service");
      if (referenceDraft) {
        setDraftRestored(true);
        router.replace(
          `/dashboard/document-audit?reference=${encodeURIComponent(referenceDraft.suffix)}&resume=1`
        );
        return;
      }
    }

    if (!raw) {
      setHasDraftProgress(false);
      return;
    }

    if (localStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY)) {
      const targetKey = resumeReference ? resumeKey : activeKey;
      localStorage.setItem(targetKey, raw);
      localStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    }

    if (sessionStorage.getItem(targetKey) || sessionStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY)) {
      localStorage.setItem(targetKey, raw);
      sessionStorage.removeItem(targetKey);
      sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    }

    const parsed = JSON.parse(raw) as Partial<JourneyDraftStorage>;
    const parsedService = parsed.selectedService;
    const isValidService = parsedService && (Object.prototype.hasOwnProperty.call(serviceLabelMap, parsedService));

    if (isValidService) {
      setSelectedService(parsedService as ServiceId);
      setBannerMessage("");
      void loadQuestionsForService(parsedService as ServiceId).then((questions) => {
        if (typeof parsed.questionIndex === "number" && Number.isFinite(parsed.questionIndex)) {
          const boundedIndex = Math.max(0, Math.min(parsed.questionIndex, Math.max(questions.length - 1, 0)));
          setQuestionIndex(boundedIndex);
        }
      });
    }

    if (parsed.stage && OCI_DRAFT_ALLOWED_STAGES.includes(parsed.stage)) {
      setStage(parsed.stage);
    }

    if (!isValidService && typeof parsed.questionIndex === "number" && Number.isFinite(parsed.questionIndex)) {
      setQuestionIndex(Math.max(0, parsed.questionIndex));
    }

    if (parsed.answers && typeof parsed.answers === "object") {
      setAnswers({ ...parsed.answers });
    }

    if (typeof parsed.supportNotes === "string") {
      setSupportNotes(parsed.supportNotes);
    }

    if (Array.isArray(parsed.addOns)) {
      setAddOns(parsed.addOns.filter((item): item is string => typeof item === "string"));
    }

    const draftAnswers = {
      ...emptyAnswers,
      ...(parsed.lastChecklistAnswers && typeof parsed.lastChecklistAnswers === "object" ? parsed.lastChecklistAnswers : {}),
      ...(parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}),
    };

    if (parsed.lastChecklistAnswers && typeof parsed.lastChecklistAnswers === "object") {
      setLastChecklistAnswers({ ...emptyAnswers, ...parsed.lastChecklistAnswers });
    }

    if (isValidService) {
      const rebuiltChecklist = await resolveDocuments(parsedService as ServiceId, draftAnswers);
      if (cancelled) return;
      if (rebuiltChecklist.length > 0) {
        setGeneratedChecklist(rebuiltChecklist);
      } else if (Array.isArray(parsed.generatedChecklist)) {
        const sanitized = (parsed.generatedChecklist as DocumentItem[]).filter(
          (item) => !looksLikeUploadedFileName(item.title)
        );
        if (sanitized.length > 0) {
          setGeneratedChecklist(sanitized);
        }
      }
    } else if (Array.isArray(parsed.generatedChecklist)) {
      const sanitized = (parsed.generatedChecklist as DocumentItem[]).filter(
        (item) => !looksLikeUploadedFileName(item.title)
      );
      if (sanitized.length > 0) {
        setGeneratedChecklist(sanitized);
      }
    }
    setHasDraftProgress(true);
  } catch {
    localStorage.removeItem(getAuditDraftKey(resumeReference || null));
    localStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    sessionStorage.removeItem(getAuditDraftKey(resumeReference || null));
    sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    setHasDraftProgress(false);
  } finally {
    if (!cancelled) setDraftRestored(true);
  }
  };

  void restoreDraft();
  return () => {
    cancelled = true;
  };
}, [resumeReference, startFresh, router]);

useEffect(() => {
  if (typeof window === "undefined") return;

  // Legacy return from /dashboard/payment after verify — go straight to dashboard.
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && !readStripeReturnParams().sessionId) {
      setPostPaymentRedirecting(true);
      toast.success("Payment successful.");
      router.replace("/dashboard");
      return;
    }
  } catch {
    // ignore
  }

  const { sessionId, paymentKind, reference } = readStripeReturnParams();
  if (!sessionId || !paymentKind) return;

  const refNum = String(reference || resumeReference || referenceNumber || applicationRecord?.reference_number || "").trim();
  if (!refNum) return;

  const redirectAfterServicePayment = (message: string) => {
    setPostPaymentRedirecting(false);
    setBannerMessage(message);
    toast.success(message);
    clearStripeReturnParams();
    setStage("checklist");
  };

  let active = true;
  void (async () => {
    try {
      setApiLoading(true);
      if (paymentKind === "audit") {
        await verifyAuditPayment(refNum, sessionId);
        if (!active) return;
        await syncApplicationFromBackend(refNum);
        if (!active) return;
        setAuditSubmitted(false);
        setStage("checklist");
        setBannerMessage(
          orderCartApps.length > 1 || (() => {
            try {
              const raw = sessionStorage.getItem("flyoci:order-cart-apps");
              const parsed = raw ? JSON.parse(raw) : null;
              return Array.isArray(parsed?.apps) && parsed.apps.length > 1;
            } catch {
              return false;
            }
          })()
            ? "Assessment payment confirmed. Upload documents for this application, then continue with the next."
            : "Assessment payment confirmed. Upload your documents for review.",
        );
        toast.success("Assessment payment successful.");
        clearStripeReturnParams();
        // Restore sequential cart if present (do not wipe sibling applications).
        try {
          const raw = sessionStorage.getItem("flyoci:order-cart-apps");
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed?.apps) && parsed.apps.length > 1) {
            const apps = parsed.apps as OrderCartApp[];
            setOrderCartApps(apps);
            const idx = apps.findIndex((app) => app.referenceNumber === refNum);
            setOrderCartIndex(idx >= 0 ? idx : 0);
          }
        } catch {
          // ignore
        }
      } else if (paymentKind === "full") {
        await verifyFullPayment(refNum, sessionId);
        if (!active) return;
        await syncApplicationFromBackend(refNum);
        if (!active) return;

        // Sequential multi-app order: keep the cart and unlock docs for this application.
        let sequentialCart: OrderCartApp[] = [];
        try {
          const raw = sessionStorage.getItem("flyoci:order-cart-apps");
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed?.apps) && parsed.apps.length > 1) {
            sequentialCart = parsed.apps.map(
              (row: {
                applicantName?: string;
                applicantEmail?: string;
                applicantMobile?: string;
                applyingFrom?: string;
                service?: string;
                applicationId?: number;
                referenceNumber?: string;
                docsComplete?: boolean;
              }) => ({
                applicantName: String(row.applicantName || ""),
                applicantEmail: String(row.applicantEmail || ""),
                applicantMobile: String(row.applicantMobile || ""),
                applyingFrom: String(row.applyingFrom || "United Kingdom"),
                service: (row.service || "undecided") as ServiceId,
                applicationId: Number(row.applicationId || 0),
                referenceNumber: String(row.referenceNumber || "").trim(),
                docsComplete: Boolean(row.docsComplete),
              }),
            );
          }
        } catch {
          sequentialCart = [];
        }

        if (sequentialCart.length > 1) {
          const idx = sequentialCart.findIndex((app) => app.referenceNumber === refNum);
          setOrderCartApps(sequentialCart);
          setOrderCartIndex(idx >= 0 ? idx : 0);
          setPostPaymentRedirecting(false);
          setStage("checklist");
          setBannerMessage(
            `Payment confirmed for ${sequentialCart[idx >= 0 ? idx : 0]?.applicantName || "this application"}. Upload documents, then continue with the next application.`,
          );
          toast.success("Payment confirmed. Upload documents for this application.");
          clearStripeReturnParams();
          return;
        }

        try {
          sessionStorage.removeItem("flyoci:order-cart-apps");
        } catch {
          // ignore
        }
        setOrderCartApps([]);
        setOrderCartIndex(0);
        redirectAfterServicePayment("Payment confirmed. Upload your documents to continue.");
      } else if (paymentKind === "cart_full") {
        let refs: string[] = [];
        try {
          const raw = sessionStorage.getItem("flyoci:order-cart-apps");
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed?.apps)) {
            refs = parsed.apps
              .map((row: { referenceNumber?: string }) => String(row.referenceNumber || "").trim())
              .filter(Boolean);
          }
        } catch {
          refs = [];
        }
        if (!refs.length) refs = [refNum];
        await verifyCartFullPayment(refs, sessionId);
        if (!active) return;
        await syncApplicationFromBackend(refNum);
        if (!active) return;
        // Keep cart so we can walk document upload per application after payment.
        setBannerMessage("Order payment confirmed. Upload documents for each application.");
        toast.success("Order payment confirmed.");
        clearStripeReturnParams();
        try {
          const raw = sessionStorage.getItem("flyoci:order-cart-apps");
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed?.apps) && parsed.apps.length) {
            setOrderCartApps(parsed.apps);
            setOrderCartIndex(0);
            await activateOrderCartApp(parsed.apps, 0);
            return;
          }
        } catch {
          // fall through to checklist
        }
        setStage("checklist");
      } else if (paymentKind === "passport-quote") {
        await verifyPassportRenewalQuotePayment(refNum, sessionId);
        if (!active) return;
        await syncApplicationFromBackend(refNum);
        if (!active) return;
        redirectAfterServicePayment("Payment confirmed. Upload your documents to continue.");
      } else {
        clearStripeReturnParams();
      }
    } catch (error) {
      if (!active) return;
      setPostPaymentRedirecting(false);
      toast.error(error instanceof Error ? error.message : "Payment verification failed.");
    } finally {
      if (active) {
        setApiLoading(false);
      }
    }
  })();

  return () => {
    active = false;
  };
}, [referenceNumber, applicationRecord?.reference_number, resumeReference, router]);

useEffect(() => {
  if (!draftRestored || !loaded || refreshRedirectHandledRef.current) {
    return;
  }
  if (postPaymentRedirecting) {
    return;
  }
  // Keep users on the journey when they arrived via Start application (service/start),
  // resume link, or an in-progress draft — do not bounce them to the dashboard.
  if (resumeReference || startFresh || serviceTypeProp) {
    return;
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("service") || params.get("start")) {
      return;
    }
  }
  if (hasDraftProgress && stage !== "service") {
    return;
  }

  refreshRedirectHandledRef.current = true;
  router.replace("/dashboard");
}, [draftRestored, loaded, resumeReference, startFresh, serviceTypeProp, hasDraftProgress, stage, router, postPaymentRedirecting]);

useEffect(() => {
  if (typeof window === "undefined") return;
  if (!referenceNumber) return;
  if (resumeReference) return;

  const activeKey = getAuditDraftKey(null);
  const referenceKey = getAuditDraftKey(referenceNumber);
  const activeDraft = localStorage.getItem(activeKey) || sessionStorage.getItem(activeKey);
  if (!activeDraft) return;

  localStorage.setItem(referenceKey, activeDraft);
  localStorage.removeItem(activeKey);
  sessionStorage.removeItem(activeKey);
}, [referenceNumber, resumeReference]);


useEffect(() => {
  try {
    if (auditResultProp && ["green", "amber", "red"].includes(auditResultProp.toLowerCase())) {
      setAuditOutcome(auditResultProp.toLowerCase() as AuditOutcome);
    }
  } catch {
    // safe to ignore
  } finally {
    setLoaded(true);
  }
}, [auditResultProp]);

  useEffect(() => {
    if (!resumeReference) return;
    if (!draftRestored) return;

    let active = true;

    const hydrateFromReference = async () => {
      try {
        setApiLoading(true);
        setApplicationStartError(null);
        setResumeHydrated(false);

        const app = await syncApplicationFromBackend(resumeReference, { skipStageSync: true });
        if (!active) return;

        let hasUploadedDocs = false;
        try {
          const refForDocuments: string = (app.reference_number ?? String(resumeReference ?? "")).toString().trim();
          const docsRaw = await getApplicationDocuments(String(refForDocuments));
          const docsPayload = normalizePayload<any>(docsRaw);
          const docs = Array.isArray(docsPayload)
            ? docsPayload
            : Array.isArray(docsPayload?.documents)
              ? docsPayload.documents
              : [];

          hasUploadedDocs = docs.some((item: any) => {
            const status = String(item?.status || "").trim().toLowerCase();
            return (
              status === "uploaded" ||
              Boolean(item?.uploaded_at) ||
              Boolean(item?.file_path) ||
              Boolean(item?.document_file) ||
              Boolean(item?.url)
            );
          });
        } catch {
          // Non-fatal for resume; stage will use other signals.
        }

        const resolvedService =
          mapBackendServiceType(app.service_type) ||
          mapBackendServiceType(app.service_name) ||
          mapBackendServiceType(serviceTypeProp);

        let loadedQuestions: JourneyQuestion[] = [];
        if (resolvedService) {
          setSelectedService(resolvedService);
          setBannerMessage("");
          loadedQuestions = await loadQuestionsForService(resolvedService);
        }

        if (hasUploadedDocs) {
          setUploadConsentsAccepted(true);
        }

        // Restore audit id and checklist from backend
        const resolvedAuditId = app.latest_audit_id ?? null;
        let restoredChecklistCount = 0;
        const resumeAnswers = { ...(lastChecklistAnswers || answers) };
        const questionnaireChecklist = resolvedService ? await resolveDocuments(resolvedService, resumeAnswers) : [];

        if (questionnaireChecklist.length > 0) {
          setGeneratedChecklist(questionnaireChecklist);
        }

        if (resolvedAuditId) {
          setAuditId(Number(resolvedAuditId));
          try {
            const raw = await getAuditStatus(Number(resolvedAuditId));
            const result = normalizePayload<{ checklist_items?: AuditChecklistItem[] }>(raw);
            if (Array.isArray(result.checklist_items) && result.checklist_items.length > 0) {
              restoredChecklistCount = result.checklist_items.length;
              await applyChecklistFromAudit(result.checklist_items, {
                preferredChecklist: questionnaireChecklist,
                questionnaireAnswers: resumeAnswers,
                service: resolvedService,
              });
            }
          } catch {
            // non-fatal: checklist may still load from saved draft
          }
        } else if (questionnaireChecklist.length > 0 && hasUploadedDocs) {
          try {
            const refForDocuments = String(app.reference_number ?? resumeReference ?? "").trim();
            const docsRaw = await getApplicationDocuments(refForDocuments);
            const docsPayload = normalizePayload<any>(docsRaw);
            const docs = Array.isArray(docsPayload)
              ? docsPayload
              : Array.isArray(docsPayload?.documents)
                ? docsPayload.documents
                : [];
            setDocuments((current) => mergeHydratedDocuments(current, docs, questionnaireChecklist));
          } catch {
            // Non-fatal for resume document hydration.
          }
        }

       const backendStage = deriveStageFromApplication(app);

// Stage priority:
// 1. If backend knows we're past checklist (paid, audit-pending, etc.) → use backend
// 2. If draft restored a meaningful stage AND checklist exists → keep it
// 3. If draft is mid-questionnaire → restore questions stage only when catalog has questions
// 4. Otherwise skip empty questionnaire and move to payment / checklist
const draftStage =
  (stageRef.current as string) === "passport-quote-pending" ? "full-payment" : stageRef.current;
const hasGeneratedChecklist = questionnaireChecklist.length > 0 || generatedChecklist.length > 0;
const hasChecklistArtifacts = hasGeneratedChecklist || restoredChecklistCount > 0 || Boolean(resolvedAuditId);
const hasQuestions = loadedQuestions.length > 0;
const goQuestionsOrNext = async () => {
  if (hasQuestions) {
    setStage("questions");
    return;
  }
  if (resolvedService) {
    await routeAfterQuestionnaire(resolvedService, resumeAnswers, app);
    return;
  }
  setStage(hasChecklistArtifacts || hasUploadedDocs ? "checklist" : "service");
};

if (backendStage && backendStage !== "service" && backendStage !== "questions") {
  setStage(backendStage);
} else if (draftStage === "checklist" || draftStage === "upload" || draftStage === "summary" || draftStage === "full-payment") {
  if (hasChecklistArtifacts || hasUploadedDocs || draftStage === "full-payment" || draftStage === "summary") {
    setStage(draftStage);
  } else {
    await goQuestionsOrNext();
  }
} else if (hasChecklistArtifacts || hasUploadedDocs) {
  setStage("checklist");
} else if (draftStage === "questions" || !draftStage || draftStage === "service") {
  await goQuestionsOrNext();
} else if (draftStage && draftStage !== "service") {
  setStage(draftStage);
} else {
  await goQuestionsOrNext();
}
      } catch (error) {
        if (!active) return;
        setApplicationStartError(error instanceof Error ? error.message : "Unable to resume this application.");
      } finally {
        if (active) {
          setApiLoading(false);
          setLoaded(true);
          setResumeHydrated(true);
        }
      }
    };

    void hydrateFromReference();

    return () => {
      active = false;
    };
  }, [resumeReference, serviceTypeProp, draftRestored, hasDraftProgress]);


  useEffect(() => {
    if (!loaded) return;
    if (resumeReference && !draftRestored) return;
    saveState({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, resumeReference, draftRestored, stage, selectedService, questionIndex, answers, documents, supportNotes, addOns, auditOutcome, auditSubmitted, reviewRound, processingStep, auditId, applicationId]);

  useEffect(() => {
    if (stage !== "audit-pending" || !auditId) return;

    let active = true;
    const pollStatus = async () => {
      try {
        setApiLoading(true);
        const raw = await getAuditStatus(auditId);
        const status = normalizePayload<Record<string, unknown>>(raw);
        const statusValue = String(status.status || "").toLowerCase();
        const notesValue = String(status.notes || "");
        const appId = Number(status.application_id || status.applicationId || 0);
        if (Number.isFinite(appId) && appId > 0) {
          setApplicationId(appId);
        }

        if (!active) return;
        if (statusValue === "green") {
          setAuditOutcome("green");
          setStage("full-payment");
          setBannerMessage(notesValue || "Assessment approved. Continue to service payment.");
        } else if (statusValue === "amber" || statusValue === "red") {
          setAuditOutcome(statusValue as AuditOutcome);
          setStage("audit-result");
          setBannerMessage(notesValue || "Your audit result is ready.");
        }
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Failed to fetch audit status.");
      } finally {
        if (active) {
          setApiLoading(false);
        }
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [stage, auditId]);

  useEffect(() => {
    if (stage !== "audit-result") return;

    let active = true;

    const loadAuditResult = async () => {
      try {
        setAuditResultLoading(true);
        setAuditResultError(null);

        const app = await syncApplicationFromBackend(referenceNumber);
        const statusValue = String(app.audit_result || "").toLowerCase();

        if (!active) return;

        if (!(["green", "amber", "red"] as const).includes(statusValue as AuditOutcome)) {
          throw new Error("Audit result is not ready yet.");
        }

        // Green = payment pending — move off the result screen into full payment.
        if (statusValue === "green") {
          setAuditOutcome("green");
          proceedToFullPayment();
          return;
        }

        const flaggedFromFlaggedDocuments = Array.isArray(app.flagged_documents)
          ? app.flagged_documents.map((item: any) => ({
              doc_id: String(item?.doc_id || item?.document_type || ""),
              doc_name:
                formatDocumentTypeLabel(item?.document_type) ||
                formatDocumentTypeLabel(item?.doc_id) ||
                "Document",
              issue: String(item?.issue || item?.issue_reason || item?.finding_description || ""),
              action_required: (["re-upload", "obtain", "apostille", "affidavit"] as const).includes(
                item?.action_required as AuditResult["flagged_documents"][number]["action_required"]
              )
                ? (item?.action_required as AuditResult["flagged_documents"][number]["action_required"])
                : "re-upload",
              status: String(item?.status || ""),
              reuploaded: Boolean(item?.reuploaded),
              reuploaded_at: item?.reuploaded_at ? String(item.reuploaded_at) : null,
            }))
          : [];

        const flaggedFromFindings = Array.isArray((app as any).latest_audit_findings)
          ? (app as any).latest_audit_findings.map((finding: any, index: number) => {
              const normalize = (value: string | number | undefined | null) =>
                String(value || "").trim().toLowerCase();
              const denormalizeType = (value: string) =>
                value
                  .replace(/[_-]+/g, " ")
                  .split(" ")
                  .filter(Boolean)
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ");

              const rawType = String(finding?.document_type || "").trim();
              const normalizedType = normalize(rawType);
              const rawName = String(finding?.document_name || "").trim();
              const normalizedName = normalize(rawName);
              const combinedText = normalize(
                `${String(finding?.finding_description || "")} ${String(finding?.required_action || "")}`
              );
              const genericLabels = new Set([
                "",
                "other",
                "document",
                "uploaded document",
                "supporting document",
                "other supporting doc",
                "other supporting document",
              ]);

              const matchedChecklistDoc = checklist.find((doc) => {
                const docId = normalize(doc.id);
                const docTitle = normalize(doc.title);
                return (
                  (normalizedType && (docId === normalizedType || docId.includes(normalizedType))) ||
                  (normalizedName && (docTitle === normalizedName || docTitle.includes(normalizedName))) ||
                  (docTitle && combinedText.includes(docTitle))
                );
              });

              const resolvedDocId = matchedChecklistDoc?.id || (normalizedType && normalizedType !== "other" ? rawType : "");
              const resolvedDocName =
                (normalizedType && normalizedType !== "other" ? denormalizeType(rawType) : "") ||
                matchedChecklistDoc?.title ||
                (!genericLabels.has(normalizedName) && !looksLikeFileName(rawName) ? rawName : "Document");

              return {
                doc_id: String(resolvedDocId || finding?.id || `finding-${index + 1}`),
                doc_name: String(resolvedDocName),
                issue: String(finding?.finding_description || finding?.required_action || "Issue details not provided."),
                action_required: "re-upload" as const,
                status: "needs_fix",
                reuploaded: false,
                reuploaded_at: null,
              };
            })
          : [];

        let flaggedFromDocuments: AuditResult["flagged_documents"] = [];
        const refForDocuments = String(app.reference_number || referenceNumber || "").trim();
        if (refForDocuments) {
          try {
            const documentsResponse = await getApplicationDocuments(refForDocuments);
            const correctionDocs = documentsResponse.filter((doc) => {
              const status = String(doc.verification_status || "").toLowerCase();
              return status === "needs_correction" || status === "rejected" || Boolean(String(doc.required_action || "").trim());
            });

            flaggedFromDocuments = correctionDocs.map((doc, index) => {
              const rawType = String(doc.document_type || "").trim();
              const labelFromType = rawType
                ? rawType
                    .replace(/[_-]+/g, " ")
                    .split(" ")
                    .filter(Boolean)
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" ")
                : "Document";

              return {
                doc_id: String(rawType || doc.id || `doc-${index + 1}`),
                doc_name: labelFromType,
                issue: String(doc.required_action || doc.verification_notes || "Document requires correction."),
                action_required: "re-upload" as const,
                status: "needs_fix",
                reuploaded: false,
                reuploaded_at: null,
              };
            });
          } catch {
            flaggedFromDocuments = [];
          }
        }

        const genericFindingNames = new Set([
          "",
          "document",
          "uploaded document",
          "supporting document",
          "other supporting doc",
          "other supporting document",
        ]);
        const findingsAreMeaningful = flaggedFromFindings.some((item: AuditResult["flagged_documents"][number]) =>
          !genericFindingNames.has(String(item.doc_name || "").trim().toLowerCase())
        );
        const resolvedFlaggedDocuments = flaggedFromFlaggedDocuments.length > 0
          ? flaggedFromFlaggedDocuments
          : findingsAreMeaningful
            ? flaggedFromFindings
            : flaggedFromDocuments.length > 0
              ? flaggedFromDocuments
              : flaggedFromFindings;

        const normalized: AuditResult = {
          status: statusValue as AuditOutcome,
          auditor_notes: String(app.auditor_notes || ""),
          flagged_documents: resolvedFlaggedDocuments,
          reviewed_at: String(app.updated_at || ""),
        };

        setAuditResultData(normalized);
        setAuditOutcome(normalized.status);
        setFlaggedReuploads({});
      } catch (error) {
        if (!active) return;
        setAuditResultData(null);
        setFlaggedReuploads({});
        setAuditResultError(error instanceof Error ? error.message : "Failed to load audit result.");
      } finally {
        if (active) {
          setAuditResultLoading(false);
        }
      }
    };

    void loadAuditResult();

    return () => {
      active = false;
    };
  }, [referenceNumber, stage, checklist]);

  useEffect(() => {
    if (stage !== "full-payment") return;

    if (!assessmentOffered) {
      setBannerMessage((current) => {
        const text = String(current || "").toLowerCase();
        if (text.includes("upload documents after payment") || text.includes("audit skipped") || text.includes("pay for")) {
          return "Pay first, then upload your documents.";
        }
        return current || "Pay first, then upload your documents.";
      });
    }

    // Assessment is configured but case is not yet approved/skipped — send user back.
    // Combined full-fee cart checkout skips this (no assessment on any line).
    if (!pricingLoading && assessmentOffered && !cartCanCombineFullPayment(orderCartApps)) {
      const result = String(applicationRecord?.audit_result || "").toLowerCase();
      const skipped = Boolean(
        applicationRecord?.audit_skipped && applicationRecord?.audit_skip_disclaimer_accepted,
      );
      if (result !== "green" && !skipped) {
        if (applicationRecord?.audit_fee_paid) {
          setStage(result === "amber" || result === "red" ? "audit-result" : "audit-pending");
          setBannerMessage(
            result === "amber" || result === "red"
              ? "Review your document check result before continuing."
              : "Document check in progress. Full service payment unlocks after approval.",
          );
        } else {
          setStage("summary");
          setBannerMessage(
            "Pay the assessment fee first. Full service payment is available after your document check is approved.",
          );
        }
        return;
      }
    }

    // Combined cart checkout already built the multi-line summary.
    if (cartCanCombineFullPayment(orderCartApps)) {
      setPaymentSummaryLoading(false);
      return;
    }

    let active = true;
    const loadPaymentSummary = async () => {
      try {
        setPaymentSummaryLoading(true);
        setPaymentSummaryError(null);

        const app = await syncApplicationFromBackend(referenceNumber);

        if (!active) return;

        const preferred = String(preferredFeePlanRef.current || "").trim().toLowerCase();
        const planCode = String(app.fee_plan_code || "").trim();
        const refNum = String(app.reference_number || referenceNumber || "").trim();

        // Keep Express choice from assessment summary when opening full payment.
        if (preferred === "express" && planCode.toLowerCase() !== "express" && refNum) {
          try {
            const updated = await selectFullPaymentPlan(refNum, "express");
            if (!active) return;
            setSelectedFeePlanCode(updated.fee_plan_code || "express");
            setPaymentSummary({
              service_label: selectedServiceRecord?.name || app.service_name || "Selected service",
              service_fee: Number((updated.service_total_pence || 0) / 100),
              audit_credit: Number((updated.audit_credit_pence || 0) / 100),
              addons: [],
              total_due: Number((updated.amount_due_pence || 0) / 100),
              currency: "GBP",
            });
            await syncApplicationFromBackend(refNum, { skipStageSync: true }).catch(() => null);
            return;
          } catch {
            // Fall through to standard snapshot if plan apply fails.
          }
        }

        if (planCode) setSelectedFeePlanCode(planCode);

        setPaymentSummary({
          service_label: selectedServiceRecord?.name || app.service_name || "Selected service",
          service_fee: Number((app.service_total_pence || 0) / 100),
          audit_credit: Number((app.audit_credit_pence || 0) / 100),
          addons: [],
          total_due: Number((app.amount_due_pence || 0) / 100),
          currency: "GBP",
        });
      } catch {
        if (!active) return;
        setPaymentSummary(null);
        setPaymentSummaryError("Unable to load payment details. Please refresh or contact support.");
      } finally {
        if (active) {
          setPaymentSummaryLoading(false);
        }
      }
    };

    void loadPaymentSummary();
    return () => {
      active = false;
    };
  }, [
    applicationRecord?.audit_fee_paid,
    applicationRecord?.audit_result,
    applicationRecord?.audit_skip_disclaimer_accepted,
    applicationRecord?.audit_skipped,
    assessmentOffered,
    pricingLoading,
    referenceNumber,
    selectedServiceRecord?.name,
    stage,
  ]);

  useEffect(() => {
    if (stage !== "processing" && stage !== "completed") return;

    let active = true;

    const loadDeliveryStage = async () => {
      try {
        const latestRecord = await syncApplicationFromBackend(referenceNumber);
        if (!active) return;
        setApplicationRecord(latestRecord);
      } catch {
        // silent refresh for delivery stages
      }
    };

    void loadDeliveryStage();

    return () => {
      active = false;
    };
  }, [stage, referenceNumber]);

  const updateDocument = (id: string, file?: File | null, meta?: Partial<DocumentState>) => {
    setDocuments((current) => {
      const previous = current[id];
      if (previous?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      if (!file) {
        return {
          ...current,
          [id]: { status: "not_uploaded" },
        };
      }

      return {
        ...current,
        [id]: {
          status: "uploaded",
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          ...meta,
        },
      };
    });
    setBannerMessage("Document status updated.");
  };

  const handleViewDocument = async (docState?: DocumentState) => {
    if (!docState) {
      toast.error("Document preview is not available yet.");
      return;
    }

    try {
      if (docState.previewUrl) {
        await openApplicationDocument(docState.documentId || 0, { previewUrl: docState.previewUrl });
        return;
      }
      if (docState.documentId) {
        await openApplicationDocument(docState.documentId, { fileUrl: docState.fileUrl });
        return;
      }
      toast.error("Document preview is not available yet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open document.");
    }
  };

  const ensureAuditStarted = async (record: ApplicationRecord): Promise<number | null> => {
    const fromState = Number(auditId || 0);
    if (Number.isFinite(fromState) && fromState > 0) {
      return fromState;
    }

    const fromRecord = Number(record.latest_audit_id || 0);
    if (Number.isFinite(fromRecord) && fromRecord > 0) {
      setAuditId(fromRecord);
      return fromRecord;
    }

    const appId = Number(record.id || applicationId || 0);
    if (!Number.isFinite(appId) || appId <= 0) {
      return null;
    }

    try {
      const raw = await startAudit(
        appId,
        serviceType,
        lastChecklistAnswers || answers,
        record.reference_number || referenceNumber || null
      );
      const result = normalizePayload<{ id?: number; audit_id?: number }>(raw);
      const createdAuditId = Number(result.audit_id || result.id || 0);
      if (Number.isFinite(createdAuditId) && createdAuditId > 0) {
        setAuditId(createdAuditId);
        return createdAuditId;
      }
    } catch {
      // Upload API only requires reference_number; audit creation is best-effort here.
    }

    return null;
  };

  const handleDocumentFileInputChange = (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    void handleDocumentUpload(id, selected).finally(() => {
      event.target.value = "";
    });
  };

  const handleDocumentUpload = async (id: string, file?: File | null) => {
    if (!file) {
      updateDocument(id, null);
      return;
    }

    try {
      setApiLoading(true);
      setUploadingDocId(id);

      const app = await syncApplicationFromBackend(referenceNumber, { skipStageSync: true }).catch(() => null);
      const record = app || applicationRecord;

      if (!record) {
        toast.error("Could not load your application before upload. Please refresh and try again.");
        return;
      }

      const resolvedReferenceNumber = String(record.reference_number || referenceNumber || "").trim();
      if (!resolvedReferenceNumber) {
        toast.error("Application reference not found.");
        return;
      }

      const correctionLoopStatus = String(record.application_status || "").toLowerCase();
      const isCorrectionLoop =
        ["correction_requested", "reuploaded_pending_review"].includes(correctionLoopStatus) || stage === "audit-result";

      if (!isCorrectionLoop) {
        await ensureAuditStarted(record);
      }

      const checklistItemId = checklistItemIdByDocId[id] ?? id;
      const checklistTitle = checklist.find((item) => item.id === id)?.title || "";
      const inferredDocumentType =
        inferBackendDocumentTypeFromChecklistId(id) ||
        (() => {
          const normalizedId = String(id || "").trim().toLowerCase();
          if (!normalizedId) return "";
          const candidateType = normalizedId.startsWith("required-") ? normalizedId.slice("required-".length) : normalizedId;
          return VALID_AUDIT_DOCUMENT_TYPES.has(candidateType) ? candidateType : "";
        })();

      const auditIdForUpload = Number(auditId || record.latest_audit_id || 0);

      const raw = await uploadDocument(
        auditIdForUpload > 0 ? auditIdForUpload : null,
        checklistItemId as string,
        file,
        resolvedReferenceNumber,
        inferredDocumentType,
        checklistTitle
      );
      const payload = normalizePayload<any>(raw);
      const uploadedDoc = payload?.document || payload?.checklist_item || payload;
      const documentId = Number(uploadedDoc?.id || 0) || undefined;
      const fileUrl = String(uploadedDoc?.file_path || "").trim() || undefined;
      const uploadedFileName = String(uploadedDoc?.original_filename || uploadedDoc?.uploaded_file_name || file.name).trim();
      // FLYOCI-FIX: BUG-REUPLOAD-5
      await syncApplicationFromBackend(referenceNumber, { skipStageSync: true });
      updateDocument(id, file, { documentId, fileUrl, fileName: uploadedFileName });
      setFlaggedReuploads((current) => ({ ...current, [id]: true }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document.");
    } finally {
      setUploadingDocId(null);
      setApiLoading(false);
    }
  };

  const resetFromService = (service: ServiceId) => {
    setReuploadOnlyFlagged(false);
    setMessageRequestedDocIds([]);
    setSelectedService(service);
    setQuestionIndex(0);
    setActiveQuestions([]);
    setAnswers({});
    setDocuments(emptyDocStatus());
    setSupportUploads({});
    setSupportNotes("");
    setAddOns([]);
    setAuditOutcome(null);
    setAuditSubmitted(false);
    setReviewRound(0);
    setProcessingStep(0);
    setApplicationId(null);
    setApplicationRecord(null);
    setReferenceNumber(null);
    setAuditId(null);
    setPaymentSummary(null);
    setPaymentSummaryError(null);
    setPaymentSummaryLoading(false);
    setAuditResultData(null);
    setAuditResultError(null);
    setChecklistGenerationError(null);
    setGeneratedChecklist([]);
    setLastChecklistAnswers(null);
    setBannerMessage(service === "undecided" ? "We will help you decide the best route." : `Great. You selected ${labelForService(service)}.`);
  };

  const loadQuestionsForService = async (service: ServiceId): Promise<JourneyQuestion[]> => {
    const backendType = toBackendServiceType(service);
    if (!backendType) {
      setActiveQuestions([]);
      setAnswers({});
      return [];
    }
    const rows = await fetchServiceQuestions(backendType);
    let mapped = rows.map(mapQuestionToJourneyItem).filter((item) => item.id && item.label);

    // Light enrichment only for questions that already exist in the catalog.
    if (mapped.length) {
      mapped = mapped.map((q) => {
        if (q.id === "nationality") {
          const options = Array.from(new Set([...(q.options || []), "Portugal", "Other"]));
          const preferred = ["British", "American", "Portugal", "Other"];
          const ordered = preferred.filter((opt) => options.includes(opt));
          return { ...q, options: [...ordered, ...options.filter((opt) => !preferred.includes(opt))] };
        }
        if (q.id === "ageGroup" && !(q.options || []).length) {
          return {
            ...q,
            options: ["Child (under 20)", "Adult (20-60)", "Senior (60+) — renewal not mandatory"],
          };
        }
        if (q.id === "birthOutsideCore" && !String(q.label || "").trim()) {
          return { ...q, label: "Birth outside United Kingdom?" };
        }
        if (q.id === "marriageOutsideIndia") {
          return {
            ...q,
            depends_on_code: q.depends_on_code || "maritalStatus",
            options_by_answer: q.options_by_answer || { Married: ["Yes", "No"] },
          };
        }
        return q;
      });
    }

    setActiveQuestions(mapped);
    setAnswers((current) => {
      const base = emptyAnswersFromQuestions(mapped);
      for (const key of Object.keys(base)) {
        if (current[key]) base[key] = current[key];
      }
      return base;
    });
    setQuestionIndex((current) => (mapped.length ? Math.max(0, Math.min(current, mapped.length - 1)) : 0));
    return mapped;
  };

 const routeAfterQuestionnaire = async (
  service: ServiceId,
  answerSet?: Answers,
  recordHint?: ApplicationRecord | null,
) => {
  // Payment first, then documents. Assessment only when fee is defined (>0) from backend/catalog.
  const answersForChecklist = answerSet || lastChecklistAnswers || emptyAnswers;
  if (answerSet) {
    setLastChecklistAnswers(answerSet);
  }
  const checklist = await resolveDocuments(service, answersForChecklist);
  setGeneratedChecklist(checklist);
  const idMap: Record<string, string | number> = {};
  checklist.forEach((item) => {
    idMap[item.id] = item.id;
  });
  setChecklistItemIdByDocId(idMap);
  if (!lastChecklistAnswers && !answerSet) {
    setLastChecklistAnswers({ ...emptyAnswers });
  }

  const record = recordHint ?? applicationRecord;
  const feePence = resolveAssessmentFeePence({
    service: service || record?.service_type,
    applicationRecord: record,
    catalogServices,
    assessmentFeeHook: assessmentFee,
    auditFeePenceProp,
  });
  const offered = feePence > 0;
  const paidOrSkipped = Boolean(
    record?.audit_fee_paid ||
      String(record?.audit_payment_status || "").toLowerCase() === "paid" ||
      (record?.audit_skipped && record?.audit_skip_disclaimer_accepted),
  );
  const servicePaid = Boolean(
    record?.payment_confirmed ||
      String(record?.full_payment_status || "").toLowerCase() === "paid" ||
      String(record?.application_status || "").toLowerCase() === "paid",
  );

  if (servicePaid || paidOrSkipped) {
    setStage("checklist");
    setBannerMessage(
      servicePaid
        ? `Payment confirmed. Upload documents for ${labelForService(service)}.`
        : `Assessment paid. Upload documents for ${labelForService(service)}.`,
    );
    return;
  }

  if (offered) {
    setPaymentConsentsAccepted(false);
    setStage("summary");
    setBannerMessage(
      "Pay the assessment fee first (or skip), then upload your documents.",
    );
    return;
  }

  setPaymentConsentsAccepted(false);
  setPaymentSummary(null);
  setPaymentSummaryError(null);
  setStage("full-payment");
  setBannerMessage(`Pay for ${labelForService(service)} first, then upload your documents.`);
};

 const continueStartedApplication = async (
  service: ServiceId,
  startedApplication: { id: number; referenceNumber: string },
) => {
  setApplicationId(startedApplication.id);
  setReferenceNumber(startedApplication.referenceNumber || null);

  const questions = await loadQuestionsForService(service);
  if (questions.length > 0) {
    // Same pipeline as before — questionnaire for THIS application only
    setStage("questions");
    setBannerMessage(
      service === "undecided"
        ? "Answer a few questions so we can recommend the best route."
        : "Answer a few questions, then pay before uploading documents.",
    );
    return;
  }

  const refreshed = await syncApplicationFromBackend(startedApplication.referenceNumber || null, {
    skipStageSync: true,
  });
  await ensureAuditStarted(refreshed);
  await routeAfterQuestionnaire(service, undefined, refreshed);
};

 const handleServiceSelection = async (service: ServiceId) => {
  setApplicationStartError(null);

  // Fix 2 (safety net): clear drafts in this entry path too.
  clearDraftStorage(resumeReference || referenceNumber || null);

  resetFromService(service); // clears localStorage first

  try {
    setApiLoading(true);
    // forceCreate=true so we never accidentally resume a stale application
    const startedApplication = await startApplicationIfNeeded(service, true);
    await continueStartedApplication(service, startedApplication);
  } catch {
    setApplicationStartError("Could not start your application. Please try again.");
  } finally {
    setApiLoading(false);
  }
};

 /** One application per (applicant × service). Same pipeline per app — no flow change. */
 const handleOrderCartContinue = async (cart: StartOrderCartEntry[]) => {
  setApplicationStartError(null);

  const resolveJourneyId = (serviceOptionId: string, journeyHint?: string | null): ServiceId | null => {
    return (
      mapCatalogServiceType(journeyHint) ||
      mapCatalogServiceType(serviceOptionId) ||
      mapBackendServiceType(serviceOptionId) ||
      (journeyHint ? String(journeyHint).trim() : null) ||
      null
    );
  };

  type OrderLine = {
    applicant: StartOrderApplicant;
    service: ServiceId;
    serviceOptionId: string;
    catalogId?: number | string | null;
  };

  const optionById = new Map<
    string,
    { id: string; journeyId: string; catalogId: number | string | null; serviceType?: string }
  >();
  for (const row of catalogServices) {
    const optionId = `svc-${row.id}`;
    optionById.set(optionId, {
      id: optionId,
      journeyId: mapCatalogServiceType(row.serviceType) || String(row.serviceType || "").replace(/_/g, "-"),
      catalogId: row.id,
      serviceType: String(row.serviceType || "").toLowerCase(),
    });
  }
  optionById.set("new_oci", { id: "new_oci", journeyId: "new-oci", catalogId: null, serviceType: "new_oci" });
  optionById.set("oci_renewal", { id: "oci_renewal", journeyId: "oci-renewal", catalogId: null, serviceType: "oci_renewal" });
  optionById.set("oci_update", { id: "oci_update", journeyId: "oci-update", catalogId: null, serviceType: "oci_update" });
  optionById.set("passport_renewal", {
    id: "passport_renewal",
    journeyId: "passport-renewal",
    catalogId: null,
    serviceType: "passport_renewal",
  });
  optionById.set("apostille", { id: "apostille", journeyId: "apostille", catalogId: null, serviceType: "apostille" });

  const lines: OrderLine[] = [];
  for (const entry of cart) {
    for (const serviceOptionId of entry.serviceIds) {
      if (serviceOptionId === "undecided") continue;
      const option = optionById.get(serviceOptionId);
      const service = resolveJourneyId(serviceOptionId, option?.journeyId);
      if (!service) continue;
      let catalogId = option?.catalogId ?? null;
      if (catalogId == null) {
        const match = catalogServices.find(
          (row) =>
            mapCatalogServiceType(row.serviceType) === service ||
            String(row.serviceType || "").toLowerCase().replace(/[\s-]+/g, "_") ===
              service.replace(/-/g, "_"),
        );
        catalogId = match?.id ?? null;
      }
      lines.push({ applicant: entry.applicant, service, serviceOptionId, catalogId });
    }
  }

  if (!lines.length) {
    toast.error("Please select at least one service.");
    return;
  }

  const firstLine = lines[0];
  clearDraftStorage(resumeReference || referenceNumber || null);
  resetFromService(firstLine.service);
  setPrimaryApplicant({
    ...firstLine.applicant,
    id: firstLine.applicant.id || "primary",
  });
  setShowServicePicker(false);

  try {
    setApiLoading(true);

    const createdApps: OrderCartApp[] = [];

    for (const line of lines) {
      const payload = await createApplication(mapApplicationServiceType(line.service), {
        serviceId: line.catalogId,
        applicantName: line.applicant.fullName.trim(),
        applicantEmail: line.applicant.email.trim(),
        applicantMobile: line.applicant.mobile.trim(),
        applyingFrom: line.applicant.applyingFrom,
        applicantEmailVerificationToken: line.applicant.emailVerificationToken || undefined,
      });
      const applicationId = Number(payload.application_id || 0);
      const referenceNumberCreated = String(payload.reference_number || "").trim();
      if (!Number.isFinite(applicationId) || applicationId <= 0 || !referenceNumberCreated) {
        throw new Error("Could not start your application. Please try again.");
      }
      createdApps.push({
        applicantName: line.applicant.fullName.trim(),
        applicantEmail: line.applicant.email.trim(),
        applicantMobile: line.applicant.mobile.trim(),
        applyingFrom: line.applicant.applyingFrom,
        service: line.service,
        applicationId,
        referenceNumber: referenceNumberCreated,
        docsComplete: false,
      });
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "flyoci:order-cart-apps",
        JSON.stringify({
          createdAt: Date.now(),
          apps: createdApps,
        }),
      );
    }

    setOrderCartApps(createdApps);
    setOrderCartIndex(0);
    setCartSkipAssessmentAccepted(false);

    if (createdApps.length > 1) {
      const canCombine = createdApps.every((app) => !serviceNeedsAssessment(app.service));
      if (canCombine) {
        toast.success(
          `Order started with ${createdApps.length} applications. Pay once for all, then upload documents for each.`,
          { duration: 6000 },
        );
        await prepareCartCombinedPayment(createdApps);
        return;
      }

      toast.success(
        `Order started with ${createdApps.length} applications. Some need assessment and some do not — each will be paid separately.`,
        { duration: 7000 },
      );
      await activateOrderCartApp(createdApps, 0);
      return;
    }

    await activateOrderCartApp(createdApps, 0);
  } catch (error) {
    setApplicationStartError(
      error instanceof Error ? error.message : "Could not start your application. Please try again.",
    );
  } finally {
    setApiLoading(false);
  }
};

  const activateOrderCartApp = async (apps: OrderCartApp[], index: number) => {
    const target = apps[index];
    if (!target) return;

    setOrderCartIndex(index);
    // Wipe prior app's local upload UI before switching reference — never reuse files across apps.
    setDocuments(emptyDocStatus());
    setFlaggedReuploads({});
    setChecklistItemIdByDocId({});
    setExpandedChecklistDocIds({});
    setSupportUploads({});
    setUploadConsentsAccepted(false);
    setGeneratedChecklist([]);
    setLastChecklistAnswers(null);
    setAuditId(null);

    resetFromService(target.service);
    setPrimaryApplicant({
      id: "primary",
      fullName: target.applicantName,
      email: target.applicantEmail,
      mobile: target.applicantMobile || "",
      applyingFrom: target.applyingFrom || "United Kingdom",
    });
    setShowServicePicker(false);

    await syncApplicationFromBackend(target.referenceNumber, { skipStageSync: true });
    setApplicationId(target.applicationId);
    setReferenceNumber(target.referenceNumber);
    // Ensure UI stays empty until this app's backend docs hydrate.
    setDocuments(emptyDocStatus());

    const questions = await loadQuestionsForService(target.service);
    setQuestionIndex(0);
    setAnswers(emptyAnswersFromQuestions(questions));
    setDocuments(emptyDocStatus());
    setGeneratedChecklist([]);
    setLastChecklistAnswers(null);
    setUploadConsentsAccepted(false);

    if (questions.length > 0) {
      setStage("questions");
      setBannerMessage(
        apps.length > 1
          ? `Applicant ${index + 1} of ${apps.length}: ${target.applicantName || "Applicant"} — ${labelForService(target.service)}. Answer the smart questionnaire for this service.`
          : `Answer a few questions, then pay before uploading documents.`,
      );
    } else {
      const refreshed = await syncApplicationFromBackend(target.referenceNumber, { skipStageSync: true });
      await ensureAuditStarted(refreshed);
      await routeAfterQuestionnaire(target.service, undefined, refreshed);
    }
  };

  const getCatalogPlansForService = (service: ServiceId) => {
    const backendType = toBackendServiceType(service) || service.replace(/-/g, "_");
    const match =
      catalogServices.find(
        (row) => String(row.serviceType || "").toLowerCase().replace(/[\s-]+/g, "_") === backendType,
      ) || null;
    return (match?.plans || [])
      .filter((plan) => plan.fee > 0)
      .slice()
      .sort((a, b) => {
        if (a.planCode === "express") return 1;
        if (b.planCode === "express") return -1;
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return String(a.label || "").localeCompare(String(b.label || ""));
      });
  };

  /** True when this service has assessment fee defined (>0) in catalog / hooks. */
  const serviceNeedsAssessment = (service: ServiceId | null | undefined): boolean => {
    if (!service) return false;
    return (
      resolveAssessmentFeePence({
        service,
        catalogServices,
        assessmentFeeHook: assessmentFee,
        auditFeePenceProp,
      }) > 0
    );
  };

  /** Combined one-checkout only when every line is full-fee (no assessment). */
  const cartCanCombineFullPayment = (apps: OrderCartApp[]): boolean =>
    apps.length > 1 && apps.every((app) => !serviceNeedsAssessment(app.service));

  const cartUsesSequentialPayments =
    orderCartApps.length > 1 && !cartCanCombineFullPayment(orderCartApps);

  const refreshCartPaymentSummary = async (apps: OrderCartApp[], planByRef?: Record<string, string>) => {
    const plans = planByRef || cartFeePlanByRef;
    const lines: Array<{ label: string; amount: number; reference: string; planCode: string }> = [];
    let total = 0;
    let anyNeedsAssessmentSkip = false;

    for (const app of apps) {
      const preferredPlan = String(plans[app.referenceNumber] || "").trim();
      if (preferredPlan) {
        try {
          await selectFullPaymentPlan(app.referenceNumber, preferredPlan);
        } catch {
          // Keep existing plan if express is unavailable for this service.
        }
      }
      const record = await syncApplicationFromBackend(app.referenceNumber, { skipStageSync: true });
      const auditFee = Number(record.audit_fee_pence || 0);
      const result = String(record.audit_result || "").toLowerCase();
      const skipped = Boolean(record.audit_skipped && record.audit_skip_disclaimer_accepted);
      if (auditFee > 0 && result !== "green" && !skipped) {
        anyNeedsAssessmentSkip = true;
      }
      const planCode = String(record.fee_plan_code || preferredPlan || "standard").trim() || "standard";
      const due = Number(record.amount_due_pence || record.service_total_pence || 0) / 100;
      const expressTag = planCode.toLowerCase() === "express" ? " · Express" : "";
      lines.push({
        label: `${app.applicantName || "Applicant"} — ${labelForService(app.service)}${expressTag}`,
        amount: due,
        reference: app.referenceNumber,
        planCode,
      });
      total += due;
    }

    setCartFeePlanByRef((current) => {
      const next = { ...current };
      for (const line of lines) {
        next[line.reference] = line.planCode;
      }
      return next;
    });

    setPaymentSummary({
      service_label: `${apps.length} applications`,
      service_fee: total,
      audit_credit: 0,
      addons: lines.map((line) => ({
        label: `${line.label} (${line.reference})`,
        amount: line.amount,
      })),
      total_due: total,
      currency: "GBP",
    });
    setPaymentSummaryError(null);
    return { anyNeedsAssessmentSkip, lines, total };
  };

  const applyCartAppFeePlan = async (referenceNumber: string, planCode: string) => {
    if (!referenceNumber || !planCode) return;
    try {
      setFeePlanUpdating(true);
      const nextPlans = { ...cartFeePlanByRef, [referenceNumber]: planCode };
      setCartFeePlanByRef(nextPlans);
      await selectFullPaymentPlan(referenceNumber, planCode);
      await refreshCartPaymentSummary(orderCartApps, nextPlans);
      toast.success(planCode === "express" ? "Express applied to this application." : "Standard fee applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update fee plan.");
    } finally {
      setFeePlanUpdating(false);
    }
  };

  const applyCartFeePlanToAll = async (planCode: string) => {
    if (!orderCartApps.length || !planCode) return;
    try {
      setFeePlanUpdating(true);
      const nextPlans: Record<string, string> = { ...cartFeePlanByRef };
      for (const app of orderCartApps) {
        const plans = getCatalogPlansForService(app.service);
        const hasPlan = plans.some((plan) => plan.planCode === planCode);
        if (!hasPlan && planCode === "express") continue;
        const resolved =
          planCode === "express"
            ? "express"
            : plans.find((plan) => plan.planCode !== "express" && plan.isDefault)?.planCode ||
              plans.find((plan) => plan.planCode !== "express")?.planCode ||
              "standard";
        nextPlans[app.referenceNumber] = resolved;
        try {
          await selectFullPaymentPlan(app.referenceNumber, resolved);
        } catch {
          // Skip apps that cannot take this plan.
        }
      }
      setCartFeePlanByRef(nextPlans);
      await refreshCartPaymentSummary(orderCartApps, nextPlans);
      toast.success(planCode === "express" ? "Express applied where available." : "Standard fees applied to all.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update fee plans.");
    } finally {
      setFeePlanUpdating(false);
    }
  };

  const prepareCartCombinedPayment = async (apps: OrderCartApp[]) => {
    setApiLoading(true);
    try {
      const initialPlans: Record<string, string> = {};
      for (const app of apps) {
        const plans = getCatalogPlansForService(app.service);
        const defaultPlan =
          plans.find((plan) => plan.planCode !== "express" && plan.isDefault) ||
          plans.find((plan) => plan.planCode !== "express") ||
          plans[0];
        initialPlans[app.referenceNumber] =
          cartFeePlanByRef[app.referenceNumber] || defaultPlan?.planCode || "standard";
      }
      setCartFeePlanByRef(initialPlans);
      const { anyNeedsAssessmentSkip } = await refreshCartPaymentSummary(apps, initialPlans);

      if (anyNeedsAssessmentSkip) {
        setCartSkipAssessmentAccepted(false);
      }

      setPaymentConsentsAccepted(false);
      setStage("full-payment");
      setBannerMessage(
        anyNeedsAssessmentSkip
          ? "Confirm assessment skip for this order, then pay once for all applications."
          : "Choose Express where available, then pay once for the order.",
      );
      toast.success("Ready for combined checkout.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare combined payment.");
    } finally {
      setApiLoading(false);
    }
  };

  const advanceOrderCartAfterDocs = async () => {
    if (orderCartApps.length <= 1) return false;

    const updated = orderCartApps.map((app, index) =>
      index === orderCartIndex ? { ...app, docsComplete: true } : app,
    );
    setOrderCartApps(updated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "flyoci:order-cart-apps",
        JSON.stringify({ createdAt: Date.now(), apps: updated }),
      );
    }

    const nextIndex = updated.findIndex((app, index) => index > orderCartIndex && !app.docsComplete);
    const fallbackIndex = updated.findIndex((app) => !app.docsComplete);

    if (nextIndex >= 0 || fallbackIndex >= 0) {
      const targetIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;
      toast.success(
        `Saved documents for ${updated[orderCartIndex]?.applicantName || "applicant"}. Continue with the next application.`,
      );
      await activateOrderCartApp(updated, targetIndex);
      return true;
    }

    // All document packs done — never force a second combined checkout here.
    setStage("processing");
    setBannerMessage(
      cartCanCombineFullPayment(updated)
        ? "All document packs uploaded. Your order is being processed."
        : "All applications in your order are paid and documents uploaded.",
    );
    toast.success("Order complete.");
    return true;
  };

  const mapChecklistServiceType = (service: ServiceId | null): "new-oci" | "oci-renewal" | "oci-update" | "passport-renewal" => {
    if (service === "new-oci") return "new-oci";
    if (service === "oci-renewal") return "oci-renewal";
    if (service === "oci-update") return "oci-update";
    if (service === "passport-renewal") return "passport-renewal";
    return "new-oci";
  };

  const mapAgeGroup = (value: string): "child" | "adult" | "senior" => {
    if (value.toLowerCase().includes("child")) return "child";
    if (value.toLowerCase().includes("senior")) return "senior";
    return "adult";
  };

  const mapMaritalStatus = (value: string): "single" | "married" | "divorced" | "widowed" => {
    const normalized = value.toLowerCase();
    if (normalized === "married") return "married";
    if (normalized === "divorced") return "divorced";
    if (normalized === "widowed") return "widowed";
    return "single";
  };

  const applyChecklistFromAudit = async (
    items: AuditChecklistItem[],
    options?: {
      preferredChecklist?: DocumentItem[];
      questionnaireAnswers?: Answers;
      service?: ServiceId | null;
    }
  ) => {
    const questionnaireChecklist =
      options?.preferredChecklist && options.preferredChecklist.length > 0
        ? options.preferredChecklist
        : options?.service && options?.questionnaireAnswers
          ? await resolveDocuments(options.service, options.questionnaireAnswers)
          : [];

    const sanitizedPreferred = (options?.preferredChecklist || generatedChecklist).filter(
      (item) => !looksLikeUploadedFileName(item.title)
    );

    const baseChecklist =
      questionnaireChecklist.length > 0
        ? questionnaireChecklist
        : sanitizedPreferred.length > 0
          ? sanitizedPreferred
          : [];

    if (baseChecklist.length > 0) {
      const mergedChecklist = baseChecklist.map((item) => ({ ...item }));
      setGeneratedChecklist(mergedChecklist);
      setChecklistItemIdByDocId(buildChecklistUploadIdMap(mergedChecklist, items));
      if (items.length > 0) {
        setDocuments((current) => ({
          ...current,
          ...documentsFromAuditChecklistItems(items, mergedChecklist),
        }));
      }
      setChecklistGenerationError(null);
      return;
    }

    const normalizedChecklist: DocumentItem[] = items.map((item, index) => {
      const documentType = String(item.document_type || "").trim();
      const stableId = String(
        item.doc_id ||
          (documentType ? `required-${documentType}` : "") ||
          item.checklist_item_id ||
          item.id ||
          item.item_id ||
          `doc-${index + 1}`
      );
      const title = resolveChecklistDisplayTitle(item, undefined);
      const rawDescription = String(item.description || "").trim();
      const description = looksLikeUploadedFileName(rawDescription) ? "" : rawDescription;

      const commonMistakes = Array.isArray(item.common_mistakes)
        ? item.common_mistakes
        : item.common_mistakes
          ? [String(item.common_mistakes)]
          : [];

      return {
        id: stableId,
        title,
        description,
        required: item.required !== false,
        mistakes: commonMistakes.join(" "),
        sample: "",
        sampleUrl: item.sample_url || null,
        commonMistakes,
        specialRequirement: item.special_requirement || null,
      };
    });

    setGeneratedChecklist(normalizedChecklist);
    setChecklistItemIdByDocId(buildChecklistUploadIdMap(normalizedChecklist, items));
    if (items.length > 0) {
      setDocuments((current) => ({
        ...current,
        ...documentsFromAuditChecklistItems(items, normalizedChecklist),
      }));
    }
    setChecklistGenerationError(null);
  };

  const completeQuestionnaire = async (answerSet: Answers) => {
    const app = await syncApplicationFromBackend(referenceNumber);
    const appId = app.id;
    const refNum = app.reference_number;
    const questionnaireChecklist = selectedService ? await resolveDocuments(selectedService, answerSet) : [];

    let nextAuditId = auditId;
    if (!nextAuditId) {
      const raw = await startAudit(appId, serviceType, answerSet, refNum || null);
      const result = normalizePayload<{ id?: number; audit_id?: number; checklist_items?: AuditChecklistItem[] }>(raw);
      const createdAuditId = Number(result.audit_id || result.id || 0);
      if (!Number.isFinite(createdAuditId) || createdAuditId <= 0) {
        throw new Error("Invalid audit id from startAudit.");
      }
      nextAuditId = createdAuditId;
      setAuditId(createdAuditId);
      await applyChecklistFromAudit(Array.isArray(result.checklist_items) ? result.checklist_items : [], {
        preferredChecklist: questionnaireChecklist,
        questionnaireAnswers: answerSet,
        service: selectedService,
      });
    } else {
      const raw = await getAuditStatus(nextAuditId);
      const result = normalizePayload<{ checklist_items?: AuditChecklistItem[] }>(raw);
      await applyChecklistFromAudit(Array.isArray(result.checklist_items) ? result.checklist_items : [], {
        preferredChecklist: questionnaireChecklist,
        questionnaireAnswers: answerSet,
        service: selectedService,
      });
    }

    setApplicationId(appId);
    setAuditId(nextAuditId);
    setReuploadOnlyFlagged(false);
    setMessageRequestedDocIds([]);
    await routeAfterQuestionnaire(selectedService || "undecided", answerSet, applicationRecord);
  };

  const retryChecklistGeneration = async () => {
    if (!lastChecklistAnswers) return;
    try {
      setApiLoading(true);
      await completeQuestionnaire(lastChecklistAnswers);
    } catch (error) {
      setChecklistGenerationError(error instanceof Error ? error.message : "Failed to generate checklist.");
    } finally {
      setApiLoading(false);
    }
  };

  const answerQuestion = async (value: string) => {
    const currentId = currentQuestion.id;
    const nextAnswers = { ...answers, [currentId]: value };
    for (let index = questionIndex + 1; index < activeQuestions.length; index += 1) {
      nextAnswers[activeQuestions[index].id] = "";
    }
    setAnswers(nextAnswers);

    if (questionIndex === activeQuestions.length - 1) {
      setLastChecklistAnswers(nextAnswers);
      setChecklistGenerationError(null);
      try {
        setApiLoading(true);
        await completeQuestionnaire(nextAnswers);
      } catch (error) {
        setChecklistGenerationError(error instanceof Error ? error.message : "Failed to generate checklist.");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    setQuestionIndex((current) => current + 1);
  };

  const goBackQuestion = () => {
    if (questionIndex === 0) {
      setStage("service");
      return;
    }
    setQuestionIndex((current) => current - 1);
  };

 

  const proceedToSummary = async () => {
    if (orderCartApps.length > 1) {
      const advanced = await advanceOrderCartAfterDocs();
      if (advanced) return;
    }

    setMessageRequestedDocIds([]);
    if (fullServicePaid) {
      setStage("processing");
      setBannerMessage("Documents uploaded. Your application is being processed.");
      return;
    }
    if (assessmentOffered && !assessmentPaidOrSkipped) {
      setStage("summary");
      setBannerMessage("Pay the assessment fee first (or skip), then upload your documents.");
      return;
    }
    setStage("full-payment");
    setBannerMessage("Continue to service payment, then upload documents if needed.");
  };

  const openDocRequestUpload = (docId: string) => {
    if (!docId) return;
    setReuploadOnlyFlagged(false);
    setMessageRequestedDocIds([docId]);
    setStage("checklist");
    setBannerMessage("Upload the requested document from your message thread.");
  };

  const submitAuditPayment = async () => {
    if (!paymentConsentsAccepted) {
      toast.error("Please accept the payment consents before continuing.");
      return;
    }

    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number || referenceNumber;
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    const serviceType = String(app?.service_type || selectedService || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const resolvedFee = resolveAssessmentFeePence({
      service: serviceType || selectedService,
      applicationRecord: app,
      catalogServices,
      assessmentFeeHook: assessmentFee,
      auditFeePenceProp,
    });
    if (resolvedFee <= 0) {
      toast.error("Assessment is not offered for this service.");
      return;
    }

    try {
      setApiLoading(true);
      const order = await createAuditPaymentOrder(refNum, supportNotes);
      const checkoutUrl = getStripeCheckoutUrl(order);
      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL is missing. Please try again or contact support.");
      }
      redirectToStripeCheckout(checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Audit payment failed.");
    } finally {
      setApiLoading(false);
    }
  };

  const resubmitForReview = async () => {
    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    try {
      setApiLoading(true);
      await resubmitApplicationForReview(refNum);
      await syncApplicationFromBackend(refNum);
      setReviewRound((current) => current + 1);
      setStage("audit-pending");
      setBannerMessage("Re-uploaded - Pending Review");
      toast.success("Application resubmitted for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resubmit for review.");
    } finally {
      setApiLoading(false);
    }
  };

  const submitReview = async () => {
    const app = await syncApplicationFromBackend(referenceNumber).catch(() => applicationRecord);
    const refNum = app?.reference_number || applicationRecord?.reference_number || referenceNumber || "";
    const testimonialText = reviewText.trim();

    if (!testimonialText) {
      toast.error("Please write your review before submitting.");
      return;
    }

    try {
      setReviewSubmitting(true);
      await submitTestimonial({
        author_name: reviewAuthorName.trim() || undefined,
        testimonial_text: testimonialText,
        service_type: String(app?.service_name || app?.service_type || selectedService || "").trim() || undefined,
        rating: reviewRating,
        application_reference: refNum || undefined,
      });
      setReviewText("");
      setReviewAuthorName("");
      setReviewRating(5);
      setReviewSubmitted(true);
      setReviewModalOpen(false);
      toast.success("Thanks. Your review is now live on the homepage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const requestDocumentDeletion = async () => {
    const refNum = String(applicationRecord?.reference_number || referenceNumber || "").trim();
    if (!refNum || docDeletionBusy) return;
    try {
      setDocDeletionBusy(true);
      await createDocumentDeletionRequest(refNum, docDeletionReason.trim());
      const payload = await getDocumentDeletionRequests(refNum);
      setDocDeletion(payload);
      setDocDeletionReason("");
      toast.success("Deletion request submitted for admin review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request document deletion.");
    } finally {
      setDocDeletionBusy(false);
    }
  };

  const confirmExecuteDocumentDeletion = async () => {
    const refNum = String(applicationRecord?.reference_number || referenceNumber || "").trim();
    const requestId = docDeletion?.open_request?.id;
    if (!refNum || !requestId || docDeletionBusy) return;
    try {
      setDocDeletionBusy(true);
      await executeDocumentDeletionRequest(refNum, requestId);
      const payload = await getDocumentDeletionRequests(refNum);
      setDocDeletion(payload);
      setDocDeleteConfirmOpen(false);
      toast.success("Your documents have been removed from FlyOCI servers.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete documents.");
    } finally {
      setDocDeletionBusy(false);
    }
  };

  const openPrintableSummary = async () => {
    const app = applicationRecord;
    const referenceLine = app?.reference_number || referenceNumber || "N/A";
    const serviceLine = app?.service_name || app?.service_type || selectedService || "N/A";
    const statusLine = app?.current_stage || app?.application_status || "Completed";
    const submissionLine = app?.submission_date || app?.approval_date || app?.completion_date || "N/A";
    const decisionLine = app?.approval_date || app?.completion_date || "N/A";
    const notesLine = app?.notes || "No decision reference recorded.";
    const safeReference = String(referenceLine)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "case-summary";

    const fallbackToPrintDialog = () => {
      const printFrame = document.createElement("iframe");
      printFrame.setAttribute("aria-hidden", "true");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);

      const printHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FlyOCI Case Summary</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 32px;
              color: #123;
              background: #f5f8fc;
            }
            .sheet {
              max-width: 860px;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #dbe8f7;
              border-radius: 20px;
              padding: 28px;
              box-shadow: 0 20px 50px rgba(18, 47, 89, 0.08);
            }
            h1 {
              margin: 0 0 8px;
              font-size: 30px;
              color: #0f4aa6;
            }
            p {
              margin: 0 0 10px;
              line-height: 1.5;
            }
            .meta {
              margin-top: 18px;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
            }
            .box {
              border: 1px solid #dbe8f7;
              border-radius: 14px;
              padding: 14px;
              background: #f9fbff;
            }
            .label {
              display: block;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #5d7089;
              margin-bottom: 6px;
            }
            .value {
              font-size: 15px;
              font-weight: 600;
              color: #1f3558;
            }
            .footer {
              margin-top: 22px;
              font-size: 12px;
              color: #6b7f99;
            }
            @media print {
              body {
                background: #fff;
                padding: 0;
              }
              .sheet {
                border: 0;
                box-shadow: none;
                border-radius: 0;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>FlyOCI Case Summary</h1>
            <p>Your completed case record is shown below. Use your browser print dialog to save this as a PDF.</p>
            <div class="meta">
              <div class="box"><span class="label">Reference</span><span class="value">${referenceLine}</span></div>
              <div class="box"><span class="label">Service</span><span class="value">${serviceLine}</span></div>
              <div class="box"><span class="label">Status</span><span class="value">${statusLine}</span></div>
              <div class="box"><span class="label">Submission / Finalized Date</span><span class="value">${submissionLine}</span></div>
              <div class="box"><span class="label">Decision Date</span><span class="value">${decisionLine}</span></div>
              <div class="box"><span class="label">Decision Reference</span><span class="value">${notesLine}</span></div>
            </div>
            <p class="footer">FlyOCI is an independent private service provider.</p>
          </div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

      const frameDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDocument) {
        document.body.removeChild(printFrame);
        toast.error("Unable to prepare the printable summary.");
        return;
      }

      frameDocument.open();
      frameDocument.write(printHtml);
      frameDocument.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 250);

      const cleanup = () => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
        window.removeEventListener("afterprint", cleanup);
      };

      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 5000);
    };

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      let y = 56;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("FlyOCI Case Summary", 48, y);
      y += 26;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(93, 112, 137);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 48, y);
      y += 26;

      const rows: Array<[string, string]> = [
        ["Reference", String(referenceLine)],
        ["Service", String(serviceLine)],
        ["Status", String(statusLine)],
        ["Submission / Finalized Date", String(submissionLine)],
        ["Decision Date", String(decisionLine)],
        ["Decision Reference", String(notesLine)],
      ];

      doc.setTextColor(31, 53, 88);
      doc.setFontSize(12);

      rows.forEach(([label, value]) => {
        if (y > 760) {
          doc.addPage();
          y = 56;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 48, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(value || "N/A", 380);
        doc.text(wrapped, 220, y);
        y += Math.max(22, wrapped.length * 14);
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 127, 153);
      doc.text("FlyOCI is an independent private service provider.", 48, 800);

      doc.save(`flyoci-case-summary-${safeReference}.pdf`);
      toast.success("Case summary PDF is downloading.");
    } catch {
      toast.error("Direct PDF download failed. Opening print dialog instead.");
      fallbackToPrintDialog();
    }
  };

  const proceedToFullPayment = () => {
    if (assessmentEligibilityPending) {
      toast.error("Loading fees… please wait a moment.");
      return;
    }

    // Multi-app order: combined pay only when every service is full-fee (no assessment).
    if (orderCartApps.length > 1 && cartCanCombineFullPayment(orderCartApps)) {
      void prepareCartCombinedPayment(orderCartApps);
      return;
    }

    if (assessmentOffered) {
      const result = String(
        applicationRecord?.audit_result || auditOutcome || auditResultData?.status || "",
      ).toLowerCase();
      const skipped = Boolean(
        applicationRecord?.audit_skipped && applicationRecord?.audit_skip_disclaimer_accepted,
      );
      // After assessment approval, remaining balance; otherwise send to assessment step first.
      if (result !== "green" && !skipped && !assessmentPaidOrSkipped) {
        setStage("summary");
        setBannerMessage(
          "Pay the assessment fee first (or skip). Document upload unlocks after payment.",
        );
        toast.error("Please complete the assessment step before full service payment.");
        return;
      }
    }
    setPaymentSummary(null);
    setPaymentSummaryError(null);
    setMessageRequestedDocIds([]);
    setPaymentConsentsAccepted(false);
    setStage("full-payment");
    setBannerMessage(
      assessmentOffered
        ? "Complete service payment. Upload documents after payment if still needed."
        : "Pay first, then upload your documents.",
    );
  };

  const skipAuditAndProceedToPayment = async () => {
    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    try {
      setApiLoading(true);
      await skipAuditWithDisclaimer(refNum, supportNotes);
      await syncApplicationFromBackend(refNum);
      setPaymentConsentsAccepted(false);
      setStage("full-payment");
      setBannerMessage("Assessment skipped with risk acknowledgement. Full payment is now available.");
      toast.success("Assessment skipped. Continuing to service payment.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to skip audit.");
    } finally {
      setApiLoading(false);
    }
  };

  const applyFeePlanSelection = async (planCode: string) => {
    const refNum = String(referenceNumber || applicationRecord?.reference_number || "").trim();
    if (!refNum || !planCode || planCode === selectedFeePlanCode) return;

    try {
      setFeePlanUpdating(true);
      const updated = await selectFullPaymentPlan(refNum, planCode);
      setSelectedFeePlanCode(updated.fee_plan_code || planCode);
      setPaymentSummary((current) => ({
        service_label: current?.service_label || selectedServiceRecord?.name || "Selected service",
        service_fee: Number((updated.service_total_pence || 0) / 100),
        audit_credit: Number((updated.audit_credit_pence || 0) / 100),
        addons: current?.addons || [],
        total_due: Number((updated.amount_due_pence || 0) / 100),
        currency: current?.currency || "GBP",
      }));
      await syncApplicationFromBackend(refNum, { skipStageSync: true }).catch(() => null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payment plan.");
    } finally {
      setFeePlanUpdating(false);
    }
  };

  const confirmFullPayment = async () => {
    if (!paymentSummary || paymentSummaryLoading || paymentSummaryError) {
      toast.error("Unable to load payment details. Please refresh or contact support.");
      return;
    }

    if (!paymentConsentsAccepted) {
      toast.error("Please accept the payment consents before continuing.");
      return;
    }

    // Combined cart checkout only when every line is full-fee (no assessment mix).
    const isCartCheckout = cartCanCombineFullPayment(orderCartApps);
    if (isCartCheckout) {
      try {
        setApiLoading(true);
        for (const app of orderCartApps) {
          const record = await syncApplicationFromBackend(app.referenceNumber, { skipStageSync: true });
          const auditFee = Number(record.audit_fee_pence || 0);
          const result = String(record.audit_result || "").toLowerCase();
          const skipped = Boolean(record.audit_skipped && record.audit_skip_disclaimer_accepted);
          if (auditFee > 0 && result !== "green" && !skipped) {
            if (!cartSkipAssessmentAccepted) {
              toast.error("Please confirm you skip the document assessment for this multi-application order.");
              return;
            }
            await skipAuditWithDisclaimer(
              app.referenceNumber,
              supportNotes || "Multi-applicant order — assessment skipped.",
            );
          }
        }

        const refs = orderCartApps.map((app) => app.referenceNumber);
        const raw = await createCartFullPaymentOrder(refs);
        const order = normalizePayload<{
          checkout_url?: string;
          order_id?: string;
          stripe_session_id?: string;
          currency?: string;
          key_id?: string;
        }>(raw);
        redirectToStripeCheckout(getStripeCheckoutUrl(order));
        setProcessingStep(1);
        setBannerMessage("Redirecting to secure checkout for your full order…");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Cart payment failed.");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    if (assessmentOffered) {
      const result = String(applicationRecord?.audit_result || "").toLowerCase();
      const skipped = Boolean(
        applicationRecord?.audit_skipped && applicationRecord?.audit_skip_disclaimer_accepted,
      );
      if (result !== "green" && !skipped) {
        setStage("summary");
        setBannerMessage(
          "Pay the assessment fee first. Full service payment is available after your document check is approved.",
        );
        toast.error(
          "Full service payment is available after your document check is approved, or if you skip the assessment.",
        );
        return;
      }
    }

    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found for full payment.");
      return;
    }

    try {
      setApiLoading(true);
      const raw = await createFullPaymentOrder(refNum, selectedFeePlanCode || undefined);
      const order = normalizePayload<{
        order?: { id: string; amount: number; currency: string; url?: string };
        checkout_url?: string;
        amount_pence?: number;
        currency: string;
        key_id: string;
      }>(raw);

      redirectToStripeCheckout(getStripeCheckoutUrl(order));
      setProcessingStep(1);
      setBannerMessage("Service confirmed. Your application is in process.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Full payment failed.");
    } finally {
      setApiLoading(false);
    }
  };

  const resetJourneyForNewApplication = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getAuditDraftKey(resumeReference || referenceNumber || null));
      localStorage.removeItem(getAuditDraftKey(null));
      localStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
      sessionStorage.removeItem(getAuditDraftKey(resumeReference || referenceNumber || null));
      sessionStorage.removeItem(getAuditDraftKey(null));
      sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    }

    setStage("service");
    setSelectedService(null);
    setShowServicePicker(true);
    setExtraApplicants([]);
    setQuestionIndex(0);
    setActiveQuestions([]);
    setAnswers({});
    setDocuments(emptyDocStatus());
    setSupportUploads({});
    setSupportNotes("");
    setAddOns([]);
    setAuditOutcome(null);
    setAuditSubmitted(false);
    setReviewRound(0);
    setProcessingStep(0);
    setApplicationId(null);
    setReferenceNumber(null);
    setMessageRequestedDocIds([]);
    setGeneratedChecklist([]);
    setChecklistGenerationError(null);
    setLastChecklistAnswers(null);
    setAuditId(null);
    setBannerMessage("Start a new application and follow the full checklist flow.");
  };

  if (postPaymentRedirecting) {
    return (
      <PageLoader
        title="Confirming your payment…"
        subtitle="Taking you to your dashboard."
      />
    );
  }

  if (!loaded || (resumeReference && !resumeHydrated)) {
    return (
      <PageLoader
        title={resumeReference ? "Opening your application…" : "Loading application…"}
        subtitle={
          resumeReference
            ? `Reference ${resumeReference}`
            : "Setting up your checklist and next steps."
        }
      />
    );
  }

  if (resumeReference && applicationStartError) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pb-10 sm:px-6">
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-rose-700">Could not open application</h2>
          <p className="mt-2 text-sm text-slate-600">{applicationStartError}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Always show full journey catalog (all categories). Live API may only return OCI —
  // merge missing passport / apostille / OCI variants from fallback so Start Order never
  // collapses to the service the user clicked on the dashboard.
  const BASELINE_ORDER_SERVICES: Array<{
    id: string;
    journeyId: string;
    name: string;
    description: string;
    price: string;
    feeNumber: number | null;
    category: string;
    categoryName: string;
  }> = [
    {
      id: "new_oci",
      journeyId: "new-oci",
      name: "New OCI Card",
      description: "First-time OCI application support",
      price: "£88",
      feeNumber: serviceFeeMap["new-oci"],
      category: "oci",
      categoryName: "OCI",
    },
    {
      id: "oci_renewal",
      journeyId: "oci-renewal",
      name: "OCI Renewal / Transfer",
      description: "Passport change and renewal checks",
      price: "£78",
      feeNumber: serviceFeeMap["oci-renewal"],
      category: "oci",
      categoryName: "OCI",
    },
    {
      id: "oci_update",
      journeyId: "oci-update",
      name: "OCI Update (Gratis)",
      description: "Mandatory update and portal handling",
      price: "£50",
      feeNumber: serviceFeeMap["oci-update"],
      category: "oci",
      categoryName: "OCI",
    },
    {
      id: "passport_renewal",
      journeyId: "passport-renewal",
      name: "Indian Passport Renewal",
      description: "Renewal support for UK or US residents",
      price: (() => {
        const row = catalogServices.find(
          (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === "passport_renewal",
        );
        if (row && typeof row.totalFee === "number" && row.totalFee > 0) {
          return formatGbp(row.totalFee);
        }
        if (typeof serviceFeeMap["passport-renewal"] === "number" && serviceFeeMap["passport-renewal"] > 0) {
          return formatGbp(serviceFeeMap["passport-renewal"]);
        }
        return "See fee at checkout";
      })(),
      feeNumber: (() => {
        const row = catalogServices.find(
          (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === "passport_renewal",
        );
        if (row && typeof row.totalFee === "number" && row.totalFee > 0) return row.totalFee;
        return serviceFeeMap["passport-renewal"];
      })(),
      category: "passport",
      categoryName: "Passport",
    },
    {
      id: "apostille",
      journeyId: "apostille",
      name: "Apostille Services",
      description: "Document apostille / legalization support",
      price: (() => {
        const row = catalogServices.find(
          (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === "apostille",
        );
        if (row && typeof row.totalFee === "number" && row.totalFee > 0) {
          return formatGbp(row.totalFee);
        }
        if (typeof serviceFeeMap.apostille === "number" && serviceFeeMap.apostille > 0) {
          return formatGbp(serviceFeeMap.apostille);
        }
        return "See fee at checkout";
      })(),
      feeNumber: (() => {
        const row = catalogServices.find(
          (item) => String(item.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === "apostille",
        );
        if (row && typeof row.totalFee === "number" && row.totalFee > 0) return row.totalFee;
        return serviceFeeMap.apostille;
      })(),
      category: "apostille",
      categoryName: "Apostille",
    },
  ];

  const journeyCatalogServices = catalogServices.filter((row) => {
    // Assessment is an OCI add-on step, not a primary start-order product.
    if (row.serviceType === "document_audit") return false;
    return true;
  });

  const categoryLabelFor = (category: string, categoryName?: string, serviceType?: string) => {
    if (categoryName) return categoryName;
    const key = String(category || "").toLowerCase();
    const type = String(serviceType || "").toLowerCase();
    if (key === "pan_card" || key === "uncategorized" || type === "pan_card") return "PAN CARD SERVICE";
    return (
      (
        {
          oci: "OCI",
          passport: "Indian Passport",
          evisa: "Indian Visa",
          apostille: "Apostille",
          other: "Others",
          uncategorized: "PAN CARD SERVICE",
          pan_card: "PAN CARD SERVICE",
        } as Record<string, string>
      )[key] || "Others"
    );
  };

  const dynamicOrderServices = journeyCatalogServices
    .map((row) => {
      const journeyId = mapCatalogServiceType(row.serviceType);
      const optionId = `svc-${row.id}`;
      const serviceType = String(row.serviceType || "").toLowerCase();
      const categoryKey =
        serviceType === "pan_card"
          ? "pan_card"
          : String(row.category || "other").toLowerCase() || "other";
      return {
        id: optionId,
        catalogId: row.id,
        journeyId: journeyId || String(row.serviceType || "").replace(/_/g, "-"),
        serviceType: String(row.serviceType || "").toLowerCase(),
        name: row.name,
        description: row.description || row.categoryName || "",
        price: priceDisplay(row),
        feeNumber: row.isQuoteBased ? null : row.totalFee,
        category: categoryKey,
        categoryName: categoryLabelFor(categoryKey, row.categoryName, serviceType),
      };
    })
    .filter(
      (
        row,
      ): row is {
        id: string;
        catalogId: number | string;
        journeyId: string;
        serviceType: string;
        name: string;
        description: string;
        price: string;
        feeNumber: number | null;
        category: string;
        categoryName: string;
      } => Boolean(row),
    );

  const liveServiceTypes = new Set(
    journeyCatalogServices.map((row) =>
      String(row.serviceType || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
    ),
  );

  // Prefer live catalog rows (unique per Service.pk). Only keep baseline entries that
  // exist in the live catalog — never offer ghost services that /applications/create/ cannot resolve.
  const byId = new Map<
    string,
    (typeof BASELINE_ORDER_SERVICES)[number] & {
      catalogId?: number | string | null;
      serviceType?: string | null;
    }
  >();
  if (dynamicOrderServices.length > 0) {
    for (const row of dynamicOrderServices) {
      byId.set(row.id, row);
    }
  } else {
    for (const row of BASELINE_ORDER_SERVICES) {
      if (liveServiceTypes.size === 0 || liveServiceTypes.has(row.id)) {
        byId.set(row.id, row);
      }
    }
  }

  // Stable category order: OCI → Indian Passport → Indian Visa → Apostille → Others → PAN CARD
  const categoryRank = (key: string) => {
    const k = key.toLowerCase();
    if (k === "oci") return 0;
    if (k === "passport") return 1;
    if (k === "evisa") return 2;
    if (k === "apostille") return 3;
    if (k === "other" || k === "others") return 4;
    if (k === "pan_card" || k === "uncategorized") return 5;
    return 9;
  };

  const orderServices = Array.from(byId.values()).sort((a, b) => {
    const cr = categoryRank(a.category) - categoryRank(b.category);
    if (cr !== 0) return cr;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {orderCartApps.length > 1 && stage !== "service" ? (
        <div className="rounded-2xl border border-[#c7dbf5] bg-[#f3f8ff] px-4 py-3">
          <p className="text-sm font-semibold text-[#0B69B7]">
            Multi-application order · {orderCartApps.filter((app) => app.docsComplete).length}/
            {orderCartApps.length} document packs complete
            {cartUsesSequentialPayments ? " · separate payments" : " · one combined payment"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {orderCartApps.map((app, index) => {
              const active = index === orderCartIndex && stage !== "full-payment" && stage !== "processing";
              return (
                <button
                  key={app.referenceNumber}
                  type="button"
                  disabled={apiLoading}
                  onClick={() => {
                    if (index === orderCartIndex && stage !== "full-payment") return;
                    void activateOrderCartApp(orderCartApps, index);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    app.docsComplete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : active
                        ? "border-[#1A56DB] bg-[#1A56DB] text-white"
                        : "border-[#D7E4F4] bg-white text-[#627D98] hover:border-[#1A56DB]"
                  }`}
                >
                  {index + 1}. {app.applicantName || "Applicant"} · {labelForService(app.service)}
                  {app.docsComplete ? " ✓" : ""}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-[#627D98]">
            {cartUsesSequentialPayments
              ? "Mixed order: services with assessment and without are paid separately. Complete payment (and assessment if required) for each application, then upload its documents before moving to the next."
              : "Pay once for the order first, then complete the smart questionnaire and document upload for each applicant × service. Files from one application are not reused on the next."}
          </p>
        </div>
      ) : null}

      {stage === "service" ? null : bannerMessage ? (
        <p className="text-sm text-slate-600">{bannerMessage}</p>
      ) : null}

      {customerMessages.length > 0 ? (
        <div className="rounded-3xl border border-[#dce7f8] bg-[#f5f9ff] p-6 shadow-sm">
          <h3 className="text-xl font-heading font-bold text-primary mb-4">Messages</h3>
          <div className="space-y-3">
            {customerMessages.map((msg, idx) => (
              <div key={`${msg.created_at || "message"}-${idx}`} className="rounded-2xl border border-[#d9e8ff] bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">{msg.subject || "Message from FlyOCI Team"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {msg.created_at ? new Date(msg.created_at).toLocaleString() : "Recently"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${msg.sender === "customer" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {msg.sender === "customer" ? "You" : "FlyOCI Team"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}


{stage === "service" && !resumeReference && (
  <StartOrderPanel
    services={[
      ...orderServices,
      ...(selectedService === "undecided"
        ? [
            {
              id: "undecided",
              name: "Not sure — help me decide",
              description: "Short questionnaire to recommend a route",
              price: "—",
              feeNumber: null,
            },
          ]
        : []),
    ]}
    selectedServiceId={selectedService || serviceTypeProp || null}
    showAllServicesInitially={showServicePicker && !selectedService}
    showExistingApplications={!startFresh}
    primaryApplicant={primaryApplicant}
    extraApplicants={extraApplicants}
    accountEmail={userEmail || user?.email || ""}
    apiLoading={apiLoading || pricingLoading}
    error={applicationStartError}
    onPrimaryChange={(patch) => setPrimaryApplicant((current) => ({ ...current, ...patch }))}
    onAddApplicant={() => {
      setExtraApplicants((prev) => [
        ...prev,
        {
          id: `applicant-${Date.now()}-${prev.length + 2}`,
          fullName: "",
          email: "",
          mobile: "",
          applyingFrom: primaryApplicant.applyingFrom || "United Kingdom",
          emailVerified: false,
          emailVerificationToken: "",
        },
      ]);
    }}
    onUpdateApplicant={(id, patch) => {
      setExtraApplicants((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    }}
    onRemoveApplicant={(id) => {
      setExtraApplicants((prev) => prev.filter((row) => row.id !== id));
    }}
    onSelectService={(serviceId) => {
      const fromCatalog = orderServices.find((row) => row.id === serviceId);
      // Prefer the live catalog service_type so variants like oci_through_spouse
      // stay distinct from new_oci (do not collapse via journeyId aliases).
      const catalogType = (fromCatalog as { serviceType?: string | null } | undefined)?.serviceType;
      const mapped =
        mapCatalogServiceType(catalogType) ||
        mapCatalogServiceType(serviceId) ||
        mapCatalogServiceType(fromCatalog?.journeyId) ||
        (fromCatalog?.journeyId as ServiceId | undefined) ||
        mapBackendServiceType(serviceId);
      const normalized = (mapped || serviceId) as ServiceId;
      // Order panel only tracks selection — do not load questions here (avoids update loops).
      // Questions load when the cart continues / an app is activated.
      if (selectedService !== normalized) {
        setSelectedService(normalized);
      }
    }}
    onContinue={(cart) => {
      if (!primaryApplicant.fullName.trim() || !primaryApplicant.email.trim()) {
        toast.error("Please enter applicant name and email.");
        return;
      }
      const incompleteExtra = extraApplicants.find(
        (row) => !row.fullName.trim() || !row.email.trim(),
      );
      if (incompleteExtra) {
        toast.error("Please complete name and email for each added applicant — or remove them.");
        return;
      }
      const emptyServices = cart.find((entry) => !entry.serviceIds.length);
      if (emptyServices) {
        toast.error("Each applicant needs at least one service selected.");
        return;
      }
      // One application per applicant × service; walk Q&A + docs per app, pay once at end.
      void handleOrderCartContinue(cart);
    }}
  />
)}
      {stage === "questions" && activeQuestions.length > 0 && (
        <div className="px-4 pb-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[820px] rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A56DB]">
                {orderCartApps.length > 1
                  ? `Applicant ${orderCartIndex + 1} of ${orderCartApps.length}`
                  : "Selected service"}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#0F1F3D]">
                {orderCartApps.length > 1
                  ? `${orderCartApps[orderCartIndex]?.applicantName || "Applicant"} — ${labelForService(selectedService ?? "undecided")}`
                  : labelForService(selectedService ?? "undecided")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStage("service")}
              disabled={orderCartApps.length > 1}
              className="rounded-lg border border-[#D0D7E2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#486581] hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {orderCartApps.length > 1 ? "Order in progress" : "Change service"}
            </button>
          </div>
          <InlineSmartQuestions
            questions={activeQuestions.map((q) => ({
              id: q.id,
              label: q.label,
              options: q.options || [],
              question_type: q.question_type,
              help_text: q.help_text,
              is_required: q.is_required !== false,
              depends_on_code: q.depends_on_code,
              options_by_answer: q.options_by_answer,
            }))}
            answers={answers}
            disabled={apiLoading}
            onChange={(code, value) => {
              setAnswers((prev) => {
                const next = { ...prev, [code]: value };
                // Changing country clears its paired state answer.
                if (code.endsWith("_state")) return next;
                const matched = activeQuestions.find((q) => q.id === code);
                if (matched && String(matched.question_type || "").toLowerCase() === "country") {
                  next[countryStateAnswerKey(code)] = "";
                }
                return clearDependentAnswers(activeQuestions, code, next);
              });
            }}
          />
          <div className="mt-4 flex justify-end border-t border-[#E8EEF6] pt-4">
            <Button
              isLoading={apiLoading}
              className="w-full sm:w-auto"
              onClick={() => {
                void (async () => {
                  const visible = activeQuestions.filter((q) => isQuestionVisible(q, answers));
                  for (const q of visible) {
                    if (q.is_required === false) continue;
                    if (!(answers[q.id] || "").trim()) {
                      toast.error("Please answer all quick questions.");
                      return;
                    }
                    if (String(q.question_type || "").toLowerCase() !== "country") continue;
                    const states = await fetchStatesForCountry(answers[q.id] || "");
                    if (states.length > 0 && !(answers[countryStateAnswerKey(q.id)] || "").trim()) {
                      toast.error("Please select a state / region.");
                      return;
                    }
                  }
                  void completeQuestionnaire(answers);
                })();
              }}
            >
              Continue to checklist
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          </div>
        </div>
      )}

      {stage === "checklist" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Your Required Documents</h3>
          <p className="mt-2 text-textMuted">
            Based on your answers, we generated a personalised checklist for {selectedServiceRecord ? selectedServiceRecord.name : "your selected service"}. Upload the required documents below after payment.
          </p>
          {reuploadOnlyFlagged ? (
            
            <p className="mt-2 text-sm text-amber-700">
              Showing only auditor-flagged documents for correction and re-upload. {}
            </p>
          ) : null}
          {messageRequestedDocIds.length > 0 ? (
            <p className="mt-2 text-sm text-primary">
              Showing only the document requested by the FlyOCI team from your message thread.
            </p>
          ) : null}

          {([
            {
              key: "required" as const,
              docs: requiredDocs,
              heading: null as string | null,
              subtitle: null as string | null,
            },
            {
              key: "optional" as const,
              docs: optionalDocs,
              heading: "Optional supporting documents",
              subtitle: "From your checklist. These do not block continuing once required documents are uploaded.",
            },
          ] as const).map((section) => {
            if (section.docs.length === 0) return null;
            return (
              <div
                key={section.key}
                className={
                  section.key === "optional"
                    ? "mt-8 rounded-2xl border border-dashed border-border bg-white p-5"
                    : "mt-6"
                }
              >
                {section.heading ? (
                  <>
                    <h4 className="text-lg font-heading font-semibold text-primary">{section.heading}</h4>
                    {section.subtitle ? <p className="mt-1 text-sm text-textMuted">{section.subtitle}</p> : null}
                  </>
                ) : null}
                <div className={section.key === "optional" ? "mt-4 grid gap-4" : "grid gap-4"}>
                  {section.docs.map((doc) => {
              const normalizedDocId = normalizeChecklistKey(doc.id);
              const flaggedMatch = flaggedDocumentsLookup.get(normalizedDocId);
              const applicationStatus = String(applicationRecord?.application_status || "").trim().toLowerCase();
              const isSubmittedUnderReview = Boolean(flaggedMatch && applicationStatus === "reuploaded_pending_review");
              const isAdminCorrectionRequested = applicationStatus === "correction_requested";
              const uploadedFileName = documents[doc.id]?.fileName || "";
              const flaggedUploaded =
                Boolean(flaggedMatch?.reuploaded) ||
                String(flaggedMatch?.status || "").toLowerCase() === "reuploaded" ||
                Boolean(flaggedReuploads[doc.id]);
              const isUploaded = isDocUploaded(doc.id) || flaggedUploaded;
              const flaggedDocLabel = flaggedMatch?.document_type || formatDocumentTypeLabel(doc.id) || doc.title;
              const state: DocumentStatus = isUploaded
                ? "uploaded"
                : flaggedMatch
                  ? "pending_reupload"
                  : "not_uploaded";
              const mistakeItems = Array.isArray(doc.commonMistakes) ? doc.commonMistakes : [];
              const specialLabel =
                doc.specialRequirement === "apostille"
                  ? "Apostille required"
                  : doc.specialRequirement === "bilingual"
                  ? "Bilingual cert needed"
                  : doc.specialRequirement === "affidavit"
                  ? "Affidavit needed"
                  : null;
              const isExpanded = Boolean(expandedChecklistDocIds[doc.id]);
              return (
                <div key={doc.id} className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedChecklistDocIds((current) => ({
                          ...current,
                          [doc.id]: !current[doc.id],
                        }))
                      }
                      className="min-w-0 flex-1 text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-primary">{doc.title}</p>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${doc.required ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                              {doc.required ? "Required" : "Optional"}
                            </span>
                            {specialLabel ? (
                              <span className="rounded-full border border-primary/30 bg-bg-blue px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                {specialLabel}
                              </span>
                            ) : null}
                          </div>
                          {!isExpanded ? (
                            <p className="mt-1 text-xs text-slate-500">Tap to view details and upload</p>
                          ) : null}
                        </div>
                        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {(() => {
                      // FLYOCI-FIX: BUG-REUPLOAD-7
                      if (isSubmittedUnderReview) {
                        return (
                          <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Submitted for Review
                          </span>
                        );
                      }

                      if (isAdminCorrectionRequested) {
                        return (
                          <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Re-upload Requested
                          </span>
                        );
                      }

                      return (
                        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${state === "uploaded" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : state === "pending_reupload" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {state === "uploaded" ? "Uploaded - pending admin review" : state === "pending_reupload" ? "Pending re-upload" : "Not uploaded"}
                        </span>
                      );
                    })()}
                  </div>

                  {isExpanded ? (
                    <>
                      <p className="mt-3 text-sm text-slate-600">{doc.description}</p>
                      {flaggedMatch ? (
                        <p className="mt-1 text-xs font-medium text-amber-800">Flagged document: {flaggedDocLabel}</p>
                      ) : null}
                      {flaggedMatch?.document_name && uploadedFileName ? (
                        <p className="mt-0.5 text-xs text-slate-500">Uploaded file: {uploadedFileName}</p>
                      ) : null}
                      {flaggedMatch?.issue_reason ? (
                        <p className="mt-1 text-xs text-amber-800">Issue: {flaggedMatch.issue_reason}</p>
                      ) : null}
                      {flaggedMatch?.required_action ? (
                        <p className="mt-1 text-xs text-amber-800">Action: {flaggedMatch.required_action}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        {doc.sampleUrl ? (
                          <a href={doc.sampleUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View sample</a>
                        ) : null}
                        {doc.sampleUrl ? <span>•</span> : null}
                        <button type="button" onClick={() => setOpenMistakesId(openMistakesId === doc.id ? null : doc.id)} className="text-slate-600 hover:underline">Common mistakes</button>
                      </div>

                  {openMistakesId === doc.id ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {mistakeItems.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {mistakeItems.map((mistake, idx) => (
                            <li key={`${doc.id}-mistake-${idx}`}>{mistake}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No common mistakes listed.</p>
                      )}
                    </div>
                  ) : null}

                  <DocumentUploadControls
                    docState={documents[doc.id]}
                    isUploaded={isUploaded}
                    isSubmittedUnderReview={isSubmittedUnderReview}
                    isUploading={uploadingDocId === doc.id}
                    disabled={false}
                    onFileSelect={(event) => handleDocumentFileInputChange(doc.id, event)}
                    onView={() => {
                      void handleViewDocument(documents[doc.id]);
                    }}
                  />
                  {isSubmittedUnderReview ? null : isAdminCorrectionRequested ? (
                    <p className="mt-2 w-full text-sm text-amber-700">Admin has requested a new correction. Please re-upload.</p>
                  ) : null}
                  {(isSubmittedUnderReview || (isUploaded && flaggedMatch?.status)) ? (
                    <span className="mt-2 block text-sm text-slate-500">
                      Review status: {isSubmittedUnderReview ? "submitted_for_review" : flaggedMatch?.status}
                    </span>
                  ) : null}
                    </>
                  ) : null}
                </div>
              );
            })}
                </div>
              </div>
            );
          })}

          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-5">
            <ConsentCheckboxes
              mode="upload"
              showMinorConsent={
                (() => {
                  const age = answerText(answers, "ageGroup").toLowerCase();
                  return age.includes("child") || age.includes("under 18") || age.includes("under 20");
                })()
              }
              onAcceptanceChange={setUploadConsentsAccepted}
            />
            <div className="mt-4">
              <label className="block text-sm font-semibold text-primary mb-2">Notes to FlyOCI team</label>
              <textarea
                value={supportNotes}
                onChange={(event) => setSupportNotes(event.target.value)}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary/50"
                rows={4}
                placeholder="Add any notes, special requests, or questions here..."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-textMuted">
              {uploadedRequiredDocs.length} of {requiredDocs.length} required documents uploaded
              {missingRequiredDocs.length > 0 ? (
                <span className="block text-xs font-medium text-amber-800 sm:inline sm:before:content-['·'] sm:before:mx-1">
                  Still needed: {missingRequiredDocs.map((doc) => doc.title).join(", ")}
                </span>
              ) : null}
              {optionalDocs.length > 0
                ? ` · ${uploadedDocs.length - uploadedRequiredDocs.length} of ${optionalDocs.length} optional`
                : ""}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Collapse expanded upload panels so the full checklist is visible again.
                  setExpandedChecklistDocIds({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Back to checklist
              </Button>
              <Button
                isLoading={apiLoading || pricingLoading}
                onClick={() => {
                  void (async () => {
                  if (pricingLoading || assessmentEligibilityPending) {
                    toast.error("Loading fees… please wait a moment.");
                    return;
                  }

                  if (!requiredComplete) {
                    const missing = requiredDocs.filter((doc) => !isDocUploaded(doc.id));
                    if (missing[0]?.id) {
                      setExpandedChecklistDocIds((current) => ({ ...current, [missing[0].id]: true }));
                    }
                    toast.error(
                      missing.length
                        ? `Please upload: ${missing.map((doc) => doc.title).join(", ")}`
                        : "Please upload all required documents before continuing.",
                    );
                    return;
                  }
                  if (!uploadConsentsAccepted) {
                    toast.error("Please accept the upload consent before continuing.");
                    return;
                  }
                  if (fullServicePaid) {
                    if (orderCartApps.length > 1) {
                      const advanced = await advanceOrderCartAfterDocs();
                      if (advanced) return;
                    }
                    setStage("processing");
                    setBannerMessage("Documents uploaded. Your application is being processed.");
                    return;
                  }
                  if (
                    assessmentOffered &&
                    assessmentPaidOrSkipped &&
                    !applicationRecord?.audit_skipped
                  ) {
                    setStage("audit-pending");
                    setBannerMessage("Documents uploaded. Awaiting assessment review.");
                    setAuditSubmitted(true);
                    return;
                  }
                  // Payment-first: unpaid users should not reach upload without paying.
                  if (assessmentOffered && !assessmentPaidOrSkipped) {
                    setStage("summary");
                    setBannerMessage("Pay the assessment fee first (or skip), then upload documents.");
                    return;
                  }
                  proceedToFullPayment();
                  })();
                }}
                disabled={pricingLoading || !requiredComplete || !uploadConsentsAccepted}
              >
                {fullServicePaid
                  ? "Submit documents"
                  : assessmentOffered && assessmentPaidOrSkipped && !applicationRecord?.audit_skipped
                    ? "Submit for assessment"
                    : assessmentOffered || assessmentEligibilityPending
                      ? "Continue to assessment payment"
                      : "Continue to payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === "summary" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">{assessmentOffered ? "Assessment Fee Payment" : "Payment"}</h3>
          <p className="mt-2 text-textMuted">
            {assessmentOffered
                ? `Pay the assessment fee first (or skip), then upload your documents. The assessment fee is fully adjusted against your final service fee when you proceed within ${AUDIT_CREDIT_VALIDITY_DAYS} days.`
                : "Pay first, then upload your documents to continue."}
          </p>

          <div className={`mt-6 grid items-stretch gap-4 ${assessmentOffered ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
            {/* 1 — Uploaded documents */}
            {(() => {
              const cardId = "docs" as const;
              const open = assessmentCardExpanded === cardId || assessmentCardHovered === cardId;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setAssessmentCardExpanded(cardId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAssessmentCardExpanded(cardId);
                    }
                  }}
                  onMouseEnter={() => setAssessmentCardHovered(cardId)}
                  onMouseLeave={() => setAssessmentCardHovered(null)}
                  className={`flex h-full min-h-[320px] cursor-pointer flex-col rounded-2xl border bg-[#F7FBFF] p-5 transition-all duration-300 ${
                    open
                      ? "border-[#33A1FD] ring-2 ring-[#33A1FD]/25 shadow-[0_12px_28px_rgba(11,105,183,0.12)]"
                      : "border-[#33A1FD]/35 ring-1 ring-[#33A1FD]/15"
                  }`}
                >
                  <div className="shrink-0">
                    <h4 className="font-semibold text-primary">Uploaded documents</h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {uploadedDocs.length} of {uploadChecklist.length} uploaded
                    </p>
                  </div>
                  <div
                    className={`mt-4 min-h-0 flex-1 transition-all duration-300 ${
                      open ? "max-h-[520px] overflow-y-auto" : "max-h-[150px] overflow-hidden"
                    }`}
                  >
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                      {uploadedDocs.length > 0 ? (
                        uploadedDocs.map((doc) => (
                          <li key={doc.id}>
                            <span className="font-medium text-slate-800">{doc.title}</span>
                            <span className="ml-2 text-[11px] font-semibold text-emerald-700">Uploaded</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-500">No documents uploaded yet.</li>
                      )}
                    </ul>
                  </div>
                  <p className="mt-3 shrink-0 text-[11px] font-medium text-[#0B69B7]">
                    {open ? "Expanded · click another card to switch" : "Hover or click to expand"}
                  </p>
                </div>
              );
            })()}

            {assessmentOffered ? (
              <>
                {/* 2 — Take Assessment */}
                {(() => {
                  const cardId = "take" as const;
                  const open = assessmentCardExpanded === cardId || assessmentCardHovered === cardId;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setAssessmentCardExpanded(cardId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAssessmentCardExpanded(cardId);
                        }
                      }}
                      onMouseEnter={() => setAssessmentCardHovered(cardId)}
                      onMouseLeave={() => setAssessmentCardHovered(null)}
                      className={`flex h-full min-h-[320px] cursor-pointer flex-col rounded-2xl border bg-emerald-50/60 p-5 transition-all duration-300 ${
                        open
                          ? "border-emerald-500 ring-2 ring-emerald-300/70 shadow-[0_12px_28px_rgba(16,185,129,0.12)]"
                          : "border-emerald-300/70 ring-1 ring-emerald-200/80"
                      }`}
                    >
                      <div className="shrink-0">
                        <h4 className="font-semibold text-emerald-950">Take Assessment</h4>
                        <p className="mt-0.5 text-xs text-emerald-800/80">Recommended · fee credited later</p>
                      </div>

                      <div
                        className={`mt-3 min-h-0 flex-1 space-y-3 transition-all duration-300 ${
                          open ? "max-h-[520px] overflow-y-auto" : "max-h-[150px] overflow-hidden"
                        }`}
                      >
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-emerald-950">
                          <li>We catch document mistakes early — most applications have at least one issue.</li>
                          <li>You avoid embassy / VFS rejections and long correction delays later.</li>
                          <li>
                            The £{auditFee} fee is fully credited against your service fee if you proceed within{" "}
                            {AUDIT_CREDIT_VALIDITY_DAYS} days.
                          </li>
                          <li>Safer path — usually no extra cost when you continue with us.</li>
                        </ul>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                          <p className="text-xs font-semibold">Fee breakdown</p>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                            <li>
                              Assessment fee: <strong>£{auditFee}</strong>
                            </li>
                            <li>
                              Credit if you proceed: <strong>-£{auditFee}</strong>
                            </li>
                            <li>
                              Credit validity: <strong>{AUDIT_CREDIT_VALIDITY_DAYS} days from payment</strong>
                            </li>
                            <li>
                              Example: service £{serviceFeeForMath} − assessment £{auditFee} = £
                              {Math.max(serviceFeeForMath - auditFee, 0)} left later
                            </li>
                          </ul>
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <ConsentCheckboxes
                            mode="payment"
                            includeAuditFeeAcknowledgement
                            onAcceptanceChange={setPaymentConsentsAccepted}
                          />
                        </div>
                      </div>

                      <div className="mt-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="w-full"
                          isLoading={apiLoading}
                          onClick={() => void submitAuditPayment()}
                          disabled={!paymentConsentsAccepted}
                        >
                          Pay £{auditFee} & Submit for Assessment
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3 — Skip Assessment */}
                {(() => {
                  const cardId = "skip" as const;
                  const open = assessmentCardExpanded === cardId || assessmentCardHovered === cardId;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setAssessmentCardExpanded(cardId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAssessmentCardExpanded(cardId);
                        }
                      }}
                      onMouseEnter={() => setAssessmentCardHovered(cardId)}
                      onMouseLeave={() => setAssessmentCardHovered(null)}
                      className={`flex h-full min-h-[320px] cursor-pointer flex-col rounded-2xl border bg-rose-50/50 p-5 transition-all duration-300 ${
                        open
                          ? "border-rose-500 ring-2 ring-rose-300/70 shadow-[0_12px_28px_rgba(244,63,94,0.12)]"
                          : "border-rose-300/70 ring-1 ring-rose-200/80"
                      }`}
                    >
                      <div className="shrink-0">
                        <h4 className="font-semibold text-rose-950">Skip Assessment</h4>
                        <p className="mt-0.5 text-xs text-rose-800/80">Not recommended · higher risk</p>
                      </div>

                      <div
                        className={`mt-3 min-h-0 flex-1 space-y-3 transition-all duration-300 ${
                          open ? "max-h-[520px] overflow-y-auto" : "max-h-[150px] overflow-hidden"
                        }`}
                      >
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-rose-950">
                          <li>More than 50% of applications have document issues we normally catch in assessment.</li>
                          <li>Problems found after full payment mean extra correction rounds and delays.</li>
                          <li>
                            You still pay the same overall if you take assessment — the £{auditFee} is
                            credited within {AUDIT_CREDIT_VALIDITY_DAYS} days.
                          </li>
                          <li>Skip only if you accept the risk of rejection or rework after paying the full fee.</li>
                        </ul>

                        <label
                          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-white p-3 text-sm text-slate-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={skipAuditDisclaimerAccepted}
                            onChange={(event) => setSkipAuditDisclaimerAccepted(event.target.checked)}
                          />
                          <span>
                            I understand that skipping assessment can cause delays and extra correction rounds after
                            payment.
                          </span>
                        </label>
                      </div>

                      <div className="mt-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="w-full"
                          variant="outline"
                          isLoading={apiLoading}
                          disabled={!skipAuditDisclaimerAccepted || apiLoading}
                          onClick={() => void skipAuditAndProceedToPayment()}
                        >
                          Skip & Continue to Payment
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
                <h4 className="font-semibold text-primary">Continue</h4>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  <li>Assessment is not required for this service.</li>
                  <li>Continue to payment to confirm and pay.</li>
                </ul>
                <div className="mt-auto pt-4">
                  <Button
                    className="w-full"
                    isLoading={apiLoading}
                    onClick={() => {
                      if (orderCartApps.length > 1) {
                        void proceedToSummary();
                        return;
                      }
                      proceedToFullPayment();
                    }}
                  >
                    {orderCartApps.length > 1 ? "Save & continue order" : "Continue to payment"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button variant="outline" onClick={() => {
              setReuploadOnlyFlagged(false);
              setMessageRequestedDocIds([]);
              setExpandedChecklistDocIds({});
              if (generatedChecklist.length > 0) {
                setStage("checklist");
              } else if (selectedService) {
                void (async () => {
                  const checklist = await resolveDocuments(selectedService, lastChecklistAnswers || answers);
                  setGeneratedChecklist(checklist);
                  setStage("checklist");
                })();
              } else {
                setStage("checklist");
              }
            }}>Back to checklist</Button>
          </div>
        </div>
      )}

      {stage === "audit-pending" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Document Check Pending</h3>
          <p className="mt-2 text-textMuted">Your review is being prepared. Expected review time: within 12–24 working hours.</p>
          <div className="mt-4 rounded-2xl border border-[#dce7f8] bg-bg-page p-5 text-sm text-slate-600">
            <p className="font-semibold text-primary">Status</p>
            <p className="mt-1">New application → Document check pending</p>
            <p className="mt-3">Email confirmation and WhatsApp confirmation will be sent after payment.</p>
            <p className="mt-3 text-xs text-slate-500">
              Your assessment credit is valid for {AUDIT_CREDIT_VALIDITY_DAYS} days from the date of payment when you proceed with an eligible OCI service.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3 text-sm text-textMuted">
            <MessageSquare className="h-4 w-4 text-primary" /> Message centre available for queries.
          </div>
        </div>
      )}

      {stage === "audit-result" && (auditResultData?.status || auditOutcome) && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          {selectedService === "passport-renewal" ? (
            <>
              <h3 className="text-2xl font-heading font-bold text-primary">Correction Requested</h3>
              <p className="mt-2 text-textMuted">Please review the documents that need to be re-uploaded and submit them again.</p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-heading font-bold text-primary">Document Check Result</h3>
              <p className="mt-2 text-textMuted">We emailed and WhatsApped you a link to view this result.</p>
            </>
          )}

          {auditResultLoading ? (
            <div className="mt-5 space-y-4 animate-pulse">
              <div className="h-28 rounded-2xl border border-slate-200 bg-slate-100" />
              <div className="h-24 rounded-2xl border border-slate-200 bg-slate-100" />
              <div className="h-36 rounded-2xl border border-slate-200 bg-slate-100" />
            </div>
          ) : auditResultError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
              <p className="font-semibold">Could not load audit result details.</p>
              <p className="mt-2">{auditResultError}</p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className={`rounded-2xl border p-5 ${auditStatus === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : auditStatus === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
                <h4 className="font-semibold text-lg">{auditStatus === "green" ? "Approved — all good" : auditStatus === "amber" ? "Needs minor fixes" : "Major issues found"}</h4>
                <p className="mt-2 text-sm">
                  {auditStatus === "green"
                    ? "Your documents look correct and you can proceed to full service payment."
                    : auditStatus === "amber"
                      ? "A few documents need small corrections before we can proceed."
                      : "Important documents need to be fixed or replaced before we can proceed."}
                </p>
                <div className="mt-4 text-sm">
                  {auditStatus === "green" && <p>Proceed directly to the full service payment stage.</p>}
                  {auditStatus === "amber" && <p>Upload corrected documents, resubmit for review, or choose add-on services if required.</p>}
                  {auditStatus === "red" && <p>This application is rejected and closed. To continue, start a new application.</p>}
                </div>
              </div>

              {selectedService !== "passport-renewal" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-primary">Auditor Notes</h4>
                  <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {auditNotes || "No auditor notes provided yet."}
                  </p>
                  {auditResultData?.reviewed_at ? (
                    <p className="mt-3 text-xs text-slate-500">Reviewed at: {new Date(auditResultData.reviewed_at).toLocaleString()}</p>
                  ) : null}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="font-semibold text-primary">{selectedService === "passport-renewal" ? "Documents to Re-upload" : "Flagged Documents"}</h4>
                {flaggedItems.length ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    {flaggedItems.map((item) => (
                      <div key={item.key} className={`rounded-xl border px-4 py-3 ${auditStatus === "red" ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{item.documentName}</p>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${auditStatus === "red" ? "border-rose-200 bg-rose-100 text-rose-800" : "border-amber-200 bg-amber-100 text-amber-800"}`}>
                            {item.actionRequired}
                          </span>
                        </div>
                        {item.uploadedFileName && looksLikeFileName(item.uploadedFileName) ? (
                          <p className="mt-1 text-xs text-slate-500">Uploaded file: {item.uploadedFileName}</p>
                        ) : null}
                        <p className="mt-2 text-slate-700">Auditor Note: {item.reason}</p>
                        {(() => {
                          const applicationStatus = String(applicationRecord?.application_status || "").trim().toLowerCase();

                          // FLYOCI-FIX: BUG-REUPLOAD-6
                          if (auditStatus === "red" || applicationStatus === "rejected") {
                            return (
                              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-100 px-3 py-2 text-xs font-medium text-rose-800">
                                Rejected case: uploads are disabled for this application.
                              </div>
                            );
                          }

                          if (applicationStatus === "reuploaded_pending_review") {
                            return (
                              <DocumentUploadControls
                                docState={item.docRecord}
                                isUploaded={item.isUploaded}
                                isSubmittedUnderReview
                                isUploading={false}
                                onFileSelect={() => undefined}
                                onView={() => {
                                  void handleViewDocument(item.docRecord);
                                }}
                              />
                            );
                          }

                          if (applicationStatus === "correction_requested") {
                            return (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-slate-600">Admin has requested a new correction. Please re-upload.</p>
                                {item.canUploadInline ? (
                                  <DocumentUploadControls
                                    docState={item.docRecord}
                                    isUploaded={item.isUploaded}
                                    isSubmittedUnderReview={false}
                                    isUploading={uploadingDocId === item.documentId}
                                    uploadLabel="Upload corrected file"
                                    onFileSelect={(event) => handleDocumentFileInputChange(item.documentId, event)}
                                    onView={() => {
                                      void handleViewDocument(item.docRecord);
                                    }}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReuploadOnlyFlagged(true);
                                      setMessageRequestedDocIds([]);
                                      setStage("checklist");
                                    }}
                                    className="rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-bg-blue"
                                  >
                                    Upload from checklist
                                  </button>
                                )}
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isUploaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                  {item.isUploaded ? "Ready" : "Pending upload"}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-3 space-y-2">
                              {item.canUploadInline ? (
                                <DocumentUploadControls
                                  docState={item.docRecord}
                                  isUploaded={item.isUploaded}
                                  isSubmittedUnderReview={false}
                                  isUploading={uploadingDocId === item.documentId}
                                  uploadLabel="Upload corrected file"
                                  onFileSelect={(event) => handleDocumentFileInputChange(item.documentId, event)}
                                  onView={() => {
                                    void handleViewDocument(item.docRecord);
                                  }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReuploadOnlyFlagged(true);
                                    setMessageRequestedDocIds([]);
                                    setStage("checklist");
                                  }}
                                  className="rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-bg-blue"
                                >
                                  Upload from checklist
                                </button>
                              )}
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isUploaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {item.isUploaded ? "Ready" : "Pending upload"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">No flagged documents.</p>
                )}
              </div>

              {auditTimeline.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-primary">Audit Timeline</h4>
                  <div
                    className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    {auditTimeline.map((entry, index) => (
                      <div key={`timeline-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold text-slate-800">{String(entry.action || "status_update").replaceAll("_", " ")}</p>
                        <p className="mt-0.5 text-slate-600">Actor: {entry.actor || "system"}</p>
                        {entry.timestamp ? (
                          <p className="text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {auditStatus === "amber" && (
            <div className="mt-6 rounded-2xl border border-border bg-bg-page p-5">
              <h4 className="font-semibold text-primary">Optional add-on services</h4>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {ADD_ONS.map((addon) => {
                  const checked = addOns.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => setAddOns((current) => current.includes(addon.id) ? current.filter((item) => item !== addon.id) : [...current, addon.id])}
                      className={`rounded-2xl border p-4 text-left transition-all ${checked ? "border-primary bg-bg-blue" : "border-border bg-white hover:border-primary/40"}`}
                    >
                      <p className="font-semibold text-primary">{addon.label}</p>
                      <p className="mt-1 text-sm text-textMuted">£{addon.fee}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => {
                  setReuploadOnlyFlagged(true);
                  setMessageRequestedDocIds([]);
                  setStage("checklist");
                }}>
                  Upload Missing / Corrected Documents
                </Button>
                {(() => {
                  const applicationStatus = String(applicationRecord?.application_status || "").trim().toLowerCase();

                  // FLYOCI-FIX: BUG-REUPLOAD-8
                  if (applicationStatus === "reuploaded_pending_review") {
                    return (
                      <p className="max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                        Your corrected documents have been submitted. Our team is reviewing them and will update you shortly.
                      </p>
                    );
                  }

                  if (applicationStatus === "correction_requested") {
                    return canResubmitNow ? (
                      <Button isLoading={apiLoading} onClick={() => void resubmitForReview()}>Resubmit for Review</Button>
                    ) : null;
                  }

                  return canResubmitNow ? (
                    <Button isLoading={apiLoading} onClick={() => void resubmitForReview()}>Resubmit for Review</Button>
                  ) : null;
                })()}
              </div>
              {isActionRequired && !allFlaggedUploadsComplete ? (
                <p className="mt-3 text-xs text-amber-800">Attach corrected files for all flagged documents before resubmitting.</p>
              ) : null}
            </div>
          )}

          {auditStatus === "red" && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h4 className="font-semibold text-rose-900">Application Closed</h4>
              <p className="mt-2 text-sm text-rose-800">
                This case is rejected and cannot proceed further. Please contact support or start a new application.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
                <Button onClick={resetJourneyForNewApplication}>Start New Application</Button>
              </div>
            </div>
          )}

          {auditStatus === "green" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                isLoading={apiLoading}
                onClick={() => {
                  proceedToFullPayment();
                }}
              >
                Proceed to Payment
              </Button>
            </div>
          )}
        </div>
      )}

      {stage === "full-payment" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Full Service Payment</h3>
          <p className="mt-2 text-textMuted">
            {assessmentOffered
              ? "After your document check is approved, pay the remaining service amount."
              : "Pay the catalog service fee to confirm and start processing your application."}
          </p>

          {(() => {
            const appServiceType = String(applicationRecord?.service_type || selectedService || "")
              .trim()
              .toLowerCase()
              .replace(/[\s-]+/g, "_");
            const catalogMatch =
              catalogServices.find((row) => String(row.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === appServiceType) ||
              null;
            const checkoutPlans = (catalogMatch?.plans || [])
              .filter((plan) => plan.fee > 0)
              .slice()
              .sort((a, b) => {
                // Standard first; Express last at checkout.
                if (a.planCode === "express") return 1;
                if (b.planCode === "express") return -1;
                if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
                return String(a.label || "").localeCompare(String(b.label || ""));
              });
            const hasExpress = checkoutPlans.some((plan) => plan.planCode === "express");
            const activePlanCode =
              selectedFeePlanCode ||
              checkoutPlans.find((plan) => plan.isDefault)?.planCode ||
              checkoutPlans[0]?.planCode ||
              "standard";
            const expressSelected = activePlanCode === "express";
            // If Express is chosen, only show Express — hide Standard / other plans.
            const visiblePlans = expressSelected
              ? checkoutPlans.filter((plan) => plan.planCode === "express")
              : checkoutPlans;

            return (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-[#fcfdff] p-5">
              <h4 className="font-semibold text-primary">Payment summary</h4>
              {paymentSummaryLoading ? (
                <div className="mt-4 space-y-2 animate-pulse">
                  <div className="h-5 rounded bg-slate-200" />
                  <div className="h-5 rounded bg-slate-200" />
                  <div className="h-5 rounded bg-slate-200" />
                  <div className="h-5 rounded bg-slate-200" />
                </div>
              ) : paymentSummaryError ? (
                <p className="mt-4 text-sm text-rose-700">Unable to load payment details. Please refresh or contact support.</p>
              ) : paymentSummary ? (
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {cartCanCombineFullPayment(orderCartApps) ? (
                    <>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={apiLoading || feePlanUpdating}
                          onClick={() => void applyCartFeePlanToAll("express")}
                          className="rounded-lg border border-[#c2410c]/40 bg-[#fff7ed] px-2.5 py-1.5 text-[11px] font-semibold text-[#c2410c] disabled:opacity-60"
                        >
                          Make all Express
                        </button>
                        <button
                          type="button"
                          disabled={apiLoading || feePlanUpdating}
                          onClick={() => void applyCartFeePlanToAll("standard")}
                          className="rounded-lg border border-[#D0D7E2] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#486581] disabled:opacity-60"
                        >
                          All Standard
                        </button>
                      </div>
                      {orderCartApps.map((app) => {
                        const plans = getCatalogPlansForService(app.service);
                        const expressPlan = plans.find((plan) => plan.planCode === "express");
                        const standardPlan =
                          plans.find((plan) => plan.planCode !== "express" && plan.isDefault) ||
                          plans.find((plan) => plan.planCode !== "express");
                        const activePlan = String(cartFeePlanByRef[app.referenceNumber] || "standard").toLowerCase();
                        const isExpress = activePlan === "express";
                        const amount =
                          paymentSummary.addons.find((addon) => addon.label.includes(app.referenceNumber))?.amount ??
                          null;
                        return (
                          <div
                            key={app.referenceNumber}
                            className="rounded-xl border border-[#E4EAF2] bg-white px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[#0F1F3D]">
                                  {app.applicantName || "Applicant"} — {labelForService(app.service)}
                                  {isExpress ? (
                                    <span className="ml-1.5 text-[11px] font-semibold text-[#c2410c]">· Express</span>
                                  ) : null}
                                </p>
                                <p className="text-[11px] text-[#829AB1]">{app.referenceNumber}</p>
                              </div>
                              <strong className="shrink-0 text-[13px] text-[#0F1F3D]">
                                {amount == null ? "—" : `£${amount.toFixed(2)}`}
                              </strong>
                            </div>
                            {expressPlan ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={apiLoading || feePlanUpdating}
                                  onClick={() =>
                                    void applyCartAppFeePlan(
                                      app.referenceNumber,
                                      standardPlan?.planCode || "standard",
                                    )
                                  }
                                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 ${
                                    !isExpress
                                      ? "border-[#1A56DB] bg-[#EFF6FF] text-[#1A56DB]"
                                      : "border-[#E1E7EF] bg-white text-[#627D98]"
                                  }`}
                                >
                                  Standard{standardPlan ? ` £${standardPlan.fee.toFixed(0)}` : ""}
                                </button>
                                <button
                                  type="button"
                                  disabled={apiLoading || feePlanUpdating}
                                  onClick={() => void applyCartAppFeePlan(app.referenceNumber, "express")}
                                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 ${
                                    isExpress
                                      ? "border-[#c2410c] bg-[#fff7ed] text-[#c2410c]"
                                      : "border-[#E1E7EF] bg-white text-[#627D98]"
                                  }`}
                                >
                                  Express £{expressPlan.fee.toFixed(0)}
                                </button>
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#829AB1]">Express not available for this service.</p>
                            )}
                          </div>
                        );
                      })}
                      <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-primary">
                        <span className="font-semibold">Order total</span>
                        <strong>£{paymentSummary.total_due.toFixed(2)}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between"><span>Service ({paymentSummary.service_label})</span><strong>£{paymentSummary.service_fee.toFixed(2)}</strong></p>
                      {paymentSummary.audit_credit > 0 ? (
                        <>
                          <p className="flex justify-between"><span>Assessment credit</span><strong>- £{paymentSummary.audit_credit.toFixed(2)}</strong></p>
                          <p className="text-xs text-slate-500">
                            Assessment credit applies when you pay within {AUDIT_CREDIT_VALIDITY_DAYS} days of your assessment fee payment.
                          </p>
                        </>
                      ) : null}
                      {paymentSummary.addons.map((addon) => (
                        <p key={addon.label} className="flex justify-between"><span>{addon.label}</span><strong>£{addon.amount.toFixed(2)}</strong></p>
                      ))}
                      <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-primary"><span className="font-semibold">Total due</span><strong>£{paymentSummary.total_due.toFixed(2)}</strong></p>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-primary">Confirm & pay</h4>
              <p className="mt-3 text-sm text-slate-600">On successful payment, your status moves to Service Confirmed – In Process and notifications are sent by email and WhatsApp.</p>
              <div className="mt-5">
                <ConsentCheckboxes mode="payment" onAcceptanceChange={setPaymentConsentsAccepted} />
              </div>

              {cartCanCombineFullPayment(orderCartApps) ? (
                <label className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={cartSkipAssessmentAccepted}
                    onChange={(event) => setCartSkipAssessmentAccepted(event.target.checked)}
                  />
                  <span>
                    I skip individual document assessments for this multi-application order and accept that FlyOCI will proceed with the uploaded documents for all applicants/services in one checkout.
                  </span>
                </label>
              ) : null}

              {!cartCanCombineFullPayment(orderCartApps) && (hasExpress || checkoutPlans.length > 1) ? (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-primary">
                    {expressSelected ? "Express service" : "Processing speed"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expressSelected
                      ? "Express selected — your case will be marked urgent after payment."
                      : "Optional on every service — Express marks your case as urgent priority for our team."}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {visiblePlans.map((plan) => {
                      const selected = activePlanCode === plan.planCode;
                      const isExpress = plan.planCode === "express";
                      return (
                        <button
                          key={plan.planCode}
                          type="button"
                          disabled={apiLoading || feePlanUpdating || paymentSummaryLoading}
                          onClick={() => void applyFeePlanSelection(plan.planCode)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                            selected
                              ? isExpress
                                ? "border-[#c2410c] bg-[#fff7ed] shadow-[0_0_0_1px_#c2410c]"
                                : "border-[#1A56DB] bg-[#EFF6FF] shadow-[0_0_0_1px_#1A56DB]"
                              : "border-[#E1E7EF] bg-white hover:border-[#B8C9DE]"
                          } disabled:opacity-60`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-[#0F1F3D]">
                              {plan.label || (isExpress ? "Express Service" : "Standard")}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[#829AB1]">
                              {isExpress
                                ? "Urgent priority handling after full payment"
                                : "Standard processing fee"}
                            </span>
                          </span>
                          <span className={`shrink-0 text-[14px] font-bold ${isExpress ? "text-[#c2410c]" : "text-[#1A56DB]"}`}>
                            £{plan.fee.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {expressSelected ? (
                    <button
                      type="button"
                      className="mt-2 text-[12px] font-semibold text-[#1A56DB] hover:underline"
                      disabled={apiLoading || feePlanUpdating}
                      onClick={() => {
                        const standard =
                          checkoutPlans.find((plan) => plan.planCode !== "express" && plan.isDefault) ||
                          checkoutPlans.find((plan) => plan.planCode !== "express");
                        if (standard) void applyFeePlanSelection(standard.planCode);
                        else setSelectedFeePlanCode("");
                      }}
                    >
                      Switch to Standard instead
                    </button>
                  ) : hasExpress ? (
                    <button
                      type="button"
                      className="mt-2 text-[12px] font-semibold text-[#c2410c] hover:underline"
                      disabled={apiLoading || feePlanUpdating}
                      onClick={() => void applyFeePlanSelection("express")}
                    >
                      Choose Express instead
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5">
                <Button
                  className="w-full"
                  isLoading={apiLoading || feePlanUpdating}
                  onClick={() => void confirmFullPayment()}
                  disabled={paymentSummaryLoading || !!paymentSummaryError || !paymentSummary || !paymentConsentsAccepted || feePlanUpdating}
                >
                  Pay & Confirm My Application
                  {cartCanCombineFullPayment(orderCartApps)
                    ? " (full order)"
                    : cartUsesSequentialPayments
                      ? ` (${orderCartIndex + 1} of ${orderCartApps.length})`
                      : ""}
                </Button>
              </div>
            </div>
          </div>
            );
          })()}

          <div className="mt-6 flex flex-wrap gap-3">
            {orderCartApps.length > 1 && orderCartApps.some((app) => !app.docsComplete) ? (
              <Button
                variant="outline"
                onClick={() => {
                  const incompleteIndex = orderCartApps.findIndex((app) => !app.docsComplete);
                  const targetIndex = incompleteIndex >= 0 ? incompleteIndex : orderCartIndex;
                  void activateOrderCartApp(orderCartApps, targetIndex);
                }}
              >
                Continue remaining applicants
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  if (orderCartApps.length > 1) {
                    router.push("/dashboard");
                    return;
                  }
                  setStage(assessmentOffered ? "audit-result" : "checklist");
                }}
              >
                {orderCartApps.length > 1
                  ? "Back to dashboard"
                  : assessmentOffered
                    ? "Back to assessment result"
                    : "Back to uploads"}
              </Button>
            )}
          </div>
        </div>
      )}

      {stage === "processing" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          {(() => {
            const rawServiceType = String(applicationRecord?.service_type || "").toLowerCase().replace(/[\s-]+/g, "_");
            const processingEstimate =
              rawServiceType === "new_oci" || rawServiceType === "first_time_oci"
                ? "8-10 weeks"
                : rawServiceType === "oci_renewal"
                  ? "6-8 weeks"
                  : rawServiceType === "oci_update" || rawServiceType === "passport_renewal"
                    ? "4-6 weeks"
                    : "8-10 weeks";

            const notesValue = String(applicationRecord?.notes || "").trim();
            const extractedGovRef = (() => {
              const submittedMatch = notesValue.match(/Govt\s*ref\s*:\s*([^\n]+)/i);
              if (submittedMatch?.[1]) return submittedMatch[1].trim();
              const decisionMatch = notesValue.match(/Decision\s*ref\s*:\s*([^\n]+)/i);
              if (decisionMatch?.[1]) return decisionMatch[1].trim();
              return "";
            })();
            const displaySubmissionDate =
              applicationRecord?.submission_date || applicationRecord?.approval_date || applicationRecord?.completion_date || "";
            const currentStageKey = String(applicationRecord?.current_stage || "").toLowerCase();
            const applicationStatusKey = String(applicationRecord?.application_status || "").toLowerCase();
            const embassySubmitted =
              ["submitted", "decision_received", "closed", "delivered"].includes(currentStageKey) ||
              ["submitted", "approved", "completed", "delivered", "dispatched", "collected"].includes(applicationStatusKey) ||
              Boolean(String(applicationRecord?.submission_date || "").trim()) ||
              Boolean(extractedGovRef);
            const friendlyStatus = (() => {
              if (embassySubmitted) {
                if (
                  ["decision_received", "closed", "delivered"].includes(currentStageKey) ||
                  ["approved", "completed", "delivered", "dispatched", "collected"].includes(applicationStatusKey)
                ) {
                  return "Decision received";
                }
                return "Submitted to embassy / VFS";
              }
              if (["correction_requested", "rejected", "reuploaded_pending_review"].includes(applicationStatusKey)) {
                return "Action needed";
              }
              if (
                ["in_preparation", "docs_received", "paid", "audit_pending"].includes(currentStageKey) ||
                ["under_review", "paid", "processing", "audit_pending"].includes(applicationStatusKey)
              ) {
                return "Under review";
              }
              const raw = applicationRecord?.current_stage || applicationRecord?.application_status || "In progress";
              return String(raw).replaceAll("_", " ");
            })();

            return (
              <>
                <div
                  className={`rounded-2xl border p-5 space-y-2 ${
                    embassySubmitted
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-sky-200 bg-sky-50"
                  }`}
                >
                  <h3
                    className={`text-xl font-heading font-bold ${
                      embassySubmitted ? "text-emerald-800" : "text-sky-900"
                    }`}
                  >
                    {embassySubmitted
                      ? "Your application has been submitted to the embassy / VFS."
                      : "Your application is being prepared by FlyOCI."}
                  </h3>
                  {applicationRecord?.reference_number ? (
                    <p className={`text-sm ${embassySubmitted ? "text-emerald-900" : "text-sky-900"}`}>
                      <span className="font-semibold">Reference:</span> {applicationRecord.reference_number}
                    </p>
                  ) : null}
                  {applicationRecord?.service_name || applicationRecord?.service_type ? (
                    <p className={`text-sm ${embassySubmitted ? "text-emerald-900" : "text-sky-900"}`}>
                      <span className="font-semibold">Service:</span>{" "}
                      {applicationRecord?.service_name || applicationRecord?.service_type}
                    </p>
                  ) : null}
                  {embassySubmitted ? (
                    displaySubmissionDate ? (
                      <p className="text-sm text-emerald-900">
                        <span className="font-semibold">Submitted on:</span>{" "}
                        {new Date(displaySubmissionDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-900">Submission date will be confirmed shortly.</p>
                    )
                  ) : (
                    <p className="text-sm text-sky-900">
                      Our team is reviewing your documents and preparing your file. You will be notified when it is
                      submitted to the embassy / VFS.
                    </p>
                  )}
                  {extractedGovRef ? (
                    <p className={`text-sm ${embassySubmitted ? "text-emerald-900" : "text-sky-900"}`}>
                      <span className="font-semibold">Government reference:</span> {extractedGovRef}
                    </p>
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-textMuted">Current status: {friendlyStatus}</p>

                {selectedService === "passport-renewal" && embassySubmitted && (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm text-blue-900"><span className="font-semibold">Your documents will be received on email</span> once the government completes your application.</p>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-primary">Estimated processing time</h4>
                  <p className="mt-3 text-sm text-slate-600">Estimated processing time: {processingEstimate}</p>
                  <p className="mt-2 text-sm text-slate-600">Processing times are set by the embassy and may vary. FlyOCI will notify you of any updates by email and WhatsApp.</p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-primary">What to expect next</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {embassySubmitted ? (
                      <>
                        <p>The embassy is reviewing your application. No action is needed from you at this stage.</p>
                        <p>If the embassy requires anything additional, FlyOCI will contact you directly and update your portal.</p>
                        <p>Once a decision is received, you will be notified immediately by email and WhatsApp.</p>
                      </>
                    ) : (
                      <>
                        <p>FlyOCI is preparing and reviewing your application. No action is needed from you right now.</p>
                        <p>If anything is missing, we will contact you and update your portal.</p>
                        <p>Once your file is submitted to the embassy / VFS, your status will update automatically.</p>
                      </>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {stage === "completed" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          {(() => {
            const detailsRecord = (applicationRecord || {}) as Record<string, unknown>;
            const decisionDate = String(applicationRecord?.approval_date || applicationRecord?.completion_date || "").trim();
            const hasReference = Boolean(String(applicationRecord?.reference_number || "").trim());
            const hasService = Boolean(String(applicationRecord?.service_name || applicationRecord?.service_type || "").trim());
            const hasDecisionDate = Boolean(decisionDate);
            const hasDecisionRef = Boolean(String(applicationRecord?.notes || "").trim());
            const hasOptionalDetails = hasReference || hasService || hasDecisionDate || hasDecisionRef;

            const approvalUrl = [
              String(detailsRecord["approval_document_url"] || "").trim(),
              String(detailsRecord["final_output_url"] || "").trim(),
              String(detailsRecord["document_url"] || "").trim(),
            ].find((value) => value.length > 0) || "";

            return (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <h3 className="text-2xl font-heading font-bold text-emerald-800">Your application is complete</h3>
                  {hasOptionalDetails ? (
                    <div className="mt-3 space-y-1 text-sm text-emerald-900">
                      {hasReference ? <p><span className="font-semibold">Reference:</span> {applicationRecord?.reference_number}</p> : null}
                      {hasService ? <p><span className="font-semibold">Service:</span> {applicationRecord?.service_name || applicationRecord?.service_type}</p> : null}
                      {hasDecisionDate ? <p><span className="font-semibold">Decision received:</span> {new Date(decisionDate).toLocaleDateString()}</p> : null}
                      {hasDecisionRef ? <p><span className="font-semibold">Decision reference:</span> {applicationRecord?.notes}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-emerald-900">Congratulations - your case has been successfully completed.</p>
                  )}
                </div>

                {selectedService === "passport-renewal" && (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm text-blue-900"><span className="font-semibold">Your renewed passport or passport receipt</span> will be sent to you by email and may also be dispatched to your registered address.</p>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                  {approvalUrl ? (
                    <a
                      href={approvalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center font-heading font-semibold tracking-[0.01em] transition-all duration-300 ease-out rounded-btn bg-btn-primary text-white shadow-btn hover:shadow-btn-hover hover:-translate-y-0.5 px-6 py-3"
                    >
                      Download Approval Letter / OCI Card Details
                    </a>
                  ) : (
                    <div className="rounded-xl border border-[#dce7f8] bg-[#fcfdff] p-4 text-sm text-slate-700">
                      Your OCI card / passport / approval letter will be sent to your registered address or emailed to you directly by FlyOCI. If you have not received anything within 5 working days of this notification, please contact support.
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {!docDeletionLoading && docDeletion ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Document retention</p>
                  <p className="mt-1 text-xs text-textMuted">
                    After your service is complete you can ask us to remove uploaded documents from our servers.
                  </p>
                </div>
                {(() => {
                  const openStatus = docDeletion.open_request?.status;
                  const chip =
                    docDeletion.documents_deleted || openStatus === "executed"
                      ? { label: "Deleted", className: "border-emerald-200 bg-emerald-50 text-emerald-800" }
                      : openStatus === "pending"
                        ? { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-800" }
                        : openStatus === "approved"
                          ? { label: "Approved", className: "border-blue-200 bg-blue-50 text-blue-800" }
                          : openStatus === "rejected" || docDeletion.requests?.[0]?.status === "rejected"
                            ? { label: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" }
                            : null;
                  return chip ? (
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chip.className}`}>
                      {chip.label}
                    </span>
                  ) : null;
                })()}
              </div>

              {docDeletion.documents_deleted || docDeletion.open_request?.status === "executed" ? (
                <p className="mt-3 text-sm text-emerald-900">Documents removed from FlyOCI servers.</p>
              ) : docDeletion.open_request?.status === "pending" ? (
                <p className="mt-3 text-sm text-amber-900">
                  Your deletion request is pending admin review. You will be able to delete documents once it is approved.
                </p>
              ) : docDeletion.open_request?.status === "approved" ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-blue-900">
                    Your request was approved. You can permanently delete your uploaded documents now.
                  </p>
                  <button
                    type="button"
                    disabled={docDeletionBusy}
                    onClick={() => setDocDeleteConfirmOpen(true)}
                    className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    Delete my documents
                  </button>
                </div>
              ) : docDeletion.eligible && !docDeletion.open_request ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={docDeletionReason}
                    onChange={(event) => setDocDeletionReason(event.target.value)}
                    rows={2}
                    placeholder="Optional reason"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={docDeletionBusy}
                    onClick={() => void requestDocumentDeletion()}
                    className="inline-flex items-center rounded-lg bg-btn-primary px-3 py-1.5 text-xs font-semibold text-white shadow-btn transition hover:shadow-btn-hover hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    Request document deletion
                  </button>
                </div>
              ) : docDeletion.requests?.[0]?.status === "rejected" ? (
                <p className="mt-3 text-sm text-rose-900">
                  Your latest deletion request was rejected
                  {docDeletion.requests[0].review_notes ? `: ${docDeletion.requests[0].review_notes}` : "."}
                </p>
              ) : null}

              {docDeletion.requests.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request history</p>
                  <ul className="mt-2 space-y-2">
                    {docDeletion.requests.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600"
                      >
                        <span className="capitalize font-semibold text-slate-800">{row.status}</span>
                        <span>
                          {row.requested_at
                            ? new Date(row.requested_at).toLocaleString()
                            : "—"}
                        </span>
                        {row.reviewed_by_name ? <span>Reviewed by {row.reviewed_by_name}</span> : null}
                        {row.review_notes ? <span className="w-full text-slate-500">{row.review_notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {docDeleteConfirmOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
              onClick={() => {
                if (!docDeletionBusy) setDocDeleteConfirmOpen(false);
              }}
              role="presentation"
            >
              <div
                className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-sm font-semibold text-primary">Delete your documents?</p>
                <p className="mt-2 text-sm text-slate-600">
                  This permanently removes uploaded files for this case from FlyOCI servers. You cannot undo this action.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={docDeletionBusy}
                    onClick={() => setDocDeleteConfirmOpen(false)}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={docDeletionBusy}
                    onClick={() => void confirmExecuteDocumentDeletion()}
                    className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {docDeletionBusy ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Download case summary</p>
              <p className="mt-1 text-xs text-textMuted">Open a compact summary and save it as a PDF.</p>
              <button
                type="button"
                onClick={() => setCaseSummaryOpen(true)}
                className="mt-3 inline-flex items-center rounded-lg bg-btn-primary px-3 py-1.5 text-xs font-semibold text-white shadow-btn transition hover:shadow-btn-hover hover:-translate-y-0.5"
              >
                View case summary
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Book your next service</p>
              <p className="mt-1 text-xs text-textMuted">Start a new OCI, passport or visa application.</p>
              <Link href="/services" className="mt-3 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Book next service</Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Leave a review</p>
              <p className="mt-1 text-xs text-textMuted">A short note and star rating help others decide faster.</p>
              {reviewSubmitted ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Thanks for the review. It has been saved and approved for the homepage.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="mt-3 inline-flex items-center rounded-lg bg-btn-primary px-3 py-1.5 text-xs font-semibold text-white shadow-btn transition hover:shadow-btn-hover hover:-translate-y-0.5"
                >
                  Leave a review
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/document-audit?start=1"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="mr-2 h-4 w-4" /> Start another application
            </Link>
          </div>
          {reviewModalOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
              onClick={() => setReviewModalOpen(false)}
              role="presentation"
            >
              <div
                className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">Leave a review</p>
                    <p className="mt-1 text-xs text-textMuted">This stays compact in a modal so the case summary remains the focus.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Close review form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitReview();
                  }}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Your name</label>
                    <input
                      value={reviewAuthorName}
                      onChange={(event) => setReviewAuthorName(event.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Rating</label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        const active = value <= reviewRating;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReviewRating(value)}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${active ? "border-amber-300 bg-amber-50 text-amber-500" : "border-slate-200 bg-white text-slate-300 hover:text-amber-400"}`}
                            aria-label={`${value} star${value > 1 ? "s" : ""}`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-xs font-semibold text-slate-500">{reviewRating}/5</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Review</label>
                    <textarea
                      value={reviewText}
                      onChange={(event) => setReviewText(event.target.value)}
                      rows={4}
                      placeholder="Tell others about your experience"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button isLoading={reviewSubmitting} type="submit" className="flex-1">
                      Submit review
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setReviewModalOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {caseSummaryOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
              onClick={() => setCaseSummaryOpen(false)}
              role="presentation"
            >
              <div
                className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">Case summary</p>
                    <p className="mt-1 text-xs text-textMuted">Review the final details, then print or save to PDF.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCaseSummaryOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Close case summary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Reference</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.reference_number || referenceNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Service</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.service_name || applicationRecord?.service_type || selectedService || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.current_stage || applicationRecord?.application_status || "Completed"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Finalized date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.submission_date || applicationRecord?.approval_date || applicationRecord?.completion_date || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Decision date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.approval_date || applicationRecord?.completion_date || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Decision reference</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{applicationRecord?.notes || "No decision reference recorded."}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void openPrintableSummary()} className="flex-1">
                    Download PDF
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setCaseSummaryOpen(false)} className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
