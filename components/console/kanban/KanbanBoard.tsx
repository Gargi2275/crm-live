"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { SlideOverPanel } from "./SlideOverPanel";
import {
  KANBAN_COLUMNS,
  displayServiceLabel,
  isApplicationFullyPaid,
  isPassportRenewalService,
  matchesServiceFilter,
  normalizeServiceCategory,
  resolvePipelinePaymentStatus,
  stageAfterPayment,
  type PipelineCase,
} from "@/lib/kanban";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminApostilleDetail,
  getAdminApplicationDetails,
  getAdminApplicationDocuments,
  listAdminApplications,
  type AdminApplication,
  type AdminApplicationDocument,
  updateAdminApplicationStage,
} from "@/lib/admin-auth";
import toast from "react-hot-toast";

type KanbanCase = PipelineCase & {
  applicationId: number;
  createdAt: string;
  updatedAt: string;
  applicationStatus: string;
  auditResult: string;
  nextAction?: string;
};

export type KanbanQuickFilter =
  | "sla_health"
  | "evisa_total"
  | "evisa_pending"
  | "evisa_approved"
  | "evisa_rejected"
  | "evisa_action_required"
  | "evisa_reupload_pending_review"
  | "sla_at_risk"
  | "sla_breached"
  | "escalations"
  | "open_cases"
  | "documents_requested"
  | "live_stages";

export type KanbanViewMode = "pipeline" | "list";

interface KanbanBoardProps {
  quickFilter?: KanbanQuickFilter | null;
  serviceFilter?: string;
  staffFilter?: string;
  ageingFilter?: string;
  searchQuery?: string;
  viewMode?: KanbanViewMode;
}

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

const STAGE_MOVE_ROLES = ["admin", "founder"];

const toStage = (rawStage?: string): PipelineCase["stage"] => {
  const normalized = (rawStage || "").trim().toUpperCase().replace(/\s+/g, "_");
  return STAGE_ALIAS[normalized] || "NEW_LEAD";
};

const getStageBadgeClass = (stage: PipelineCase["stage"]) => {
  switch (stage) {
    case "NEW_LEAD":
      return "bg-[#E0F2FE] text-[#0B69B7] border-[#B7D7F7]";
    case "ASSESSMENT_PENDING":
      return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
    case "ASSESSMENT_COMPLETED":
      return "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]";
    case "DOCUMENTS_REQUIRED":
      return "bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]";
    case "PAYMENT_PENDING":
      return "bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8]";
    case "DOCUMENT_UPLOAD_PENDING":
      return "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]";
    case "FORM_FILLING":
      return "bg-[#ECFEFF] text-[#155E75] border-[#A5F3FC]";
    case "REVIEW_PENDING":
      return "bg-[#FEF9C3] text-[#854D0E] border-[#FDE047]";
    case "READY_FOR_SUBMISSION":
      return "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]";
    case "SUBMITTED":
      return "bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]";
    case "DELIVERED":
      return "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]";
    default:
      return "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]";
  }
};

