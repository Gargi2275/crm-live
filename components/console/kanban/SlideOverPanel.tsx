"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock, FileText, MessageSquare, MoveRight, Send, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PipelineCase } from "@/lib/kanban";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  adminAuthenticatedFetch,
  downloadAdminApostilleDocumentBlob,
  getAdminApplicationMessages,
  getAdminApplicationDocuments,
  patchAdminApostilleCase,
  patchAdminApplication,
  reopenAdminApplication,
  sendAdminApplicationReminder,
  setAdminPassportRenewalQuote,
  sendAdminCustomerMessage,
  getAdminApplicationInternalMessages,
  sendAdminApplicationInternalMessage,
  listStaffUsers,
  sendAdminApostilleThreadMessage,
  submitAdminAuditResult,
  updateAdminApplicationStage,
  updateAdminApplicationNotes,
  type AdminApplication,
  type AdminApplicationDocument,
  type AdminAuditFindingInput,
  type AdminStaffInternalMessage,
  type AdminStaffUser,
} from "@/lib/admin-auth";
import toast from "react-hot-toast";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  proof_of_address: "Proof of Address",
  old_oci: "Old OCI Card",
  birth_certificate: "Birth Certificate",
  marriage_certificate: "Marriage Certificate",
  divorce_decree: "Divorce Decree",
  photograph: "Photograph",
  signature: "Signature",
  affidavit: "Affidavit",
  apostille: "Apostille",
  other: "Uploaded Document",
};

const KANBAN_STAGE_OPTIONS: PipelineCase["stage"][] = [
  "NEW_LEAD",
  "PASSPORT_QUOTE_PENDING",
  "AUDIT_PENDING",
  "AUDIT_COMPLETED",
  "DOCUMENTS_REQUIRED",
  "PAYMENT_PENDING",
  "DOCUMENT_UPLOAD_PENDING",
  "FORM_FILLING",
  "REVIEW_PENDING",
  "READY_FOR_SUBMISSION",
  "SUBMITTED",
  "DELIVERED",
];

const toDocumentTypeLabel = (value: string) => {
  const key = (value || "").trim().toLowerCase();
  if (!key) return "Document";
  return DOCUMENT_TYPE_LABELS[key] || key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const isGenericDocumentName = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "other" || normalized === "supporting document" || normalized === "uploaded document";
};

const toDocumentDisplayTitle = (document: AdminApplicationDocument) => {
  if (document.document_name && !isGenericDocumentName(document.document_name)) {
    return document.document_name;
  }

  const fileName = (document.original_filename || document.stored_filename || "").trim();
  if (fileName) {
    return fileName;
  }

  return toDocumentTypeLabel(document.document_type);
};

const toUploadedFileLabel = (document: AdminApplicationDocument) => {
  const fileName = (document.original_filename || document.stored_filename || "").trim();
  if (fileName) {
    return fileName;
  }
  return toDocumentDisplayTitle(document);
};

const normalizeDocValue = (value?: string) => (value || "").trim().toLowerCase();

const toPounds = (pence?: number) => ((pence || 0) / 100).toFixed(2);

const resolveApostilleAmountDue = (
  details: AdminApplication | null | undefined,
  apostilleQuotedFee: string,
) => {
  const localFee = apostilleQuotedFee.trim();
  if (localFee) {
    const parsed = Number.parseFloat(localFee);
    if (Number.isFinite(parsed)) return parsed.toFixed(2);
  }
  const quoted = details?.quoted_fee;
  if (quoted != null && String(quoted).trim()) {
    const parsed = Number.parseFloat(String(quoted));
    if (Number.isFinite(parsed)) return parsed.toFixed(2);
  }
  return toPounds(details?.amount_due_pence);
};

const toStageLabel = (stage: PipelineCase["stage"] | string) =>
  String(stage || "")
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getNextActionLabel = (stage: PipelineCase["stage"]): string => {
  const map: Partial<Record<PipelineCase["stage"], string>> = {
    NEW_LEAD: "Open lead and assign service",
    PASSPORT_QUOTE_PENDING: "Send passport quote to customer",
    AUDIT_PENDING: "Review uploaded documents",
    AUDIT_COMPLETED: "Send payment link to customer",
    DOCUMENTS_REQUIRED: "Request missing documents from customer",
    PAYMENT_PENDING: "Follow up on payment confirmation",
    DOCUMENT_UPLOAD_PENDING: "Wait for customer document upload",
    FORM_FILLING: "Complete government application form",
    REVIEW_PENDING: "Admin review of completed form",
    READY_FOR_SUBMISSION: "Submit application and enter reference number",
    SUBMITTED: "Monitor and update application result",
    DELIVERED: "Confirm delivery and close case",
  };
  return map[stage] || "No action defined";
};

const getAllowedActions = (stage: PipelineCase["stage"]): string[] => {
  const map: Partial<Record<PipelineCase["stage"], string[]>> = {
    NEW_LEAD: ["Open lead", "Assign service", "Send quote", "Reject duplicate"],
    PASSPORT_QUOTE_PENDING: ["Set passport quote", "Send to customer"],
    AUDIT_PENDING: ["Review documents", "Accept / reject each document", "Request missing document", "Escalate document issue"],
    AUDIT_COMPLETED: ["Send payment link", "Move to form filling after payment confirmed"],
    DOCUMENTS_REQUIRED: ["Request missing documents", "Review corrected uploads", "Escalate to admin"],
    PAYMENT_PENDING: ["Send payment reminder", "Confirm payment received"],
    DOCUMENT_UPLOAD_PENDING: ["Send upload reminder", "Wait for customer upload"],
    FORM_FILLING: ["Complete form", "Save draft", "Request customer confirmation", "Send to review"],
    REVIEW_PENDING: ["Approve for submission", "Send back to form filling", "Request correction"],
    READY_FOR_SUBMISSION: ["Submit application", "Enter government reference", "Upload submission proof"],
    SUBMITTED: ["Update result", "Mark approved", "Mark rejected", "Send delivery email"],
    DELIVERED: ["Mark delivered", "Confirm customer notified", "Close case"],
  };
  return map[stage] || ["No actions defined for this stage"];
};

const resolveDisplayPaymentStatus = (
  details: AdminApplication | null | undefined,
  effectiveStage: PipelineCase["stage"],
  isEVisaCase: boolean,
) => {
  const fullPaymentStatus = String(details?.full_payment_status || "").trim().toLowerCase();
  const auditPaymentStatus = String(details?.audit_payment_status || "").trim().toLowerCase();
  const applicationStatus = String(details?.application_status || "").trim().toLowerCase();
  const amountDue = Number(details?.amount_due_pence || 0);

  const paidSignals = new Set(["paid", "captured", "success", "completed", "settled"]);
  if (paidSignals.has(fullPaymentStatus) || paidSignals.has(auditPaymentStatus)) {
    return "Paid";
  }

  if (
    isEVisaCase
    && (
      ["under_review", "reuploaded_pending_review"].includes(applicationStatus)
      || ["REVIEW_PENDING", "READY_FOR_SUBMISSION", "SUBMITTED", "DELIVERED"].includes(effectiveStage)
    )
  ) {
    return "Cleared for processing";
  }

  const pendingSignals = new Set(["pending", "created", "initiated", "unpaid", "failed"]);
  if (pendingSignals.has(fullPaymentStatus) || pendingSignals.has(auditPaymentStatus)) {
    return "Pending";
  }

  if (amountDue <= 0 && (details?.service_total_pence || details?.audit_fee_pence)) {
    return "Paid";
  }

  if (["REVIEW_PENDING", "READY_FOR_SUBMISSION", "SUBMITTED", "DELIVERED"].includes(effectiveStage)) {
    return isEVisaCase ? "Cleared for processing" : "Cleared";
  }

  if (effectiveStage === "FORM_FILLING") {
    return "Cleared";
  }

  return "Pending";
};

