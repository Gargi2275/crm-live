"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown, Lock, Upload } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { ProgressStepper } from "@/components/ProgressStepper";
import { FileDropZone } from "@/components/FileDropZone";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
import { ConsentCheckboxes } from "@/components/ConsentCheckboxes";
import { eVisaApi } from "@/lib/api-client";
import { authenticatedFetch } from "@/lib/api";
import { authService } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { isCurrentPathAllowed, isMissingCaseError, resolveCanonicalEVisaRoute, resolveMissingCaseRedirect } from "@/lib/evisa-step-guard";
import {
  buildUploadSpecHint,
  fetchDocumentRequirements,
  fileAcceptFromTypes,
  formatMaxSizeLabel,
  mapRequirementToChecklistItem,
  validateDocumentFile,
  type ChecklistDocumentItem,
  type DocumentRequirementRow,
} from "@/lib/document-requirements";

const SUPPORTING_MAX_BYTES = 5 * 1024 * 1024;
const SUPPORTING_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function formatMb(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = n / 1024 / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

type CorrectionDocument = {
  document_type: string;
  document_name: string;
  issue_reason: string;
  required_action: string;
  status: string;
};

export default function UploadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, updateData } = useEVisa();
  const caseNumber = searchParams.get("case") || data.fileNumber || "";
  const emailFromQuery = searchParams.get("email") || "";

  const [serviceType, setServiceType] = useState(() =>
    data.visaDuration === "5-Year" ? "evisa_5year" : "evisa_1year",
  );
  const [requirements, setRequirements] = useState<DocumentRequirementRow[]>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState("");
  const [filesByCode, setFilesByCode] = useState<Record<string, File | null>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [applicantEmail, setApplicantEmail] = useState(emailFromQuery || data.email || "");
  
  const [arrivalDate, setArrivalDate] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [addressInIndia, setAddressInIndia] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [notes, setNotes] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [supportingError, setSupportingError] = useState("");
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [flaggedDocuments, setFlaggedDocuments] = useState<CorrectionDocument[]>([]);
  const [correctionFiles, setCorrectionFiles] = useState<Record<string, File | null>>({});
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string>>({});
  const [consentsAccepted, setConsentsAccepted] = useState(false);
  const [expandedChecklistDocIds, setExpandedChecklistDocIds] = useState<Record<string, boolean>>({});
  const showMinorConsent = searchParams.get("minor") === "1" || searchParams.get("applicant_type")?.toLowerCase() === "minor";

  const fileNumber = caseNumber || "FO-EV-...";

  const checklistItems = useMemo(
    () => requirements.map(mapRequirementToChecklistItem),
    [requirements],
  );

  const mandatoryCodes = useMemo(
    () => checklistItems.filter((item) => item.required).map((item) => item.id),
    [checklistItems],
  );

  useEffect(() => {
    let cancelled = false;

    const enforceStepOrder = async () => {
      const normalizedCase = (caseNumber || "").trim().toUpperCase();
      if (!normalizedCase) {
        if (!isCurrentPathAllowed(pathname, "/indian-e-visa")) {
          router.replace("/indian-e-visa");
        }
        return;
      }

      let canonicalRoute = `/indian-e-visa/upload?case=${encodeURIComponent(normalizedCase)}`;
      if (isSuccess || data.hasUploaded) {
        canonicalRoute = `/indian-e-visa/review?case=${encodeURIComponent(normalizedCase)}`;
      } else if (!data.hasPaid) {
        canonicalRoute = `/indian-e-visa/payment?case=${encodeURIComponent(normalizedCase)}`;
      }

      if (authService.isLoggedIn()) {
        try {
          const resume = await eVisaApi.getResume(normalizedCase);
          const appData = resume.data.application_data;
          if (appData?.payment_confirmed || appData?.email_confirmed) {
            updateData({
              fileNumber: normalizedCase,
              hasPaid: Boolean(appData.payment_confirmed),
              isEmailConfirmed: Boolean(appData.email_confirmed),
            });
          }
          const resumedType = String(appData?.service_type || "").trim().toLowerCase();
          if (resumedType.startsWith("evisa")) {
            setServiceType(resumedType);
          }
          canonicalRoute = resolveCanonicalEVisaRoute(resume.data, normalizedCase);
        } catch (error) {
          if (isMissingCaseError(error)) {
            canonicalRoute = resolveMissingCaseRedirect(true);
          }
        }
      }

      if (!cancelled && !isCurrentPathAllowed(pathname, canonicalRoute)) {
        router.replace(canonicalRoute);
      }
    };

    void enforceStepOrder();

    const handlePopState = () => {
      void enforceStepOrder();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [caseNumber, data.hasPaid, data.hasUploaded, isSuccess, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    const loadRequirements = async () => {
      setRequirementsLoading(true);
      setRequirementsError("");
      try {
        const rows = await fetchDocumentRequirements(serviceType, { force: true });
        if (cancelled) return;
        const active = rows.filter((row) => row.is_active !== false);
        setRequirements(active);
        if (!active.length) {
          setRequirementsError(
            "No documents configured for this e-Visa service yet. Ask an admin to add them under Services → Documents.",
          );
        }
      } catch {
        if (!cancelled) {
          setRequirements([]);
          setRequirementsError("Could not load document checklist. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setRequirementsLoading(false);
      }
    };
    void loadRequirements();
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  useEffect(() => {
    if (!caseNumber) {
      return;
    }

    const loadCorrectionRequirements = async () => {
      try {
        const response = await eVisaApi.getResume(caseNumber);
        const appData = response.data.application_data;
        const normalize = (value: string) => value.trim().toLowerCase();
        const resumedType = String(appData.service_type || "").trim().toLowerCase();
        if (resumedType.startsWith("evisa")) {
          setServiceType(resumedType);
        }
        const correctionRequested =
          String(appData.application_status || "").toLowerCase() === "correction_requested" ||
          String(appData.current_stage || "").toLowerCase() === "correction_requested" ||
          Boolean(appData.correction_requested);
        const unifiedStatus = String((appData as { unified_status?: string }).unified_status || "").toLowerCase();

        const normalizeRequested = (
          source: Array<{
            document_type?: string;
            document_name?: string;
            issue_reason?: string;
            required_action?: string;
            status?: string;
          }>
        ) => {
          const normalizedItems = source
            .map((item) => ({
              document_type: String(item?.document_type || "").trim(),
              document_name: String(item?.document_name || "").trim(),
              issue_reason: String(item?.issue_reason || "").trim(),
              required_action: String(item?.required_action || "").trim(),
              status: String(item?.status || "needs_fix").trim().toLowerCase(),
            }))
            .filter((item) => Boolean(item.document_name || item.document_type))
            .filter((item) => !["reuploaded", "resolved", "done"].includes(item.status));

          return Array.from(
            normalizedItems.reduce((acc, item) => {
              const key = normalize(item.document_type || item.document_name);
              if (!key) return acc;
              acc.set(key, item);
              return acc;
            }, new Map<string, CorrectionDocument>()).values()
          );
        };

        const normalizedFlagged = normalizeRequested(Array.isArray(appData.flagged_documents) ? appData.flagged_documents : []);

        let latestRequestFlagged: CorrectionDocument[] = [];
        try {
          const detailsResponse = await authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(caseNumber)}/`, {
            method: "GET",
          });
          if (detailsResponse.ok) {
            const detailsJson = await detailsResponse.json().catch(() => ({}));
            const detailsData = (detailsJson as {
              data?: {
                reupload_requests?: Array<{
                  created_at?: string;
                  flagged_documents?: Array<{
                    document_type?: string;
                    document_name?: string;
                    issue_reason?: string;
                    required_action?: string;
                    status?: string;
                  }>;
                }>;
              };
            }).data;
            const requests = Array.isArray(detailsData?.reupload_requests) ? detailsData.reupload_requests : [];
            if (requests.length > 0) {
              const latestRequest = [...requests].sort((left, right) => {
                const leftTs = new Date(left.created_at || "").getTime();
                const rightTs = new Date(right.created_at || "").getTime();
                return rightTs - leftTs;
              })[0];
              latestRequestFlagged = normalizeRequested(Array.isArray(latestRequest?.flagged_documents) ? latestRequest.flagged_documents : []);
            }
          }
        } catch {
          // Fall back to resume payload if details fetch fails.
        }

        const activeFlagged = latestRequestFlagged.length > 0 ? latestRequestFlagged : normalizedFlagged;

        const shouldShowCorrection = correctionRequested || unifiedStatus === "pending_docs";

        if (shouldShowCorrection && activeFlagged.length > 0) {
          setIsCorrectionMode(true);
          setFlaggedDocuments(activeFlagged);
          return;
        }

        setIsCorrectionMode(false);
        setFlaggedDocuments([]);
      } catch {
        // Keep regular upload mode when resume fetch fails.
      }
    };

    void loadCorrectionRequirements();
  }, [caseNumber]);

  useEffect(() => {
    // Rehydrate draft fields after refresh. Keep user-typed values if already present.
    if (data.email && !applicantEmail) {
      setApplicantEmail(data.email);
    }
    if (data.travelDetails.arrivalDate && !arrivalDate) {
      setArrivalDate(data.travelDetails.arrivalDate);
    }
    if (data.travelDetails.portOfEntry && !portOfEntry) {
      setPortOfEntry(data.travelDetails.portOfEntry);
    }
    if (data.travelDetails.addressInIndia && !addressInIndia) {
      setAddressInIndia(data.travelDetails.addressInIndia);
    }
    if (data.travelDetails.emergencyContact && !emergencyContact) {
      setEmergencyContact(data.travelDetails.emergencyContact);
    }
    if (data.travelDetails.additionalNotes && !notes) {
      setNotes(data.travelDetails.additionalNotes);
    }
  }, [
    data.email,
    data.travelDetails.arrivalDate,
    data.travelDetails.portOfEntry,
    data.travelDetails.addressInIndia,
    data.travelDetails.emergencyContact,
    data.travelDetails.additionalNotes,
    applicantEmail,
    arrivalDate,
    portOfEntry,
    addressInIndia,
    emergencyContact,
    notes,
  ]);

  useEffect(() => {
    updateData({
      fileNumber: caseNumber || data.fileNumber,
      email: applicantEmail || data.email,
      travelDetails: {
        arrivalDate,
        portOfEntry,
        addressInIndia,
        emergencyContact,
        additionalNotes: notes,
      },
    });
  }, [
    caseNumber,
    applicantEmail,
    arrivalDate,
    portOfEntry,
    addressInIndia,
    emergencyContact,
    notes,
    updateData,
    data.fileNumber,
    data.email,
  ]);

  // Validate Required Fields — catalog requirements from backend
  const docsReady =
    checklistItems.length > 0 &&
    mandatoryCodes.every((code) => Boolean(filesByCode[code])) &&
    Object.values(fileErrors).every((err) => !err);

  const isRegularFormValid =
    docsReady &&
    Boolean(applicantEmail.trim()) &&
    Boolean(caseNumber) &&
    !supportingError &&
    !requirementsError;

  const isCorrectionFormValid =
    isCorrectionMode &&
    Boolean(caseNumber) &&
    Boolean(applicantEmail.trim()) &&
    flaggedDocuments.length > 0 &&
    flaggedDocuments.every((_, index) => Boolean(correctionFiles[`flagged-${index}`]));

  const isFormValid = isCorrectionMode ? isCorrectionFormValid : isRegularFormValid;

  const handleRequirementUpload = (item: ChecklistDocumentItem, file: File | null) => {
    setUploadError("");
    setFileErrors((prev) => ({ ...prev, [item.id]: "" }));
    if (!file) {
      setFilesByCode((prev) => ({ ...prev, [item.id]: null }));
      return;
    }
    const error = validateDocumentFile(file, {
      allowedFileTypes: item.allowedFileTypes,
      maxFileSizeMb: item.maxFileSizeMb,
    });
    if (error) {
      setFilesByCode((prev) => ({ ...prev, [item.id]: null }));
      setFileErrors((prev) => ({ ...prev, [item.id]: error }));
      return;
    }
    setFilesByCode((prev) => ({ ...prev, [item.id]: file }));
  };

  const handleSupportingFilesChange = (files: File[]) => {
    setUploadError("");
    setSupportingError("");
    if (!files.length) {
      setSupportingFiles([]);
      return;
    }

    for (const file of files) {
      if (!SUPPORTING_TYPES.has(file.type)) {
        setSupportingFiles([]);
        setSupportingError("Supporting documents must be JPG, PNG, or PDF.");
        return;
      }
      if (file.size > SUPPORTING_MAX_BYTES) {
        setSupportingFiles([]);
        setSupportingError(`Supporting file is too large (${formatMb(file.size)}). Maximum allowed is 5 MB.`);
        return;
      }
    }
    setSupportingFiles(files);
  };

  const validateCorrectionFile = (docTypeOrName: string, file: File): string => {
    const hint = (docTypeOrName || "").trim().toLowerCase();
    const isPhotoDoc = hint.includes("photo") || hint.includes("photograph");

    if (isPhotoDoc) {
      const err = validateDocumentFile(file, {
        allowedFileTypes: ["jpg", "png"],
        maxFileSizeMb: 2,
      });
      return err || "";
    }

    const err = validateDocumentFile(file, {
      allowedFileTypes: ["pdf", "jpg", "png"],
      maxFileSizeMb: 5,
    });
    return err || "";
  };

  const handleCorrectionUpload = (index: number, file: File | null, docTypeOrName: string) => {
    const key = `flagged-${index}`;
    setUploadError("");

    if (!file) {
      setCorrectionFiles((prev) => ({ ...prev, [key]: null }));
      setCorrectionErrors((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    const validationError = validateCorrectionFile(docTypeOrName, file);
    if (validationError) {
      setCorrectionFiles((prev) => ({ ...prev, [key]: null }));
      setCorrectionErrors((prev) => ({ ...prev, [key]: validationError }));
      return;
    }

    setCorrectionFiles((prev) => ({ ...prev, [key]: file }));
    setCorrectionErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCorrectionMode) {
      if (!applicantEmail.trim()) {
        setUploadError("Email is required.");
        return;
      }

      const missingKeys = flaggedDocuments
        .map((_, index) => `flagged-${index}`)
        .filter((key) => !correctionFiles[key]);

      if (missingKeys.length > 0) {
        const nextErrors = { ...correctionErrors };
        missingKeys.forEach((key) => {
          nextErrors[key] = "Please upload this corrected document.";
        });
        setCorrectionErrors(nextErrors);
        setUploadError("Please upload all requested corrected documents.");
        return;
      }

      setUploadError("");
      setIsUploading(true);
      setUploadProgress(10);

      try {
        for (let index = 0; index < flaggedDocuments.length; index += 1) {
          const item = flaggedDocuments[index];
          const key = `flagged-${index}`;
          const file = correctionFiles[key];
          if (!file) {
            continue;
          }

          const formData = new FormData();
          formData.append("case_number", caseNumber);
          formData.append("email", applicantEmail.trim());
          formData.append("flagged_document_name", item.document_name || item.document_type || `Document ${index + 1}`);
          if (item.document_type) {
            formData.append("flagged_document_type", item.document_type);
          }
          formData.append("document", file);

          const response = await fetch(`${API_BASE_URL}/evisa/correction-resubmit/`, {
            method: "POST",
            body: formData,
          });

          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            const message = (json as { message?: string }).message || "Failed to submit correction document.";
            throw new Error(message);
          }

          const progress = 10 + Math.round(((index + 1) / flaggedDocuments.length) * 90);
          setUploadProgress(Math.min(progress, 100));
        }

        setUploadProgress(100);
        setIsSuccess(true);
        updateData({
          hasUploaded: true,
          fileNumber: caseNumber,
          email: applicantEmail,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setUploadError(message);
      } finally {
        setIsUploading(false);
      }

      return;
    }

    if (!applicantEmail.trim()) {
      setUploadError("Email is required.");
      return;
    }
    if (!consentsAccepted) {
      setUploadError("Please accept all required consents before submitting.");
      return;
    }
    if (!checklistItems.length) {
      setUploadError(requirementsError || "Document checklist is not available yet.");
      return;
    }

    const nextErrors: Record<string, string> = { ...fileErrors };
    let missing = false;
    for (const item of checklistItems) {
      if (item.required && !filesByCode[item.id]) {
        nextErrors[item.id] = `${item.title} is required.`;
        missing = true;
      }
    }
    if (missing) {
      setFileErrors(nextErrors);
      setUploadError("Please complete all required document fields before submitting.");
      return;
    }

    if (!isFormValid) {
      setUploadError("Please complete all required document fields before submitting.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("case_number", caseNumber);
      formData.append("email", applicantEmail);
      for (const item of checklistItems) {
        const file = filesByCode[item.id];
        if (file) formData.append(item.id, file);
      }
      formData.append("intended_arrival_date", arrivalDate);
      formData.append("port_of_entry", portOfEntry);
      formData.append("address_in_india", addressInIndia);
      formData.append("emergency_contact", emergencyContact);

      supportingFiles.forEach((file) => formData.append("supporting_documents", file));

      setUploadProgress(55);
      await eVisaApi.uploadDocuments(formData);
      setUploadProgress(100);
      setIsSuccess(true);
      updateData({
        hasUploaded: true,
        fileNumber: caseNumber,
        email: applicantEmail,
        travelDetails: {
          arrivalDate,
          portOfEntry,
          addressInIndia,
          emergencyContact,
          additionalNotes: notes,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      if (message.toLowerCase().includes("email does not match case owner")) {
        setUploadError("Email does not match this case. Please use the same email used during registration/payment.");
      } else {
        setUploadError(message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const inputClasses =
    "w-full px-3.5 py-2.5 border border-[#d5e3f5] rounded-[10px] font-body text-[14px] bg-white outline-none focus:border-[#1c69dd] focus:ring-2 focus:ring-[#1c69dd]/15 transition-all";

  if (isSuccess) {
    return (
      <div className="flex-1 w-full bg-[#f7f9fc] relative pb-20">
        <div className="w-full border-b border-[#e2e8f0] bg-white py-2.5 px-4">
          <div className="max-w-[720px] mx-auto flex items-center justify-between">
            <div className="font-mono text-[#0F1F3D] text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-slate-400">File No:</span> {fileNumber}
            </div>
            <span className="text-emerald-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Documents complete
            </span>
          </div>
        </div>
        <ProgressStepper currentStep={2} />

        <div className="max-w-[480px] mx-auto px-4 mt-10">
          <Reveal direction="up">
            <div className="bg-white rounded-2xl border border-[#dce7f8] p-6 sm:p-8 text-center">
              <div className="mb-5 flex justify-center h-20">
                <AnimatedCheckmark size={80} color="#16A34A" />
              </div>
              <h2 className="font-heading font-extrabold text-[#16A34A] text-2xl sm:text-3xl mb-2">Documents Received</h2>
              <p className="font-body text-[#486581] text-[15px] mb-6 leading-relaxed">
                We&apos;ll proceed with submission shortly. Track your case anytime from your dashboard.
              </p>
              <div className="space-y-3">
                <motion.button
                  onClick={() => {
                    const trackCase = (caseNumber || fileNumber || "").trim();
                    if (!trackCase || trackCase === "FO-EV-...") {
                      router.push("/track");
                      return;
                    }
                    router.push(`/track?case=${encodeURIComponent(trackCase)}`);
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-accent text-white font-bold text-[15px] px-6 py-3 rounded-[10px] shadow-[0_4px_14px_rgba(245,166,35,0.28)]"
                >
                  Track Application
                </motion.button>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="w-full border border-[#0F1F3D] text-[#0F1F3D] font-semibold text-[15px] px-6 py-3 rounded-[10px] hover:bg-[#0F1F3D] hover:text-white transition-colors"
                >
                  {isCorrectionMode ? "Upload more corrected documents" : "Upload more documents"}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#f7f9fc] relative pb-24">
      <div className="w-full border-b border-[#e2e8f0] bg-white py-2.5 px-4 sticky top-0 z-30">
        <div className="max-w-[720px] mx-auto flex justify-between items-center gap-4">
          <div className="font-mono text-[#0F1F3D] text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0">
            <span className="text-slate-400">File No:</span> {fileNumber}
          </div>
          <div className="text-slate-500 font-body text-[11px] sm:text-xs hidden sm:flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            AES-256 encrypted uploads
          </div>
        </div>
      </div>

      <ProgressStepper currentStep={2} />

      <div className="mx-auto mt-6 w-full max-w-[720px] px-4 lg:mt-8">
        <Reveal direction="up" delay={0.05}>
          <div className="mb-6">
            <h2 className="font-heading font-semibold text-[#0F1F3D] text-2xl tracking-tight">
              {isCorrectionMode ? "Re-upload requested documents" : "Upload your documents"}
            </h2>
            <p className="font-body text-slate-500 text-sm mt-1 max-w-xl">
              {isCorrectionMode
                ? "Upload only the documents flagged by our team."
                : "Tap each document for requirements, then upload. Specs come from your service checklist."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isCorrectionMode ? (
              <div className="grid gap-4">
                {flaggedDocuments.map((item, index) => {
                  const key = `flagged-${index}`;
                  const label = item.document_name || item.document_type || `Document ${index + 1}`;
                  const hintText = item.required_action || item.issue_reason || "Upload corrected document.";
                  const docHint = (item.document_type || item.document_name || "").toLowerCase();
                  const isPhotoDoc = docHint.includes("photo") || docHint.includes("photograph");
                  const accept = isPhotoDoc ? "image/jpeg,image/png" : ".pdf,image/jpeg,image/png";
                  const isExpanded = expandedChecklistDocIds[key] !== false;
                  const isUploaded = Boolean(correctionFiles[key]);

                  return (
                    <div key={key} className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedChecklistDocIds((current) => ({
                            ...current,
                            [key]: !isExpanded,
                          }))
                        }
                        className="flex w-full items-start justify-between gap-3 text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-[#0F1F3D]">{label}</p>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                              Re-upload
                            </span>
                          </div>
                          {!isExpanded ? (
                            <p className="mt-1 text-xs text-slate-500">Tap to view details and upload</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                              isUploaded
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isUploaded ? "Ready" : "Pending re-upload"}
                          </span>
                          <ChevronDown className={`mt-0.5 h-4 w-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="mt-3 space-y-3">
                          {item.issue_reason ? (
                            <p className="text-xs font-medium text-amber-800">Issue: {item.issue_reason}</p>
                          ) : null}
                          <p className="text-sm text-slate-600">{hintText}</p>
                          <FileDropZone
                            label={`Upload corrected ${label}`}
                            accept={accept}
                            maxSizeMsg={hintText}
                            file={correctionFiles[key] || null}
                            onUpload={(file) => handleCorrectionUpload(index, file, item.document_type || item.document_name)}
                            error={correctionErrors[key] || ""}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!isCorrectionMode ? (
              <>
                <div className="grid gap-4">
                  {requirementsLoading ? (
                    <p className="text-sm text-slate-500 rounded-2xl border border-[#dce7f8] bg-white p-5">
                      Loading document checklist…
                    </p>
                  ) : requirementsError ? (
                    <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      {requirementsError}
                    </p>
                  ) : checklistItems.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-2xl border border-[#dce7f8] bg-white p-5">
                      No documents configured yet for this service.
                    </p>
                  ) : (
                    checklistItems.map((item) => {
                      const isExpanded = Boolean(expandedChecklistDocIds[item.id]);
                      const isUploaded = Boolean(filesByCode[item.id]) && !fileErrors[item.id];
                      const mustHaveItems = item.mustHave?.length ? item.mustHave : [];
                      const mistakeItems = item.mustNot?.length ? item.mustNot : item.commonMistakes || [];
                      const sizeLabel = formatMaxSizeLabel(item.maxFileSizeMb);

                      return (
                        <div key={item.id} className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedChecklistDocIds((current) => ({
                                  ...current,
                                  [item.id]: !current[item.id],
                                }))
                              }
                              className="min-w-0 flex-1 text-left"
                              aria-expanded={isExpanded}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-[#0F1F3D]">{item.title}</p>
                                    <span
                                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                        item.required
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : "border-slate-200 bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      {item.required ? "Required" : "Optional"}
                                    </span>
                                  </div>
                                  {!isExpanded ? (
                                    <p className="mt-1 text-xs text-slate-500">Tap to view details and upload</p>
                                  ) : null}
                                </div>
                                <ChevronDown
                                  className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </div>
                            </button>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                isUploaded
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {isUploaded ? "Ready to submit" : "Not uploaded"}
                            </span>
                          </div>

                          {isExpanded ? (
                            <>
                              {item.description ? (
                                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                              ) : null}
                              {(mustHaveItems.length > 0 || mistakeItems.length > 0) ? (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  {mustHaveItems.length > 0 ? (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                                      <p className="font-semibold">Must include</p>
                                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                        {mustHaveItems.map((line, idx) => (
                                          <li key={`${item.id}-must-${idx}`}>{line}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                  {mistakeItems.length > 0 ? (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
                                      <p className="font-semibold">Must not</p>
                                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                        {mistakeItems.map((line, idx) => (
                                          <li key={`${item.id}-not-${idx}`}>{line}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {sizeLabel ? (
                                <p className="mt-2 text-xs text-slate-500">Max size: {sizeLabel}</p>
                              ) : null}
                              <div className="mt-3">
                                <FileDropZone
                                  label={`Upload ${item.title}`}
                                  accept={fileAcceptFromTypes(item.allowedFileTypes)}
                                  maxSizeMsg={buildUploadSpecHint(item.allowedFileTypes, item.maxFileSizeMb)}
                                  file={filesByCode[item.id] || null}
                                  onUpload={(file) => handleRequirementUpload(item, file)}
                                  error={fileErrors[item.id] || ""}
                                />
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-2xl border border-[#dce7f8] bg-white p-5 space-y-3">
                  <h3 className="text-base font-semibold text-[#0F1F3D]">Optional travel details</h3>
                  <p className="text-sm text-slate-500">Helpful if known — you can skip for now</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">
                        Email used for registration *
                      </label>
                      <input
                        type="email"
                        required
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">
                        Intended arrival date
                      </label>
                      <input
                        type="date"
                        value={arrivalDate}
                        onChange={(e) => setArrivalDate(e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Port of entry</label>
                      <input
                        type="text"
                        placeholder="e.g. Delhi (DEL)"
                        value={portOfEntry}
                        onChange={(e) => setPortOfEntry(e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Emergency contact</label>
                      <input
                        type="text"
                        placeholder="Name and phone (optional)"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Address in India</label>
                    <textarea
                      placeholder="Hotel name or complete residential address"
                      rows={2}
                      value={addressInIndia}
                      onChange={(e) => setAddressInIndia(e.target.value)}
                      className={`${inputClasses} resize-none`}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-[#dce7f8] bg-white p-5 space-y-3">
                  <h3 className="text-base font-semibold text-[#0F1F3D]">Supporting files &amp; notes</h3>
                  <div>
                    <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Supporting documents</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(e) => handleSupportingFilesChange(Array.from(e.target.files || []))}
                      className="block w-full font-body text-sm text-[#627d98] file:mr-3 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:text-xs file:font-semibold file:bg-[#eaf4ff] file:text-[#0F1F3D] hover:file:bg-[#d8e9ff]"
                    />
                    {supportingFiles.length > 0 ? (
                      <p className="text-[11px] text-[#166534] font-semibold mt-1.5">
                        {supportingFiles.length} file(s) selected
                      </p>
                    ) : null}
                    {supportingError ? <p className="text-xs text-red-600 font-semibold mt-1.5">{supportingError}</p> : null}
                  </div>
                  <div>
                    <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Notes to FlyOCI team</label>
                    <textarea
                      placeholder="Any specific information our team should know..."
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${inputClasses} resize-none`}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dce7f8] bg-white p-5 space-y-3">
                  <ConsentCheckboxes mode="upload" showMinorConsent={showMinorConsent} onAcceptanceChange={setConsentsAccepted} />
                </div>
              </>
            ) : null}

            {isCorrectionMode ? (
              <div className="rounded-2xl border border-[#dce7f8] bg-white p-5 space-y-3">
                <ConsentCheckboxes mode="upload" onAcceptanceChange={setConsentsAccepted} />
              </div>
            ) : null}

            <motion.button
              type="submit"
              disabled={!isFormValid || isUploading || !consentsAccepted}
              whileHover={isFormValid && !isUploading ? { scale: 1.01 } : {}}
              whileTap={isFormValid && !isUploading ? { scale: 0.99 } : {}}
              className={`w-full font-bold text-[15px] px-6 py-3.5 rounded-[10px] flex justify-center items-center gap-2 transition-all ${
                isFormValid && !isUploading && consentsAccepted
                  ? "bg-accent text-white shadow-[0_4px_14px_rgba(245,166,35,0.28)] hover:shadow-[0_6px_18px_rgba(245,166,35,0.35)]"
                  : "bg-[#cbd5e1] text-white cursor-not-allowed"
              }`}
            >
              <Upload className="w-4 h-4" />
              {isCorrectionMode ? "Submit Corrected Documents" : "Submit Documents"}
            </motion.button>

            {uploadError ? (
              <p className="text-center text-sm text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            ) : null}
          </form>
        </Reveal>
      </div>

      <AnimatePresence>
        {isUploading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#0F1F3D]/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-[340px] w-full text-center bg-white rounded-2xl border border-[#dce7f8] shadow-lg p-6"
            >
              <div className="w-14 h-14 rounded-full bg-[#eaf4ff] flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-[#1c69dd] animate-pulse" />
              </div>
              <h3 className="font-heading font-extrabold text-[#0F1F3D] text-xl mb-1">Uploading Files</h3>
              <p className="text-xs text-slate-500 mb-5">Please keep this tab open</p>
              <div className="w-full h-2 bg-[#e8edf3] rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-[#1A56DB] rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="font-mono text-lg font-bold text-[#0F1F3D]">{Math.round(uploadProgress)}%</div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
