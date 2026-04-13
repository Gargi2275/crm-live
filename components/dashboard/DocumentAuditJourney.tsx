"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, MessageSquare, RefreshCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApplicationTracker, ApplicationTrackerStep } from "@/components/dashboard/ApplicationTracker";
import toast from "react-hot-toast";
import {
  authenticatedFetch,
  createApplication,
  createAuditPaymentOrder,
  createFullPaymentOrder,
  getApplicationByReference,
  getApplicationDocuments,
  getAuditStatus,
  resubmitApplicationForReview,
  skipAuditWithDisclaimer,
  startAudit,
  uploadDocument,
  verifyAuditPayment,
  verifyFullPayment,
} from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
type ServiceId = "new-oci" | "oci-renewal" | "oci-update" | "passport-renewal" | "undecided";
type FlowStage = "service" | "questions" | "checklist" | "upload" | "summary" | "audit-pending" | "audit-result" | "full-payment" | "processing" | "completed";
type QuestionId = "journeyType" | "nationality" | "ageGroup" | "maritalStatus" | "nameChanged" | "birthOutsideCore";
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

type ApplicationProgressResponse = {
  current_step: number;
  steps: Array<{
    number: number;
    label: string;
    note: string | null;
    completed: boolean;
    active: boolean;
  }>;
};

type Answers = Record<QuestionId, string>;

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

type DocumentState = {
  status: DocumentStatus;
  fileName?: string;
};

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
  reference_number: string;
  application_status: string;
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
  full_payment_status?: string;
  payment_confirmed?: boolean;
  current_stage?: string;
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
  audit_logs?: Array<{
    action?: string;
    timestamp?: string;
    actor?: string;
    metadata?: Record<string, unknown>;
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

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOpenOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (payload: RazorpaySuccessPayload) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOpenOptions) => { open: () => void };
  }
}

const QUESTION_LIST: Array<{ id: QuestionId; label: string; options: string[] }> = [
  {
    id: "journeyType",
    label: "Is this first time OCI or conversion?",
    options: ["First Time", "I Already Have One / Conversion"],
  },
  {
    id: "nationality",
    label: "Current nationality / previous Indian passport status",
    options: ["British", "American", "Other"],
  },
  {
    id: "ageGroup",
    label: "Age group",
    options: ["Child (under 18)", "Adult (18-60)", "Senior (60+)"],
  },
  {
    id: "maritalStatus",
    label: "Marital status",
    options: ["Single", "Married", "Divorced", "Widowed"],
  },
  {
    id: "nameChanged",
    label: "Any name changes?",
    options: ["Yes", "No"],
  },
  {
    id: "birthOutsideCore",
    label: "Birth outside India / UK / US?",
    options: ["Yes", "No"],
  },
];

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
  { id: "passport-renewal", name: "Indian Passport Renewal", description: "Renewal support for UK or US residents", price: "£85", backendId: 7 },
];

const ADD_ONS = [
  { id: "apostille", label: "Apostille handling", fee: 35 },
  { id: "affidavit", label: "Drafting affidavits", fee: 25 },
  { id: "translation", label: "Translation / bilingual certificates", fee: 40 },
];

const PROCESS_ITEMS = [
  { title: "Documents Audited", description: "Your audit is complete and the case is moving forward." },
  { title: "Form Filling in Progress", description: "FlyOCI is preparing the submission pack." },
  { title: "Submitted to Embassy / VFS", description: "Your application has been sent to the relevant authority." },
  { title: "Under Process", description: "Awaiting official review and further updates." },
  { title: "Decision / Dispatched / Collected", description: "Final outcome, dispatch, or collection status." },
];

const emptyAnswers: Answers = {
  journeyType: "",
  nationality: "",
  ageGroup: "",
  maritalStatus: "",
  nameChanged: "",
  birthOutsideCore: "",
};

const defaultDocuments = (service: ServiceId | null, answers: Answers): DocumentItem[] => {
  const base: DocumentItem[] = [];

  switch (service) {
    case "new-oci":
      base.push(
        { id: "passport", title: "Current Passport Bio Page", description: "Clear scan of the current passport photo page.", required: true, mistakes: "Cut-off edges, glare, or unreadable MRZ.", sample: "Use a clear full-page scan." },
        { id: "proof-origin", title: "Proof of Indian Origin", description: "Birth certificate, old passport or parent proof as applicable.", required: true, mistakes: "Wrong name format or incomplete parent details.", sample: "Match names carefully with passport." },
        { id: "photo", title: "OCI Photo", description: "Recent photo meeting OCI specification.", required: true, mistakes: "Background, size, or head position errors.", sample: "Use a plain light background." },
        { id: "address", title: "UK / US Address Proof", description: "Utility bill, council tax, or residence document.", required: true, mistakes: "Outdated address or unclear issue date.", sample: "Use a recent proof document." },
      );
      break;
    case "oci-renewal":
      base.push(
        { id: "current-passport", title: "Current Passport Bio Page", description: "Passport page with current details.", required: true, mistakes: "Expired scan or cropped details.", sample: "Keep the full page visible." },
        { id: "old-oci", title: "Old OCI Card / Details", description: "Existing OCI card or reference copy.", required: true, mistakes: "Missing OCI number or unreadable reference.", sample: "Upload the clearest card image." },
        { id: "new-passport", title: "New Passport Details", description: "New passport biodata page if passport changed.", required: true, mistakes: "Mixing old and new passport pages.", sample: "Use the newest passport." },
        { id: "photo-renewal", title: "Recent Photo", description: "Current photo according to OCI standards.", required: true, mistakes: "Incorrect crop or background.", sample: "Use a plain background." },
      );
      break;
    case "oci-update":
      base.push(
        { id: "oci-card", title: "OCI Card / Reference", description: "Existing OCI card or file reference.", required: true, mistakes: "Wrong file number or blurry scan.", sample: "Upload the latest OCI record." },
        { id: "updated-passport", title: "Updated Passport", description: "New passport bio page if passport changed.", required: true, mistakes: "Old passport page uploaded by mistake.", sample: "Use the new passport only." },
        { id: "address-update", title: "Address / Status Proof", description: "Residence proof or supporting update document.", required: true, mistakes: "Wrong address date or incomplete proof.", sample: "Use a recent document." },
        { id: "update-photo", title: "Passport Size Photo", description: "Current compliant photo for the update.", required: true, mistakes: "Shadow, tilt, or wrong size.", sample: "Use a simple background." },
      );
      break;
    case "passport-renewal":
      base.push(
        { id: "old-passport", title: "Current Passport", description: "Bio page and any relevant visa pages.", required: true, mistakes: "Missing signature page or old details.", sample: "Upload the full passport copy." },
        { id: "renewal-form", title: "Renewal Form", description: "Completed passport renewal application.", required: true, mistakes: "Unsigned or partially filled form.", sample: "Check all details carefully." },
        { id: "residence-proof", title: "UK / US Residence Proof", description: "Address proof as requested by the renewal route.", required: true, mistakes: "Expired or unclear address document.", sample: "Use a recent bill or statement." },
        { id: "passport-photo", title: "Passport Photo", description: "Recent compliant passport size photo.", required: true, mistakes: "Incorrect size or background.", sample: "Keep it neutral and clear." },
      );
      break;
    default:
      base.push(
        { id: "passport-generic", title: "Passport Bio Page", description: "We will confirm the exact required document set next.", required: true, mistakes: "Uploading the wrong document type.", sample: "Start with the main ID page." },
        { id: "photo-generic", title: "Recent Photo", description: "A clear compliant photo for the chosen route.", required: true, mistakes: "Poor background or crop.", sample: "Use a plain light background." },
        { id: "address-generic", title: "Address Proof", description: "Proof of current residence.", required: true, mistakes: "Old address or unreadable scan.", sample: "Use a recent proof." },
      );
  }

  if (answers.nameChanged === "Yes") {
    base.push({ id: "name-affidavit", title: "Affidavit for Name Discrepancy", description: "Required if names differ across your documents.", required: true, mistakes: "Missing sworn declaration or outdated details.", sample: "Include all old and new names." });
  }

  if (answers.birthOutsideCore === "Yes") {
    base.push({ id: "birth-proof", title: "Birth / Parent Proof", description: "Birth proof or parent record, depending on the case.", required: true, mistakes: "Mismatch in names, dates, or country details.", sample: "Use an official certified copy." });
  }

  if (service === "undecided") {
    base.push({ id: "any-existing-id", title: "Any Existing OCI / Visa / Passport Record", description: "We will use this to confirm the best service route.", required: true, mistakes: "Uploading unrelated documents only.", sample: "Upload anything current and relevant." });
  }

  return base;
};

