import {
  getAdminApostilleDetail,
  getAdminApplicationDetails,
  getAdminApplicationDocuments,
  type AdminApplication,
  type AdminApplicationDocument,
} from "@/lib/admin-auth";
import { type PipelineCase } from "@/lib/kanban";

export type AdminKanbanCase = PipelineCase & {
  applicationId: number;
  createdAt: string;
  updatedAt: string;
  applicationStatus: string;
  auditResult: string;
  nextAction?: string;
};

const STAGE_ALIAS: Record<string, PipelineCase["stage"]> = {
  NEW_LEAD: "NEW_LEAD",
  PASSPORT_QUOTE_PENDING: "PAYMENT_PENDING",
  ASSESSMENT_PENDING: "ASSESSMENT_PENDING",
  ASSESSMENT_COMPLETED: "ASSESSMENT_COMPLETED",
  AUDIT_PENDING: "ASSESSMENT_PENDING",
  AUDIT_COMPLETED: "ASSESSMENT_COMPLETED",
  DOCUMENTS_REQUIRED: "DOCUMENTS_REQUIRED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  UPLOAD_PENDING: "DOCUMENT_UPLOAD_PENDING",
  DOCUMENT_UPLOAD_PENDING: "DOCUMENT_UPLOAD_PENDING",
  FORM_FILLING: "FORM_FILLING",
  REVIEW_PENDING: "REVIEW_PENDING",
  READY_FOR_SUBMISSION: "READY_FOR_SUBMISSION",
  SUBMITTED: "SUBMITTED",
  DELIVERED: "DELIVERED",
};

const toStage = (rawStage?: string): PipelineCase["stage"] => {
  const normalized = (rawStage || "").trim().toUpperCase().replace(/\s+/g, "_");
  return STAGE_ALIAS[normalized] || "NEW_LEAD";
};

const normalizeServiceType = (serviceType?: string, caseType?: string): PipelineCase["serviceType"] => {
  const normalized = (serviceType || "").toLowerCase();
  const normalizedCaseType = (caseType || "").toLowerCase();
  if (normalizedCaseType.includes("apostille")) return "Apostille";
  if (normalized.includes("apostille")) return "Apostille";
  if (normalized.includes("passport")) return "Passport Renewal";
  if (normalized.includes("visa")) return "E-Visa";
  return "OCI";
};

