"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, MessageSquare, RefreshCcw, Star, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApplicationTracker, ApplicationTrackerStep } from "@/components/dashboard/ApplicationTracker";
import toast from "react-hot-toast";
import {
  authenticatedFetch,
  createApplication,
  createAuditPaymentOrder,
  createFullPaymentOrder,
  createPassportRenewalQuoteOrder,
  getApplicationByReference,
  getApplicationDocuments,
  getAuditStatus,
  getPassportRenewalQuoteDetail,
  getPublicTestimonials,
  resubmitApplicationForReview,
  skipAuditWithDisclaimer,
  startAudit,
  submitPassportRenewalRequest,
  submitTestimonial,
  uploadDocument,
  verifyAuditPayment,
  verifyPassportRenewalQuotePayment,
  verifyFullPayment,
} from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
type ServiceId = "new-oci" | "oci-renewal" | "oci-update" | "passport-renewal" | "undecided";
type FlowStage = "service" | "questions" | "checklist" | "upload" | "summary" | "passport-quote-pending" | "audit-pending" | "audit-result" | "full-payment" | "processing" | "completed";
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
  { id: "passport-renewal", name: "Indian Passport Renewal", description: "Renewal support for UK or US residents", price: "Price on request", backendId: 7 },
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
  const dynamicAnswers = answers as Record<string, string>;

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
      {
      const applicantType = answers.ageGroup === "Child (under 18)" ? "MINOR" : String(dynamicAnswers.applicant_type || "ADULT").toUpperCase();
      const nameChanged = answers.nameChanged === "Yes" || String(dynamicAnswers.name_change || "").toUpperCase() === "YES";
      const category = String(dynamicAnswers.category || "").toUpperCase();
      const country =
        answers.nationality === "British"
          ? "UK"
          : answers.nationality === "American"
            ? "US"
            : String(dynamicAnswers.country || "OTHER").toUpperCase();
      const firstRenewal = String(dynamicAnswers.first_renewal || "").toUpperCase();

      base.push(
        { id: "current-passport-all-pages", title: "Current Indian passport (all pages scan)", description: "Why needed: verifies existing identity and stamping history. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Missing pages or blurred scans.", sample: "Upload one clear merged PDF or ordered image set.", sampleUrl: "/document-audit#sample-passport-renewal" },
        { id: "old-expired-passport", title: "Old or expired passport (if any)", description: "Why needed: previous passport linkage for renewal continuity. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: false, mistakes: "Skipping this when an old passport exists.", sample: "Include old booklet bio/signature pages.", sampleUrl: "/document-audit#sample-passport-renewal" },
        { id: "address-proof", title: "Proof of address (UK/US utility bill or bank statement)", description: "Why needed: confirms current residence for jurisdiction checks. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Outdated document or cropped address.", sample: "Use a recent statement with full name and address.", sampleUrl: "/document-audit#sample-passport-renewal" },
        { id: "recent-photo-35x45", title: "Recent passport photograph (white background, 35mm x 45mm)", description: "Why needed: submission photo compliance. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Wrong dimensions or dark background.", sample: "Front-facing image with proper lighting.", sampleUrl: "/document-audit#sample-passport-renewal" },
        { id: "completed-renewal-form", title: "Completed application form", description: "Why needed: official data capture for renewal request. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Unsigned fields and incomplete sections.", sample: "Ensure all mandatory sections are completed.", sampleUrl: "/document-audit#sample-passport-renewal" },
      );

      if (applicantType === "MINOR") {
        base.push(
          { id: "minor-birth-certificate", title: "Birth certificate", description: "Why needed: age and parent linkage for minor renewal. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Unreadable names or dates.", sample: "Certified copy with full details.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "minor-parents-passports", title: "Both parents' passports", description: "Why needed: parental identity verification. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Only one parent passport uploaded.", sample: "Include bio pages for both parents.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "minor-parents-address-proof", title: "Parents' proof of address", description: "Why needed: residency validation for minor application. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Address mismatch with form.", sample: "Recent utility bill or statement.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "minor-consent-single-parent", title: "Consent letter (if single parent)", description: "Why needed: legal consent where one guardian applies. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: false, mistakes: "Unsigned consent declaration.", sample: "Signed letter with supporting proof.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }

      if (nameChanged) {
        base.push(
          { id: "name-change-proof", title: "Name change proof (marriage certificate or deed poll or court order)", description: "Why needed: links old and new names across records. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Document does not match passport name history.", sample: "Upload official name-change proof.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }

      if (category === "TATKAL") {
        base.push(
          { id: "tatkal-fee-proof", title: "Tatkaal fee proof", description: "Why needed: validates Tatkaal processing category. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Missing transaction details.", sample: "Include fee receipt or payment proof.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "tatkal-urgency-proof", title: "Proof of urgency (travel booking, medical etc.)", description: "Why needed: supports Tatkaal urgency claim. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "No date-aligned urgency document.", sample: "Upload travel/medical urgency evidence.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "tatkal-self-declaration", title: "Self declaration for Tatkal", description: "Why needed: applicant declaration for priority process. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Unsigned declaration.", sample: "Signed Tatkaal declaration format.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }

      if (country === "UK") {
        base.push(
          { id: "uk-brp-card", title: "BRP card (if applicable)", description: "Why needed: UK residence evidence when applicable. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: false, mistakes: "Expired BRP without explanation.", sample: "Front and back clear copy.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "uk-visa-settlement", title: "UK visa or settlement proof", description: "Why needed: immigration status verification. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "No visible visa validity details.", sample: "Upload visa vignette/settlement record.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }

      if (country === "US") {
        base.push(
          { id: "us-visa-green-card", title: "US visa or green card copy", description: "Why needed: lawful residence verification in US. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Document edges cropped.", sample: "Upload both sides where applicable.", sampleUrl: "/document-audit#sample-passport-renewal" },
          { id: "us-i94-record", title: "I-94 record (if applicable)", description: "Why needed: entry/status support for US residency. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: false, mistakes: "I-94 mismatch with passport details.", sample: "Download latest I-94 and upload PDF.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }

      if (firstRenewal === "NO") {
        base.push(
          { id: "previous-renewal-receipt", title: "Previous passport renewal receipt", description: "Why needed: evidence of earlier renewal history. Accepted formats: PDF/JPG/PNG. Max size: 5MB.", required: true, mistakes: "Receipt missing identifying details.", sample: "Upload complete receipt image/PDF.", sampleUrl: "/document-audit#sample-passport-renewal" },
        );
      }
      }
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

const serviceFeeMap: Record<ServiceId, number | null> = {
  "new-oci": 88,
  "oci-renewal": 78,
  "oci-update": 50,
  "passport-renewal": null,
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
  focusQuote?: boolean;
  auditResult?: string;
  amountDuePence?: number;
  auditFeePence?: number;
  showPersistentTracker?: boolean;
  onUnreadCountChange?: (count: number) => void;
};



export function DocumentAuditJourney({ userEmail, applicationId: applicationIdProp, serviceType: serviceTypeProp, resumeReference, focusQuote = false, auditResult: auditResultProp, amountDuePence: amountDuePenceProp, auditFeePence: auditFeePenceProp, showPersistentTracker = true, onUnreadCountChange }: DocumentAuditJourneyProps) {
  const router = useRouter();
  void userEmail;
  void applicationIdProp;
  void serviceTypeProp;
  void onUnreadCountChange;
  const stageRef = useRef<FlowStage>("service");
  const quoteCardRef = useRef<HTMLDivElement | null>(null);
  const quoteFocusHandledRef = useRef(false);
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
  const [passportMaskedEmail, setPassportMaskedEmail] = useState<string>("");
  const [passportCaseReference, setPassportCaseReference] = useState<string>("");
  const [passportQuoteAcknowledged, setPassportQuoteAcknowledged] = useState(false);
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
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraftProgress, setHasDraftProgress] = useState(false);
  const [reviewAuthorName, setReviewAuthorName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [caseSummaryOpen, setCaseSummaryOpen] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (stage !== "passport-quote-pending") {
      return;
    }

    const refNum = String(applicationRecord?.reference_number || referenceNumber || "").trim();
    if (!refNum) {
      return;
    }

    let cancelled = false;
    const syncQuoteDetail = async () => {
      try {
        const quote = await getPassportRenewalQuoteDetail(refNum);
        if (cancelled) {
          return;
        }
        setApplicationRecord((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            quote_status: quote.quote_status,
            quote_amount_pence: quote.quote_amount_pence,
            quoted_fee: quote.quoted_fee,
            quote_notes: quote.quote_notes || "",
            quote_set_at: quote.quote_set_at || null,
            quote_expires_at: quote.quote_expires_at || null,
          };
        });
        setPassportCaseReference(String(quote.case_reference || ""));
        setPassportMaskedEmail(String(quote.masked_email || ""));
      } catch {
        // Keep existing record data if quote sync fails transiently.
      }
    };

    void syncQuoteDetail();
    return () => {
      cancelled = true;
    };
  }, [applicationRecord?.reference_number, referenceNumber, stage]);

  useEffect(() => {
    if (!focusQuote || quoteFocusHandledRef.current || stage !== "passport-quote-pending") {
      return;
    }
    const status = String(applicationRecord?.quote_status || "").toUpperCase();
    if (status !== "QUOTED") {
      return;
    }

    const timer = window.setTimeout(() => {
      quoteCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      quoteFocusHandledRef.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [applicationRecord?.quote_status, focusQuote, stage]);

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

    void loadSubmittedReview();

    return () => {
      cancelled = true;
    };
  }, [applicationRecord?.reference_number, referenceNumber, stage]);

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
        const backendDocumentName = String(item?.doc_name || item?.document_name || "").trim();
        const requiredDocumentName = String(matchedDoc?.title || backendDocumentName || "Document");
        const statusFromBackend = normalize(item?.status);
        const backendMarkedUploaded = Boolean(item?.reuploaded) || statusFromBackend === "reuploaded";

        return {
          key: `${resolvedDocId || item?.doc_name || item?.document_name || "flag"}-${index}`,
          documentId: resolvedDocId,
          documentName: requiredDocumentName,
          uploadedDocumentName: backendDocumentName,
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
  const customerMessages = useMemo(() => {
    const directMessages = Array.isArray(applicationRecord?.admin_messages)
      ? applicationRecord.admin_messages
          .map((item) => ({
            created_at: String(item?.created_at || "").trim(),
            subject: String(item?.subject || "FlyOCI update").trim() || "FlyOCI update",
            message: String(item?.message || "").trim(),
          }))
          .filter((item) => item.message)
      : [];

    const fallbackMessages = (applicationRecord?.audit_logs || [])
      .filter((log) => String(log?.action || "").trim().toLowerCase() === "admin_customer_message")
      .map((log) => {
        const metadata = log?.metadata && typeof log.metadata === "object" ? (log.metadata as Record<string, unknown>) : {};
        const message = String(metadata.description || metadata.message || "").trim();
        return {
          created_at: String(log?.timestamp || "").trim(),
          subject: String(metadata.subject || "FlyOCI update").trim() || "FlyOCI update",
          message,
        };
      })
      .filter((item) => item.message);

    const source = directMessages.length > 0 ? directMessages : fallbackMessages;
    return source.slice().sort((a, b) => {
      const aTs = new Date(String(a.created_at || "")).getTime();
      const bTs = new Date(String(b.created_at || "")).getTime();
      return bTs - aTs;
    });
  }, [applicationRecord?.admin_messages, applicationRecord?.audit_logs]);
  const selectedServiceRecord = SERVICES.find((item) => item.id === selectedService) || null;
  const complexityScore = [answers.journeyType, answers.nameChanged, answers.birthOutsideCore].filter((item) => item === "Yes" || item === "I Already Have One / Conversion").length;
  const auditFee = selectedService === "undecided" || complexityScore >= 2 ? 20 : 15;
  const serviceFee = selectedService ? serviceFeeMap[selectedService] : 88;
  const serviceFeeForMath = typeof serviceFee === "number" ? serviceFee : 0;
  const addOnTotal = addOns.reduce((sum, id) => sum + (ADD_ONS.find((item) => item.id === id)?.fee || 0), 0);
  const finalAmount = Math.max(serviceFeeForMath - auditFee + addOnTotal, 0);
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
    const quoteStatus = String(record.quote_status || "").toUpperCase();
    const isResumingExistingCase = Boolean(resumeReference);
    const isPassportService = String(record.service_type || "").toLowerCase().includes("passport");

    // Correction loops must take priority over quote/payment states for passport cases.
    if (["correction_requested", "reuploaded_pending_review"].includes(applicationStatus)) {
      return "audit-result";
    }

    const hasTerminalDate = Boolean(String(record.approval_date || "").trim() || String(record.completion_date || "").trim());
    const isTerminalStage = ["decision_received", "closed", "delivered", "dispatched", "collected"].includes(currentStage);
    const isTerminalStatus = ["approved", "completed", "closed", "delivered", "dispatched", "collected", "decision_received"].includes(applicationStatus);

    if (isTerminalStage || isTerminalStatus || hasTerminalDate) {
      return "completed";
    }

    if (
      isPassportService &&
      (
        ["PENDING_QUOTE", "QUOTED", "EXPIRED"].includes(quoteStatus) ||
        ["pending_quote", "quoted"].includes(applicationStatus) ||
        currentStage === "initial_review"
      )
    ) {
      return "passport-quote-pending";
    }

    if (isPassportService && ["QUOTE_ACCEPTED", "PAID"].includes(quoteStatus)) {
      return "processing";
    }

    if (applicationStatus === "rejected" || auditResult === "red") {
      return "audit-result";
    }

    if (["registered", "draft"].includes(currentStage) || ["draft", "registered"].includes(applicationStatus)) {
      return isResumingExistingCase ? null : "service";
    }

    if (currentStage === "submitted") {
      return "processing";
    }

    if (fullPaymentStatus === "paid" || record.payment_confirmed || applicationStatus === "paid") {
      return "processing";
    }

    if (record.audit_skipped && record.audit_skip_disclaimer_accepted) {
      return "full-payment";
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



    const nextRecord: ApplicationRecord = {
      id: backendApplicationId,
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
      full_payment_status: response.full_payment_status,
      payment_confirmed: response.payment_confirmed,
      current_stage: response.current_stage,
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
        const progressiveStages = ["checklist", "upload", "summary", "audit-pending", "audit-result", "full-payment", "processing", "completed"];
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
): Promise<number> => {
  if (!forceCreate && applicationRecord?.id) {
    return applicationRecord.id;
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

  try {
    const resumeKey = getAuditDraftKey(resumeReference || null);
    const activeKey = getAuditDraftKey(null);
    const targetKey = resumeReference ? resumeKey : activeKey;
    const raw = localStorage.getItem(targetKey) ||
      (resumeReference ? localStorage.getItem(activeKey) : null) ||
      localStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY) ||
      sessionStorage.getItem(targetKey) ||
      (resumeReference ? sessionStorage.getItem(activeKey) : null) ||
      sessionStorage.getItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
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
    setHasDraftProgress(true);
  } catch {
    localStorage.removeItem(getAuditDraftKey(resumeReference || null));
    localStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    sessionStorage.removeItem(getAuditDraftKey(resumeReference || null));
    sessionStorage.removeItem(OCI_AUDIT_DRAFT_KEY_LEGACY);
    setHasDraftProgress(false);
  } finally {
    setDraftRestored(true);
  }
}, [resumeReference]);

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

        if (resolvedService) {
          setSelectedService(resolvedService);
          setBannerMessage(`Resuming your ${serviceLabelMap[resolvedService]} application.`);
        }

        // Restore audit id and checklist from backend
        const resolvedAuditId = (app as any).audit_id ?? (app as any).latest_audit_id ?? null;
        let restoredChecklistCount = 0;
        if (resolvedAuditId) {
          setAuditId(Number(resolvedAuditId));
          try {
            const raw = await getAuditStatus(Number(resolvedAuditId));
            const result = normalizePayload<{ checklist_items?: AuditChecklistItem[] }>(raw);
            if (Array.isArray(result.checklist_items) && result.checklist_items.length > 0) {
              restoredChecklistCount = result.checklist_items.length;
              applyChecklistFromAudit(result.checklist_items);
            }
          } catch {
            // non-fatal: checklist may still load from saved draft
          }
        }

       const backendStage = deriveStageFromApplication(app);


// const progressiveStages: FlowStage[] = ["audit-pending", "audit-result", "full-payment", "processing", "completed"];
// const draftStage = stageRef.current;

// if (backendStage && progressiveStages.includes(backendStage)) {
//   // Backend says we're past upload — always trust this
//   setStage(backendStage);
// } else if (draftStage && draftStage !== "service") {
//   // Draft has a real position — keep it (questions q2, checklist, summary, etc.)
//   setStage(draftStage);
// } else {
//   // No useful draft, backend says fresh app — safe minimum for resume
//   setStage("checklist");
// }

// Stage priority:
// 1. If backend knows we're past checklist (paid, audit-pending, etc.) → use backend
// 2. If draft restored a meaningful stage AND checklist exists → keep it
// 3. If draft is mid-questionnaire → restore questions stage
// 4. Otherwise fall back to questions (not checklist) as safe minimum
const progressiveStages: FlowStage[] = ["passport-quote-pending", "audit-pending", "audit-result", "full-payment", "processing", "completed"];
const draftStage = stageRef.current;
const hasGeneratedChecklist = generatedChecklist.length > 0;
const hasChecklistArtifacts = hasGeneratedChecklist || restoredChecklistCount > 0 || Boolean(resolvedAuditId);

if (backendStage && backendStage !== "service" && backendStage !== "questions") {
  // Backend stage is authoritative for all post-questionnaire states.
  setStage(backendStage);
} else if (draftStage === "checklist" || draftStage === "upload" || draftStage === "summary") {
  // Only restore checklist-family stages when checklist or uploads exist
  if (hasChecklistArtifacts || hasUploadedDocs) {
    setStage(draftStage);
  } else {
    setStage("questions");
  }
} else if (hasChecklistArtifacts || hasUploadedDocs) {
  // Resume users with existing checklist/uploads directly into checklist flow.
  setStage("checklist");
} else if (draftStage && draftStage !== "service") {
  // Mid-questionnaire draft — restore it
  setStage(draftStage);
} else {
  // No useful draft — send to questions, not checklist
  setStage("questions");
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

    const app = await syncApplicationFromBackend(referenceNumber, { skipStageSync: true }).catch(() => null);

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

      // const effectiveAuditId = Number(auditId || app?.id || applicationRecord?.id || 0);

      const effectiveAuditId = Number(
  auditId ||
  (app as any)?.audit_id ||
  (applicationRecord as any)?.audit_id ||
  app?.id ||
  applicationRecord?.id ||
  0
);

      await uploadDocument(
        effectiveAuditId,
        checklistItemId as string,
        file,
        resolvedReferenceNumber,
        inferredDocumentType
      );
      // FLYOCI-FIX: BUG-REUPLOAD-5
      await syncApplicationFromBackend(referenceNumber, { skipStageSync: true });
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

  // Fix 2 (safety net): clear drafts in this entry path too.
  clearDraftStorage(resumeReference || referenceNumber || null);

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
      const raw = await createAuditPaymentOrder(refNum, supportNotes);
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

  const submitPassportRequestForQuote = async () => {
    const app = await syncApplicationFromBackend(referenceNumber).catch(() => null);
    const refNum = app?.reference_number;
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    try {
      setApiLoading(true);
      const response = await submitPassportRenewalRequest(refNum);
      setPassportMaskedEmail(String(response.masked_email || ""));
      setPassportCaseReference(String(response.case_reference || response.file_number || refNum));
      setPassportQuoteAcknowledged(false);
      setStage("passport-quote-pending");
      setBannerMessage("Passport renewal request submitted. We will notify you when the quote is ready in your dashboard.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit passport renewal request.");
    } finally {
      setApiLoading(false);
    }
  };

  const payPassportQuotedFee = async () => {
    const app = await syncApplicationFromBackend(referenceNumber).catch(() => applicationRecord);
    const refNum = String(app?.reference_number || referenceNumber || "").trim();
    if (!refNum) {
      toast.error("Application reference not found.");
      return;
    }

    if (!passportQuoteAcknowledged) {
      toast.error("Please acknowledge the quote before payment.");
      return;
    }

    try {
      setApiLoading(true);
      const raw = await createPassportRenewalQuoteOrder(refNum);
      const order = normalizePayload<{
        order: { id: string; amount: number; currency: string };
        key_id: string;
        amount_pence: number;
      }>(raw);

      await openRazorpayCheckout(
        {
          key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: Number(order.amount_pence || order.order?.amount || 0),
          currency: order.order?.currency || "GBP",
          order_id: order.order?.id || "",
          name: "FlyOCI",
          description: "Passport Renewal Quote Payment",
        },
        async (payment) => {
          await verifyPassportRenewalQuotePayment(
            refNum,
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature
          );
        }
      );

      await syncApplicationFromBackend(refNum);
      router.push(`/dashboard/document-audit?reference=${encodeURIComponent(refNum)}&resume=1`);
      toast.success("Payment successful. Your case is now in progress.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Passport quote payment failed.");
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
      await skipAuditWithDisclaimer(refNum, supportNotes);
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
  };

  if (!loaded) {
    return <div className="rounded-3xl border border-border bg-white p-6 text-textMuted shadow-sm">Loading audit journey...</div>;
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">
              {selectedService === "passport-renewal" ? "Passport Renewal Journey" : "Document Audit Journey"}
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-bold text-primary">Your Required Documents</h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600">{bannerMessage}</p>
          </div>
          <button
            type="button"
            onClick={resetJourneyForNewApplication}
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

      {customerMessages.length > 0 ? (
        <div className="rounded-3xl border border-[#dce7f8] bg-[#f5f9ff] p-6 shadow-sm">
          <h3 className="text-xl font-heading font-bold text-primary mb-4">Messages from FlyOCI Team</h3>
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
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>
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
          <h3 className="text-2xl font-heading font-bold text-primary">{selectedService === "passport-renewal" ? "Upload Summary and Request Submission" : "Upload Summary and Audit Fee Payment"}</h3>
          <p className="mt-2 text-textMuted">
            {selectedService === "passport-renewal"
              ? "Submit your passport renewal request now. Our team will review your documents and share a Price on request quote in your dashboard within 24-48 working hours."
              : "We will review your documents and confirm if they are acceptable for submission. Audit fee is fully adjusted in final service fee."}
          </p>

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
            {selectedService === "passport-renewal" ? (
              <div className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5 text-slate-700">
                <h4 className="font-semibold text-primary">Price on request flow</h4>
                <p className="mt-2 text-sm">Your documents are submitted for review. Once our team validates your case details, your quoted fee will appear in your dashboard for secure payment.</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="flex justify-between"><span>Service</span><strong>Indian Passport Renewal</strong></p>
                  <p className="mt-2 flex justify-between"><span>Pricing</span><strong>Price on request</strong></p>
                  <p className="mt-2 flex justify-between"><span>Quote turnaround</span><strong>24-48 working hours</strong></p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <h4 className="font-semibold">Audit fee breakdown</h4>
                <p className="mt-2 text-sm">This is a one-time expert pre-check. If you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update), this amount is deducted from your final fee (e.g., New OCI £88 - £15 = £73 to pay later). Audit credit does not apply to e-Visa or Passport Renewal.</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex justify-between"><span>Audit fee</span><strong>£{auditFee}</strong></p>
                  <p className="flex justify-between"><span>Credit if you proceed</span><strong>-£{auditFee}</strong></p>
                  <p className="flex justify-between border-t border-amber-200 pt-2"><span>Example service fee</span><strong>{serviceFee === null ? "Price on request" : `£${serviceFee}`}</strong></p>
                </div>
                <label className="mt-5 flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" />
                  <span>I acknowledge the audit fee and understand it is credited against my final service fee if I proceed.</span>
                </label>

                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-semibold">Skip audit? You can, but it is not recommended.</p>
                  <p className="mt-1">
                    More than 50% of applications have document issues we catch at audit stage. The £15 audit fee is fully deducted from your
                    OCI service fee (New OCI, OCI Renewal, or OCI Update) if you proceed with us. Audit credit does not apply to e-Visa or Passport Renewal. Are you sure you want to skip?
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
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={() => {
              setReuploadOnlyFlagged(false);
              setMessageRequestedDocIds([]);
              setStage("checklist");
            }}>Back to uploads</Button>
            {selectedService === "passport-renewal" ? (
              <Button isLoading={apiLoading} onClick={() => void submitPassportRequestForQuote()}>Submit Passport Renewal Request</Button>
            ) : (
              <Button isLoading={apiLoading} onClick={() => void submitAuditPayment()}>Pay £{auditFee} & Submit for Audit</Button>
            )}
          </div>
        </div>
      )}

      {stage === "passport-quote-pending" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-7 shadow-sm">
          <h3 className="text-2xl font-heading font-bold text-primary">Passport Renewal Request Submitted</h3>
          <p className="mt-2 text-textMuted">Our team will review your uploaded documents and update your dashboard quote status within 24-48 working hours.</p>
          <div className="mt-5 rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5 text-sm text-slate-700">
            <p className="flex justify-between"><span>Case number</span><strong>{passportCaseReference || applicationRecord?.file_number || applicationRecord?.reference_number || referenceNumber || "N/A"}</strong></p>
            <p className="mt-2 flex justify-between"><span>Updates sent to</span><strong>{passportMaskedEmail || "your registered email"}</strong></p>
            <p className="mt-2 flex justify-between"><span>Quote status</span><strong>{String(applicationRecord?.quote_status || "PENDING_QUOTE").replaceAll("_", " ")}</strong></p>
          </div>

          {String(applicationRecord?.quote_status || "").toUpperCase() === "PENDING_QUOTE" ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Your quote is being prepared by our team. We'll notify you by email when it's ready. Expected: within 24 hours.
            </div>
          ) : null}

          {String(applicationRecord?.quote_status || "").toUpperCase() === "QUOTED" ? (
            <div id="passport-quote-box" ref={quoteCardRef} className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              {(() => {
                const quotedFeeRaw = String(applicationRecord?.quoted_fee || "").trim();
                const quotedFeeNumber = Number.parseFloat(quotedFeeRaw);
                const quoteAmountPence = Number(applicationRecord?.quote_amount_pence || 0);
                const displayAmount = Number.isFinite(quotedFeeNumber) && quotedFeeNumber > 0
                  ? quotedFeeNumber.toFixed(2)
                  : quoteAmountPence > 0
                    ? (quoteAmountPence / 100).toFixed(2)
                    : "0.00";

                return (
                  <>
              <p className="text-lg font-semibold">Your Quote is Ready!</p>
              <p className="mt-2 text-base font-semibold">Passport Renewal: £{displayAmount}</p>
              <p className="mt-1">Valid until: {applicationRecord?.quote_expires_at ? new Date(applicationRecord.quote_expires_at).toLocaleString() : "Not set"}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => router.push(`/passport-renewal/pay?reference=${encodeURIComponent(String(applicationRecord?.reference_number || referenceNumber || ""))}`)}>
                  Pay Now
                </Button>
                <Button variant="outline" onClick={() => router.push(`/passport-renewal/pay?reference=${encodeURIComponent(String(applicationRecord?.reference_number || referenceNumber || ""))}`)}>
                  View Details
                </Button>
              </div>
                  </>
                );
              })()}
            </div>
          ) : null}

          {String(applicationRecord?.quote_status || "").toUpperCase() === "EXPIRED" ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p>Your quote has expired. Please contact us for a new quote.</p>
              <div className="mt-3">
                <Button variant="outline" onClick={() => router.push("/contact")}>Contact Support</Button>
              </div>
            </div>
          ) : null}

          {["QUOTE_ACCEPTED", "PAID"].includes(String(applicationRecord?.quote_status || "").toUpperCase()) ? (
            <div className="mt-5 rounded-2xl border border-[#dce7f8] bg-[#f5f9ff] p-4 text-sm text-slate-700">
              Payment is in progress or confirmed. Your application is moving to processing.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/services/passport-renewal")}>View Passport Service Details</Button>
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
          {selectedService === "passport-renewal" ? (
            <>
              <h3 className="text-2xl font-heading font-bold text-primary">Correction Requested</h3>
              <p className="mt-2 text-textMuted">Please review the documents that need to be re-uploaded and submit them again.</p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-heading font-bold text-primary">Audit Result</h3>
              <p className="mt-2 text-textMuted">Email + WhatsApp message sent with a link to view your audit result.</p>
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
                        {item.uploadedDocumentName && item.uploadedDocumentName !== item.documentName ? (
                          <p className="mt-1 text-xs text-slate-500">Flagged file: {item.uploadedDocumentName}</p>
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
                <Button onClick={resetJourneyForNewApplication}>Start New Application</Button>
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

            return (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
                  <h3 className="text-xl font-heading font-bold text-emerald-800">Your application has been submitted to the embassy / VFS.</h3>
                  {applicationRecord?.reference_number ? <p className="text-sm text-emerald-900"><span className="font-semibold">Reference:</span> {applicationRecord.reference_number}</p> : null}
                  {applicationRecord?.service_name || applicationRecord?.service_type ? (
                    <p className="text-sm text-emerald-900"><span className="font-semibold">Service:</span> {applicationRecord?.service_name || applicationRecord?.service_type}</p>
                  ) : null}
                  {displaySubmissionDate ? (
                    <p className="text-sm text-emerald-900"><span className="font-semibold">Submitted on:</span> {new Date(displaySubmissionDate).toLocaleDateString()}</p>
                  ) : (
                    <p className="text-sm text-emerald-900">Submission date will be confirmed shortly.</p>
                  )}
                  {extractedGovRef ? <p className="text-sm text-emerald-900"><span className="font-semibold">Government reference:</span> {extractedGovRef}</p> : null}
                </div>

                <p className="mt-3 text-sm text-textMuted">Current status: {applicationRecord?.current_stage?.replaceAll("_", " ") || "Submitted"}</p>

                {selectedService === "passport-renewal" && (
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
                    <p>The embassy is reviewing your application. No action is needed from you at this stage.</p>
                    <p>If the embassy requires anything additional, FlyOCI will contact you directly and update your portal.</p>
                    <p>Once a decision is received, you will be notified immediately by email and WhatsApp.</p>
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
            <Button variant="outline" onClick={() => setStage("service")}><ArrowRight className="mr-2 h-4 w-4" /> Start another application</Button>
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