const defaultSupportDocs = [
  { id: "flight", title: "Travel itinerary", description: "Helpful for date-sensitive OCI or passport submissions", status: "optional" },
  { id: "extra-address", title: "Extra address proof", description: "Useful if the main address document is weak", status: "optional" },
  { id: "old-copies", title: "Older copies / previous references", description: "Useful for complex OCI renewals", status: "optional" },
];

const serviceFeeMap: Record<ServiceId, number> = {
  "new-oci": 88,
  "oci-renewal": 78,
  "oci-update": 50,
  "passport-renewal": 85,
  undecided: 88,
};

const serviceLabelMap: Record<ServiceId, string> = {
  "new-oci": "New OCI Card",
  "oci-renewal": "OCI Renewal / Transfer",
  "oci-update": "OCI Update (Gratis)",
  "passport-renewal": "Indian Passport Renewal",
  undecided: "Undecided - we will recommend a service",
};

const emptyDocStatus = (): Record<string, DocumentState> => ({});
const OCI_AUDIT_DRAFT_KEY_PREFIX = "flyoci:oci-audit-draft-v2";
const OCI_AUDIT_DRAFT_KEY_LEGACY = "flyoci:oci-audit-draft-v1";
const OCI_DRAFT_ALLOWED_STAGES: FlowStage[] = ["service", "questions", "checklist", "upload", "summary"];
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

type DocumentAuditJourneyProps = {
  userEmail?: string;
  applicationId?: number;
  serviceType?: string;
  resumeReference?: string;
  auditResult?: string;
  amountDuePence?: number;
  auditFeePence?: number;
  showPersistentTracker?: boolean;
  onUnreadCountChange?: (count: number) => void;
};