export const resolveAdminCaseStage = (item: AdminApplication): PipelineCase["stage"] => {
  const rawStage = String(item.stage || item.current_stage || item.kanban_stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  const auditResult = String(item.audit_result || "").toLowerCase();
  const applicationStatus = String(item.application_status || "").toLowerCase();
  const fullPaymentStatus = String(item.full_payment_status || "").toLowerCase();
  const serviceHint = String(item.service_type || item.service_name || "").toLowerCase();
  const quoteStatus = String((item as { quote_status?: string }).quote_status || "").trim().toUpperCase();
  const isEVisaCase = serviceHint.includes("evisa") || serviceHint.includes("e-visa") || serviceHint.includes("e visa");
  const isPassportCase = serviceHint.includes("passport");
  const isApostilleCase = serviceHint.includes("apostille") || String(item.case_type || "").toLowerCase().includes("apostille");
  const hasDocuments = Number(item.document_count || 0) > 0;
  const quotedFee = Number.parseFloat(String((item as { quoted_fee?: string | number | null }).quoted_fee ?? ""));
  const hasQuotedFee = Number.isFinite(quotedFee) && quotedFee > 0;
  const paymentConfirmed =
    Boolean((item as { payment_confirmed?: boolean }).payment_confirmed) || fullPaymentStatus === "paid";
  const finalCompleted = Boolean((item as { final_submission_completed?: boolean }).final_submission_completed);

  if (isApostilleCase) {
    const kanbanStage = String(item.kanban_stage || item.stage || "").trim().toUpperCase().replace(/\s+/g, "_");
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
    if (applicationStatus === "under_review" || rawStage === "INITIAL_REVIEW" || rawStage === "ASSESSMENT_PENDING") {
      return "ASSESSMENT_PENDING";
    }
    return (STAGE_ALIAS[rawStage] || "ASSESSMENT_PENDING") as PipelineCase["stage"];
  }

  // Passport legacy quote states → PAYMENT_PENDING (docs) / NEW_LEAD (no docs).
  if (
    isPassportCase &&
    (rawStage === "INITIAL_REVIEW" || rawStage === "PASSPORT_QUOTE_PENDING" || applicationStatus === "pending_quote" || quoteStatus === "PENDING_QUOTE")
  ) {
    return hasDocuments ? "PAYMENT_PENDING" : "NEW_LEAD";
  }

  if (isPassportCase && (applicationStatus === "quoted" || ["QUOTED", "EXPIRED", "QUOTE_ACCEPTED"].includes(quoteStatus))) {
    return "PAYMENT_PENDING";
  }

  const backendStage = String(item.stage || "").trim();
  if (backendStage) {
    return toStage(backendStage);
  }

  if (rawStage === "CORRECTION_REQUESTED" || applicationStatus === "correction_requested" || applicationStatus === "reuploaded_pending_review") {
    return "DOCUMENTS_REQUIRED";
  }

  if (auditResult === "red" || applicationStatus === "rejected") {
    return "DOCUMENTS_REQUIRED";
  }

  if (isEVisaCase) {
    if (rawStage === "DELIVERED" || rawStage === "CLOSED" || rawStage === "DECISION_RECEIVED") {
      return "DELIVERED";
    }
    if (rawStage === "SUBMITTED") return "SUBMITTED";
    if (rawStage === "READY_FOR_SUBMISSION") return "READY_FOR_SUBMISSION";
    if (rawStage === "REVIEW_PENDING") return "REVIEW_PENDING";
    if (rawStage === "FORM_FILLING" || rawStage === "IN_PREPARATION" || rawStage === "DOCS_RECEIVED") {
      return "FORM_FILLING";
    }
    if (rawStage === "PAID") {
      return hasDocuments ? "FORM_FILLING" : "DOCUMENT_UPLOAD_PENDING";
    }
    if (rawStage === "CORRECTION_REQUESTED") return "DOCUMENT_UPLOAD_PENDING";
    if (rawStage === "PAYMENT_PENDING" || rawStage === "EMAIL_CONFIRMED" || applicationStatus === "payment_pending") {
      return "PAYMENT_PENDING";
    }
    if (rawStage === "REGISTERED" || applicationStatus === "draft") return "NEW_LEAD";
    return (STAGE_ALIAS[rawStage] || "FORM_FILLING") as PipelineCase["stage"];
  }

  if (rawStage === "REGISTERED" || applicationStatus === "draft") return "NEW_LEAD";
  if (["SUBMITTED", "DELIVERED"].includes(rawStage)) return rawStage as PipelineCase["stage"];
  if (rawStage === "REVIEW_PENDING" || rawStage === "READY_FOR_SUBMISSION") return rawStage as PipelineCase["stage"];
  if (fullPaymentStatus === "paid") return "FORM_FILLING";
  if (auditResult === "green" && ["pending", "created"].includes(fullPaymentStatus)) return "PAYMENT_PENDING";
  if (rawStage === "PAYMENT_PENDING" || applicationStatus === "payment_pending") return "PAYMENT_PENDING";
  if (rawStage === "FORM_FILLING" || rawStage === "IN_PREPARATION") return "FORM_FILLING";
  if (rawStage === "CORRECTION_REQUESTED" || auditResult === "amber") return "DOCUMENTS_REQUIRED";
  if (auditResult === "pending" || rawStage === "ASSESSMENT_PENDING" || rawStage === "DOCS_RECEIVED") return "ASSESSMENT_PENDING";
  if (rawStage === "ASSESSMENT_COMPLETED") {
    return auditResult === "green" ? "PAYMENT_PENDING" : "ASSESSMENT_COMPLETED";
  }

  return (STAGE_ALIAS[rawStage] || "NEW_LEAD") as PipelineCase["stage"];
};

const getNextAction = (stage: PipelineCase["stage"]): string => {
  const map: Partial<Record<PipelineCase["stage"], string>> = {
    NEW_LEAD: "Open lead and assign service",
    ASSESSMENT_PENDING: "Review uploaded documents",
    ASSESSMENT_COMPLETED: "Send payment link to customer",
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

const getPaymentStatus = (item: AdminApplication): PipelineCase["paymentStatus"] => {
  if (
    item.full_payment_status === "paid"
    || item.audit_payment_status === "paid"
    || Boolean((item as { payment_confirmed?: boolean }).payment_confirmed)
  ) {
    return "Paid";
  }
  if (item.audit_payment_status === "created" || item.full_payment_status === "created") {
    return "Prepaid";
  }
  return "Pending";
};

export const adminApplicationToKanbanCase = (item: AdminApplication): AdminKanbanCase => {
  const createdAt = item.created_at || new Date().toISOString();
  const ageHours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
  const st = String(item.service_type || "").toLowerCase();
  const ct = String(item.case_type || "").toLowerCase();
  const isApostille = st.includes("apostille") || ct.includes("apostille");
  const displayId =
    isApostille && (item.file_number || "").trim()
      ? String(item.file_number).trim()
      : item.reference_number || `APP-${item.id}`;
  const stage = resolveAdminCaseStage(item);
  const feePlan = String(item.fee_plan_code || "").trim().toLowerCase();
  return {
    applicationId: item.id,
    createdAt,
    updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
    applicationStatus: String(item.application_status || ""),
    auditResult: String(item.audit_result || ""),
    id: displayId,
    customer: item.customer_name || `Customer ${item.id}`,
    serviceType: normalizeServiceType(item.service_type, item.case_type),
    country: "",
    flag: "",
    amount: 0,
    paymentStatus: getPaymentStatus(item),
    stage,
    nextAction: getNextAction(stage),
    assignedTo: item.assigned_staff ? String(item.assigned_staff) : null,
    slaTimer: `${ageHours}h`,
    slaBreached: ageHours >= 24 * 7,
    isExpress: feePlan === "express" || feePlan.startsWith("express") || Boolean(item.is_express),
  };
};

export type AdminCaseSlideOverPayload = {
  caseData: AdminKanbanCase;
  details: AdminApplication | null;
  documents: AdminApplicationDocument[];
  detailsError: string | null;
  documentsError: string | null;
};

export async function loadAdminCaseSlideOver(applicationId: number): Promise<AdminCaseSlideOverPayload> {
  const details = await getAdminApplicationDetails(applicationId);
  let caseData = adminApplicationToKanbanCase(details);
  const isApostilleCase = caseData.serviceType === "Apostille";

  if (isApostilleCase) {
    let mergedDetails: AdminApplication | null = details;
    let detailsError: string | null = null;
    try {
      const apostilleData = (await getAdminApostilleDetail(caseData.id)) as Record<string, unknown>;
      mergedDetails = {
        ...details,
        ...(apostilleData as Partial<AdminApplication>),
        id: details.id ?? applicationId,
        reference_number: String(details.reference_number || apostilleData.reference_number || caseData.id),
        file_number: String(apostilleData.file_number || details.file_number || caseData.id),
        service_type: String(details.service_type || apostilleData.service_type || "Apostille Services"),
        flagged_documents: (apostilleData.flagged_documents as AdminApplication["flagged_documents"]) || details.flagged_documents,
        document_overview: (apostilleData.document_overview as AdminApplication["document_overview"]) || details.document_overview,
        documents: (apostilleData.documents as AdminApplication["documents"]) || details.documents,
        quoted_fee: (apostilleData.quoted_fee as AdminApplication["quoted_fee"]) ?? details.quoted_fee ?? null,
        quote_currency: String(apostilleData.quote_currency || details.quote_currency || "GBP"),
        amount_due_pence: Number(apostilleData.amount_due_pence ?? apostilleData.quote_amount_pence ?? details.amount_due_pence ?? 0),
        review_note: String(apostilleData.review_note || details.review_note || ""),
        internal_admin_notes: String(apostilleData.internal_admin_notes || details.internal_admin_notes || ""),
        application_status: String(apostilleData.application_status || details.application_status || ""),
        kanban_stage: String(apostilleData.kanban_stage || details.kanban_stage || ""),
        stage: String(apostilleData.kanban_stage || details.stage || details.kanban_stage || ""),
        payment_confirmed: Boolean(apostilleData.payment_confirmed ?? details.payment_confirmed),
        full_payment_status: String(apostilleData.full_payment_status || details.full_payment_status || ""),
        final_submission_completed: Boolean(
          apostilleData.final_submission_completed ?? details.final_submission_completed,
        ),
        full_payment_id: String(apostilleData.full_payment_id || details.full_payment_id || ""),
        delivery: (apostilleData.delivery as AdminApplication["delivery"]) || details.delivery,
        correction_requested_at: String(
          apostilleData.correction_requested_at || details.correction_requested_at || "",
        ) || undefined,
      } as AdminApplication;
      caseData = adminApplicationToKanbanCase(mergedDetails);
      caseData.id = String(mergedDetails.file_number || caseData.id);

      const referenceNumber = String(mergedDetails.reference_number || "").trim();
      let documents: AdminApplicationDocument[] = [];
      let documentsError: string | null = null;
      if (referenceNumber) {
        try {
          documents = await getAdminApplicationDocuments(referenceNumber);
        } catch (error) {
          documentsError = error instanceof Error ? error.message : "Failed to load documents.";
        }
      }
      if (documents.length === 0 && Array.isArray(apostilleData.documents)) {
        documents = (apostilleData.documents as Array<Record<string, unknown>>).map((doc) => ({
          id: Number(doc.id),
          document_type: String(doc.document_type || "other"),
          document_name: String(doc.document_name || ""),
          original_filename: String(doc.original_filename || ""),
          stored_filename: String(doc.original_filename || ""),
          verification_status: String(doc.verification_status || "pending"),
          mime_type: String(doc.mime_type || ""),
          is_encrypted: Boolean(doc.is_encrypted),
          encryption_algorithm: String(doc.encryption_algorithm || ""),
        })) as AdminApplicationDocument[];
      }
      return {
        caseData,
        details: mergedDetails,
        documents,
        detailsError,
        documentsError,
      };
    } catch (error) {
      detailsError = error instanceof Error ? error.message : "Failed to load apostille details.";
    }
    return {
      caseData,
      details: mergedDetails,
      documents: [],
      detailsError,
      documentsError: null,
    };
  }

  const referenceNumber = String(details.reference_number || caseData.id).trim();
  let documents: AdminApplicationDocument[] = [];
  let documentsError: string | null = null;
  try {
    documents = await getAdminApplicationDocuments(referenceNumber);
  } catch (error) {
    documentsError = error instanceof Error ? error.message : "Failed to load documents.";
  }

  return {
    caseData,
    details,
    documents,
    detailsError: null,
    documentsError,
  };
}