const resolveEffectiveStage = (stage?: string, details?: AdminApplication | null, caseData?: PipelineCase | null): PipelineCase["stage"] => {
  const rawStage = String(stage || details?.stage || caseData?.stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  const auditResult = String(details?.audit_result || "").toLowerCase();
  const applicationStatus = String(details?.application_status || "").toLowerCase();
  const fullPaymentStatus = String(details?.full_payment_status || "").toLowerCase();
  const quoteStatus = String(details?.quote_status || "").trim().toUpperCase();
  const serviceHint = String(details?.service_type || details?.service_name || caseData?.serviceType || "").toLowerCase();
  const isEVisaCase = serviceHint.includes("evisa") || serviceHint.includes("e-visa") || serviceHint.includes("e visa");
  const isPassportCase = serviceHint.includes("passport");
  const isApostilleCase = serviceHint.includes("apostille");
  const hasDocuments = Number(details?.document_count || 0) > 0;
  const quotedFee = Number.parseFloat(String(details?.quoted_fee ?? ""));
  const hasQuotedFee = Number.isFinite(quotedFee) && quotedFee > 0;

  if (isApostilleCase) {
    const kanbanStage = String(details?.kanban_stage || details?.stage || stage || caseData?.stage || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    const paymentConfirmed = Boolean(details?.payment_confirmed) || fullPaymentStatus === "paid";
    const finalCompleted = Boolean(details?.final_submission_completed);

    if (kanbanStage === "DELIVERED" || applicationStatus === "completed" || applicationStatus === "dispatched") {
      return "DELIVERED";
    }
    if (kanbanStage === "SUBMITTED") {
      return "SUBMITTED";
    }
    if (kanbanStage === "READY_FOR_SUBMISSION") {
      return "READY_FOR_SUBMISSION";
    }
    if (kanbanStage === "FORM_FILLING") {
      return "FORM_FILLING";
    }
    if (kanbanStage === "REVIEW_PENDING") {
      return "REVIEW_PENDING";
    }
    if (applicationStatus === "submitted" || rawStage === "SUBMITTED") {
      return "SUBMITTED";
    }
    if (applicationStatus === "processing" || finalCompleted) {
      return "REVIEW_PENDING";
    }
    if (applicationStatus === "final_submission_pending" || (paymentConfirmed && !finalCompleted)) {
      return "FORM_FILLING";
    }
    if ((applicationStatus === "payment_pending" || applicationStatus === "approved" || hasQuotedFee) && !paymentConfirmed) {
      return "PAYMENT_PENDING";
    }
    if (applicationStatus === "rejected" || rawStage === "CORRECTION_REQUESTED") {
      return "DOCUMENTS_REQUIRED";
    }
    if (applicationStatus === "under_review" || rawStage === "INITIAL_REVIEW" || rawStage === "AUDIT_PENDING") {
      return "AUDIT_PENDING";
    }
    return (rawStage as PipelineCase["stage"]) || "AUDIT_PENDING";
  }

  if (rawStage === "CORRECTION_REQUESTED" || applicationStatus === "correction_requested" || applicationStatus === "reuploaded_pending_review") {
    return "DOCUMENTS_REQUIRED";
  }

  if (auditResult === "red" || applicationStatus === "rejected") {
    return "DOCUMENTS_REQUIRED";
  }

  if (
    isPassportCase &&
    (
      rawStage === "INITIAL_REVIEW" ||
      applicationStatus === "pending_quote" ||
      quoteStatus === "PENDING_QUOTE"
    )
  ) {
    return "PASSPORT_QUOTE_PENDING";
  }

  if (
    isPassportCase &&
    (
      applicationStatus === "quoted" ||
      ["QUOTED", "EXPIRED", "QUOTE_ACCEPTED"].includes(quoteStatus)
    )
  ) {
    return "PAYMENT_PENDING";
  }

  if (isEVisaCase) {
    if (rawStage === "DELIVERED" || rawStage === "CLOSED" || rawStage === "DECISION_RECEIVED") {
      return "DELIVERED";
    }

    if (rawStage === "SUBMITTED") {
      return "SUBMITTED";
    }

    if (rawStage === "READY_FOR_SUBMISSION") {
      return "READY_FOR_SUBMISSION";
    }

    if (rawStage === "REVIEW_PENDING") {
      return "REVIEW_PENDING";
    }

    if (applicationStatus === "reuploaded_pending_review" || applicationStatus === "under_review") {
      return "REVIEW_PENDING";
    }

    if (rawStage === "DOCS_RECEIVED" || rawStage === "AUDIT_PENDING") {
      return "REVIEW_PENDING";
    }

    if (rawStage === "FORM_FILLING" || rawStage === "IN_PREPARATION") {
      return "FORM_FILLING";
    }

    if (rawStage === "PAID") {
      return hasDocuments ? "REVIEW_PENDING" : "DOCUMENT_UPLOAD_PENDING";
    }

    if (rawStage === "CORRECTION_REQUESTED") {
      return "DOCUMENT_UPLOAD_PENDING";
    }

    if (rawStage === "PAYMENT_PENDING" || rawStage === "EMAIL_CONFIRMED" || applicationStatus === "payment_pending") {
      return "PAYMENT_PENDING";
    }

    if (rawStage === "REGISTERED" || applicationStatus === "draft") {
      return "NEW_LEAD";
    }

    return (rawStage as PipelineCase["stage"]) || "FORM_FILLING";
  }

  if (rawStage === "REGISTERED" || applicationStatus === "draft") {
    return "NEW_LEAD";
  }

  if (["SUBMITTED", "DELIVERED"].includes(rawStage)) {
    return rawStage as PipelineCase["stage"];
  }

  if (rawStage === "REVIEW_PENDING" || rawStage === "READY_FOR_SUBMISSION") {
    return rawStage as PipelineCase["stage"];
  }

  if (fullPaymentStatus === "paid") {
    return "FORM_FILLING";
  }

  if (auditResult === "green" && ["pending", "created"].includes(fullPaymentStatus)) {
    return "PAYMENT_PENDING";
  }

  if (rawStage === "PAYMENT_PENDING" || applicationStatus === "payment_pending") {
    return "PAYMENT_PENDING";
  }

  if (rawStage === "FORM_FILLING" || rawStage === "IN_PREPARATION") {
    return "FORM_FILLING";
  }

  if (rawStage === "CORRECTION_REQUESTED" || auditResult === "amber") {
    return "DOCUMENTS_REQUIRED";
  }

  if (auditResult === "pending" || rawStage === "AUDIT_PENDING" || rawStage === "DOCS_RECEIVED") {
    return "AUDIT_PENDING";
  }

  if (rawStage === "AUDIT_COMPLETED") {
    return auditResult === "green" ? "PAYMENT_PENDING" : "AUDIT_COMPLETED";
  }

  return (rawStage as PipelineCase["stage"]) || "NEW_LEAD";
};

type InternalNoteRecipientOption = {
  key: string;
  label: string;
  subtitle?: string;
};

function InternalNoteRecipientSearch({
  staffRecipients,
  allowAllTeam,
  value,
  onChange,
}: {
  staffRecipients: AdminStaffUser[];
  allowAllTeam: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (value === "all") return "All team";
    const staff = staffRecipients.find((member) => String(member.id) === value);
    if (!staff) return "";
    return `${staff.full_name || staff.username} · ${staff.role.replaceAll("_", " ")}`;
  }, [staffRecipients, value]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: InternalNoteRecipientOption[] = [];

    if (allowAllTeam && (!q || "all team".includes(q) || q.includes("all") || q.includes("team"))) {
      items.push({ key: "all", label: "All team", subtitle: "Notify everyone on staff" });
    }

    for (const staff of staffRecipients) {
      const haystack = `${staff.full_name || ""} ${staff.username || ""} ${staff.role || ""} ${staff.email || ""}`.toLowerCase();
      if (q && !haystack.includes(q)) continue;
      items.push({
        key: String(staff.id),
        label: staff.full_name || staff.username,
        subtitle: staff.role.replaceAll("_", " "),
      });
    }

    return items;
  }, [allowAllTeam, query, staffRecipients]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleSelect = (key: string) => {
    onChange(key);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-[10px] font-semibold text-[#9AA5B4] uppercase tracking-wide">Send to</label>
      {value ? (
        <div className="mt-1 flex items-center justify-between gap-2 rounded border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2">
          <p className="text-sm font-medium text-[#102A43]">{selectedLabel}</p>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
            }}
            className="text-xs font-semibold text-[#0B69B7] hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mt-1">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={allowAllTeam ? "Search staff or all team..." : "Search staff by name..."}
            className="w-full rounded border border-[#D9E1EA] px-3 py-2 text-sm bg-white"
            autoComplete="off"
          />
          {open && (
            <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#D9E1EA] bg-white shadow-[0_12px_28px_rgba(16,42,67,0.12)]">
              {options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[#627D98]">No matching staff found.</p>
              ) : (
                options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="w-full border-b border-[#EEF2F6] px-3 py-2 text-left last:border-0 hover:bg-[#F8FAFC]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option.key)}
                  >
                    <p className="text-sm font-medium text-[#102A43]">{option.label}</p>
                    {option.subtitle ? <p className="text-xs text-[#627D98] capitalize">{option.subtitle}</p> : null}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: PipelineCase | null;
  details?: AdminApplication | null;
  documents?: AdminApplicationDocument[];
  detailsLoading?: boolean;
  detailsError?: string | null;
  documentsLoading?: boolean;
  documentsError?: string | null;
  onStageResolved?: (nextStage: PipelineCase["stage"]) => void;
}

export function SlideOverPanel({
  isOpen,
  onClose,
  caseData,
  details,
  documents = [],
  detailsLoading = false,
  detailsError = null,
  documentsLoading = false,
  documentsError = null,
  onStageResolved,
}: SlideOverPanelProps) {
  const { adminUser } = useAdminAuth();
  const canSendToAllTeam = adminUser?.role === "admin" || adminUser?.role === "ops_manager";
  const autoMovedCorrectionRef = useRef<string | null>(null);
  const previousCaseIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "audit" | "documents">("overview");
  const [auditResult, setAuditResult] = useState<"green" | "amber" | "red">("green");
  const [auditorNotes, setAuditorNotes] = useState("");
  const [findings, setFindings] = useState<AdminAuditFindingInput[]>([]);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [actionBanner, setActionBanner] = useState("");
  const [apostilleQuotedFee, setApostilleQuotedFee] = useState("");
  const [apostilleReviewNote, setApostilleReviewNote] = useState("");
  const [isSavingApostille, setIsSavingApostille] = useState(false);

  const [evisaDocOverviewOpen, setEvisaDocOverviewOpen] = useState(false);
  const [internalNotesOpen, setInternalNotesOpen] = useState(false);
  const [apostilleControlsOpen, setApostilleControlsOpen] = useState(false);
  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const [showSetQuote, setShowSetQuote] = useState(false);
  const [isRequestingDocs, setIsRequestingDocs] = useState(false);
  const [isSendingCustomerMessage, setIsSendingCustomerMessage] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Array<{ sender: "team" | "customer"; message_body: string; created_at: string }>>([]);

  const [requestDocType, setRequestDocType] = useState("passport");
  const [requestDocDescription, setRequestDocDescription] = useState("");
  const [pendingDocRequests, setPendingDocRequests] = useState<Array<{ doc_type: string; description: string }>>([]);
  const [quoteAmountGbp, setQuoteAmountGbp] = useState("");
  const [quoteValidDays, setQuoteValidDays] = useState("7");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [isSettingQuote, setIsSettingQuote] = useState(false);

  const [staffMessage, setStaffMessage] = useState("");
  const [internalMessages, setInternalMessages] = useState<AdminStaffInternalMessage[]>([]);
  const [internalNoteDraft, setInternalNoteDraft] = useState("");
  const [internalNoteRecipientId, setInternalNoteRecipientId] = useState("");
  const [staffRecipients, setStaffRecipients] = useState<AdminStaffUser[]>([]);
  const [isLoadingInternalMessages, setIsLoadingInternalMessages] = useState(false);
  const [isSendingInternalNote, setIsSendingInternalNote] = useState(false);
  const [targetStage, setTargetStage] = useState<PipelineCase["stage"]>(caseData?.stage || "NEW_LEAD");

  const [formChecklist, setFormChecklist] = useState<Record<string, boolean>>({
    government_form_completed: false,
    all_documents_verified: false,
    applicant_details_confirmed: false,
    payment_receipt_attached: false,
  });

  const [submissionGovRef, setSubmissionGovRef] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [decisionReference, setDecisionReference] = useState("");
  const [reviewSendBackReason, setReviewSendBackReason] = useState("");

  const [latestdocuments, setlatestdocuments] = useState<AdminApplicationDocument[]>(documents);

  useEffect(() => {
    setlatestdocuments(documents);
  }, [documents]);

  useEffect(() => {
    const currentCaseId = caseData?.id ?? null;
    if (!currentCaseId) {
      previousCaseIdRef.current = null;
      return;
    }
    if (previousCaseIdRef.current === currentCaseId) {
      return;
    }
    previousCaseIdRef.current = currentCaseId;

    setActiveTab("overview");
    setAuditResult("green");
    setAuditorNotes(details?.auditor_notes || "");
    setFindings([]);
    setActionBanner("");
    setEvisaDocOverviewOpen(false);
    setInternalNotesOpen(false);
    setApostilleControlsOpen(false);
    setShowRequestDocs(false);
    setShowSendMessage(false);
    setShowMoveStage(false);
    setShowSetQuote(false);
    setQuoteAmountGbp("");
    setQuoteValidDays("7");
    setQuoteNotes("");
    setIsSettingQuote(false);
    setInternalMessages([]);
    setInternalNoteDraft("");
    setInternalNoteRecipientId("");
    autoMovedCorrectionRef.current = null;
    setTargetStage(((details?.stage || caseData?.stage) || "NEW_LEAD") as PipelineCase["stage"]);
  }, [caseData?.id, details?.auditor_notes, details?.stage, caseData?.stage]);

  useEffect(() => {
    if (!details?.id) {
      setInternalMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingInternalMessages(true);
    void (async () => {
      try {
        const [messages, staff] = await Promise.all([
          getAdminApplicationInternalMessages(details.id),
          listStaffUsers(),
        ]);
        if (cancelled) return;
        setInternalMessages(messages);
        setStaffRecipients(staff.filter((member) => member.is_active !== false));
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load internal notes.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInternalMessages(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [details?.id]);

  useEffect(() => {
    const detailRecord = (details || {}) as Record<string, unknown>;
    setApostilleQuotedFee(String(detailRecord.quoted_fee ?? ""));
    setApostilleReviewNote(String(detailRecord.review_note || ""));
  }, [details, caseData?.id]);

  useEffect(() => {
    const applicationId = Number(details?.id || caseData?.applicationId || 0);
    if (!applicationId) {
      setThreadMessages([]);
      return;
    }
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const payload = await getAdminApplicationMessages(applicationId);
        if (cancelled) return;
        const merged = (payload.threads || []).flatMap((thread) => thread.messages || []);
        setThreadMessages(merged);
      } catch {
        if (!cancelled) {
          setThreadMessages([]);
        }
      }
    };
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [details?.id, caseData?.applicationId]);

  const effectiveStage = resolveEffectiveStage(details?.stage || caseData?.stage, details, caseData);
  const serviceHint = String(details?.service_type || details?.service_name || caseData?.serviceType || "").toLowerCase();
  const isApostilleCase = serviceHint.includes("apostille");
  const apostilleAmountDue = resolveApostilleAmountDue(details, apostilleQuotedFee);
  const isEVisaCase = serviceHint.includes("evisa") || serviceHint.includes("e-visa") || serviceHint.includes("e visa");
  const paymentStatusLabel = resolveDisplayPaymentStatus(details, effectiveStage, isEVisaCase);
  const processStatusLabel = toStageLabel(effectiveStage);
  const isAuditPending = effectiveStage === "AUDIT_PENDING";
  const isDocumentsRequired = effectiveStage === "DOCUMENTS_REQUIRED";
  const isRejected = isDocumentsRequired && details?.audit_result === "red" && details?.application_status === "rejected";
  const quoteStatusUpper = String(details?.quote_status || "").trim().toUpperCase();
  const canSetPassportQuote = effectiveStage === "PASSPORT_QUOTE_PENDING" && (quoteStatusUpper === "" || quoteStatusUpper === "PENDING_QUOTE");

  const flaggedDocuments = useMemo(() => {
    const fromDetails = Array.isArray(details?.flagged_documents) ? details.flagged_documents : [];
    if (fromDetails.length > 0) {
      return fromDetails.map((item) => ({
        document_type: (item.document_type || "").trim().toLowerCase(),
        document_name: item.document_name || "",
        issue_reason: item.issue_reason || "",
        required_action: item.required_action || "",
      }));
    }

    const fromFindings = Array.isArray(details?.latest_audit_findings) ? details.latest_audit_findings : [];
    return fromFindings.map((finding) => ({
      document_type: (finding.document_type || "").trim().toLowerCase(),
      document_name: finding.document_name || "",
      issue_reason: finding.finding_description || "",
      required_action: finding.required_action || "",
    }));
  }, [details?.flagged_documents, details?.latest_audit_findings]);

  const overviewRequestedDocuments = useMemo(
    () => (Array.isArray(details?.document_overview?.requested_documents) ? details.document_overview.requested_documents : []),
    [details?.document_overview?.requested_documents]
  );

  const overviewUploadedDocuments = useMemo(
    () => (Array.isArray(details?.document_overview?.uploaded_documents) ? details.document_overview.uploaded_documents : []),
    [details?.document_overview?.uploaded_documents]
  );

  const hasFlaggedDocuments = flaggedDocuments.length > 0;
  const isAmberCorrection = isDocumentsRequired && details?.audit_result === "amber";
  const isEVisaCorrectionFlow = isDocumentsRequired && isEVisaCase && hasFlaggedDocuments;
  const applicationStatusLower = String(details?.application_status || "").toLowerCase();
  const isApostilleCorrectionFlow =
    isApostilleCase &&
    hasFlaggedDocuments &&
    (applicationStatusLower === "rejected" || applicationStatusLower === "correction_requested" || isDocumentsRequired);
  const customerMessageTimeline = useMemo(() => {
    type TimelineMessage = {
      createdAt: string;
      sender: "team" | "customer";
      subject: string;
      message: string;
    };

    const fromAdminMessages: TimelineMessage[] = Array.isArray(details?.admin_messages)
      ? details.admin_messages.map((msg) => ({
          createdAt: String(msg.created_at || ""),
          sender: "team" as const,
          subject: String(msg.subject || "FlyOCI update").trim() || "FlyOCI update",
          message: String(msg.message || "").trim(),
        }))
      : [];

    const customerNote = String(details?.notes || "").trim();

    const fromThreadMessages: TimelineMessage[] = threadMessages
      .map((item) => {
        const sender: "team" | "customer" = item.sender === "customer" ? "customer" : "team";
        const message = String(item.message_body || "").trim();
        if (!message) return null;
        // Notes field is shown separately — skip duplicate thread entry.
        if (sender === "customer" && customerNote && message === customerNote) {
          return null;
        }
        return {
          createdAt: String(item.created_at || ""),
          sender,
          subject: sender === "customer" ? "Customer message" : "FlyOCI team message",
          message,
        } as TimelineMessage;
      })
      .filter((item): item is TimelineMessage => Boolean(item));

    const fromCustomerNotes: TimelineMessage[] = customerNote
      ? [
          {
            createdAt: String(details?.updated_at || details?.application_date || details?.created_at || ""),
            sender: "customer",
            subject: "Customer note to FlyOCI Team",
            message: customerNote,
          },
        ]
      : [];

    const merged = [
      ...fromAdminMessages,
      ...fromThreadMessages,
      ...(isApostilleCase ? [] : fromCustomerNotes),
    ];
    const deduped = merged.filter((item, index, list) => {
      return (
        list.findIndex((candidate) =>
          candidate.sender === item.sender &&
          candidate.message === item.message &&
          candidate.createdAt === item.createdAt
        ) === index
      );
    });

    return deduped.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }, [
    details?.admin_messages,
    details?.notes,
    details?.updated_at,
    details?.application_date,
    details?.created_at,
    isApostilleCase,
    threadMessages,
  ]);

  const findingDocumentTypes = useMemo(() => {
    const normalize = (value?: string) => (value || "").trim().toLowerCase();
    const uploadedTypes = latestdocuments
      .map((doc) => normalize(doc.document_type))
      .filter(Boolean);

    const fromFlagged = flaggedDocuments
      .map((flagged) => {
        const flaggedType = normalize(flagged.document_type);
        if (flaggedType) {
          return flaggedType;
        }

        const flaggedName = normalize(flagged.document_name);
        if (!flaggedName) {
          return "";
        }

        const matchedUpload = latestdocuments.find((doc) => {
          const docName = normalize(doc.document_name);
          const originalName = normalize(doc.original_filename);
          const storedName = normalize(doc.stored_filename);
          return flaggedName === docName || flaggedName === originalName || flaggedName === storedName;
        });

        return normalize(matchedUpload?.document_type);
        
      })
      .filter(Boolean);

    return Array.from(new Set([...fromFlagged, ...uploadedTypes]));
  }, [flaggedDocuments, latestdocuments]);


  const latestDocuments = useMemo(() => {
  const map = new Map<string, AdminApplicationDocument>();

  latestdocuments.forEach((doc) => {
    const key = (doc.document_type || "").toLowerCase();
    const existing = map.get(key);

    const currentTime = new Date(doc.upload_date || doc.created_at || "").getTime();
    const existingTime = existing
      ? new Date(existing.upload_date || existing.created_at || "").getTime()
      : 0;

    if (!existing || currentTime > existingTime) {
      map.set(key, doc);
    }
  });

  return Array.from(map.values());
}, [latestdocuments]);

  const auditTabDocuments = useMemo(() => {
    if (isAuditPending) {
      return latestdocuments;
    }

    if (isDocumentsRequired && (isAmberCorrection || isEVisaCorrectionFlow)) {
      const normalize = (value?: string) => (value || "").trim().toLowerCase();
      const flaggedTypes = new Set(flaggedDocuments.map((doc) => normalize(doc.document_type)).filter(Boolean));
      const flaggedNames = new Set(flaggedDocuments.map((doc) => normalize(doc.document_name)).filter(Boolean));

      return latestdocuments.filter((doc) => {
        const docType = normalize(doc.document_type);
        const docName = normalize(doc.document_name);
        const originalName = normalize(doc.original_filename);
        const storedName = normalize(doc.stored_filename);

        return (
          flaggedTypes.has(docType) ||
          flaggedNames.has(docName) ||
          flaggedNames.has(originalName) ||
          flaggedNames.has(storedName)
        );
      });
    }

    return latestdocuments;
  }, [isAuditPending, isDocumentsRequired, isAmberCorrection, isEVisaCorrectionFlow, latestdocuments, flaggedDocuments]);

  const correctionRequestedAt = details?.correction_requested_at
    ? new Date(details.correction_requested_at).getTime()
    : details?.updated_at
      ? new Date(details.updated_at).getTime()
      : 0;
  const flaggedDocumentStatuses = useMemo(() => {
    return flaggedDocuments.map((flagged) => {
      const normalize = (value?: string) => (value || "").trim().toLowerCase();
      const matching = latestdocuments
        .filter((doc) => {
          const docType = normalize(doc.document_type);
          const docName = normalize(doc.document_name);
          const originalName = normalize(doc.original_filename);
          const storedName = normalize(doc.stored_filename);
          const flaggedType = normalize(flagged.document_type);
          const flaggedName = normalize(flagged.document_name);

          return (
            (Boolean(flaggedType) && docType === flaggedType) ||
            (Boolean(flaggedName) && (docName === flaggedName || originalName === flaggedName || storedName === flaggedName))
          );
        })
        .sort((a, b) => {
          const tsA = new Date((a.upload_date || a.created_at || "") as string).getTime();
          const tsB = new Date((b.upload_date || b.created_at || "") as string).getTime();
          return tsB - tsA;
        });

      const latest = matching[0];
      const uploadedAt = latest ? new Date((latest.upload_date || latest.created_at || "") as string).getTime() : 0;
      const reuploaded = Boolean(latest && Number.isFinite(uploadedAt) && correctionRequestedAt > 0 && uploadedAt > correctionRequestedAt);

      return {
        ...flagged,
        reuploaded,
        reuploadedAt: reuploaded && latest ? (latest.upload_date || latest.created_at || "") : "",
        uploadedDocumentName: latest ? toUploadedFileLabel(latest) : "",
        uploadStatusLabel: reuploaded ? "Re-uploaded" : "Awaiting upload",
      };
    });
  }, [flaggedDocuments, latestdocuments, correctionRequestedAt]);

  const overviewRequestedStatuses = useMemo(() => {
    if (overviewRequestedDocuments.length === 0) {
      return flaggedDocumentStatuses;
    }

    return overviewRequestedDocuments.map((requested) => {
      const requestedType = normalizeDocValue(requested.document_type);
      const requestedName = normalizeDocValue(requested.document_name);
      const matchingUpload = overviewUploadedDocuments
        .filter((uploaded) => {
          const uploadedType = normalizeDocValue(uploaded.document_type);
          const uploadedName = normalizeDocValue(uploaded.document_name);
          return (
            (Boolean(requestedType) && uploadedType === requestedType) ||
            (Boolean(requestedName) && uploadedName === requestedName)
          );
        })
        .sort((left, right) => {
          const leftTs = new Date(left.uploaded_at || "").getTime();
          const rightTs = new Date(right.uploaded_at || "").getTime();
          return rightTs - leftTs;
        })[0];

      const reuploaded = Boolean(matchingUpload?.is_reupload);
      return {
        document_type: requested.document_type || "",
        document_name: requested.document_name || toDocumentTypeLabel(requested.document_type || ""),
        issue_reason: requested.issue_reason || "",
        required_action: requested.required_action || "",
        reuploaded,
        reuploadedAt: matchingUpload?.uploaded_at || "",
        uploadedDocumentName: matchingUpload?.document_name || "",
        uploadStatusLabel: reuploaded ? "Re-uploaded" : "Awaiting upload",
      };
    });
  }, [overviewRequestedDocuments, overviewUploadedDocuments, flaggedDocumentStatuses]);

  const requestedDocumentStatuses =
    overviewRequestedDocuments.length > 0 ? overviewRequestedStatuses : flaggedDocumentStatuses;

  const evisaUploadedMetaById = useMemo(() => {
    const meta = new Map<
      number,
      { isRequested: boolean; isReupload: boolean; displayType: string; displayName: string; originalFilename: string }
    >();
    if (!isEVisaCase || overviewUploadedDocuments.length === 0) {
      return meta;
    }

    latestdocuments.forEach((doc) => {
      const docType = normalizeDocValue(doc.document_type);
      const docUploadedAt = new Date((doc.upload_date || doc.created_at || "") as string).getTime();
      const docNames = [doc.document_name, doc.original_filename, doc.stored_filename]
        .map((value) => normalizeDocValue(value))
        .filter(Boolean);

      const match = overviewUploadedDocuments.find((uploaded) => {
        const uploadedAt = uploaded.uploaded_at ? new Date(uploaded.uploaded_at).getTime() : NaN;
        if (Number.isFinite(uploadedAt) && Number.isFinite(docUploadedAt) && uploadedAt === docUploadedAt) {
          return true;
        }

        const uploadedType = normalizeDocValue(uploaded.document_type);
        const uploadedName = normalizeDocValue(uploaded.document_name);

        if (docType && uploadedType === docType && docNames.some((name) => name === uploadedName)) {
          return true;
        }

        return Boolean(docType) && docType !== "other" && uploadedType === docType;
      });

      if (match) {
        meta.set(doc.id, {
          isRequested: Boolean(match.is_requested),
          isReupload: Boolean(match.is_reupload),
          displayType: match.document_type || doc.document_type,
          displayName: match.document_name || doc.document_name || toDocumentTypeLabel(doc.document_type),
          originalFilename: String((match as { original_filename?: string }).original_filename || doc.original_filename || doc.stored_filename || ""),
        });
      }
    });

    return meta;
  }, [isEVisaCase, overviewUploadedDocuments, latestdocuments]);

  const allFlaggedReuploaded = Boolean(
    requestedDocumentStatuses.length > 0
      && requestedDocumentStatuses.every((item) => item.reuploaded === true)
  );

  const warnings: string[] = [];
  if (caseData?.slaBreached) warnings.push("SLA breached — case is overdue");
  if (isRejected) warnings.push("Application rejected — review required");
  if (isDocumentsRequired && !allFlaggedReuploaded) warnings.push("Waiting for customer to reupload documents");
  if (effectiveStage === "REVIEW_PENDING") warnings.push("Awaiting admin/senior review before submission");

  const correctedDocumentIds = useMemo(() => {
    if (requestedDocumentStatuses.length === 0 || correctionRequestedAt <= 0) {
      return new Set<number>();
    }

    const normalize = (value?: string) => (value || "").trim().toLowerCase();
    const ids = new Set<number>();

    latestdocuments.forEach((doc) => {
      const docType = normalize(doc.document_type);
      const docName = normalize(doc.document_name);
      const originalName = normalize(doc.original_filename);
      const storedName = normalize(doc.stored_filename);
      const uploadedAt = new Date((doc.upload_date || doc.created_at || "") as string).getTime();
      if (!Number.isFinite(uploadedAt) || uploadedAt <= correctionRequestedAt) {
        return;
      }

      const matchesFlagged = requestedDocumentStatuses.some((flagged) => {
        const flaggedType = normalize(flagged.document_type);
        const flaggedName = normalize(flagged.document_name);
        return (
          (Boolean(flaggedType) && flaggedType === docType) ||
          (Boolean(flaggedName) && (flaggedName === docName || flaggedName === originalName || flaggedName === storedName))
        );
      });

      if (matchesFlagged) {
        ids.add(doc.id);
      }
    });

    return ids;
  }, [requestedDocumentStatuses, latestdocuments, correctionRequestedAt]);

  const isReuploadPendingReview = String(details?.application_status || "").toLowerCase() === "reuploaded_pending_review";
  type ApostilleAdminDocument = {
    id: number;
    document_type?: string;
    document_name?: string;
    original_filename?: string;
    verification_status?: string;
    mime_type?: string;
  };

  const toApostilleDocumentLabel = (document: ApostilleAdminDocument) => {
    const displayName = (document.document_name || document.original_filename || "").trim();
    if (displayName) return displayName;
    return toDocumentTypeLabel(document.document_type || "other");
  };

  const apostilleDocuments = useMemo(
    () =>
      (
        ((details || {}) as Record<string, unknown>).documents as ApostilleAdminDocument[] | undefined
      )?.filter((doc) => Number.isFinite(doc.id)) || [],
    [details],
  );

  const panelDocuments = useMemo(() => {
    if (latestdocuments.length > 0) return latestdocuments;
    if (!isApostilleCase || apostilleDocuments.length === 0) return latestdocuments;
    return apostilleDocuments.map((doc) => ({
      id: doc.id,
      document_type: doc.document_type || "other",
      document_name: doc.document_name || doc.original_filename || "",
      original_filename: doc.original_filename || "",
      stored_filename: doc.original_filename || "",
      verification_status: doc.verification_status || "pending",
      mime_type: doc.mime_type || "",
      is_encrypted: Boolean(doc.is_encrypted),
      encryption_algorithm: doc.encryption_algorithm || "",
    })) as AdminApplicationDocument[];
  }, [apostilleDocuments, isApostilleCase, latestdocuments]);

  useEffect(() => {
    if (!details?.id || !details?.reference_number) return;
    if (!isDocumentsRequired || !(isAmberCorrection || isEVisaCorrectionFlow) || !allFlaggedReuploaded) return;

    const moveKey = `${details.id}:${details.reference_number}`;
    if (autoMovedCorrectionRef.current === moveKey) return;
    autoMovedCorrectionRef.current = moveKey;

    const autoMoveToAuditReview = async () => {
      try {
        await updateAdminApplicationStage(details.id, "AUDIT_PENDING");
        onStageResolved?.("AUDIT_PENDING");
        setActionBanner("All corrected documents uploaded. Moved to Audit Review.");
        toast.success("All corrected documents uploaded. Case moved to Audit Review.");
      } catch (error) {
        autoMovedCorrectionRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to move case to audit review.");
      }
    };

    void autoMoveToAuditReview();
  }, [
    details?.id,
    details?.reference_number,
    isDocumentsRequired,
    isAmberCorrection,
    isEVisaCorrectionFlow,
    allFlaggedReuploaded,
    onStageResolved,
  ]);

  const reloadDocuments = async () => {
    if (!details?.reference_number) return;
    try {
      const nextDocs = await getAdminApplicationDocuments(details.reference_number);
      setlatestdocuments(nextDocs);
    } catch {
      // Ignore fetch errors for inline refresh.
    }
  };

  const openDocumentFile = async (doc: AdminApplicationDocument, download = false) => {
    if (!doc.file_path) {
      toast.error("Document file is not available.");
      return;
    }

    try {
      const fileUrl = new URL(doc.file_path, window.location.origin);
      if (download) {
        fileUrl.searchParams.set("download", "1");
      }

      const endpoint = `${fileUrl.pathname}${fileUrl.search}`;
      const normalizedEndpoint = endpoint.startsWith("/api/") ? endpoint.slice(4) : endpoint;
      const response = await adminAuthenticatedFetch(normalizedEndpoint, {
        method: "GET",
        headers: {
          Accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch document file.");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const filename = doc.original_filename || doc.stored_filename || doc.document_name || `document-${doc.id}`;

      if (download) {
        const link = window.document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.style.display = "none";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open document file.");
    }
  };

  const addFinding = () => {
    const preferredType = findingDocumentTypes.find((type) => type !== "other") || findingDocumentTypes[0] || "";
    setFindings((prev) => [
      ...prev,
      {
        document_type: preferredType,
        finding_description: "",
        required_action: "",
        priority: "medium",
      },
    ]);
  };

  const updateFinding = (index: number, patch: Partial<AdminAuditFindingInput>) => {
    setFindings((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const removeFinding = (index: number) => {
    setFindings((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmitAudit = async (resultOverride?: "green" | "amber" | "red") => {
    if (!details?.reference_number) {
      toast.error("Reference number missing for this application.");
      return;
    }

    const selectedResult = resultOverride || auditResult;
    const overallStatus: "pass" | "needs_correction" | "incomplete" =
      selectedResult === "green" ? "pass" : selectedResult === "amber" ? "needs_correction" : "incomplete";

    const cleanedFindings = findings
      .map((item) => ({
        ...item,
        document_type: item.document_type.trim(),
        finding_description: item.finding_description.trim(),
        required_action: item.required_action.trim(),
      }))
      .filter((item) => item.document_type && item.finding_description);

    if (selectedResult === "amber" && cleanedFindings.length < 1) {
      toast.error("Minor issues requires at least one finding.");
      return;
    }

    if (selectedResult === "red") {
      if (!auditorNotes.trim()) {
        toast.error("Rejection requires auditor notes.");
        return;
      }
      const confirmed = window.confirm("This will reject the application. Continue?");
      if (!confirmed) {
        return;
      }
    }

    setIsSubmittingAudit(true);
    try {
      await submitAdminAuditResult({
        reference_number: details.reference_number,
        audit_result: selectedResult,
        overall_status: overallStatus,
        auditor_notes: auditorNotes.trim(),
        findings: cleanedFindings,
      });

      const nextStage: PipelineCase["stage"] = selectedResult === "green" ? "AUDIT_COMPLETED" : "DOCUMENTS_REQUIRED";
      onStageResolved?.(nextStage);
      await reloadDocuments();

      if (selectedResult === "green") {
        setActionBanner("✓ Audit passed. Card moved to Audit Completed.");
      } else if (selectedResult === "amber") {
        setActionBanner("⚠ Corrections requested. Email sent to customer.");
      } else {
        setActionBanner("✗ Application rejected. Email sent to customer.");
      }

      toast.success("Audit result submitted.");
      setActiveTab("overview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit audit result.");
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const handleAddDocRequest = () => {
    if (!requestDocDescription.trim()) {
      toast.error("Enter what is needed for this document.");
      return;
    }
    setPendingDocRequests((prev) => [
      ...prev,
      { doc_type: requestDocType, description: requestDocDescription.trim() },
    ]);
    setRequestDocDescription("");
  };

  const handleRemoveDocRequest = (index: number) => {
    setPendingDocRequests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRequestDocuments = async () => {
    if (isRequestingDocs) return;
    const allRequests = [
      ...pendingDocRequests,
      ...(requestDocDescription.trim()
        ? [{ doc_type: requestDocType, description: requestDocDescription.trim() }]
        : []),
    ];
    if (!details?.reference_number || allRequests.length === 0) {
      toast.error("Add at least one document request before sending.");
      return;
    }

    try {
      setIsRequestingDocs(true);

      if (isEVisaCase) {
        if (!details?.id) {
          toast.error("Application id missing.");
          return;
        }

        const flaggedDocs = allRequests.map((r) => ({
          document_type: r.doc_type,
          document_name: toDocumentTypeLabel(r.doc_type),
          issue_reason: r.description,
          required_action: r.description,
          status: "needs_fix",
        }));

        const requestLines = allRequests.map((r) => `• ${toDocumentTypeLabel(r.doc_type)}: ${r.description}`).join("\n");

        await patchAdminApplication(details.id, {
          stage: "DOCUMENT_UPLOAD_PENDING",
          correction_cause: "customer_error",
          notes: `Correction requested:\n${requestLines}`,
          flagged_documents: flaggedDocs,
        });

        await sendAdminCustomerMessage({
          application_id: details.id,
          reference_number: details.reference_number,
          subject: `FlyOCI - Please re-upload documents for ${details.reference_number}`,
          description: `Please re-upload the following document(s):\n${requestLines}`,
        });

        setActionBanner("Correction requested. Customer asked to re-upload documents.");
        onStageResolved?.("DOCUMENT_UPLOAD_PENDING");
        toast.success(`Re-upload request sent for ${allRequests.length} document(s).`);
        setShowRequestDocs(false);
        setRequestDocDescription("");
        setPendingDocRequests([]);
        return;
      }

      if (isApostilleCase) {
        const apostilleFileNumber = String(details?.file_number || caseData?.id || "").trim();
        if (!apostilleFileNumber) {
          toast.error("Apostille file number missing.");
          return;
        }

        const flaggedDocs = allRequests.map((r) => ({
          document_type: r.doc_type,
          document_name: toDocumentTypeLabel(r.doc_type),
          issue_reason: r.description,
          required_action: r.description,
          status: "needs_fix",
        }));
        const requestLines = allRequests
          .map((r) => `• ${toDocumentTypeLabel(r.doc_type)}: ${r.description}`)
          .join("\n");
        const reviewNote = [apostilleReviewNote.trim(), `Correction requested:\n${requestLines}`]
          .filter(Boolean)
          .join("\n\n");

        await patchAdminApostilleCase(apostilleFileNumber, {
          application_status: "rejected",
          review_note: reviewNote,
          flagged_documents: flaggedDocs,
        });

        setActionBanner("Correction requested. Customer can re-upload from track-apostille.");
        onStageResolved?.("DOCUMENTS_REQUIRED");
        toast.success(`Document request sent for ${allRequests.length} item(s).`);
        setShowRequestDocs(false);
        setRequestDocDescription("");
        setPendingDocRequests([]);
        return;
      }

      await submitAdminAuditResult({
        reference_number: details.reference_number,
        audit_result: "amber",
        overall_status: "needs_correction",
        auditor_notes: "",
        findings: allRequests.map((r) => ({
          document_type: r.doc_type,
          finding_description: r.description,
          required_action: r.description,
          priority: "medium",
        })),
      });
      setActionBanner("Request sent. Email dispatched to customer.");
      onStageResolved?.("DOCUMENTS_REQUIRED");
      toast.success(`Request sent for ${allRequests.length} document(s).`);
      setShowRequestDocs(false);
      setRequestDocDescription("");
      setPendingDocRequests([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send request.");
    } finally {
      setIsRequestingDocs(false);
    }
  };

  const handleSendMessage = async () => {
    if (isSendingCustomerMessage) return;
    if (!details?.reference_number || !staffMessage.trim()) {
      toast.error("Message text is required.");
      return;
    }

    try {
      setIsSendingCustomerMessage(true);
      await sendAdminCustomerMessage({
        application_id: details.id,
        reference_number: details.reference_number,
        subject: `FlyOCI update for ${details.reference_number}`,
        description: staffMessage.trim(),
      });
      setActionBanner("Message sent to customer.");
      toast.success("Message sent to customer.");
      setStaffMessage("");
      setShowSendMessage(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setIsSendingCustomerMessage(false);
    }
  };

  const handleMoveStage = async () => {
    if (!details?.id) {
      toast.error("Application id missing.");
      return;
    }

    try {
      await updateAdminApplicationStage(details.id, targetStage, {
        correctionCause: targetStage === "DOCUMENTS_REQUIRED" ? "customer_error" : undefined,
      });
      onStageResolved?.(targetStage);
      setActionBanner(`Moved to ${targetStage.replaceAll("_", " ")}.`);
      toast.success("Stage updated.");
      setShowMoveStage(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move stage.");
    }
  };

  const handleReopenCase = async () => {
    if (!details?.id) {
      toast.error("Application id missing.");
      return;
    }

    try {
      await reopenAdminApplication(details.id);
      onStageResolved?.("AUDIT_PENDING");
      setActionBanner("Case reopened and moved to Audit Pending.");
      toast.success("Case reopened for audit review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reopen case.");
    }
  };

  const handleReminder = async (type: "payment" | "upload") => {
    if (!details?.id) {
      toast.error("Application id missing.");
      return;
    }

    try {
      await sendAdminApplicationReminder(details.id, type);
      setActionBanner(type === "payment" ? "Reminder sent." : "Upload reminder sent.");
      toast.success(type === "payment" ? "Payment reminder sent." : "Upload reminder sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder.");
    }
  };

  const handleSetPassportQuote = async () => {
    if (!details?.id) {
      toast.error("Application id missing.");
      return;
    }

    const parsedAmount = Number.parseFloat(quoteAmountGbp);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid quote amount in GBP.");
      return;
    }

    const parsedDays = Number.parseInt(quoteValidDays, 10);
    if (!Number.isFinite(parsedDays) || parsedDays < 1) {
      toast.error("Validity days must be at least 1.");
      return;
    }

    const quote_amount_pence = Math.round(parsedAmount * 100);
    setIsSettingQuote(true);
    try {
      await setAdminPassportRenewalQuote(details.id, {
        quote_amount_pence,
        valid_days: parsedDays,
        quote_notes: quoteNotes.trim(),
      });
      onStageResolved?.("PAYMENT_PENDING");
      setActionBanner(`Passport quote set: GBP ${(quote_amount_pence / 100).toFixed(2)} (${parsedDays} days validity). Moved to Payment Pending.`);
      toast.success("Passport quote set successfully.");
      setShowSetQuote(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set passport quote.");
    } finally {
      setIsSettingQuote(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!details?.id) return;
    try {
      await updateAdminApplicationNotes(details.id, auditorNotes);
      toast.success("Notes saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save notes.");
    }
  };

  const handleSendInternalNote = async () => {
    if (!details?.id || isSendingInternalNote) return;
    if (!internalNoteDraft.trim()) {
      toast.error("Message text is required.");
      return;
    }
    if (!internalNoteRecipientId) {
      toast.error("Select who should receive this note.");
      return;
    }

    try {
      setIsSendingInternalNote(true);
      const recipientStaffId =
        internalNoteRecipientId === "all" ? "all" : Number(internalNoteRecipientId);
      const created = await sendAdminApplicationInternalMessage(details.id, {
        message_text: internalNoteDraft.trim(),
        recipient_staff_id: recipientStaffId,
      });
      setInternalMessages((prev) => [created, ...prev]);
      setInternalNoteDraft("");
      toast.success("Internal note sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send internal note.");
    } finally {
      setIsSendingInternalNote(false);
    }
  };

  const handleSaveApostille = async () => {
    const fileNumber = String(caseData?.id || "").trim();
    if (!fileNumber) {
      toast.error("Apostille file number is missing.");
      return;
    }

    setIsSavingApostille(true);
    try {
      const body: Record<string, unknown> = {
        review_note: apostilleReviewNote.trim(),
      };
      if (apostilleQuotedFee.trim()) {
        body.quoted_fee = apostilleQuotedFee.trim();
      }

      const updated = await patchAdminApostilleCase(fileNumber, body);
      if (updated.quoted_fee != null) {
        setApostilleQuotedFee(String(updated.quoted_fee));
      }
      if (typeof updated.review_note === "string") {
        setApostilleReviewNote(updated.review_note);
      }
      if (apostilleQuotedFee.trim() || updated.quoted_fee != null) {
        onStageResolved?.("PAYMENT_PENDING");
        setActionBanner("Quoted fee saved. Case moved to Payment Pending.");
      } else {
        setActionBanner("Apostille details saved.");
      }
      toast.success("Apostille details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save apostille details.");
    } finally {
      setIsSavingApostille(false);
    }
  };

  const handleMoveToAuditReview = async () => {
    if (!details?.id) return;
    try {
      await updateAdminApplicationStage(details.id, "AUDIT_PENDING");
      onStageResolved?.("AUDIT_PENDING");
      setActionBanner("Moved to Audit Review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move stage.");
    }
  };

  const handleSendToReview = async () => {
    if (!details?.id) return;
    const checklistSummary = Object.entries(formChecklist)
      .map(([key, value]) => `${key}:${value ? "yes" : "no"}`)
      .join(", ");

    try {
      await patchAdminApplication(details.id, {
        stage: "REVIEW_PENDING",
        notes: `${auditorNotes.trim()}\nChecklist: ${checklistSummary}`.trim(),
      });
      onStageResolved?.("REVIEW_PENDING");
      setActionBanner("Moved to Review Pending.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move to review.");
    }
  };

  const handleApproveForSubmission = async () => {
    if (!details?.id) return;
    if (effectiveStage === "READY_FOR_SUBMISSION") {
      toast.success("Already approved. Use Mark as Submitted below.");
      return;
    }
    try {
      await patchAdminApplication(details.id, { stage: "READY_FOR_SUBMISSION" });
      onStageResolved?.("READY_FOR_SUBMISSION");
      setActionBanner("Application approved for submission. Enter government reference to mark submitted.");
      toast.success("Approved for submission.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve for submission.");
    }
  };

  const handleSendBackToForm = async () => {
    if (!details?.id) return;
    try {
      await patchAdminApplication(details.id, {
        stage: "FORM_FILLING",
        notes: reviewSendBackReason.trim(),
      });
      onStageResolved?.("FORM_FILLING");
      setActionBanner("Sent back to Form Filling.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send back.");
    }
  };

  const handleMarkSubmitted = async () => {
    const isValidDate = Boolean(submissionDate) && /^\d{4}-\d{2}-\d{2}$/.test(submissionDate);

    if (!details?.id || !submissionGovRef.trim() || !isValidDate) {
      toast.error("Government reference and submission date are required.");
      return;
    }

    const formattedDate = submissionDate.includes("T")
      ? submissionDate
      : `${submissionDate}T09:00:00`;

    try {
      await patchAdminApplication(details.id, {
        stage: "SUBMITTED",
        submission_date: formattedDate,
        notes: `Submitted. Govt ref: ${submissionGovRef.trim()}`,
      });
      onStageResolved?.("SUBMITTED");
      setActionBanner("Marked as submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark submitted.");
    }
  };

  const handleMarkDelivered = async () => {
    const isValidDate = Boolean(decisionDate) && /^\d{4}-\d{2}-\d{2}$/.test(decisionDate);
    if (!details?.id || !isValidDate) {
      toast.error("Decision date is required.");
      return;
    }

    try {
      const notesLine = decisionReference.trim() ? `Decision ref: ${decisionReference.trim()}` : "Decision recorded.";
      await patchAdminApplication(details.id, {
        stage: "DELIVERED",
        approval_date: `${decisionDate}T09:00:00`,
        completion_date: `${decisionDate}T09:00:00`,
        notes: notesLine,
      });
      onStageResolved?.("DELIVERED");
      setActionBanner("Marked as delivered.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark delivered.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
        className={cn(
          "absolute inset-0 z-50 bg-white overflow-y-auto flex flex-col transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#D9E1EA] bg-white gap-6 flex-wrap shrink-0">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#D9E1EA] text-sm font-semibold text-[#486581] hover:text-[#102A43] shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="h-5 w-px bg-[#E5EAF0] shrink-0" />
            <p className="text-sm font-bold text-[#102A43] shrink-0">{caseData?.id || "Case"}</p>
            <span className="text-[#D9E1EA]">·</span>
            <p className="text-sm text-[#486581] truncate">{caseData?.customer || "—"}</p>
            <span className="text-[#D9E1EA]">·</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#33A1FD]/10 text-[#0B69B7] shrink-0">{caseData?.serviceType || "—"}</span>
            <span className="text-[#D9E1EA]">·</span>
            <span className="text-xs font-semibold text-[#486581] shrink-0">{toStageLabel(effectiveStage)}</span>
            <span className={cn("text-xs font-semibold shrink-0", caseData.slaBreached ? "text-[#B42318]" : "text-[#006F57]")}>
              SLA {caseData.slaTimer}
            </span>
          </div>
        </div>

        <div className="shrink-0 border-b border-[#E5EAF0] bg-white px-6 py-2">
          <div className="inline-flex rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-1">
            {(["overview", "messages", "audit", "documents"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors uppercase",
                  activeTab === tab ? "bg-white text-[#102A43] shadow-sm" : "text-[#627D98] hover:text-[#334E68]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-col w-full">
            <div className="px-5 pb-3 space-y-4">
              {activeTab === "overview" && (
                <>
                  <div className="bg-white rounded-[12px] border border-[#E5EAF0] p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Case Details</h3>
                    {detailsLoading && <p className="text-sm text-[#486581]">Loading full details...</p>}
                    {!detailsLoading && detailsError && <p className="text-sm text-[#B42318]">{detailsError}</p>}
                    {!detailsLoading && !detailsError && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {[
                          ["Reference", details?.reference_number || caseData.id],
                          ["Customer", details?.customer_name || caseData.customer],
                          ["Service", details?.service_name || details?.service_type || caseData.serviceType],
                          ["Stage", processStatusLabel],
                          ["Payment status", paymentStatusLabel],
                          ["SLA timer", caseData.slaTimer],
                          ["Assigned staff", caseData.assignedTo || "Unassigned"],
                          ["Created date", details?.created_at ? new Date(details.created_at).toLocaleString() : "-"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-2.5">
                            <p className="text-[10px] font-semibold text-[#9AA5B4] uppercase tracking-wide">{label}</p>
                            <p className="text-sm text-[#102A43] font-medium mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[12px] border border-[#E5EAF0] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setInternalNotesOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
                      aria-expanded={internalNotesOpen}
                    >
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Notes</span>
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        {internalMessages.length > 0 ? (
                          <span className="text-[10px] font-semibold text-[#627D98] normal-case">
                            {internalMessages.length} note{internalMessages.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-[#627D98] transition-transform duration-200",
                            internalNotesOpen ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </span>
                    </button>

                    {internalNotesOpen ? (
                      <div className="px-4 pb-4 space-y-3 border-t border-[#E5EAF0]">
                        {isLoadingInternalMessages ? (
                          <p className="text-sm text-[#627D98]">Loading notes...</p>
                        ) : internalMessages.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {internalMessages.map((message) => (
                              <div key={message.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-[#102A43]">
                                    {message.sender_name} → {message.recipient_name}
                                  </p>
                                  <p className="text-[10px] text-[#627D98] shrink-0">
                                    {message.created_at ? new Date(message.created_at).toLocaleString() : ""}
                                  </p>
                                </div>
                                <p className="mt-1.5 text-sm text-[#334E68] whitespace-pre-wrap">{message.message_text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#9AA5B4]">No internal notes yet.</p>
                        )}
                        <div className="space-y-2">
                          <InternalNoteRecipientSearch
                            staffRecipients={staffRecipients}
                            allowAllTeam={canSendToAllTeam}
                            value={internalNoteRecipientId}
                            onChange={setInternalNoteRecipientId}
                          />
                          <textarea
                            value={internalNoteDraft}
                            onChange={(event) => setInternalNoteDraft(event.target.value)}
                            placeholder="Write an internal note for your team..."
                            className="w-full min-h-[88px] rounded border border-[#D9E1EA] px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleSendInternalNote();
                            }}
                            disabled={isSendingInternalNote || !internalNoteDraft.trim() || !internalNoteRecipientId}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#102A43] text-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {isSendingInternalNote ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between py-2 mb-1">
                    <div>
                      <p className="text-[10px] font-semibold text-[#9AA5B4] uppercase tracking-wide">Current Task</p>
                      <p className="text-base font-semibold text-[#102A43]">{getNextActionLabel(effectiveStage)}</p>
                    </div>
                    <span className={cn(
                      "text-[11px] font-semibold px-3 py-1 rounded-full",
                      caseData.slaBreached ? "bg-[#FEF2F2] text-[#B42318]" : "bg-[#ECFDF5] text-[#006F57]"
                    )}>
                      {caseData.slaBreached ? "Overdue" : "On track"}
                    </span>
                  </div>

                  {warnings.length > 0 && (
                    <div className="rounded-[12px] border border-[#B42318]/30 bg-[#FEF2F2] p-4">
                      <p className="text-[11px] font-semibold text-[#B42318] uppercase tracking-wide mb-2">Warnings</p>
                      <ul className="space-y-1.5">
                        {warnings.map((warning) => (
                          <li key={warning} className="text-xs text-[#B42318] flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {actionBanner && (
                    <div className="rounded-lg border border-[#B7D7F7] bg-[#EFF7FF] px-3 py-2 text-sm text-[#0B69B7]">{actionBanner}</div>
                  )}
                </>
              )}

              {activeTab === "messages" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Messages</h3>
                  {customerMessageTimeline.length > 0 ? (
                    customerMessageTimeline.map((message, index) => (
                      <div key={`${message.createdAt}-${message.subject}-main-${index}`} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#102A43]">{message.subject}</p>
                            <p className="text-[10px] text-[#627D98] mt-1">{message.createdAt ? new Date(message.createdAt).toLocaleString() : "Date unknown"}</p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white text-[#486581] border-[#D9E1EA]">
                            {message.sender === "customer" ? "Customer" : "Team"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#334E68] whitespace-pre-wrap">{message.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#9AA5B4]">No messages yet.</p>
                  )}
                </div>
              )}

              {activeTab === "audit" && (isAuditPending || (isDocumentsRequired && isAmberCorrection)) && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Review</h3>
                {auditTabDocuments.map((document) => (
                  <div key={document.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#102A43]">{toDocumentTypeLabel(document.document_type)}</p>
                        <p className="text-xs text-[#627D98]">{document.original_filename || toDocumentDisplayTitle(document)}</p>
                        <p className="text-xs text-[#627D98]">{document.upload_date ? new Date(document.upload_date).toLocaleString() : "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void openDocumentFile(document, false);
                          }}
                          className="text-xs px-2 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openDocumentFile(document, true);
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#D9E1EA] uppercase">
                          {document.verification_status || "pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Findings</h4>
                    <button onClick={addFinding} className="text-xs px-2.5 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]">
                      + Add Finding
                    </button>
                  </div>
                  {findings.map((finding, index) => (
                    <div key={`${index}-${finding.document_type}`} className="rounded-lg border border-[#D9E1EA] p-3 bg-[#F8FAFC] space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                          value={finding.document_type}
                          onChange={(event) => updateFinding(index, { document_type: event.target.value })}
                          className="rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                        >
                          <option value="">Select document type</option>
                          {findingDocumentTypes.map((type) => (
                            <option key={type} value={type}>
                              {toDocumentTypeLabel(type)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={finding.priority}
                          onChange={(event) => updateFinding(index, { priority: event.target.value as AdminAuditFindingInput["priority"] })}
                          className="rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                        >
                          <option value="high">high</option>
                          <option value="medium">medium</option>
                          <option value="low">low</option>
                        </select>
                      </div>
                      <input
                        value={finding.finding_description}
                        onChange={(event) => updateFinding(index, { finding_description: event.target.value })}
                        placeholder="Issue description"
                        className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                      />
                      <input
                        value={finding.required_action}
                        onChange={(event) => updateFinding(index, { required_action: event.target.value })}
                        placeholder="Required action"
                        className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                      />
                      <button onClick={() => removeFinding(index)} className="text-xs px-2 py-1 rounded border border-[#E5EAF0] bg-white text-[#B42318]">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <textarea
                  value={auditorNotes}
                  onChange={(event) => setAuditorNotes(event.target.value)}
                  placeholder="Auditor notes"
                  className="w-full min-h-[96px] rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm text-[#102A43]"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button disabled={isSubmittingAudit} onClick={() => { void handleSubmitAudit("green"); }} className="text-xs px-3 py-2 rounded-lg bg-[#009877] text-white font-semibold">
                    ✓ PASS
                  </button>
                  <button disabled={isSubmittingAudit} onClick={() => { void handleSubmitAudit("amber"); }} className="text-xs px-3 py-2 rounded-lg bg-[#B87333] text-white font-semibold">
                    ⚠ MINOR ISSUES
                  </button>
                  <button disabled={isSubmittingAudit} onClick={() => { void handleSubmitAudit("red"); }} className="text-xs px-3 py-2 rounded-lg bg-[#B42318] text-white font-semibold">
                    ✗ REJECT
                  </button>
                </div>
              </div>
            </div>
          )}

              {activeTab === "documents" && (
              <div className="bg-white p-4 rounded-xl border border-blue-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documents</h3>
              {documentsLoading && <p className="text-sm text-[#486581]">Loading documents...</p>}
              {!documentsLoading && documentsError && !(isApostilleCase && apostilleDocuments.length > 0) && <p className="text-sm text-[#B42318]">{documentsError}</p>}
              {!documentsLoading && latestdocuments.length === 0 && (!isApostilleCase || apostilleDocuments.length === 0) && !documentsError && (
                <p className="text-sm text-[#627D98]">No uploaded documents available.</p>
              )}
              {!documentsLoading && !documentsError && latestdocuments.length > 0 && (
                <div className="space-y-2">
                  {latestdocuments.map((document) => (
                    <div key={document.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {(() => {
                            const evisaMeta = evisaUploadedMetaById.get(document.id);
                            const isRequestedDoc = Boolean(evisaMeta?.isRequested);
                            const isReuploadDoc = Boolean(evisaMeta?.isReupload || correctedDocumentIds.has(document.id));
                            return (
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                {isRequestedDoc ? (
                                  <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#FFF4E5] border border-[#FCD9B0] text-[#9C4F17] uppercase">
                                    Requested by Admin
                                  </span>
                                ) : null}
                                {isReuploadDoc ? (
                                  <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#ECFFF1] border border-[#B8E6C2] text-[#1F6B35] uppercase">
                                    Re-uploaded
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}
                          {(() => {
                            const evisaMeta = evisaUploadedMetaById.get(document.id);
                            const typeLabel = toDocumentTypeLabel(evisaMeta?.displayType || document.document_type);
                            const title = evisaMeta?.displayName || toDocumentDisplayTitle(document);
                            const fileLabel = evisaMeta?.originalFilename || document.original_filename || document.stored_filename || "";
                            return (
                              <>
                                <p className="text-sm font-semibold text-[#102A43]">{title}</p>
                                <p className="text-xs text-[#627D98]">Type: {typeLabel}</p>
                                {fileLabel && fileLabel !== title ? (
                                  <p className="text-xs text-[#627D98]">File: {fileLabel}</p>
                                ) : null}
                              </>
                            );
                          })()}
                          <p className="text-xs text-[#627D98]">Uploaded: {document.upload_date ? new Date(document.upload_date).toLocaleString() : "-"}</p>
                          {correctedDocumentIds.has(document.id) ? (
                            <span className="mt-1 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#ECFFF1] border border-[#B8E6C2] text-[#1F6B35] uppercase">
                              Corrected Upload
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void openDocumentFile(document, false);
                            }}
                            className="text-xs px-2 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void openDocumentFile(document, true);
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!documentsLoading && latestdocuments.length === 0 && isApostilleCase && (() => {
                if (apostilleDocuments.length === 0) {
                  return null;
                }
                return (
                  <div className="space-y-2">
                    {apostilleDocuments.map((document) => {
                      const docLabel = toApostilleDocumentLabel(document);
                      const typeLabel = toDocumentTypeLabel(document.document_type || "other");
                      const statusLabel = (document.verification_status || "pending").replace(/_/g, " ");
                      return (
                      <div key={`apostille-doc-${document.id}`} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#102A43] truncate">{docLabel}</p>
                            <p className="text-xs text-[#627D98]">
                              {typeLabel !== docLabel ? `${typeLabel} · ` : ""}
                              Status: {statusLabel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const blob = await downloadAdminApostilleDocumentBlob(document.id);
                                const url = URL.createObjectURL(blob);
                                const link = window.document.createElement("a");
                                link.href = url;
                                link.download = (document.original_filename || document.document_name || `apostille-document-${document.id}`).trim();
                                link.style.display = "none";
                                window.document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.setTimeout(() => URL.revokeObjectURL(url), 60000);
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Download failed");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#D9E1EA] bg-white text-[#334E68]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                );
              })()}
            </div>
              )}

              {activeTab === "overview" && (
              <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <h3 className="text-xs font-bold text-[#33A1FD] uppercase tracking-wider mb-2">Current Status</h3>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{toStageLabel(effectiveStage)}</span>
                    {isReuploadPendingReview ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF7FF] border border-[#B7D7F7] text-[#0B69B7] uppercase">
                        Re-upload Pending Review
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> SLA: {caseData.slaTimer}
                  </span>
                </div>
                {isApostilleCase ? (
                  <p className="mt-2 text-sm text-[#334E68]">
                    Quoted fee:{" "}
                    <span className="font-semibold text-[#102A43]">
                      {apostilleQuotedFee.trim()
                        ? `GBP ${apostilleQuotedFee.trim()}`
                        : details?.quoted_fee
                          ? `${details.quote_currency || "GBP"} ${details.quoted_fee}`
                          : "Not set"}
                    </span>
                  </p>
                ) : null}
              </div>

              {isApostilleCase && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setApostilleControlsOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
                    aria-expanded={apostilleControlsOpen}
                  >
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apostille Case Controls</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-[#627D98] transition-transform duration-200",
                        apostilleControlsOpen ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </button>

                  {apostilleControlsOpen ? (
                    <div className="px-4 pb-4 space-y-3 border-t border-[#E5EAF0]">
                      <label className="block text-xs font-semibold text-slate-600">Quoted fee (GBP)</label>
                      <input
                        type="text"
                        value={apostilleQuotedFee}
                        onChange={(event) => setApostilleQuotedFee(event.target.value)}
                        className="w-full rounded-lg border border-[#D9E1EA] px-2 py-2 text-sm"
                        placeholder="e.g. 85.00"
                      />

                      <label className="block text-xs font-semibold text-slate-600">Review note (customer-visible)</label>
                      <textarea
                        value={apostilleReviewNote}
                        onChange={(event) => setApostilleReviewNote(event.target.value)}
                        className="w-full rounded-lg border border-[#D9E1EA] px-2 py-2 text-sm"
                        rows={3}
                      />

                      <button
                        type="button"
                        onClick={() => { void handleSaveApostille(); }}
                        disabled={isSavingApostille}
                        className="inline-flex items-center rounded-lg bg-[#102A43] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isSavingApostille ? "Saving..." : "Save Apostille Changes"}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {isDocumentsRequired && (isAmberCorrection || isEVisaCorrectionFlow || isApostilleCorrectionFlow) && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <span className="inline-flex rounded-full bg-[#FFF4E5] px-2.5 py-1 text-xs font-semibold text-[#B45309] border border-[#FCD9B0]">Corrections Requested</span>
                  {(details?.latest_audit_findings || []).map((finding) => (
                    <div key={finding.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                      <p className="text-sm font-semibold text-[#102A43]">{finding.document_name || toDocumentTypeLabel(finding.document_type)}</p>
                      <p className="text-xs text-[#486581] mt-1">Issue: {finding.finding_description}</p>
                      <p className="text-xs text-[#486581]">Required action: {finding.required_action}</p>
                      <p className="text-xs text-[#486581]">Priority: {finding.priority}</p>
                    </div>
                  ))}

                  {requestedDocumentStatuses.length > 0 ? (
                    <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested Files</p>
                      {requestedDocumentStatuses.map((item, index) => (
                        <div key={`${item.document_type || item.document_name}-${index}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                          <p className="text-sm font-semibold text-[#102A43]">{(item.reuploaded && item.uploadedDocumentName) ? item.uploadedDocumentName : (item.document_name || toDocumentTypeLabel(item.document_type))}</p>
                          {(item.reuploaded && item.uploadedDocumentName && item.document_name) ? (
                            <p className="text-xs text-[#627D98]">Requested: {item.document_name}</p>
                          ) : null}
                          <p className="text-xs text-[#486581] mt-1">Issue: {item.issue_reason || "Correction required."}</p>
                          <p className="text-xs text-[#486581]">Required action: {item.required_action || "Please upload corrected document."}</p>
                          <p className="text-xs text-[#486581]">{item.reuploaded ? "✓" : "⏳"} {item.uploadStatusLabel}</p>
                          {item.reuploaded && item.uploadedDocumentName ? (
                            <p className="text-xs text-[#486581]">Uploaded file: {item.uploadedDocumentName}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2 text-xs text-[#486581]">
                    {requestedDocumentStatuses.map((item) => (
                      <div key={`${item.document_type}-${item.document_name}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                        <p className="font-semibold text-[#334E68]">{(item.reuploaded && item.uploadedDocumentName) ? item.uploadedDocumentName : (item.document_name || toDocumentTypeLabel(item.document_type))}</p>
                        {(item.reuploaded && item.uploadedDocumentName && item.document_name) ? <p>Requested: {item.document_name}</p> : null}
                        <p>Issue: {item.issue_reason || "Correction required."}</p>
                        <p>Required action: {item.required_action || "Please upload corrected document."}</p>
                        <p>{item.reuploaded ? "✓" : "⏳"} {item.uploadStatusLabel}</p>
                        {item.reuploaded && item.uploadedDocumentName ? <p>Uploaded file: {item.uploadedDocumentName}</p> : null}
                      </div>
                    ))}
                  </div>

                  {allFlaggedReuploaded && (
                    <button
                      type="button"
                      onClick={() => { void handleMoveToAuditReview(); }}
                      className="inline-flex items-center rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#334E68]"
                    >
                      Move to Audit Review
                    </button>
                  )}

                  <p className="text-xs text-[#627D98]">Email has been sent to customer requesting corrections.</p>
                </div>
              )}

              {isEVisaCase && (overviewRequestedDocuments.length > 0 || overviewUploadedDocuments.length > 0) && (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEvisaDocOverviewOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
                    aria-expanded={evisaDocOverviewOpen}
                  >
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EVisa Document Overview</span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-[#627D98] normal-case">
                        {overviewRequestedDocuments.length + overviewUploadedDocuments.length} doc(s)
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-[#627D98] transition-transform duration-200",
                          evisaDocOverviewOpen ? "rotate-180" : "rotate-0",
                        )}
                      />
                    </span>
                  </button>

                  {evisaDocOverviewOpen ? (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#E5EAF0]">
                  {overviewRequestedDocuments.length > 0 ? (
                    <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested by Admin</p>
                      {requestedDocumentStatuses.map((item, index) => (
                        <div key={`${item.document_type || item.document_name}-overview-${index}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                          <p className="text-sm font-semibold text-[#102A43]">{(item.reuploaded && item.uploadedDocumentName) ? item.uploadedDocumentName : (item.document_name || toDocumentTypeLabel(item.document_type))}</p>
                          {(item.reuploaded && item.uploadedDocumentName && item.document_name) ? (
                            <p className="text-xs text-[#627D98]">Requested: {item.document_name}</p>
                          ) : null}
                          <p className="text-xs text-[#486581] mt-1">{item.issue_reason || "Correction required."}</p>
                          <p className="text-xs text-[#486581]">{item.reuploaded ? "✓ Re-uploaded" : "⏳ Awaiting re-upload"}</p>
                          {item.reuploaded && item.uploadedDocumentName ? (
                            <p className="text-xs text-[#486581]">Uploaded file: {item.uploadedDocumentName}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {overviewUploadedDocuments.length > 0 ? (
                    <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded by Customer</p>
                      {overviewUploadedDocuments.map((item, index) => {
                        const typeLabel = toDocumentTypeLabel(item.document_type || "");
                        const originalFilename = String((item as { original_filename?: string }).original_filename || "");
                        return (
                        <div key={`${item.document_type || item.document_name}-uploaded-${index}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                          <p className="text-sm font-semibold text-[#102A43]">{item.document_name || typeLabel}</p>
                          <p className="text-xs text-[#486581]">Type: {typeLabel}</p>
                          {originalFilename && originalFilename !== item.document_name ? (
                            <p className="text-xs text-[#486581]">File: {originalFilename}</p>
                          ) : null}
                          <p className="text-xs text-[#486581]">Uploaded: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "-"}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.is_requested ? (
                              <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#FFF4E5] border border-[#FCD9B0] text-[#9C4F17] uppercase">
                                Requested File
                              </span>
                            ) : null}
                            {item.is_reupload ? (
                              <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#ECFFF1] border border-[#B8E6C2] text-[#1F6B35] uppercase">
                                Re-uploaded
                              </span>
                            ) : (
                              <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#EEF4FF] border border-[#B7D7F7] text-[#0B69B7] uppercase">
                                Initial Upload
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : null}
                  </div>
                  ) : null}
                </div>
              )}

              {isRejected && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <span className="inline-flex rounded-full bg-[#FEE4E2] px-2.5 py-1 text-xs font-semibold text-[#B42318] border border-[#FECDCA]">Rejected</span>
                  <p className="text-sm text-[#486581]">{details?.auditor_notes || "Application rejected."}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void handleReopenCase();
                    }}
                    className="inline-flex items-center rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#334E68]"
                  >
                    Reopen Case
                  </button>
                </div>
              )}

              {effectiveStage === "AUDIT_COMPLETED" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</h3>
                  <p className="text-sm text-[#334E68]">Amount due: GBP {toPounds(details?.amount_due_pence)}</p>
                  <p className="text-sm text-[#334E68]">Audit credit applied: GBP {toPounds(details?.audit_credit_pence)}</p>
                  <p className="text-sm text-[#334E68]">Full service fee: GBP {toPounds(details?.service_total_pence)}</p>
                  <span className="inline-flex rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#0B69B7] border border-[#B7D7F7]">Awaiting customer payment</span>
                  <p className="text-xs text-[#627D98]">Email sent to customer to complete payment.</p>
                </div>
              )}

              {effectiveStage === "PAYMENT_PENDING" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Monitoring</h3>
                  <p className="text-sm text-[#334E68]">
                    Amount due: {isApostilleCase ? `GBP ${apostilleAmountDue}` : `GBP ${toPounds(details?.amount_due_pence)}`}
                  </p>
                  <p className="text-sm text-[#334E68]">Status: Customer has not yet paid</p>
                  <button onClick={() => { void handleReminder("payment"); }} className="inline-flex items-center gap-1 rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#334E68]">
                    <Send className="w-3 h-3" /> Send Payment Reminder
                  </button>
                </div>
              )}

              {isApostilleCase && (details?.payment_confirmed || String(details?.full_payment_status || "").toLowerCase() === "paid") ? (
                <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment Received</h3>
                  <p className="text-sm text-[#334E68]">
                    Paid: GBP {apostilleAmountDue}
                    {details?.full_payment_id ? ` · Payment ID: ${details.full_payment_id}` : ""}
                  </p>
                </div>
              ) : null}

              {isApostilleCase && details?.final_submission_completed ? (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Submission Details</h3>
                  {(() => {
                    const delivery = (details as AdminApplication & { delivery?: Record<string, string> }).delivery || {};
                    const lines = [
                      delivery.delivery_name && `Name: ${delivery.delivery_name}`,
                      delivery.delivery_address_line1 && `Address: ${delivery.delivery_address_line1}`,
                      delivery.delivery_address_line2 && `Line 2: ${delivery.delivery_address_line2}`,
                      delivery.delivery_city && `City: ${delivery.delivery_city}`,
                      delivery.delivery_postcode && `Postcode: ${delivery.delivery_postcode}`,
                      delivery.delivery_country && `Country: ${delivery.delivery_country}`,
                      delivery.delivery_special_instructions && `Instructions: ${delivery.delivery_special_instructions}`,
                    ].filter(Boolean);
                    return lines.length ? (
                      <div className="space-y-1 text-sm text-[#334E68]">
                        {lines.map((line) => <p key={line}>{line}</p>)}
                      </div>
                    ) : (
                      <p className="text-sm text-[#627d98]">Final details submitted. Open Documents tab for uploaded files.</p>
                    );
                  })()}
                </div>
              ) : null}

              {effectiveStage === "DOCUMENT_UPLOAD_PENDING" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Status</h3>
                  <p className="text-sm text-[#334E68]">Payment confirmed. Waiting for customer to upload documents.</p>
                  <div className="space-y-1 text-xs text-[#486581]">
                    {findingDocumentTypes.map((type) => {
                      const uploaded = latestdocuments.some((doc) => (doc.document_type || "").toLowerCase() === type);
                      return <p key={type}>{uploaded ? "✓" : "⏳"} {toDocumentTypeLabel(type)}</p>;
                    })}
                  </div>
                  <button onClick={() => { void handleReminder("upload"); }} className="inline-flex items-center gap-1 rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#334E68]">
                    <Send className="w-3 h-3" /> Send Upload Reminder
                  </button>
                </div>
              )}

              {effectiveStage === "FORM_FILLING" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-4">
                  {(() => {
                    const detailsRecord = (details || {}) as Record<string, unknown>;
                    const hasValue = (value: unknown) => {
                      if (typeof value === "string") return value.trim().length > 0;
                      return value !== null && value !== undefined;
                    };

                    const serviceDisplay = details?.service_name || details?.service_type;
                    const caseSummaryRows = [
                      { label: "Reference", value: details?.reference_number },
                      { label: "Customer", value: details?.customer_name },
                      { label: "Service", value: serviceDisplay },
                      { label: "Nationality", value: detailsRecord["nationality"] },
                    ].filter((row) => hasValue(row.value));

                    const applicantRows = [
                      { label: "Name", value: details?.customer_name },
                      {
                        label: "Date of birth",
                        value: hasValue(detailsRecord["date_of_birth"])
                          ? new Date(String(detailsRecord["date_of_birth"])).toLocaleDateString()
                          : "",
                      },
                      { label: "Passport number", value: detailsRecord["passport_number"] },
                      { label: "Address", value: detailsRecord["address"] || detailsRecord["customer_address"] },
                      { label: "Email", value: detailsRecord["email"] },
                      { label: "Phone", value: detailsRecord["phone"] },
                    ].filter((row) => hasValue(row.value));

                    const checklistKeys = [
                      "government_form_completed",
                      "all_documents_verified",
                      "applicant_details_confirmed",
                      "payment_receipt_attached",
                      "declaration_completed",
                    ];

                    const completedCount = checklistKeys.filter((key) => Boolean(formChecklist[key])).length;
                    const allChecklistComplete = completedCount === checklistKeys.length;

                    return (
                      <>
                        <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Case Summary</h3>
                            <span className="inline-flex rounded-full bg-[#FFF4E5] px-2.5 py-1 text-xs font-semibold text-[#B45309] border border-[#FCD9B0]">Form filling</span>
                          </div>
                          {caseSummaryRows.map((row) => (
                            <p key={row.label} className="text-sm text-[#334E68]">
                              <span className="font-semibold text-[#102A43]">{row.label}:</span> {String(row.value)}
                            </p>
                          ))}
                        </div>

                        <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant Details</h3>
                          {applicantRows.length > 0 ? (
                            applicantRows.map((row) => (
                              <p key={row.label} className="text-sm text-[#334E68]">
                                <span className="font-semibold text-[#102A43]">{row.label}:</span> {String(row.value)}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-[#627D98]">No applicant details available</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</h3>
                          {documentsLoading ? (
                            <p className="text-sm text-[#486581]">Loading documents...</p>
                          ) : documentsError ? (
                            <p className="text-sm text-[#B42318]">{documentsError}</p>
                          ) : latestdocuments.length === 0 ? (
                            <p className="text-sm text-[#627D98]">No documents uploaded yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {latestdocuments.map((document, idx) => (
                                <div key={`${document.id || document.document_type || "doc"}-${idx}`} className="rounded-md border border-[#D9E1EA] bg-white p-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[#102A43]">{toDocumentDisplayTitle(document) || toDocumentTypeLabel(document.document_type)}</p>
                                      {document.original_filename || document.stored_filename ? (
                                        <p className="text-xs text-[#627D98] truncate">{document.original_filename || document.stored_filename}</p>
                                      ) : null}
                                      {document.upload_date ? (
                                        <p className="text-xs text-[#627D98]">{new Date(document.upload_date).toLocaleString()}</p>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void openDocumentFile(document, false);
                                        }}
                                        className="inline-flex items-center gap-1 rounded border border-[#D9E1EA] bg-white px-2 py-1 text-xs text-[#334E68]"
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void openDocumentFile(document, true);
                                        }}
                                        className="inline-flex items-center gap-1 rounded border border-[#D9E1EA] bg-white px-2 py-1 text-xs text-[#334E68]"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Checklist</h3>
                            <span className="text-xs font-semibold text-[#486581]">{completedCount} / 5</span>
                          </div>
                          {checklistKeys.map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-[#334E68]">
                              <input
                                type="checkbox"
                                checked={Boolean(formChecklist[key])}
                                onChange={(event) => {
                                  setFormChecklist((prev) => ({ ...prev, [key]: event.target.checked }));
                                }}
                              />
                              {key.replaceAll("_", " ")}
                            </label>
                          ))}
                          <button
                            onClick={() => {
                              void handleSendToReview();
                            }}
                            disabled={!allChecklistComplete}
                            className={`inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-2 text-xs font-semibold ${!allChecklistComplete ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <MoveRight className="w-3 h-3" /> Send to Review
                          </button>
                          {allChecklistComplete ? (
                            <p className="text-xs text-emerald-700">All checklist items are complete. Ready to send to review.</p>
                          ) : (
                            <p className="text-xs text-[#627D98]">Complete all checklist items to proceed</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {effectiveStage === "REVIEW_PENDING" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reviewer Panel</h3>
                  <p className="text-sm text-[#334E68]">Customer: {details?.customer_name || caseData.customer}</p>
                  <p className="text-sm text-[#334E68]">Service: {details?.service_name || details?.service_type || caseData.serviceType}</p>
                  <p className="text-sm text-[#334E68]">Reference: {details?.reference_number || caseData.id}</p>
                  {isApostilleCase && details?.file_number ? (
                    <p className="text-sm text-[#334E68]">File number: {details.file_number}</p>
                  ) : null}
                  <p className="text-sm text-[#334E68]">
                    Document count: {panelDocuments.length || details?.document_count || 0}
                  </p>
                  <p className="text-sm text-[#334E68]">Payment status: {paymentStatusLabel}</p>

                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Status</p>
                    {panelDocuments.length === 0 ? (
                      <p className="text-sm text-[#627D98]">No uploaded documents found.</p>
                    ) : (
                      panelDocuments
                        .slice()
                        .sort((left, right) => {
                          const leftTs = new Date(left.upload_date || left.created_at || "").getTime();
                          const rightTs = new Date(right.upload_date || right.created_at || "").getTime();
                          return rightTs - leftTs;
                        })
                        .map((document) => (
                          <div key={`review-doc-${document.id}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                            <p className="text-sm font-semibold text-[#102A43]">{toDocumentDisplayTitle(document)}</p>
                            <p className="text-xs text-[#486581]">Type: {toDocumentTypeLabel(document.document_type)}</p>
                            <p className="text-xs text-[#486581]">
                              Status: {(document.verification_status || "pending").replaceAll("_", " ")}
                            </p>
                            <p className="text-xs text-[#486581]">
                              Uploaded: {document.upload_date ? new Date(document.upload_date).toLocaleString() : "-"}
                            </p>
                          </div>
                        ))
                    )}
                  </div>

                  <textarea
                    value={reviewSendBackReason}
                    onChange={(event) => setReviewSendBackReason(event.target.value)}
                    placeholder="Reason if sending back"
                    className="w-full min-h-[72px] rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { void handleApproveForSubmission(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#009877] text-white px-3 py-2 text-xs font-semibold">
                      <CheckCircle className="w-3 h-3" /> Approve for Submission
                    </button>
                    <button onClick={() => { void handleSendBackToForm(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#B87333] text-white px-3 py-2 text-xs font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Send Back to Form Filling
                    </button>
                  </div>
                </div>
              )}

              {effectiveStage === "READY_FOR_SUBMISSION" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submit Application</h3>
                  <input
                    value={submissionGovRef}
                    onChange={(event) => setSubmissionGovRef(event.target.value)}
                    placeholder="Government submission reference"
                    className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={submissionDate}
                    onChange={(event) => setSubmissionDate(event.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />
                  <button onClick={() => { void handleMarkSubmitted(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#0B69B7] text-white px-3 py-2 text-xs font-semibold">
                    Mark as Submitted
                  </button>
                </div>
              )}

              {effectiveStage === "SUBMITTED" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Decision</h3>
                  <p className="text-sm text-[#334E68]">Government reference: {details?.notes || "Awaiting"}</p>
                  <p className="text-sm text-[#334E68]">Submission date: {details?.submission_date ? new Date(details.submission_date).toLocaleDateString() : "-"}</p>
                  <p className="text-sm text-[#334E68]">Estimated processing: 8-10 weeks</p>

                  <input
                    type="date"
                    value={decisionDate}
                    onChange={(event) => setDecisionDate(event.target.value)}
                    className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />
                  <input
                    value={decisionReference}
                    onChange={(event) => setDecisionReference(event.target.value)}
                    placeholder="Government reference (optional)"
                    className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />
                  <button onClick={() => { void handleMarkDelivered(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#009877] text-white px-3 py-2 text-xs font-semibold">
                    Mark as Delivered
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-[#E5EAF0] bg-[#F8FAFC] p-4">
                <p className="text-[10px] font-semibold text-[#9AA5B4] uppercase tracking-wide mb-3">Allowed Actions</p>
                <ul className="space-y-2">
                  {getAllowedActions(effectiveStage).map((action) => (
                    <li key={action} className="text-xs text-[#486581] flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#009877] shrink-0 mt-1" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[12px] border border-[#E5EAF0] bg-white p-4 space-y-2">
                <p className="text-[10px] font-semibold text-[#9AA5B4] uppercase tracking-wide mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => { setShowRequestDocs((prev) => !prev); if (showRequestDocs) { setPendingDocRequests([]); setRequestDocDescription(""); } }} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium">
                    <FileText className="w-4 h-4 text-[#33A1FD]" /> Request Documents
                  </button>
                  <button onClick={() => setShowSendMessage((prev) => !prev)} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium">
                    <MessageSquare className="w-4 h-4 text-[#0B69B7]" /> Send Message
                  </button>
                  <button onClick={() => setShowMoveStage((prev) => !prev)} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium">
                    <MoveRight className="w-4 h-4 text-[#B87333]" /> Move Stage
                  </button>
                  <button onClick={() => setActiveTab("documents")} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium">
                    <FileText className="w-4 h-4 text-[#009877]" /> View Documents
                  </button>
                  {effectiveStage === "PASSPORT_QUOTE_PENDING" ? (
                    <button onClick={() => setShowSetQuote((prev) => !prev)} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium col-span-2">
                      <Send className="w-4 h-4 text-[#0B69B7]" /> Set Passport Quote
                    </button>
                  ) : null}
                </div>

                {showSetQuote && effectiveStage === "PASSPORT_QUOTE_PENDING" && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-[#102A43]">Set Quote for Passport Renewal</p>
                    {!canSetPassportQuote ? (
                      <p className="text-[11px] text-[#B42318]">Quote cannot be set because current status is {quoteStatusUpper || "N/A"}.</p>
                    ) : null}
                    <input
                      value={quoteAmountGbp}
                      onChange={(event) => setQuoteAmountGbp(event.target.value)}
                      placeholder="Quote amount in GBP (e.g. 89.99)"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                    />
                    <input
                      value={quoteValidDays}
                      onChange={(event) => setQuoteValidDays(event.target.value)}
                      placeholder="Validity days"
                      type="number"
                      min="1"
                      step="1"
                      className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                    />
                    <textarea
                      value={quoteNotes}
                      onChange={(event) => setQuoteNotes(event.target.value)}
                      placeholder="Quote notes (optional)"
                      className="w-full min-h-[72px] rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => { void handleSetPassportQuote(); }}
                      disabled={isSettingQuote || !canSetPassportQuote}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                    >
                      {isSettingQuote ? "Setting quote..." : "Confirm Set Quote"}
                    </button>
                  </div>
                )}

                {showRequestDocs && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-[#102A43]">Request Documents</p>

                    {requestedDocumentStatuses.length > 0 ? (
                      <div className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2 space-y-1">
                        <p className="text-[11px] font-semibold text-[#627D98]">Already Requested</p>
                        {requestedDocumentStatuses.map((item, index) => (
                          <p key={`${item.document_type || item.document_name}-${index}`} className="text-[11px] text-[#486581]">
                            • {(item.reuploaded && item.uploadedDocumentName) ? item.uploadedDocumentName : (item.document_name || toDocumentTypeLabel(item.document_type))} ({item.uploadStatusLabel})
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {/* Pending requests queue */}
                    {pendingDocRequests.length > 0 ? (
                      <div className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2 space-y-1">
                        <p className="text-[11px] font-semibold text-[#0B69B7]">Queued ({pendingDocRequests.length})</p>
                        {pendingDocRequests.map((r, i) => (
                          <div key={i} className="flex items-start justify-between gap-1">
                            <p className="text-[11px] text-[#102A43]">• <span className="font-medium">{toDocumentTypeLabel(r.doc_type)}</span>: {r.description}</p>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocRequest(i)}
                              className="text-[10px] text-[#B42318] font-semibold hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Add document row */}
                    <select value={requestDocType} onChange={(event) => setRequestDocType(event.target.value)} className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs">
                      {Object.keys(DOCUMENT_TYPE_LABELS).map((type) => (
                        <option key={type} value={type}>{toDocumentTypeLabel(type)}</option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <input
                        value={requestDocDescription}
                        onChange={(event) => setRequestDocDescription(event.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDocRequest(); } }}
                        placeholder="Describe what is needed"
                        className="flex-1 rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddDocRequest}
                        className="rounded border border-[#0B69B7] bg-white text-[#0B69B7] px-2 py-1.5 text-xs font-semibold hover:bg-[#EBF5FF]"
                      >
                        + Add
                      </button>
                    </div>

                    <button
                      onClick={() => { void handleRequestDocuments(); }}
                      disabled={isRequestingDocs || (pendingDocRequests.length === 0 && !requestDocDescription.trim())}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      {isRequestingDocs ? "Sending..." : `Send Request${pendingDocRequests.length > 0 ? ` (${pendingDocRequests.length + (requestDocDescription.trim() ? 1 : 0)} doc${pendingDocRequests.length + (requestDocDescription.trim() ? 1 : 0) > 1 ? "s" : ""})` : ""}`}
                    </button>
                  </div>
                )}

                {showSendMessage && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <textarea
                      value={staffMessage}
                      onChange={(event) => setStaffMessage(event.target.value)}
                      placeholder="Write your message"
                      className="w-full min-h-[86px] rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => { void handleSendMessage(); }}
                      disabled={isSendingCustomerMessage}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      {isSendingCustomerMessage ? "Sending..." : "Send"}
                    </button>
                  </div>
                )}

                {showMoveStage && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <p className="text-[11px] text-[#9AA5B4]">Admin: Manual stage move</p>
                    <select value={targetStage} onChange={(event) => setTargetStage(event.target.value as PipelineCase["stage"])} className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs">
                      {KANBAN_STAGE_OPTIONS.map((stage) => (
                        <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                    <button onClick={() => { void handleMoveStage(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold">
                      Confirm Move
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    toast("Escalate to admin feature coming soon.", { icon: "🔔" });
                  }}
                  className="w-full rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5 text-xs font-semibold text-[#486581] hover:border-[#B42318]/40 hover:text-[#B42318] transition-colors"
                >
                  Escalate to Admin
                </button>
              </div>
            </div>
            </div>
              )}
          </div>

        </div>
      </div>
    </div>
  );
}