export function DocumentAuditJourney({ userEmail, applicationId: applicationIdProp, serviceType: serviceTypeProp, resumeReference, auditResult: auditResultProp, amountDuePence: amountDuePenceProp, auditFeePence: auditFeePenceProp, showPersistentTracker = true, onUnreadCountChange }: DocumentAuditJourneyProps) {
  const router = useRouter();
  void userEmail;
  void applicationIdProp;
  void serviceTypeProp;
  void onUnreadCountChange;
  const stageRef = useRef<FlowStage>("service");
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<FlowStage>("service");
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [documents, setDocuments] = useState<Record<string, DocumentState>>(emptyDocStatus);
  const [supportUploads, setSupportUploads] = useState<Record<string, string>>({});
  const [supportNotes, setSupportNotes] = useState("");
  const [openMistakesId, setOpenMistakesId] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [auditOutcome, setAuditOutcome] = useState<AuditOutcome | null>(null);
  const [auditSubmitted, setAuditSubmitted] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [bannerMessage, setBannerMessage] = useState("Start a new document audit and follow the full checklist flow.");
  const [auditId, setAuditId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [applicationRecord, setApplicationRecord] = useState<ApplicationRecord | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
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
  const [skipAuditDisclaimerAccepted, setSkipAuditDisclaimerAccepted] = useState(false);
  const [progressCurrentStep, setProgressCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [progressSteps, setProgressSteps] = useState<ApplicationTrackerStep[]>([
    { number: 1, label: "Documents audited", note: null, completed: false, active: true },
    { number: 2, label: "Form filling in progress", note: null, completed: false, active: false },
    { number: 3, label: "Submitted to Embassy / VFS", note: null, completed: false, active: false },
    { number: 4, label: "Under process", note: null, completed: false, active: false },
    { number: 5, label: "Decision / Dispatched / Collected", note: null, completed: false, active: false },
  ]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [messageRequestedDocIds, setMessageRequestedDocIds] = useState<string[]>([]);
  const [applicationStartError, setApplicationStartError] = useState<string | null>(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const currentQuestion = QUESTION_LIST[questionIndex];
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

  const flaggedDocumentsLookup = useMemo(() => {
    const lookup = new Map<string, {
      document_name?: string;
      issue_reason?: string;
      required_action?: string;
      status?: string;
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
        document_name: String(item?.document_name || item?.doc_name || "").trim(),
        issue_reason: String(item?.issue_reason || item?.issue || item?.finding_description || "").trim(),
        required_action: String(item?.required_action || item?.action_required || "").trim(),
        status: String(item?.status || "").trim(),
      });
    });

    return lookup;
  }, [auditResultData?.flagged_documents, applicationRecord?.flagged_documents]);

  const requiredDocs = uploadChecklist.filter((item) => item.required);
  const requiredComplete = requiredDocs.every((doc) => documents[doc.id]?.status === "uploaded");
  const uploadedDocs = uploadChecklist.filter((doc) => documents[doc.id]?.status === "uploaded");
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
        const statusFromBackend = normalize(item?.status);
        const backendMarkedUploaded = Boolean(item?.reuploaded) || statusFromBackend === "reuploaded";

        return {
          key: `${resolvedDocId || item?.doc_name || item?.document_name || "flag"}-${index}`,
          documentId: resolvedDocId,
          documentName: String(item?.doc_name || item?.document_name || matchedDoc?.title || "Document"),
          reason: String(item?.issue || item?.issue_reason || "Issue details not provided."),
          actionRequired: (item?.action_required || item?.required_action || "re-upload") as "re-upload" | "obtain" | "apostille" | "affidavit",
          canUploadInline: Boolean(resolvedDocId),
          isUploaded: backendMarkedUploaded || (resolvedDocId ? Boolean(flaggedReuploads[resolvedDocId]) : false),
          uploadedFileName: resolvedDocId ? documents[resolvedDocId]?.fileName : "",
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
  const selectedServiceRecord = SERVICES.find((item) => item.id === selectedService) || null;
  const complexityScore = [answers.journeyType, answers.nameChanged, answers.birthOutsideCore].filter((item) => item === "Yes" || item === "I Already Have One / Conversion").length;
  const auditFee = selectedService === "undecided" || complexityScore >= 2 ? 20 : 15;
  const serviceFee = selectedService ? serviceFeeMap[selectedService] : 88;
  const addOnTotal = addOns.reduce((sum, id) => sum + (ADD_ONS.find((item) => item.id === id)?.fee || 0), 0);
  const finalAmount = Math.max(serviceFee - auditFee + addOnTotal, 0);
  const questionProgress = ((questionIndex + 1) / QUESTION_LIST.length) * 100;
  const shouldShowPersistentTracker =
    showPersistentTracker && !["service", "questions", "checklist", "upload", "summary"].includes(stage);

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
    const isResumingExistingCase = Boolean(resumeReference);

    if (applicationStatus === "rejected" || auditResult === "red") {
      return "audit-result";
    }

    if (["registered", "draft"].includes(currentStage) || ["draft", "registered"].includes(applicationStatus)) {
      return isResumingExistingCase ? "checklist" : "service";
    }

    if (fullPaymentStatus === "paid" || record.payment_confirmed || applicationStatus === "paid") {
      return "processing";
    }

    if (record.audit_skipped && record.audit_skip_disclaimer_accepted) {
      return "full-payment";
    }

    if (["correction_requested", "reuploaded_pending_review"].includes(applicationStatus)) {
      return "audit-result";
    }

    if (["payment_pending"].includes(applicationStatus)) {
      return "full-payment";
    }

    if (["green", "amber", "red"].includes(auditResult)) {
      return "audit-result";
    }

    if (record.audit_fee_paid || auditPaymentStatus === "paid") {
      return "audit-pending";
    }

    if (["under_review", "submitted", "audit_pending", "approved"].includes(applicationStatus)) {
      return "audit-pending";
    }

    return null;
  };

  const syncApplicationFromBackend = async (referenceHint?: string | null): Promise<ApplicationRecord> => {
    const refNum = referenceHint && referenceHint.trim()
      ? referenceHint.trim()
      : requireReferenceNumber();

    const response = await getApplicationByReference(refNum);
    const backendApplicationId = Number(response.id || 0);

    if (!Number.isFinite(backendApplicationId) || backendApplicationId <= 0) {
      throw new Error("Invalid application returned by backend.");
    }

    const nextRecord: ApplicationRecord = {
      id: backendApplicationId,
      reference_number: response.reference_number || refNum,
      application_status: response.application_status || "draft",
      service_type: response.service_type,
      service_name: response.service_name,
      audit_fee_pence: response.audit_fee_pence,
      audit_fee_paid: response.audit_fee_paid,
      audit_payment_status: response.audit_payment_status,
      audit_skipped: (response as any).audit_skipped,
      audit_skip_disclaimer_accepted: (response as any).audit_skip_disclaimer_accepted,
      audit_result: response.audit_result,
      audit_credit_pence: response.audit_credit_pence,
      amount_due_pence: response.amount_due_pence,
      service_total_pence: response.service_total_pence,
      full_payment_status: response.full_payment_status,
      payment_confirmed: response.payment_confirmed,
      current_stage: response.current_stage,
      updated_at: response.updated_at,
      auditor_notes: (response as any).auditor_notes,
      flagged_documents: (response as any).flagged_documents,
      latest_audit_findings: (response as any).latest_audit_findings,
      correction_requested_at: (response as any).correction_requested_at,
      correction_resubmitted_at: (response as any).correction_resubmitted_at,
      audit_logs: (response as any).audit_logs,
    };

    setApplicationRecord(nextRecord);
    setApplicationId(backendApplicationId);
    setReferenceNumber(nextRecord.reference_number);

    const backendStage = deriveStageFromApplication(nextRecord);
    if (backendStage) {
      const progressiveStages = ["checklist", "upload", "summary", "audit-pending", "audit-result", "full-payment", "processing", "completed"];
      const currentStageIsProgressive = progressiveStages.includes(stageRef.current);
      const backendWouldRegress = backendStage === "service" || backendStage === "questions";

      if (!(currentStageIsProgressive && backendWouldRegress)) {
        setStage(backendStage);
      }
    }

    return nextRecord;
  };

  const serviceType = (selectedService || "undecided").replace(/-/g, "_");

  const mapApplicationServiceType = (service: ServiceId): "new-oci" | "oci-renewal" | "oci-update" | "passport-renewal" => {
    if (service === "new-oci") return "new-oci";
    if (service === "oci-renewal") return "oci-renewal";
    if (service === "oci-update") return "oci-update";
    if (service === "passport-renewal") return "passport-renewal";
    return "new-oci";
  };

  const mapBackendServiceType = (value?: string | null): ServiceId | null => {
    if (!value) return null;
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized.startsWith("evisa")) return null;
    if (normalized.includes("passport") && normalized.includes("renewal")) return "passport-renewal";
    if (normalized === "new_oci" || normalized.includes("new_oci")) return "new-oci";
    if (normalized === "oci_renewal" || normalized.includes("oci_renewal") || normalized.includes("transfer")) return "oci-renewal";
    if (normalized === "oci_update" || normalized.includes("oci_update") || normalized.includes("gratis")) return "oci-update";
    if (normalized.includes("first_time_oci")) return "new-oci";
    return null;
  };

const startApplicationIfNeeded = async (
  serviceOverride?: ServiceId | null,
  forceCreate = false
): Promise<number> => {
  if (!forceCreate && applicationRecord?.id) {
    return applicationRecord.id;
  }

  const resolvedService = serviceOverride ?? selectedService;
  if (!resolvedService) {
    throw new Error("Could not start your application. Please try again.");
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
  return refreshedApplication.id || createdApplicationId;
};

  const ensureRazorpayLoaded = async (): Promise<void> => {
    if (typeof window === "undefined") {
      throw new Error("Razorpay is only available in browser.");
    }
    if (window.Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpay = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
      document.body.appendChild(script);
    });
  };

  const openRazorpayCheckout = async (
    options: Omit<RazorpayOpenOptions, "handler">,
    onSuccess: (payload: RazorpaySuccessPayload) => Promise<void>
  ): Promise<void> => {
    await ensureRazorpayLoaded();
    if (!window.Razorpay) {
      throw new Error("Razorpay SDK unavailable.");
    }

    await new Promise<void>((resolve, reject) => {
      const RazorpayCtor = window["Razorpay"];
      if (!RazorpayCtor) {
        reject(new Error("Razorpay SDK unavailable."));
        return;
      }

      const instance = new RazorpayCtor({
        ...options,
        handler: async (payload) => {
          try {
            await onSuccess(payload);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled.")),
        },
      });

      instance.open();
    });
  };

const saveState = (_next: Partial<JourneyStorage>) => {
  if (typeof window === "undefined") return;

  const draftKey = getAuditDraftKey(resumeReference || referenceNumber || null);

  if (!OCI_DRAFT_ALLOWED_STAGES.includes(stage)) {
    sessionStorage.removeItem(draftKey);
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

  sessionStorage.setItem(draftKey, JSON.stringify(draft));
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

  try {
    const resumeKey = getAuditDraftKey(resumeReference || null);
    const activeKey = getAuditDraftKey(null);
    const raw = sessionStorage.getItem(resumeReference ? resumeKey : activeKey) ||
      (resumeReference ? sessionStorage.getItem(activeKey) : null) ||
      sessionStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    if (!raw) return;

    if (sessionStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY)) {
      const targetKey = resumeReference ? resumeKey : activeKey;
      sessionStorage.setItem(targetKey, raw);
      sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    }

    const parsed = JSON.parse(raw) as Partial<JourneyDraftStorage>;
    const parsedService = parsed.selectedService;
    const isValidService = parsedService && (Object.prototype.hasOwnProperty.call(serviceLabelMap, parsedService));

    if (isValidService) {
      setSelectedService(parsedService as ServiceId);
      setBannerMessage(`Resuming your ${serviceLabelMap[parsedService as ServiceId]} audit journey.`);
    }

    if (parsed.stage && OCI_DRAFT_ALLOWED_STAGES.includes(parsed.stage)) {
      setStage(parsed.stage);
    }

    if (typeof parsed.questionIndex === "number" && Number.isFinite(parsed.questionIndex)) {
      const boundedIndex = Math.max(0, Math.min(parsed.questionIndex, QUESTION_LIST.length - 1));
      setQuestionIndex(boundedIndex);
    }

    if (parsed.answers && typeof parsed.answers === "object") {
      setAnswers({ ...emptyAnswers, ...parsed.answers });
    }

    if (typeof parsed.supportNotes === "string") {
      setSupportNotes(parsed.supportNotes);
    }

    if (Array.isArray(parsed.addOns)) {
      setAddOns(parsed.addOns.filter((item): item is string => typeof item === "string"));
    }

    if (Array.isArray(parsed.generatedChecklist)) {
      setGeneratedChecklist(parsed.generatedChecklist as DocumentItem[]);
    }

    if (parsed.lastChecklistAnswers && typeof parsed.lastChecklistAnswers === "object") {
      setLastChecklistAnswers({ ...emptyAnswers, ...parsed.lastChecklistAnswers });
    }
  } catch {
    sessionStorage.removeItem(getAuditDraftKey(resumeReference || null));
    sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
  }
}, [resumeReference]);

useEffect(() => {
  if (typeof window === "undefined") return;
  if (!referenceNumber) return;
  if (resumeReference) return;

  const activeKey = getAuditDraftKey(null);
  const referenceKey = getAuditDraftKey(referenceNumber);
  const activeDraft = sessionStorage.getItem(activeKey);
  if (!activeDraft) return;

  sessionStorage.setItem(referenceKey, activeDraft);
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

    let active = true;

    const hydrateFromReference = async () => {
      try {
        setApiLoading(true);
        setApplicationStartError(null);

        const app = await syncApplicationFromBackend(resumeReference);
        if (!active) return;

        const resolvedService =
          mapBackendServiceType(app.service_type) ||
          mapBackendServiceType(app.service_name) ||
          mapBackendServiceType(serviceTypeProp);

        if (resolvedService) {
          setSelectedService(resolvedService);
          setBannerMessage(`Resuming your ${serviceLabelMap[resolvedService]} application.`);
        }

        const backendStage = deriveStageFromApplication(app);
        if (backendStage) {
          setStage(backendStage);
        }
      } catch (error) {
        if (!active) return;
        setApplicationStartError(error instanceof Error ? error.message : "Unable to resume this application.");
      } finally {
        if (active) {
          setApiLoading(false);
          setLoaded(true);
        }
      }
    };

    void hydrateFromReference();

    return () => {
      active = false;
    };
  }, [resumeReference, serviceTypeProp]);


  useEffect(() => {
    if (!loaded) return;
    saveState({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, stage, selectedService, questionIndex, answers, documents, supportNotes, addOns, auditOutcome, auditSubmitted, reviewRound, processingStep, auditId, applicationId]);

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
        if (["green", "amber", "red"].includes(statusValue)) {
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

        const flaggedFromFlaggedDocuments = Array.isArray(app.flagged_documents)
          ? app.flagged_documents.map((item: any) => ({
              doc_id: String(item?.doc_id || item?.document_type || ""),
              doc_name: String(item?.doc_name || item?.document_name || ""),
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
              const resolvedDocName = !genericLabels.has(normalizedName)
                ? rawName
                : matchedChecklistDoc?.title || (normalizedType && normalizedType !== "other" ? denormalizeType(rawType) : "Requested document");

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
                doc_name: String(doc.document_name || labelFromType),
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

    let active = true;
    const loadPaymentSummary = async () => {
      try {
        setPaymentSummaryLoading(true);
        setPaymentSummaryError(null);

        const app = await syncApplicationFromBackend(referenceNumber);

        if (!active) return;

        setPaymentSummary({
          service_label: selectedServiceRecord?.name || "Selected service",
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
  }, [referenceNumber, selectedServiceRecord?.name, stage]);

  useEffect(() => {
    if (!shouldShowPersistentTracker) return;

    let active = true;
    const loadProgress = async () => {
      try {
        setProgressLoading(true);
        setProgressError(null);

        const app = await syncApplicationFromBackend(referenceNumber);
        const stageValue = String(app.current_stage || "registered").toLowerCase();
        const stageToStep: Record<string, 1 | 2 | 3 | 4 | 5> = {
          registered: 1,
          email_confirmed: 1,
          paid: 1,
          docs_received: 1,
          in_preparation: 2,
          submitted: 3,
          decision_received: 4,
          closed: 5,
          correction_requested: 1,
        };
        const nextCurrent = stageToStep[stageValue] || 1;
        const nextSteps: ApplicationTrackerStep[] = [
          { number: 1, label: "Documents audited", note: null, completed: nextCurrent > 1, active: nextCurrent === 1 },
          { number: 2, label: "Form filling in progress", note: null, completed: nextCurrent > 2, active: nextCurrent === 2 },
          { number: 3, label: "Submitted to Embassy / VFS", note: null, completed: nextCurrent > 3, active: nextCurrent === 3 },
          { number: 4, label: "Under process", note: null, completed: nextCurrent > 4, active: nextCurrent === 4 },
          { number: 5, label: "Decision / Dispatched / Collected", note: null, completed: nextCurrent === 5, active: nextCurrent === 5 },
        ];

        if (!active) return;

        setProgressCurrentStep(nextCurrent);
        setProgressSteps(nextSteps);
      } catch (error) {
        if (!active) return;
        setProgressError(error instanceof Error ? error.message : "Failed to load progress tracker.");
      } finally {
        if (active) {
          setProgressLoading(false);
        }
      }
    };

    void loadProgress();
    const intervalId = window.setInterval(() => {
      void loadProgress();
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [referenceNumber, shouldShowPersistentTracker]);

  const updateDocument = (id: string, file?: File | null) => {
    setDocuments((current) => ({
      ...current,
      [id]: file
        ? { status: "uploaded", fileName: file.name }
        : { status: "not_uploaded", fileName: undefined },
    }));
    setBannerMessage("Document status updated.");
  };

  const handleDocumentUpload = async (id: string, file?: File | null) => {
    if (!file) {
      updateDocument(id, null);
      return;
    }

    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);

    const correctionLoopStatus = String(app?.application_status || applicationRecord?.application_status || "").toLowerCase();
    const isCorrectionLoop = ["correction_requested", "reuploaded_pending_review"].includes(correctionLoopStatus) || stage === "audit-result";
    if (!auditId && !isCorrectionLoop) {
      toast.error("Start audit first by completing questionnaire.");
      return;
    }

    const checklistItemId = checklistItemIdByDocId[id] ?? id;

    try {
      setApiLoading(true);
      setUploadingDocId(id);
      const inferredDocumentType = (() => {
        const normalizedId = String(id || "").trim().toLowerCase();
        if (!normalizedId) return "";
        const candidateType = normalizedId.startsWith("required-") ? normalizedId.slice("required-".length) : normalizedId;
        return VALID_AUDIT_DOCUMENT_TYPES.has(candidateType) ? candidateType : "";
      })();

      const resolvedReferenceNumber = app?.reference_number || referenceNumber || applicationRecord?.reference_number || "";
      if (!resolvedReferenceNumber.trim()) {
        toast.error("Application reference not found.");
        return;
      }

      const effectiveAuditId = Number(auditId || app?.id || applicationRecord?.id || 0);

      await uploadDocument(
        effectiveAuditId,
        checklistItemId as string,
        file,
        resolvedReferenceNumber,
        inferredDocumentType
      );
      // FLYOCI-FIX: BUG-REUPLOAD-5
      await syncApplicationFromBackend(referenceNumber);
      updateDocument(id, file);
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
    setAnswers(emptyAnswers);
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
    setBannerMessage(service === "undecided" ? "We will help you decide the best route." : `Great. You selected ${serviceLabelMap[service]}.`);
  };

 const handleServiceSelection = async (service: ServiceId) => {
  setApplicationStartError(null);
  resetFromService(service); // clears localStorage first

  try {
    setApiLoading(true);
    // forceCreate=true so we never accidentally resume a stale application
    const applicationIdValue = await startApplicationIfNeeded(service, true);
    setApplicationId(applicationIdValue);
    setStage("questions");
  } catch {
    setApplicationStartError("Could not start your application. Please try again.");
  } finally {
    setApiLoading(false);
  }
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

  const applyChecklistFromAudit = (items: AuditChecklistItem[]) => {
    const normalizedChecklist: DocumentItem[] = items.map((item, index) => {
      const docId = String(item.doc_id || item.id || item.checklist_item_id || item.item_id || `doc-${index + 1}`);
      const title = String(item.document_name || item.title || item.document_type || `Document ${index + 1}`);
      const commonMistakes = Array.isArray(item.common_mistakes)
        ? item.common_mistakes
        : item.common_mistakes
          ? [String(item.common_mistakes)]
          : [];

      return {
        id: docId,
        title,
        description: String(item.description || ""),
        required: item.required !== false,
        mistakes: commonMistakes.join(" "),
        sample: "",
        sampleUrl: item.sample_url || null,
        commonMistakes,
        specialRequirement: item.special_requirement || null,
      };
    });

    const nextMap: Record<string, string | number> = {};
    for (const item of normalizedChecklist) {
      nextMap[item.id] = item.id;
    }

    setGeneratedChecklist(normalizedChecklist);
    setChecklistItemIdByDocId(nextMap);
    setChecklistGenerationError(null);
  };

  const completeQuestionnaire = async (answerSet: Answers) => {
    const app = await syncApplicationFromBackend(referenceNumber);
    const appId = app.id;
    const refNum = app.reference_number;

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
      applyChecklistFromAudit(Array.isArray(result.checklist_items) ? result.checklist_items : []);
    } else {
      const raw = await getAuditStatus(nextAuditId);
      const result = normalizePayload<{ checklist_items?: AuditChecklistItem[] }>(raw);
      applyChecklistFromAudit(Array.isArray(result.checklist_items) ? result.checklist_items : []);
    }

    setApplicationId(appId);
    setAuditId(nextAuditId);
    setReuploadOnlyFlagged(false);
    setMessageRequestedDocIds([]);
    setStage("checklist");
    setBannerMessage("Your required documents checklist is ready.");
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
    for (let index = questionIndex + 1; index < QUESTION_LIST.length; index += 1) {
      nextAnswers[QUESTION_LIST[index].id] = "";
    }
    setAnswers(nextAnswers);

    if (questionIndex === QUESTION_LIST.length - 1) {
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

 

  const proceedToSummary = () => {
    if (!requiredComplete) return;
    setMessageRequestedDocIds([]);
    setStage("summary");
    setBannerMessage("Review your upload summary and audit fee.");
  };

  const openDocRequestUpload = (docId: string) => {
    if (!docId) return;
    setReuploadOnlyFlagged(false);
    setMessageRequestedDocIds([docId]);
    setStage("checklist");
    setBannerMessage("Upload the requested document from your message thread.");
  };

  const submitAuditPayment = async () => {
    if (!auditId) {
      toast.error("Audit not initialized.");
      return;
    }

    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    try {
      setApiLoading(true);
      const raw = await createAuditPaymentOrder(refNum);
      const order = normalizePayload<{
        order: { id: string; amount: number; currency: string };
        key_id: string;
        amount_pence: number;
      }>(raw);

      await openRazorpayCheckout(
        {
          key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: Number(auditFeePenceProp ?? order.amount_pence ?? order.order?.amount ?? 0),
          currency: order.order?.currency || "GBP",
          order_id: order.order?.id || "",
          name: "FlyOCI",
          description: "Audit Fee Payment",
        },
        async (payment) => {
          await verifyAuditPayment(
            refNum,
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature
          );
        }
      );

      setAuditSubmitted(true);
      setStage("audit-pending");
      setBannerMessage("Audit submitted. Awaiting review.");
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

  const proceedToFullPayment = () => {
    setPaymentSummary(null);
    setPaymentSummaryError(null);
    setMessageRequestedDocIds([]);
    setStage("full-payment");
    setBannerMessage("Proceed to full service payment.");
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
      await skipAuditWithDisclaimer(refNum);
      await syncApplicationFromBackend(refNum);
      setStage("full-payment");
      setBannerMessage("Audit skipped with risk acknowledgement. Full payment is now available.");
      toast.success("Audit skipped. Proceeding to full payment.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to skip audit.");
    } finally {
      setApiLoading(false);
    }
  };

  const confirmFullPayment = async () => {
    if (!paymentSummary || paymentSummaryLoading || paymentSummaryError) {
      toast.error("Unable to load payment details. Please refresh or contact support.");
      return;
    }

    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found for full payment.");
      return;
    }

    try {
      setApiLoading(true);
      const raw = await createFullPaymentOrder(refNum);
      const order = normalizePayload<{
        order?: { id: string; amount: number; currency: string };
        amount_pence?: number;
        currency: string;
        key_id: string;
      }>(raw);

      await openRazorpayCheckout(
        {
          key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: Number(amountDuePenceProp ?? order.amount_pence ?? order.order?.amount ?? 0),
          currency: order.order?.currency || order.currency,
          order_id: order.order?.id || "",
          name: "FlyOCI",
          description: "Full Service Payment",
        },
        async (payment) => {
          await verifyFullPayment(
            refNum,
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature
          );
        }
      );

      router.push(`/dashboard/document-audit?reference=${encodeURIComponent(refNum)}&resume=1&payment=success`);
      // Optionally, you can still update state if you want to keep the in-component state in sync
      setStage("processing");
      setProcessingStep(1);
      setBannerMessage("Service confirmed. Your application is in process.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Full payment failed.");
    } finally {
      setApiLoading(false);
    }
  };

  const advanceProcessing = () => {
    setProcessingStep((current) => Math.min(current + 1, PROCESS_ITEMS.length - 1));
  };

  const completeJourney = () => {
    setProcessingStep(PROCESS_ITEMS.length - 1);
    setStage("completed");
    setBannerMessage("Your application is complete.");
  };

  if (!loaded) {
    return <div className="rounded-3xl border border-border bg-white p-6 text-textMuted shadow-sm">Loading audit journey...</div>;
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Document Audit Journey</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-bold text-primary">Your Required Documents</h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600">{bannerMessage}</p>
          </div>
          <button
            type="button"
           onClick={() => {
  setStage("service");
  setSelectedService(null);
  setQuestionIndex(0);
  setAnswers(emptyAnswers);
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
  setBannerMessage("Start a new document audit and follow the full checklist flow.");
}}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset Journey
          </button>
        </div>
      </div>

      {shouldShowPersistentTracker ? (
        <div className="space-y-3">
          {progressLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading progress tracker...</div>
          ) : null}
          {progressError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{progressError}</div>
          ) : null}
          <ApplicationTracker currentStep={progressCurrentStep} steps={progressSteps} />
        </div>
      ) : null}

    


{stage === "service" && (
  <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
    <h3 className="text-2xl font-heading font-bold text-primary">
      Which service do you need?
    </h3>
    <p className="mt-2 text-textMuted">
      Select one to generate your personalised document checklist.
    </p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {SERVICES.map((service) => {
        const selected = selectedService === service.id;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => {
              void handleServiceSelection(service.id);
            }}
            className={`relative rounded-2xl border p-4 text-left transition-all ${
              selected
                ? "border-2 border-primary bg-bg-blue"
                : "border-border bg-white hover:border-primary/40"
            }`}
          >
            {selected && (
              <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
            )}
            <p className="text-sm font-semibold text-primary">{service.name}</p>
            <p className="mt-1 text-xs text-textMuted">{service.description}</p>
            <p className="mt-3 text-xs font-semibold text-slate-500">{service.price}</p>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          void handleServiceSelection("undecided");
        }}
        className={`rounded-2xl border p-4 text-left transition-all ${
          selectedService === "undecided"
            ? "border-2 border-primary bg-bg-blue"
            : "border-border bg-white hover:border-primary/40"
        }`}
      >
        <HelpCircle className="h-5 w-5 text-primary" />
        <p className="mt-2 text-sm font-semibold text-primary">Not Sure — Help Me Decide</p>
        <p className="mt-1 text-xs text-textMuted">We still run the questionnaire and recommend a route.</p>
      </button>
    </div>
  
   <div className="mt-6">
  <Button isLoading={apiLoading} disabled>
    Select a service to continue
  </Button>
    {applicationStartError ? (
      <p className="mt-3 text-sm text-rose-700">{applicationStartError}</p>
    ) : null}
</div>
    
  </div>
)}
      {stage === "questions" && currentQuestion && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">

          <div className="mb-4 flex items-center gap-2">
      <span className="text-sm font-semibold text-primary">
        {serviceLabelMap[selectedService ?? "undecided"]}
      </span>
      <button
        type="button"
        onClick={() => setStage("service")}
        className="text-xs text-slate-500 underline hover:text-primary"
      >
        Change service
      </button>
    </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-heading font-bold text-primary">Step 2 — Smart Questionnaire</h3>
              <p className="mt-1 text-textMuted">This helps us generate your personalised document checklist.</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-bg-blue px-3 py-1 text-xs font-semibold text-primary">Q{questionIndex + 1} of {QUESTION_LIST.length}</span>
          </div>

          <div className="mb-4 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${questionProgress}%` }} />
          </div>

          <div className="rounded-2xl border border-border bg-bg-page p-5 sm:p-6">
            <h4 className="text-lg sm:text-xl font-heading font-semibold text-primary mb-5">{currentQuestion.label}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const active = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answerQuestion(option)}
                    disabled={apiLoading}
                    className={`rounded-xl border px-4 py-3 text-left font-medium transition-all ${apiLoading ? "opacity-50 cursor-not-allowed" : ""} ${active ? "border-primary bg-bg-blue text-primary" : "border-border bg-white text-slate-700 hover:border-primary/40"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button variant="outline" onClick={goBackQuestion} disabled={apiLoading}>Back</Button>
            {apiLoading && (
              <span className="text-sm text-slate-500 animate-pulse">
                Building your checklist...
              </span>
            )}
          </div>
          {checklistGenerationError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-800">{checklistGenerationError}</p>
              <div className="mt-3">
                <Button onClick={() => void retryChecklistGeneration()} disabled={apiLoading}>Retry Checklist Generation</Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {stage === "checklist" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Your Required Documents</h3>
          <p className="mt-2 text-textMuted">
            Based on your answers, we generated a personalised checklist for {selectedServiceRecord ? selectedServiceRecord.name : "your selected service"}.
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

          <div className="mt-6 grid gap-4">
            {uploadChecklist.map((doc) => {
              const normalizedDocId = doc.id; // Use the raw doc.id (e.g., "photo")
              const flaggedMatch = flaggedDocumentsLookup.get(normalizedDocId);
              const applicationStatus = String(applicationRecord?.application_status || "").trim().toLowerCase();
              const isSubmittedUnderReview = Boolean(flaggedMatch && applicationStatus === "reuploaded_pending_review");
              const isAdminCorrectionRequested = applicationStatus === "correction_requested";
              const uploadedFileName = documents[doc.id]?.fileName || "";
              const isUploaded = Boolean(uploadedFileName);
              const state: DocumentStatus = isUploaded ? "uploaded" : (flaggedMatch ? "pending_reupload" : (documents[doc.id]?.status || "not_uploaded"));
              const mistakeItems = Array.isArray(doc.commonMistakes) ? doc.commonMistakes : [];
              const specialLabel =
                doc.specialRequirement === "apostille"
                  ? "Apostille required"
                  : doc.specialRequirement === "bilingual"
                  ? "Bilingual cert needed"
                  : doc.specialRequirement === "affidavit"
                  ? "Affidavit needed"
                  : null;
              return (
                <div key={doc.id} className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                      <p className="mt-1 text-sm text-slate-600">{doc.description}</p>
                      {flaggedMatch?.document_name ? (
                        <p className="mt-1 text-xs font-medium text-slate-500">Flagged file: {flaggedMatch.document_name}</p>
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
                    </div>
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

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {isSubmittedUnderReview ? (
                      <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {uploadedFileName || "Uploaded"}
                      </div>
                    ) : isUploaded ? (
                      <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {uploadedFileName || "Uploaded"}
                      </div>
                    ) : (
                      <label className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold ${flaggedMatch ? "cursor-pointer border-primary/20 bg-white text-primary hover:bg-bg-blue" : "cursor-pointer border-primary/20 bg-white text-primary hover:bg-bg-blue"}`}>
                        <Upload className="mr-2 h-4 w-4" /> Upload PDF/JPEG/PNG
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(event) => void handleDocumentUpload(doc.id, event.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                    {isSubmittedUnderReview ? null : isAdminCorrectionRequested ? (
                      <p className="w-full text-sm text-amber-700">Admin has requested a new correction. Please re-upload.</p>
                    ) : null}
                    {uploadingDocId === doc.id ? <span className="text-sm text-slate-500">Uploading...</span> : null}
                    {(isSubmittedUnderReview || (isUploaded && flaggedMatch?.status)) ? <span className="text-sm text-slate-500">Review status: {isSubmittedUnderReview ? "submitted_for_review" : flaggedMatch?.status}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-5">
            <h4 className="text-lg font-heading font-semibold text-primary">Optional supporting documents</h4>
            <p className="mt-1 text-sm text-textMuted">Useful for complex cases. These do not block your main audit payment.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {defaultSupportDocs.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-bg-page p-4">
                  <p className="font-semibold text-primary text-sm">{item.title}</p>
                  <p className="mt-1 text-xs text-textMuted">{item.description}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-bg-blue">
                    <Upload className="mr-2 h-3.5 w-3.5" /> Upload
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setSupportUploads((current) => ({
                          ...current,
                          [item.id]: file ? file.name : "",
                        }));
                      }}
                    />
                  </label>
                  {supportUploads[item.id] ? <p className="mt-2 text-[11px] text-slate-500">{supportUploads[item.id]}</p> : null}
                </div>
              ))}
            </div>
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
              {uploadedDocs.length} of {uploadChecklist.length} documents uploaded
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStage("checklist")}>Back to checklist</Button>
              <Button isLoading={apiLoading} onClick={proceedToSummary} disabled={!requiredComplete}>Review & Proceed to Payment</Button>
            </div>
          </div>
        </div>
      )}

      {stage === "summary" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Upload Summary and Audit Fee Payment</h3>
          <p className="mt-2 text-textMuted">We will review your documents and confirm if they are acceptable for submission. Audit fee is fully adjusted in final service fee.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
              <h4 className="font-semibold text-primary">Uploaded documents</h4>
              <div className="mt-4 space-y-3">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <span className="text-slate-700">{doc.title}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Uploaded</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h4 className="font-semibold">Audit fee breakdown</h4>
              <p className="mt-2 text-sm">This is a one-time expert pre-check. If you proceed with FlyOCI, this amount is deducted from your final fee (e.g., New OCI £88 - £15 = £73 to pay later).</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex justify-between"><span>Audit fee</span><strong>£{auditFee}</strong></p>
                <p className="flex justify-between"><span>Credit if you proceed</span><strong>-£{auditFee}</strong></p>
                <p className="flex justify-between border-t border-amber-200 pt-2"><span>Example service fee</span><strong>£{serviceFee}</strong></p>
              </div>
              <label className="mt-5 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" />
                <span>I acknowledge the audit fee and understand it is credited against my final service fee if I proceed.</span>
              </label>

              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <p className="font-semibold">Skip audit? You can, but it is not recommended.</p>
                <p className="mt-1">
                  More than 50% of applications have document issues we catch at audit stage. The £15 audit fee is fully deducted from your
                  service fee if you proceed with us. Are you sure you want to skip?
                </p>
                <label className="mt-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={skipAuditDisclaimerAccepted}
                    onChange={(event) => setSkipAuditDisclaimerAccepted(event.target.checked)}
                  />
                  <span>I understand that skipping audit can cause delays and extra correction rounds after payment.</span>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" isLoading={apiLoading} onClick={() => void submitAuditPayment()}>
                    Take the Audit (Recommended)
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={apiLoading}
                    disabled={!skipAuditDisclaimerAccepted || apiLoading}
                    onClick={() => void skipAuditAndProceedToPayment()}
                  >
                    Skip & Pay Full Fee
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={() => {
              setReuploadOnlyFlagged(false);
              setMessageRequestedDocIds([]);
              setStage("checklist");
            }}>Back to uploads</Button>
            <Button isLoading={apiLoading} onClick={() => void submitAuditPayment()}>Pay £{auditFee} & Submit for Audit</Button>
          </div>
        </div>
      )}

      {stage === "audit-pending" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Audit Pending</h3>
          <p className="mt-2 text-textMuted">Your review is being prepared. Expected review time: within 12–24 working hours.</p>
          <div className="mt-4 rounded-2xl border border-[#dce7f8] bg-bg-page p-5 text-sm text-slate-600">
            <p className="font-semibold text-primary">Status</p>
            <p className="mt-1">New application → Audit Pending</p>
            <p className="mt-3">Email confirmation and WhatsApp confirmation will be sent after payment.</p>
          </div>
          <div className="mt-6 flex items-center gap-3 text-sm text-textMuted">
            <MessageSquare className="h-4 w-4 text-primary" /> Message centre available for queries.
          </div>
        </div>
      )}

      {stage === "audit-result" && (auditResultData?.status || auditOutcome) && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Audit Result</h3>
          <p className="mt-2 text-textMuted">Email + WhatsApp message sent with a link to view your audit result.</p>

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
                <h4 className="font-semibold text-lg">{auditStatus === "green" ? "Green - All Good" : auditStatus === "amber" ? "Amber - Minor Flaws" : "Red - Major Issues"}</h4>
                <p className="mt-2 text-sm">
                  {auditStatus === "green"
                    ? "All your documents are correct and ready to proceed."
                    : auditStatus === "amber"
                      ? "These 1–2 docs need re-upload or additional detail."
                      : "Important documents are missing or not acceptable. These extra steps are needed: apostille, affidavit, translation, or bilingual certificate."}
                </p>
                <div className="mt-4 text-sm">
                  {auditStatus === "green" && <p>Proceed directly to the full service payment stage.</p>}
                  {auditStatus === "amber" && <p>Upload corrected documents, resubmit for review, or choose add-on services if required.</p>}
                  {auditStatus === "red" && <p>This application is rejected and closed. To continue, start a new application.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="font-semibold text-primary">Auditor Notes</h4>
                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {auditNotes || "No auditor notes provided yet."}
                </p>
                {auditResultData?.reviewed_at ? (
                  <p className="mt-3 text-xs text-slate-500">Reviewed at: {new Date(auditResultData.reviewed_at).toLocaleString()}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="font-semibold text-primary">Flagged Documents</h4>
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
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {item.uploadedFileName ? <span className="text-xs text-slate-500">{item.uploadedFileName}</span> : null}
                                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  Submitted — Under Admin Review
                                </span>
                              </div>
                            );
                          }

                          if (applicationStatus === "correction_requested") {
                            return (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-slate-600">Admin has requested a new correction. Please re-upload.</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.canUploadInline ? (
                                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-bg-blue">
                                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload corrected file
                                      <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(event) => void handleDocumentUpload(item.documentId, event.target.files?.[0] || null)}
                                      />
                                    </label>
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
                                  {uploadingDocId === item.documentId ? <span className="text-xs text-slate-500">Uploading...</span> : null}
                                  {item.uploadedFileName ? <span className="text-xs text-slate-500">{item.uploadedFileName}</span> : null}
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isUploaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                    {item.isUploaded ? "Ready" : "Pending upload"}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {item.canUploadInline ? (
                                <label className="inline-flex cursor-pointer items-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-bg-blue">
                                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload corrected file
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(event) => void handleDocumentUpload(item.documentId, event.target.files?.[0] || null)}
                                  />
                                </label>
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
                              {uploadingDocId === item.documentId ? <span className="text-xs text-slate-500">Uploading...</span> : null}
                              {item.uploadedFileName ? <span className="text-xs text-slate-500">{item.uploadedFileName}</span> : null}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isUploaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
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
                <Button onClick={() => router.push("/dashboard/document-audit")}>Start New Application</Button>
              </div>
            </div>
          )}

          {auditStatus === "green" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button isLoading={apiLoading} onClick={async () => {
                setApiLoading(true);
                try {
                  const refNum = requireReferenceNumber();
                  router.push(`/dashboard/payment?reference=${encodeURIComponent(refNum)}`);
                } finally {
                  setApiLoading(false);
                }
              }}>
                Proceed to Full Service Payment
              </Button>
            </div>
          )}
        </div>
      )}

      {stage === "full-payment" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Full Service Payment</h3>
          <p className="mt-2 text-textMuted">Once documents are audit approved, pay the remaining service amount.</p>

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
                  <p className="flex justify-between"><span>Service ({paymentSummary.service_label})</span><strong>£{paymentSummary.service_fee.toFixed(2)}</strong></p>
                  <p className="flex justify-between"><span>Audit credit</span><strong>- £{paymentSummary.audit_credit.toFixed(2)}</strong></p>
                  {paymentSummary.addons.map((addon) => (
                    <p key={addon.label} className="flex justify-between"><span>{addon.label}</span><strong>£{addon.amount.toFixed(2)}</strong></p>
                  ))}
                  <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-primary"><span className="font-semibold">Total due</span><strong>£{paymentSummary.total_due.toFixed(2)}</strong></p>
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-primary">What happens next</h4>
              <p className="mt-3 text-sm text-slate-600">On successful payment, your status moves to Service Confirmed – In Process and notifications are sent by email and WhatsApp.</p>
              <label className="mt-5 flex items-start gap-2 text-sm text-slate-600">
                <input type="checkbox" className="mt-1" />
                <span>I confirm I want FlyOCI to begin processing my application.</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStage("audit-result")}>Back to audit result</Button>
            <Button isLoading={apiLoading} onClick={() => void confirmFullPayment()} disabled={paymentSummaryLoading || !!paymentSummaryError || !paymentSummary}>Pay & Confirm My Application</Button>
          </div>
        </div>
      )}

      {stage === "processing" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Application Processing</h3>
          <p className="mt-2 text-textMuted">Your tracker moves through each processing step, and major updates are shared by email and WhatsApp.</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-primary">Message centre</h4>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-bg-page px-4 py-3">FlyOCI: We are reviewing your application and will notify you of the next step.</div>
                <div className="rounded-xl border border-slate-200 bg-bg-page px-4 py-3">You can upload any extra requested documents directly in the portal, not via WhatsApp.</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-primary">Current stage actions</h4>
              <p className="mt-3 text-sm text-slate-600">If FlyOCI needs anything extra, a request appears here and in your notification channels.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={advanceProcessing}>Advance tracker</Button>
                <Button onClick={completeJourney}>Mark Completed</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "completed" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Completed</h3>
          <p className="mt-2 text-textMuted">OCI approval date, visa details, or passport details can be logged here once the case finishes.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Downloadable summary PDF</p>
              <p className="mt-1 text-xs text-textMuted">Keep a copy of your completed case summary.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Book next service</p>
              <p className="mt-1 text-xs text-textMuted">Start a future visa, OCI, or passport service.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-bg-page p-4">
              <p className="text-sm font-semibold text-primary">Request review</p>
              <p className="mt-1 text-xs text-textMuted">Leave a Google or Trustpilot review.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/services" className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Book next service</Link>
            <Button variant="outline" onClick={() => setStage("service")}><ArrowRight className="mr-2 h-4 w-4" /> Start another audit</Button>
          </div>
        </div>
      )}
    </div>
  );
}
