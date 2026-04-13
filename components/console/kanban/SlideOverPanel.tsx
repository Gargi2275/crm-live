"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Clock, FileText, MessageSquare, MoveRight, Send, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PipelineCase } from "@/lib/kanban";
import {
  adminAuthenticatedFetch,
  getAdminApplicationDocuments,
  patchAdminApplication,
  reopenAdminApplication,
  sendAdminApplicationReminder,
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

const toPounds = (pence?: number) => ((pence || 0) / 100).toFixed(2);

const resolveEffectiveStage = (stage?: string, details?: AdminApplication | null, caseData?: PipelineCase | null): PipelineCase["stage"] => {
  const rawStage = String(stage || details?.stage || caseData?.stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  const auditResult = String(details?.audit_result || "").toLowerCase();
  const applicationStatus = String(details?.application_status || "").toLowerCase();
  const fullPaymentStatus = String(details?.full_payment_status || "").toLowerCase();
  const amountDue = Number(details?.amount_due_pence || 0);

  if (["SUBMITTED", "DELIVERED"].includes(rawStage)) {
    return rawStage as PipelineCase["stage"];
  }

  if (auditResult === "red" || applicationStatus === "rejected") {
    return "DOCUMENTS_REQUIRED";
  }

  if (rawStage === "REVIEW_PENDING" || rawStage === "READY_FOR_SUBMISSION") {
    return rawStage as PipelineCase["stage"];
  }

  if (fullPaymentStatus === "paid" || amountDue <= 0) {
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
  const [activeTab, setActiveTab] = useState<"overview" | "audit" | "documents">("overview");
  const [auditResult, setAuditResult] = useState<"green" | "amber" | "red">("green");
  const [auditorNotes, setAuditorNotes] = useState("");
  const [findings, setFindings] = useState<AdminAuditFindingInput[]>([]);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [actionBanner, setActionBanner] = useState("");

  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);

  const [requestDocType, setRequestDocType] = useState("passport");
  const [requestDocDescription, setRequestDocDescription] = useState("");

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
    setTargetStage(((details?.stage || caseData?.stage) || "NEW_LEAD") as PipelineCase["stage"]);
  }, [caseData?.id, details?.auditor_notes, details?.stage, caseData?.stage]);

  const effectiveStage = resolveEffectiveStage(details?.stage || caseData?.stage, details, caseData);
  const isAuditPending = effectiveStage === "AUDIT_PENDING";
  const isDocumentsRequired = effectiveStage === "DOCUMENTS_REQUIRED";
  const isRejected = isDocumentsRequired && details?.audit_result === "red" && details?.application_status === "rejected";
  const isAmberCorrection = isDocumentsRequired && details?.audit_result === "amber";

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

    if (isDocumentsRequired && isAmberCorrection) {
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
  }, [isAuditPending, isDocumentsRequired, isAmberCorrection, latestdocuments, flaggedDocuments]);

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
        uploadStatusLabel: reuploaded ? "Re-uploaded" : "Awaiting upload",
      };
    });
  }, [flaggedDocuments, latestdocuments, correctionRequestedAt]);

  const allFlaggedReuploaded = Boolean(
    flaggedDocumentStatuses.length > 0
      && flaggedDocumentStatuses.every((item) => item.reuploaded === true)
  );

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
      await updateAdminApplicationStage(details.id, targetStage);
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
    if (!details?.id || !submissionGovRef.trim() || !submissionDate) {
      toast.error("Government reference and submission date are required.");
      return;
    }

    try {
      await patchAdminApplication(details.id, {
        stage: "SUBMITTED",
        current_stage: "submitted",
        submission_date: `${submissionDate}T09:00:00`,
        notes: `Submitted. Govt ref: ${submissionGovRef.trim()}`,
      });
      onStageResolved?.("SUBMITTED");
      setActionBanner("Marked as submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark submitted.");
    }
  };

  const handleMarkDelivered = async () => {
    if (!details?.id || !decisionDate) {
      toast.error("Decision date is required.");
      return;
    }

    try {
      const notesLine = decisionReference.trim() ? `Decision ref: ${decisionReference.trim()}` : "Decision recorded.";
      await patchAdminApplication(details.id, {
        stage: "DELIVERED",
        current_stage: "closed",
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
            {(["overview", "audit", "documents"] as const).map((tab) => (
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
                          <p className="text-sm font-semibold text-[#102A43]">{toDocumentDisplayTitle(document)}</p>
                          <p className="text-xs text-[#627D98]">Type: {toDocumentTypeLabel(document.document_type)}</p>
                          <p className="text-xs text-[#627D98]">Uploaded: {document.upload_date ? new Date(document.upload_date).toLocaleString() : "-"}</p>
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
                  <span className="font-semibold text-slate-900">{(details?.stage || caseData.stage).replaceAll("_", " ")}</span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> SLA: {caseData.slaTimer}
                  </span>
                </div>
              </div>

              {isDocumentsRequired && isAmberCorrection && (
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

                  <div className="space-y-2 text-xs text-[#486581]">
                    {flaggedDocumentStatuses.map((item) => (
                      <div key={`${item.document_type}-${item.document_name}`} className="rounded-md border border-[#D9E1EA] bg-white px-2.5 py-2">
                        <p className="font-semibold text-[#334E68]">{item.document_name || toDocumentTypeLabel(item.document_type)}</p>
                        <p>Issue: {item.issue_reason || "Correction required."}</p>
                        <p>Required action: {item.required_action || "Please upload corrected document."}</p>
                        <p>{item.reuploaded ? "✓" : "⏳"} {item.uploadStatusLabel}</p>
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
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Form Filling</h3>
                  {Object.entries(formChecklist).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-[#334E68]">
                      <input
                        type="checkbox"
                        checked={value}
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
                    onBlur={() => { void handleSaveNotes(); }}
                    placeholder="Internal notes"
                    className="w-full min-h-[80px] rounded-lg border border-[#D9E1EA] px-3 py-2 text-sm"
                  />
                  <button onClick={() => { void handleSendToReview(); }} className="inline-flex items-center gap-1 rounded-lg bg-[#102A43] text-white px-3 py-2 text-xs font-semibold">
                    <MoveRight className="w-3 h-3" /> Send to Review
                  </button>
                </div>
              )}

              {effectiveStage === "REVIEW_PENDING" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reviewer Panel</h3>
                  <p className="text-sm text-[#334E68]">Customer: {details?.customer_name || caseData.customer}</p>
                  <p className="text-sm text-[#334E68]">Service: {details?.service_name || details?.service_type || caseData.serviceType}</p>
                  <p className="text-sm text-[#334E68]">Reference: {details?.reference_number || caseData.id}</p>
                  <p className="text-sm text-[#334E68]">Document count: {latestdocuments.length}</p>
                  <p className="text-sm text-[#334E68]">Payment status: {details?.full_payment_status || details?.audit_payment_status || "pending"}</p>

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
                </div>

                {showRequestDocs && (
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
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
                    <p><span className="font-semibold text-[#102A43]">Status:</span> {details.application_status || "-"}</p>
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
