"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { updateAdminApplicationStage } from "@/lib/admin-auth";
import { type PipelineCase } from "@/lib/kanban";
import {
  type AdminKanbanCase,
  loadAdminCaseSlideOver,
} from "@/components/console/kanban/caseSlideOver";
import type { AdminApplication, AdminApplicationDocument } from "@/lib/admin-auth";

export type CaseSlideOverPreview = {
  reference?: string;
  customer?: string;
};

const buildPlaceholderCase = (applicationId: number, preview?: CaseSlideOverPreview): AdminKanbanCase => {
  const now = new Date().toISOString();
  return {
    applicationId,
    createdAt: now,
    updatedAt: now,
    applicationStatus: "",
    auditResult: "",
    id: preview?.reference || `APP-${applicationId}`,
    customer: preview?.customer || "Loading case…",
    serviceType: "OCI",
    country: "",
    flag: "",
    amount: 0,
    paymentStatus: "Pending",
    stage: "NEW_LEAD",
    assignedTo: null,
    slaTimer: "0h",
    slaBreached: false,
  };
};

export function useAdminCaseSlideOver() {
  const requestRef = useRef(0);
  const [selectedCase, setSelectedCase] = useState<AdminKanbanCase | null>(null);
  const [selectedCaseDetails, setSelectedCaseDetails] = useState<AdminApplication | null>(null);
  const [selectedCaseDocuments, setSelectedCaseDocuments] = useState<AdminApplicationDocument[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const closeCase = useCallback(() => {
    requestRef.current += 1;
    setIsPanelOpen(false);
    setSelectedCase(null);
    setSelectedCaseDetails(null);
    setSelectedCaseDocuments([]);
    setDetailsError(null);
    setDocumentsError(null);
    setDetailsLoading(false);
    setDocumentsLoading(false);
  }, []);

  const openCaseByApplicationId = useCallback(async (applicationId: number, preview?: CaseSlideOverPreview) => {
    const requestId = ++requestRef.current;
    setIsPanelOpen(true);
    setSelectedCase(buildPlaceholderCase(applicationId, preview));
    setSelectedCaseDetails(null);
    setSelectedCaseDocuments([]);
    setDetailsError(null);
    setDocumentsError(null);
    setDetailsLoading(true);
    setDocumentsLoading(true);

    try {
      const payload = await loadAdminCaseSlideOver(applicationId);
      if (requestRef.current !== requestId) return;
      setSelectedCase(payload.caseData);
      setSelectedCaseDetails(payload.details);
      setSelectedCaseDocuments(payload.documents);
      setDetailsError(payload.detailsError);
      setDocumentsError(payload.documentsError);
    } catch (error) {
      if (requestRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Failed to open case.";
      setDetailsError(message);
      toast.error(message);
    } finally {
      if (requestRef.current === requestId) {
        setDetailsLoading(false);
        setDocumentsLoading(false);
      }
    }
  }, []);

  const handleStageResolved = useCallback(
    async (nextStage: PipelineCase["stage"]) => {
      if (!selectedCase) return;
      const previousStage = selectedCase.stage;
      setSelectedCase((prev) => (prev ? { ...prev, stage: nextStage } : prev));
      setSelectedCaseDetails((prev) => (prev ? { ...prev, stage: nextStage } : prev));

      try {
        await updateAdminApplicationStage(selectedCase.applicationId, nextStage, {
          correctionCause: nextStage === "DOCUMENTS_REQUIRED" ? "customer_error" : undefined,
        });
      } catch (error) {
        setSelectedCase((prev) => (prev ? { ...prev, stage: previousStage } : prev));
        setSelectedCaseDetails((prev) => (prev ? { ...prev, stage: previousStage } : prev));
        toast.error(error instanceof Error ? error.message : "Failed to update stage.");
      }
    },
    [selectedCase],
  );

  return {
    selectedCase,
    selectedCaseDetails,
    selectedCaseDocuments,
    detailsLoading,
    detailsError,
    documentsLoading,
    documentsError,
    openCaseByApplicationId,
    closeCase,
    handleStageResolved,
    isOpen: isPanelOpen,
  };
}
