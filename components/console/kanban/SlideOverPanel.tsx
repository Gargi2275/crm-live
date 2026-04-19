"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Clock, FileText, MessageSquare, MoveRight, Send, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PipelineCase } from "@/lib/kanban";
import {
  adminAuthenticatedFetch,
  getAdminApplicationDocuments,
  patchAdminApplication,
  reopenAdminApplication,
  sendAdminApplicationReminder,
  setAdminPassportRenewalQuote,
  sendAdminCustomerMessage,
  submitAdminAuditResult,
  updateAdminApplicationStage,
  updateAdminApplicationNotes,
  type AdminApplication,
  type AdminApplicationDocument,
  type AdminAuditFindingInput,
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

const toStageLabel = (stage: PipelineCase["stage"] | string) =>
  String(stage || "")
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
  const hasDocuments = Number(details?.document_count || 0) > 0;

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
  const autoMovedCorrectionRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "audit" | "documents">("overview");
  const [auditResult, setAuditResult] = useState<"green" | "amber" | "red">("green");
  const [auditorNotes, setAuditorNotes] = useState("");
  const [findings, setFindings] = useState<AdminAuditFindingInput[]>([]);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [actionBanner, setActionBanner] = useState("");

  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const [showSetQuote, setShowSetQuote] = useState(false);

  const [requestDocType, setRequestDocType] = useState("passport");
  const [requestDocDescription, setRequestDocDescription] = useState("");
  const [quoteAmountGbp, setQuoteAmountGbp] = useState("");
  const [quoteValidDays, setQuoteValidDays] = useState("7");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [isSettingQuote, setIsSettingQuote] = useState(false);

  const [staffMessage, setStaffMessage] = useState("");
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
    setActiveTab("overview");
    setAuditResult("green");
    setAuditorNotes(details?.auditor_notes || "");
    setFindings([]);
    setActionBanner("");
    setShowRequestDocs(false);
    setShowSendMessage(false);
    setShowMoveStage(false);
    setShowSetQuote(false);
    setQuoteAmountGbp("");
    setQuoteValidDays("7");
    setQuoteNotes("");
    setIsSettingQuote(false);
    autoMovedCorrectionRef.current = null;
    setTargetStage(((details?.stage || caseData?.stage) || "NEW_LEAD") as PipelineCase["stage"]);
  }, [caseData?.id, details?.auditor_notes, details?.stage, caseData?.stage]);

  const effectiveStage = resolveEffectiveStage(details?.stage || caseData?.stage, details, caseData);
  const serviceHint = String(details?.service_type || details?.service_name || caseData?.serviceType || "").toLowerCase();
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

  const evisaRequestedStatuses = useMemo(() => {
    if (!isEVisaCase || overviewRequestedDocuments.length === 0) {
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

      const matchingLatestDocument = latestdocuments
        .filter((doc) => {
          const docType = normalizeDocValue(doc.document_type);
          const docName = normalizeDocValue(doc.document_name);
          const originalName = normalizeDocValue(doc.original_filename);
          const storedName = normalizeDocValue(doc.stored_filename);
          return (
            (Boolean(requestedType) && docType === requestedType) ||
            (Boolean(requestedName) && (docName === requestedName || originalName === requestedName || storedName === requestedName))
          );
        })
        .sort((left, right) => {
          const leftTs = new Date(left.upload_date || left.created_at || "").getTime();
          const rightTs = new Date(right.upload_date || right.created_at || "").getTime();
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
        uploadedDocumentName: matchingLatestDocument ? toUploadedFileLabel(matchingLatestDocument) : (matchingUpload?.document_name || ""),
        uploadStatusLabel: reuploaded ? "Re-uploaded" : "Awaiting upload",
      };
    });
  }, [isEVisaCase, overviewRequestedDocuments, overviewUploadedDocuments, flaggedDocumentStatuses, latestdocuments]);

  const requestedDocumentStatuses = isEVisaCase && overviewRequestedDocuments.length > 0
    ? evisaRequestedStatuses
    : flaggedDocumentStatuses;

  const evisaUploadedMetaById = useMemo(() => {
    const meta = new Map<number, { isRequested: boolean; isReupload: boolean }>();
    if (!isEVisaCase || overviewUploadedDocuments.length === 0) {
      return meta;
    }

    latestdocuments.forEach((doc) => {
      const docType = normalizeDocValue(doc.document_type);
      const docNames = [doc.document_name, doc.original_filename, doc.stored_filename]
        .map((value) => normalizeDocValue(value))
        .filter(Boolean);

      const match = overviewUploadedDocuments.find((uploaded) => {
        const uploadedType = normalizeDocValue(uploaded.document_type);
        const uploadedName = normalizeDocValue(uploaded.document_name);

        if (docType && uploadedType === docType && docNames.some((name) => name === uploadedName)) {
          return true;
        }

        return Boolean(docType) && uploadedType === docType;
      });

      if (match) {
        meta.set(doc.id, {
          isRequested: Boolean(match.is_requested),
          isReupload: Boolean(match.is_reupload),
        });
      }
    });

    return meta;
  }, [isEVisaCase, overviewUploadedDocuments, latestdocuments]);

  const allFlaggedReuploaded = Boolean(
    requestedDocumentStatuses.length > 0
      && requestedDocumentStatuses.every((item) => item.reuploaded === true)
  );

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

  const handleRequestDocuments = async () => {
    if (!details?.reference_number || !requestDocDescription.trim()) {
      toast.error("Select a document and enter what is required.");
      return;
    }

    try {
      const requestLine = `${toDocumentTypeLabel(requestDocType)}: ${requestDocDescription.trim()}`;

      if (isEVisaCase) {
        if (!details?.id) {
          toast.error("Application id missing.");
          return;
        }

        const nextRequestedDocument = {
          document_type: requestDocType,
          document_name: toDocumentTypeLabel(requestDocType),
          issue_reason: requestDocDescription.trim(),
          required_action: requestDocDescription.trim(),
          status: "needs_fix",
        };
        const latestRequestedDocuments = [nextRequestedDocument];

        await patchAdminApplication(details.id, {
          stage: "DOCUMENT_UPLOAD_PENDING",
          correction_cause: "customer_error",
          notes: `Correction requested: ${requestLine}`,
          flagged_documents: latestRequestedDocuments,
        });

        await sendAdminCustomerMessage({
          application_id: details.id,
          reference_number: details.reference_number,
          subject: `FlyOCI - Please re-upload document for ${details.reference_number}`,
          description: `Please re-upload the following document:\n${requestLine}`,
        });

        setActionBanner("Correction requested. Customer asked to re-upload documents.");
        onStageResolved?.("DOCUMENT_UPLOAD_PENDING");
        toast.success("Re-upload request sent to customer.");
        setShowRequestDocs(false);
        setRequestDocDescription("");
        return;
      }

      await submitAdminAuditResult({
        reference_number: details.reference_number,
        audit_result: "amber",
        overall_status: "needs_correction",
        auditor_notes: "",
        findings: [
          {
            document_type: requestDocType,
            finding_description: requestDocDescription.trim(),
            required_action: requestDocDescription.trim(),
            priority: "medium",
          },
        ],
      });
      setActionBanner("Request sent. Email dispatched to customer.");
      onStageResolved?.("DOCUMENTS_REQUIRED");
      toast.success("Request sent to customer.");
      setShowRequestDocs(false);
      setRequestDocDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send request.");
    }
  };

  const handleSendMessage = async () => {
    if (!details?.reference_number || !staffMessage.trim()) {
      toast.error("Message text is required.");
      return;
    }

    try {
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
    try {
      await patchAdminApplication(details.id, { stage: "READY_FOR_SUBMISSION" });
      onStageResolved?.("READY_FOR_SUBMISSION");
      setActionBanner("Application approved for submission.");
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

  if (!isOpen || !caseData) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full md:w-[620px] bg-[#F0F4FF] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-blue-200 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-blue-200 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{caseData.id}</h2>
            <p className="text-sm text-slate-500">{caseData.customer} • {caseData.serviceType}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-blue-50 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 bg-white border-b border-blue-200">
          <div className="inline-flex rounded-lg border border-[#D9E1EA] p-1 bg-[#F8FAFC]">
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {actionBanner && (
            <div className="rounded-lg border border-[#B7D7F7] bg-[#EFF7FF] px-3 py-2 text-sm text-[#0B69B7]">{actionBanner}</div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Customer Messages</h3>
                {!details?.admin_messages || details.admin_messages.length === 0 ? (
                  <p className="text-sm text-[#627D98]">No messages from customer yet.</p>
                ) : (
                  <div className="space-y-3">
                    {details.admin_messages.map((msg, index) => (
                      <div key={`msg-${index}`} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#102A43]">{msg.subject || "Customer Message"}</p>
                            <p className="text-[10px] text-[#627D98] mt-1">{msg.created_at ? new Date(msg.created_at).toLocaleString() : "Date unknown"}</p>
                          </div>
                        </div>
                        <p className="text-sm text-[#334E68] whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              {!documentsLoading && documentsError && <p className="text-sm text-[#B42318]">{documentsError}</p>}
              {!documentsLoading && !documentsError && latestdocuments.length === 0 && (
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
                          <p className="text-sm font-semibold text-[#102A43]">{toDocumentDisplayTitle(document)}</p>
                          <p className="text-xs text-[#627D98]">Type: {toDocumentTypeLabel(document.document_type)}</p>
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
            </div>
          )}

          {activeTab === "overview" && (
            <>
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
              </div>

              {isDocumentsRequired && (isAmberCorrection || isEVisaCorrectionFlow) && (
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
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">EVisa Document Overview</h3>

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
                      {overviewUploadedDocuments.map((item, index) => (
                        <div key={`${item.document_type || item.document_name}-uploaded-${index}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                          <p className="text-sm font-semibold text-[#102A43]">{item.document_name || toDocumentTypeLabel(item.document_type || "")}</p>
                          <p className="text-xs text-[#486581]">Type: {toDocumentTypeLabel(item.document_type || "")}</p>
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
                      ))}
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
                  <p className="text-sm text-[#334E68]">Amount due: GBP {toPounds(details?.amount_due_pence)}</p>
                  <p className="text-sm text-[#334E68]">Status: Customer has not yet paid</p>
                  <button onClick={() => { void handleReminder("payment"); }} className="inline-flex items-center gap-1 rounded-lg border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#334E68]">
                    <Send className="w-3 h-3" /> Send Payment Reminder
                  </button>
                </div>
              )}

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
                          <textarea
                            value={auditorNotes}
                            onChange={(event) => setAuditorNotes(event.target.value)}
                            onBlur={() => {
                              void handleSaveNotes();
                            }}
                            placeholder="Internal notes"
                            className="w-full min-h-[80px] rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                          />
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
                  <p className="text-sm text-[#334E68]">Document count: {latestdocuments.length}</p>
                  <p className="text-sm text-[#334E68]">Payment status: {paymentStatusLabel}</p>

                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Status</p>
                    {latestdocuments.length === 0 ? (
                      <p className="text-sm text-[#627D98]">No uploaded documents found.</p>
                    ) : (
                      latestdocuments
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

              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => setShowRequestDocs((prev) => !prev)} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium">
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
                    {requestedDocumentStatuses.length > 0 ? (
                      <div className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2 space-y-1">
                        <p className="text-[11px] font-semibold text-[#102A43]">Already Requested Files</p>
                        {requestedDocumentStatuses.map((item, index) => (
                          <p key={`${item.document_type || item.document_name}-${index}`} className="text-[11px] text-[#486581]">
                            • {(item.reuploaded && item.uploadedDocumentName) ? item.uploadedDocumentName : (item.document_name || toDocumentTypeLabel(item.document_type))} ({item.uploadStatusLabel})
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <select value={requestDocType} onChange={(event) => setRequestDocType(event.target.value)} className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs">
                      {Object.keys(DOCUMENT_TYPE_LABELS).map((type) => (
                        <option key={type} value={type}>{toDocumentTypeLabel(type)}</option>
                      ))}
                    </select>
                    <input
                      value={requestDocDescription}
                      onChange={(event) => setRequestDocDescription(event.target.value)}
                      placeholder="Describe what is needed"
                      className="w-full rounded border border-[#D9E1EA] px-2 py-1.5 text-xs"
                    />
                    <button onClick={() => { void handleRequestDocuments(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold">
                      Send Request
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
                    <button onClick={() => { void handleSendMessage(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-1.5 text-xs font-semibold">
                      Send
                    </button>
                  </div>
                )}

                {showMoveStage && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
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
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Application Details</h3>
                {detailsLoading && <p className="text-sm text-[#486581]">Loading full details...</p>}
                {!detailsLoading && detailsError && <p className="text-sm text-[#B42318]">{detailsError}</p>}
                {!detailsLoading && !detailsError && details && (
                  <div className="space-y-1 text-sm text-[#334E68]">
                    <p><span className="font-semibold text-[#102A43]">Reference:</span> {details.reference_number}</p>
                    <p><span className="font-semibold text-[#102A43]">Service:</span> {details.service_name || details.service_type || "-"}</p>
                    <p><span className="font-semibold text-[#102A43]">Status:</span> {processStatusLabel}</p>
                    <p><span className="font-semibold text-[#102A43]">Backend status:</span> {details.application_status || "-"}</p>
                    <p><span className="font-semibold text-[#102A43]">Created:</span> {details.created_at ? new Date(details.created_at).toLocaleString() : "-"}</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Case Notes</h3>
                <textarea
                  value={auditorNotes}
                  onChange={(event) => setAuditorNotes(event.target.value)}
                  onBlur={() => { void handleSaveNotes(); }}
                  placeholder="Internal notes"
                  className="w-full min-h-[88px] rounded border border-[#D9E1EA] px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
