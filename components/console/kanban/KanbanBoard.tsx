"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { SlideOverPanel } from "./SlideOverPanel";
import { KANBAN_COLUMNS, type PipelineCase } from "@/lib/kanban";
import {
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
};

const STAGE_ALIAS: Record<string, PipelineCase["stage"]> = {
  NEW_LEAD: "NEW_LEAD",
  AUDIT_PENDING: "AUDIT_PENDING",
  AUDIT_COMPLETED: "AUDIT_COMPLETED",
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

const normalizeServiceType = (serviceType?: string): PipelineCase["serviceType"] => {
  const normalized = (serviceType || "").toLowerCase();
  if (normalized.includes("passport")) return "Passport Renewal";
  if (normalized.includes("visa")) return "E-Visa";
  return "OCI";
};

const getPaymentStatus = (item: AdminApplication): PipelineCase["paymentStatus"] => {
  if (item.full_payment_status === "paid" || item.audit_payment_status === "paid") {
    return "Paid";
  }
  if (item.audit_payment_status === "created" || item.full_payment_status === "created") {
    return "Prepaid";
  }
  return "Pending";
};

const toKanbanCase = (item: AdminApplication): KanbanCase => {
  const createdAt = item.created_at || new Date().toISOString();
  const ageHours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
  return {
    applicationId: item.id,
    createdAt,
    updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
    applicationStatus: String(item.application_status || ""),
    auditResult: String(item.audit_result || ""),
    id: item.reference_number || `APP-${item.id}`,
    customer: item.customer_name || `Customer ${item.id}`,
    serviceType: normalizeServiceType(item.service_type),
    country: "",
    flag: "",
    amount: 0,
    paymentStatus: getPaymentStatus(item),
    stage: toStage(item.stage),
    assignedTo: item.assigned_staff || null,
    slaTimer: `${ageHours}h`,
    slaBreached: ageHours >= 24 * 7,
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

export function KanbanBoard() {
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
  const [serviceFilter, setServiceFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [ageingFilter, setAgeingFilter] = useState("Any");
  const [columnLoading, setColumnLoading] = useState<Record<PipelineCase["stage"], boolean>>(() => makeColumnMap(() => true));
  const [columnErrors, setColumnErrors] = useState<Record<PipelineCase["stage"], string | null>>(() => makeColumnMap(() => null));

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
          setPendingCases(nextCases);
          setHasNewUpdates(true);
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

  const serviceOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(cases.map((item) => item.serviceType)))];
  }, [cases]);

  const staffOptions = useMemo(() => {
    const values = Array.from(new Set(cases.map((item) => item.assignedTo).filter(Boolean))) as string[];
    return ["All", ...values, "Unassigned"];
  }, [cases]);

  const moveCase = (caseId: string, stage: PipelineCase["stage"]) => {
    setCases((prev) => prev.map((item) => (item.id === caseId ? { ...item, stage } : item)));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

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

      moveCase(caseId, targetStage);
      const columnTitle = KANBAN_COLUMNS.find((col) => col.id === targetStage)?.title;

      const targetCase = cases.find((item) => item.id === caseId);
      if (!targetCase) {
        toast.success(`${active.id} moved to ${columnTitle}`);
        return;
      }

      setColumnLoading((prev) => ({ ...prev, [targetStage]: true }));
      setColumnErrors((prev) => ({ ...prev, [targetStage]: null }));
      try {
        await updateAdminApplicationStage(targetCase.applicationId, targetStage);
        toast.success(`${active.id} moved to ${columnTitle}`);
      } catch (error) {
        moveCase(caseId, previousStage);
        const message = error instanceof Error ? error.message : "Failed to update stage.";
        setColumnErrors((prev) => ({ ...prev, [targetStage]: message }));
        toast.error(message);
      } finally {
        setColumnLoading((prev) => ({ ...prev, [targetStage]: false }));
      }
    }
  };

  const handleCardClick = async (caseItem: KanbanCase) => {
    setSelectedCase(caseItem);
    setSelectedCaseDetails(null);
    setSelectedCaseDocuments([]);
    setDetailsError(null);
    setDocumentsError(null);
    setDetailsLoading(true);
    setDocumentsLoading(true);

    try {
      const [detailsResult, documentsResult] = await Promise.allSettled([
        getAdminApplicationDetails(caseItem.applicationId),
        getAdminApplicationDocuments(caseItem.id),
      ]);

      if (detailsResult.status === "fulfilled") {
        setSelectedCaseDetails(detailsResult.value);
      } else {
        setDetailsError(detailsResult.reason instanceof Error ? detailsResult.reason.message : "Failed to load application details.");
      }

      if (documentsResult.status === "fulfilled") {
        setSelectedCaseDocuments(documentsResult.value);
      } else {
        setDocumentsError(documentsResult.reason instanceof Error ? documentsResult.reason.message : "Failed to load documents.");
      }
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Failed to load application details.");
    } finally {
      setDetailsLoading(false);
      setDocumentsLoading(false);
    }
  };

  const filteredCases = cases.filter((item) => {
    const byService = serviceFilter === "All" || item.serviceType === serviceFilter;
    const byStaff = staffFilter === "All" || (staffFilter === "Unassigned" ? !item.assignedTo : item.assignedTo === staffFilter);
    const ageDays = ageInDays(item.createdAt);
    const byAgeing = ageingFilter === "Any" || (ageingFilter === "3d+" && ageDays >= 3) || (ageingFilter === "5d+" && ageDays >= 5) || (ageingFilter === "7d+" && ageDays >= 7);
    return byService && byStaff && byAgeing;
  });

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[#627D98]">
          Last refreshed: {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : "-"}
        </p>
        {hasNewUpdates && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#B7D7F7] bg-[#EFF7FF] px-3 py-1.5 text-xs text-[#0B69B7]">
            New updates available
            <button
              onClick={() => {
                if (pendingCases) {
                  setCases(pendingCases);
                }
                setPendingCases(null);
                setHasNewUpdates(false);
                setLastRefreshedAt(new Date());
              }}
              className="rounded border border-[#B7D7F7] bg-white px-2 py-0.5 font-semibold"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

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
            await updateAdminApplicationStage(selectedCase.applicationId, nextStage);
          } catch (error) {
            moveCase(caseId, previousStage);
            setSelectedCase((prev) => (prev ? { ...prev, stage: previousStage } : prev));
            setSelectedCaseDetails((prev) => (prev ? { ...prev, stage: previousStage } : prev));
            toast.error(error instanceof Error ? error.message : "Failed to update stage after audit result.");
          }
        }}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        {[
          ["Service Type", serviceOptions, serviceFilter, setServiceFilter],
          ["Assigned Staff", staffOptions, staffFilter, setStaffFilter],
          ["Ageing", ["Any", "3d+", "5d+", "7d+"], ageingFilter, setAgeingFilter],
        ].map(([label, options, value, setter]) => (
          <select
            key={label as string}
            value={value as string}
            onChange={(e) => (setter as (value: string) => void)(e.target.value)}
            className="bg-white border-[0.5px] border-[#D9E1EA] text-sm rounded-[10px] px-3 py-2 text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/25 focus:border-[#009877] min-w-[150px]"
            aria-label={label as string}
          >
            {(options as string[]).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ))}
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-[560px] max-h-[64vh] min-h-[420px] overflow-x-auto pb-2 custom-scrollbar">
          {KANBAN_COLUMNS.map((column) => {
            const columnCases = filteredCases.filter((c) => c.stage === column.id);
            return (
              <KanbanColumn key={column.id} id={column.id} title={column.title} color={column.color} count={columnCases.length}>
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
                    onClick={() => handleCardClick(c)}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
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
    </>
  );
}