const resolveStage = (item: AdminApplication): PipelineCase["stage"] => {
  const rawStage = String(item.stage || item.current_stage || item.kanban_stage || "").trim().toUpperCase().replace(/\s+/g, "_");
  const auditResult = String(item.audit_result || "").toLowerCase();
  const applicationStatus = String(item.application_status || "").toLowerCase();
  const fullPaymentStatus = String(item.full_payment_status || "").toLowerCase();
  const serviceHint = String(item.service_type || item.service_name || "").toLowerCase();
  const quoteStatus = String((item as { quote_status?: string }).quote_status || "").trim().toUpperCase();
  const isEVisaCase = serviceHint.includes("evisa") || serviceHint.includes("e-visa") || serviceHint.includes("e visa");
  const isPassportCase = isPassportRenewalService(item.service_type, item.service_name);
  const isApostilleCase =
    serviceHint.includes("apostille") || String(item.case_type || "").toLowerCase().includes("apostille");
  const hasDocuments = Number(item.document_count || 0) > 0;
  const paymentConfirmed = isApplicationFullyPaid(item);

  // Paid cases must never fall back to Payment Pending / New Lead (all services).
  if (paymentConfirmed) {
    return stageAfterPayment(rawStage, hasDocuments);
  }

  if (isApostilleCase) {
    const kanbanStage = String(item.kanban_stage || item.stage || "").trim().toUpperCase().replace(/\s+/g, "_");
    const quotedFee = Number.parseFloat(String((item as { quoted_fee?: string | number | null }).quoted_fee ?? ""));
    const hasQuotedFee = Number.isFinite(quotedFee) && quotedFee > 0;
    const finalCompleted = Boolean((item as { final_submission_completed?: boolean }).final_submission_completed);
    if (kanbanStage === "DELIVERED" || applicationStatus === "completed" || applicationStatus === "dispatched") {
      return "DELIVERED";
    }
    if (kanbanStage === "SUBMITTED" || applicationStatus === "submitted") return "SUBMITTED";
    if (kanbanStage === "READY_FOR_SUBMISSION") return "READY_FOR_SUBMISSION";
    if (kanbanStage === "FORM_FILLING") return "FORM_FILLING";
    if (kanbanStage === "REVIEW_PENDING" || applicationStatus === "processing" || finalCompleted) {
      return "REVIEW_PENDING";
    }
    if (applicationStatus === "final_submission_pending") return "FORM_FILLING";
    if (applicationStatus === "payment_pending" || applicationStatus === "approved" || hasQuotedFee) {
      return "PAYMENT_PENDING";
    }
    if (applicationStatus === "rejected" || rawStage === "CORRECTION_REQUESTED") return "DOCUMENTS_REQUIRED";
    if (applicationStatus === "under_review" || rawStage === "INITIAL_REVIEW" || rawStage === "ASSESSMENT_PENDING") {
      return "ASSESSMENT_PENDING";
    }
    return (STAGE_ALIAS[rawStage] || "ASSESSMENT_PENDING") as PipelineCase["stage"];
  }

  // Passport renewal legacy quote states → PAYMENT_PENDING
  if (
    isPassportCase &&
    (
      rawStage === "INITIAL_REVIEW" ||
      rawStage === "PASSPORT_QUOTE_PENDING" ||
      applicationStatus === "pending_quote" ||
      quoteStatus === "PENDING_QUOTE"
    )
  ) {
    return "PAYMENT_PENDING";
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

  // Assessment approved + unpaid full service → Payment Pending (never Assessment Completed).
  if (auditResult === "green") {
    return "PAYMENT_PENDING";
  }

  const backendStage = String(item.stage || "").trim();
  if (backendStage) {
    const mapped = toStage(backendStage);
    if (mapped === "ASSESSMENT_COMPLETED" || mapped === "PAYMENT_PENDING") {
      return "PAYMENT_PENDING";
    }
    return mapped;
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

    if (rawStage === "SUBMITTED") {
      return "SUBMITTED";
    }

    if (rawStage === "READY_FOR_SUBMISSION") {
      return "READY_FOR_SUBMISSION";
    }

    if (rawStage === "REVIEW_PENDING") {
      return "REVIEW_PENDING";
    }

    if (rawStage === "FORM_FILLING" || rawStage === "IN_PREPARATION" || rawStage === "DOCS_RECEIVED") {
      return "FORM_FILLING";
    }

    if (rawStage === "PAID") {
      return hasDocuments ? "FORM_FILLING" : "DOCUMENT_UPLOAD_PENDING";
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

    return (STAGE_ALIAS[rawStage] || "FORM_FILLING") as PipelineCase["stage"];
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

  if (fullPaymentStatus === "paid" || paymentConfirmed) {
    return stageAfterPayment(rawStage, hasDocuments);
  }

  if (auditResult === "green" && ["pending", "created"].includes(fullPaymentStatus) && !paymentConfirmed) {
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

  if (auditResult === "pending" || rawStage === "ASSESSMENT_PENDING" || rawStage === "DOCS_RECEIVED") {
    return "ASSESSMENT_PENDING";
  }

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

const getPaymentStatus = (item: AdminApplication): PipelineCase["paymentStatus"] =>
  resolvePipelinePaymentStatus(item);

const toKanbanCase = (item: AdminApplication): KanbanCase => {
  const createdAt = item.created_at || new Date().toISOString();
  const ageHours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
  const serviceCategory = normalizeServiceCategory(item.service_type, item.case_type, item.service_name);
  const isApostille = serviceCategory === "Apostille";
  const displayId =
    isApostille && (item.file_number || "").trim()
      ? String(item.file_number).trim()
      : item.reference_number || `APP-${item.id}`;
  const stage = resolveStage(item);
  const feePlan = String(item.fee_plan_code || "").trim().toLowerCase();
  return {
    applicationId: item.id,
    createdAt,
    updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
    applicationStatus: String(item.application_status || ""),
    auditResult: String(item.audit_result || ""),
    id: displayId,
    customer: item.customer_name || `Customer ${item.id}`,
    serviceType: displayServiceLabel(item),
    serviceCategory,
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

const makeColumnMap = <T,>(factory: () => T) => {
  return KANBAN_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = factory();
      return acc;
    },
    {} as Record<PipelineCase["stage"], T>
  );
};

const ageInDays = (createdAt: string): number => {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
};

interface DraggableKanbanAreaProps {
  children: ReactNode;
  activeId: string | null;
  cases: KanbanCase[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

function DraggableKanbanArea({ children, activeId, cases, onDragStart, onDragEnd }: DraggableKanbanAreaProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {children}

      <DragOverlay dropAnimation={{
        duration: 250,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeId && cases.find((c) => c.id === activeId) ? (() => {
          const activeCase = cases.find((c) => c.id === activeId)!;
          return (
            <div className="opacity-90 shadow-2xl scale-105 border-2 border-[#009877] rotate-2 z-50 rounded-[12px]">
              <KanbanCard
                {...activeCase}
                onClick={() => {}}
              />
            </div>
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}

export function KanbanBoard({
  quickFilter = null,
  serviceFilter = "All",
  staffFilter = "All",
  ageingFilter = "Any",
  searchQuery = "",
  viewMode = "pipeline",
}: KanbanBoardProps) {
  const { adminUser } = useAdminAuth();
  const [cases, setCases] = useState<KanbanCase[]>([]);
  const [pendingCases, setPendingCases] = useState<KanbanCase[] | null>(null);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<KanbanCase | null>(null);
  const [selectedCaseDetails, setSelectedCaseDetails] = useState<AdminApplication | null>(null);
  const [selectedCaseDocuments, setSelectedCaseDocuments] = useState<AdminApplicationDocument[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const detailsRequestRef = useRef(0);
  const [columnLoading, setColumnLoading] = useState<Record<PipelineCase["stage"], boolean>>(() => makeColumnMap(() => true));
  const [columnErrors, setColumnErrors] = useState<Record<PipelineCase["stage"], string | null>>(() => makeColumnMap(() => null));
  const isStaff = !STAGE_MOVE_ROLES.includes(String(adminUser?.role || ""));

  const fetchAndMapApplications = async () => {
    const applications = await listAdminApplications();
    return applications.map(toKanbanCase);
  };

  useEffect(() => {
    const fetchApplications = async () => {
      setColumnLoading(makeColumnMap(() => true));
      setColumnErrors(makeColumnMap(() => null));
      try {
        const mappedCases = await fetchAndMapApplications();
        setCases(mappedCases);
        setLastRefreshedAt(new Date());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load applications.";
        setColumnErrors(makeColumnMap(() => message));
        toast.error(message);
      } finally {
        setColumnLoading(makeColumnMap(() => false));
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const nextCases = await fetchAndMapApplications();
        const currentById = new Map(cases.map((item) => [item.id, item]));
        let hasStageChange = false;
        let hasNewCard = false;
        let hasMetadataChange = false;

        for (const item of nextCases) {
          const existing = currentById.get(item.id);
          if (!existing) {
            hasNewCard = true;
            break;
          }
          if (existing.stage !== item.stage) {
            hasStageChange = true;
            break;
          }
          if (
            existing.updatedAt !== item.updatedAt
            || existing.applicationStatus !== item.applicationStatus
            || existing.auditResult !== item.auditResult
          ) {
            hasMetadataChange = true;
            break;
          }
        }

        if (hasStageChange || hasNewCard || hasMetadataChange) {
          setCases(nextCases);
          setPendingCases(null);
          setHasNewUpdates(false);
          setLastRefreshedAt(new Date());

          if (selectedCase) {
            const updatedCase = nextCases.find((item) => item.applicationId === selectedCase.applicationId);
            if (updatedCase) {
              setSelectedCase(updatedCase);
              setSelectedCaseDetails((prev) => (
                prev
                  ? {
                      ...prev,
                      stage: updatedCase.stage,
                      current_stage: updatedCase.stage,
                      application_status: updatedCase.applicationStatus,
                      audit_result: (updatedCase.auditResult || prev.audit_result) as AdminApplication["audit_result"],
                      full_payment_status: updatedCase.paymentStatus === "Paid" ? "paid" : prev.full_payment_status,
                      updated_at: updatedCase.updatedAt,
                    }
                  : prev
              ));
            }
          }
        } else {
          setLastRefreshedAt(new Date());
        }
      } catch {
        // Silent polling failures to avoid noisy UX.
      }
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cases]);

  const moveCase = (caseId: string, stage: PipelineCase["stage"]) => {
    setCases((prev) =>
      prev.map((item) => {
        if (item.id !== caseId) return item;
        const nextStage =
          item.paymentStatus === "Paid" && stage === "PAYMENT_PENDING"
            ? stageAfterPayment(item.stage, true)
            : stage;
        return { ...item, stage: nextStage, nextAction: getNextAction(nextStage) };
      }),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id && active.data.current?.originalColumnId !== over.id) {
      const caseId = active.id as string;
      const previousStage = active.data.current?.originalColumnId as PipelineCase["stage"];
      const targetStage = KANBAN_COLUMNS.find((col) => col.id === over.id)?.id ?? cases.find((c) => c.id === over.id)?.stage;

      if (!targetStage) return;

      const targetCase = cases.find((item) => item.id === caseId);
      const resolvedTarget =
        targetCase?.paymentStatus === "Paid" && targetStage === "PAYMENT_PENDING"
          ? stageAfterPayment(targetCase.stage, true)
          : targetStage;

      moveCase(caseId, resolvedTarget);
      const columnTitle = KANBAN_COLUMNS.find((col) => col.id === resolvedTarget)?.title;

      if (!targetCase) {
        toast.success(`${active.id} moved to ${columnTitle}`);
        return;
      }

      setColumnLoading((prev) => ({ ...prev, [resolvedTarget]: true }));
      setColumnErrors((prev) => ({ ...prev, [resolvedTarget]: null }));
      try {
        await updateAdminApplicationStage(targetCase.applicationId, resolvedTarget, {
          correctionCause: resolvedTarget === "DOCUMENTS_REQUIRED" ? "customer_error" : undefined,
        });
        toast.success(`${active.id} moved to ${columnTitle}`);
      } catch (error) {
        moveCase(caseId, previousStage);
        const message = error instanceof Error ? error.message : "Failed to update stage.";
        setColumnErrors((prev) => ({ ...prev, [resolvedTarget]: message }));
        toast.error(message);
      } finally {
        setColumnLoading((prev) => ({ ...prev, [resolvedTarget]: false }));
      }
    }
  };

  const handleCardClick = async (caseItem: KanbanCase) => {
    const requestId = ++detailsRequestRef.current;
    const isApostilleCase = caseItem.serviceCategory === "Apostille" || caseItem.serviceType.toLowerCase().includes("apostille");
    setSelectedCase(caseItem);
    setSelectedCaseDetails(null);
    setSelectedCaseDocuments([]);
    setDetailsError(null);
    setDocumentsError(null);
    setDetailsLoading(true);
    setDocumentsLoading(true);

    try {
      if (isApostilleCase) {
        const [detailsResult, apostilleResult] = await Promise.allSettled([
          getAdminApplicationDetails(caseItem.applicationId),
          getAdminApostilleDetail(caseItem.id),
        ]);
        if (detailsRequestRef.current !== requestId) {
          return;
        }

        let mergedDetails: AdminApplication | null = null;
        if (detailsResult.status === "fulfilled") {
          mergedDetails = detailsResult.value;
        }

        if (apostilleResult.status === "fulfilled") {
          const apostilleData = apostilleResult.value as Record<string, unknown>;
          mergedDetails = {
            ...(mergedDetails || ({} as AdminApplication)),
            ...(apostilleData as Partial<AdminApplication>),
            id: mergedDetails?.id ?? caseItem.applicationId,
            reference_number: String(
              (mergedDetails as Record<string, unknown> | null)?.reference_number
              || apostilleData.reference_number
              || caseItem.id
            ),
            service_type: String(
              (mergedDetails as Record<string, unknown> | null)?.service_type
              || apostilleData.service_type
              || "Apostille Services"
            ),
          } as AdminApplication;
        }

        if (mergedDetails) {
          setSelectedCaseDetails(mergedDetails);
        } else if (detailsResult.status === "rejected") {
          setDetailsError(detailsResult.reason instanceof Error ? detailsResult.reason.message : "Failed to load application details.");
        } else if (apostilleResult.status === "rejected") {
          setDetailsError(apostilleResult.reason instanceof Error ? apostilleResult.reason.message : "Failed to load apostille details.");
        }

        setSelectedCaseDocuments([]);
        setDocumentsError(null);
        return;
      }

      const detailsResult = await Promise.allSettled([
        getAdminApplicationDetails(caseItem.applicationId),
      ]);
      if (detailsRequestRef.current !== requestId) {
        return;
      }

      if (detailsResult[0].status === "fulfilled") {
        setSelectedCaseDetails(detailsResult[0].value);
      } else {
        setDetailsError(detailsResult[0].reason instanceof Error ? detailsResult[0].reason.message : "Failed to load application details.");
      }

      const referenceNumber = (
        detailsResult[0].status === "fulfilled"
          ? String(detailsResult[0].value.reference_number || caseItem.id)
          : String(caseItem.id)
      ).trim();
      const documentsResult = await Promise.allSettled([
        getAdminApplicationDocuments(referenceNumber),
      ]);
      if (detailsRequestRef.current !== requestId) {
        return;
      }
      if (documentsResult[0].status === "fulfilled") {
        setSelectedCaseDocuments(documentsResult[0].value);
      } else {
        setDocumentsError(documentsResult[0].reason instanceof Error ? documentsResult[0].reason.message : "Failed to load documents.");
      }
    } catch (error) {
      if (detailsRequestRef.current !== requestId) {
        return;
      }
      setDetailsError(error instanceof Error ? error.message : "Failed to load application details.");
    } finally {
      if (detailsRequestRef.current === requestId) {
        setDetailsLoading(false);
        setDocumentsLoading(false);
      }
    }
  };

  const filteredCases = cases.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const bySearch =
      !q ||
      [
        item.id,
        item.customer,
        item.assignedTo,
        item.serviceType,
        item.applicationStatus,
        item.stage,
        item.country,
        item.nextAction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    const byService = matchesServiceFilter(
      item.serviceCategory || normalizeServiceCategory(undefined, undefined, item.serviceType),
      item.serviceType,
      serviceFilter,
    );
    const byStaff = staffFilter === "All" || (staffFilter === "Unassigned" ? !item.assignedTo : item.assignedTo === staffFilter);
    const ageDays = ageInDays(item.createdAt);
    const byAgeing = ageingFilter === "Any" || (ageingFilter === "3d+" && ageDays >= 3) || (ageingFilter === "5d+" && ageDays >= 5) || (ageingFilter === "7d+" && ageDays >= 7);

    const status = String(item.applicationStatus || "").toLowerCase();
    const stage = item.stage;
    const isClosed = stage === "SUBMITTED" || stage === "DELIVERED";
    const isEVisa = item.serviceCategory === "E-Visa" || item.serviceType.toLowerCase().includes("visa");
    const isReuploadPendingReview = status === "reuploaded_pending_review";
    const isActionRequired = status === "correction_requested" || stage === "DOCUMENTS_REQUIRED";
    const isApproved = status === "approved" || stage === "DELIVERED";
    const isRejected = status === "rejected" || item.auditResult === "red";
    const isPending = isEVisa && !isApproved && !isRejected && !isActionRequired && !isReuploadPendingReview;

    const byQuickFilter = !quickFilter || (() => {
      switch (quickFilter) {
        case "evisa_total":
          return isEVisa;
        case "sla_health":
          return !isClosed && ageDays >= 3;
        case "evisa_pending":
          return isPending;
        case "evisa_approved":
          return isEVisa && isApproved;
        case "evisa_rejected":
          return isEVisa && isRejected;
        case "evisa_action_required":
          return isEVisa && isActionRequired;
        case "evisa_reupload_pending_review":
          return isEVisa && isReuploadPendingReview;
        case "sla_at_risk":
          return !isClosed && ageDays >= 3;
        case "sla_breached":
          return !isClosed && ageDays >= 7;
        case "escalations":
          return stage === "REVIEW_PENDING" || stage === "DOCUMENTS_REQUIRED" || ageDays >= 7;
        case "open_cases":
          return !isClosed;
        case "documents_requested":
          return stage === "DOCUMENTS_REQUIRED" || stage === "DOCUMENT_UPLOAD_PENDING";
        case "live_stages":
          return stage === "DOCUMENTS_REQUIRED" || stage === "PAYMENT_PENDING" || stage === "REVIEW_PENDING";
        default:
          return true;
      }
    })();

    return bySearch && byService && byStaff && byAgeing && byQuickFilter;
  });

  const renderColumns = (staffView: boolean) => (
    <div className="flex gap-4 h-[560px] max-h-[64vh] min-h-[420px] overflow-x-auto pb-2 custom-scrollbar">
      {(quickFilter
        ? KANBAN_COLUMNS.filter((column) => filteredCases.some((c) => c.stage === column.id))
        : KANBAN_COLUMNS
      ).map((column) => {
        const columnCases = filteredCases
          .filter((c) => c.stage === column.id)
          .slice()
          .sort((a, b) => {
            // Priority / Express paid cases stay on top of the working portal column.
            if (a.isExpress !== b.isExpress) return a.isExpress ? -1 : 1;
            return 0;
          });
        return (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={columnCases.length}
            droppable={!staffView}
          >
            {columnLoading[column.id] && (
              <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[10px] p-3 text-xs text-[#627D98]">
                Loading applications...
              </div>
            )}
            {!columnLoading[column.id] && columnErrors[column.id] && (
              <div className="bg-white border-[0.5px] border-[#B42318]/40 rounded-[10px] p-3 text-xs text-[#B42318]">
                {columnErrors[column.id]}
              </div>
            )}
            {!columnLoading[column.id] && !columnErrors[column.id] && columnCases.map((c) => (
              <KanbanCard
                key={c.id}
                {...c}
                draggable={!staffView}
                nextAction={c.nextAction}
                onClick={() => handleCardClick(c)}
              />
            ))}
          </KanbanColumn>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white">
      <div className="max-h-[64vh] min-h-[420px] overflow-auto custom-scrollbar">
        <table className="w-full min-w-[980px] table-auto border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
            <tr className="border-b border-[#D9E1EA]">
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Case ID</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Customer</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Service</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Stage</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Next Action</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Assigned</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">Payment</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#627D98]">SLA</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-[#627D98]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#627D98]">
                  No cases found for current filters.
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => {
                const stageLabel = KANBAN_COLUMNS.find((column) => column.id === item.stage)?.title || item.stage;
                return (
                  <tr key={item.id} className="border-b border-[#EEF2F6] hover:bg-[#FAFCFF]">
                    <td className="px-3 py-2 text-xs font-semibold text-[#102A43]">{item.id}</td>
                    <td className="px-3 py-2 text-sm text-[#334E68]">{item.customer}</td>
                    <td className="px-3 py-2 text-xs text-[#486581]">{item.serviceType}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${getStageBadgeClass(item.stage)}`}>
                        {stageLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#486581]">{item.nextAction || "-"}</td>
                    <td className="px-3 py-2 text-xs text-[#486581]">{item.assignedTo || "Unassigned"}</td>
                    <td className="px-3 py-2 text-xs text-[#486581]">{item.paymentStatus}</td>
                    <td className={`px-3 py-2 text-xs font-semibold ${item.slaBreached ? "text-[#B42318]" : "text-[#006F57]"}`}>
                      {item.slaTimer}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => { void handleCardClick(item); }}
                        className="rounded-md border border-[#B7D7F7] bg-[#EFF7FF] px-2.5 py-1 text-xs font-semibold text-[#0B69B7] hover:bg-[#E5F2FF]"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <SlideOverPanel 
        isOpen={!!selectedCase} 
        onClose={() => {
          setSelectedCase(null);
          setSelectedCaseDetails(null);
          setSelectedCaseDocuments([]);
          setDetailsError(null);
          setDocumentsError(null);
          setDocumentsLoading(false);
        }} 
        caseData={selectedCase}
        details={selectedCaseDetails}
        documents={selectedCaseDocuments}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        documentsLoading={documentsLoading}
        documentsError={documentsError}
        onStageResolved={async (nextStage) => {
          if (!selectedCase) return;
          const caseId = selectedCase.id;
          const previousStage = selectedCase.stage;
          moveCase(caseId, nextStage);
          setSelectedCase((prev) => (prev ? { ...prev, stage: nextStage } : prev));
          setSelectedCaseDetails((prev) => (prev ? { ...prev, stage: nextStage } : prev));

          try {
            await updateAdminApplicationStage(selectedCase.applicationId, nextStage, {
              correctionCause: nextStage === "DOCUMENTS_REQUIRED" ? "customer_error" : undefined,
            });
          } catch (error) {
            moveCase(caseId, previousStage);
            setSelectedCase((prev) => (prev ? { ...prev, stage: previousStage } : prev));
            setSelectedCaseDetails((prev) => (prev ? { ...prev, stage: previousStage } : prev));
            toast.error(error instanceof Error ? error.message : "Failed to update stage after audit result.");
          }
        }}
      />

      {viewMode === "list" ? (
        renderListView()
      ) : isStaff ? (
        renderColumns(true)
      ) : (
        <DraggableKanbanArea
          activeId={activeId}
          cases={cases}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {renderColumns(false)}
        </DraggableKanbanArea>
      )}
    </>
  );
}
