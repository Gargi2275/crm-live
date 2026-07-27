"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2, FileText, Lock, Shield, Upload } from "lucide-react";

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

const PASSPORT_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const SUPPORTING_MAX_BYTES = 5 * 1024 * 1024;
const PASSPORT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);
const SUPPORTING_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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

  const [passportRef, setPassportRef] = useState<File | null>(null);
  const [photoRef, setPhotoRef] = useState<File | null>(null);
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
  const [passportError, setPassportError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [supportingError, setSupportingError] = useState("");
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [flaggedDocuments, setFlaggedDocuments] = useState<CorrectionDocument[]>([]);
  const [correctionFiles, setCorrectionFiles] = useState<Record<string, File | null>>({});
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string>>({});
  const [consentsAccepted, setConsentsAccepted] = useState(false);
  const showMinorConsent = searchParams.get("minor") === "1" || searchParams.get("applicant_type")?.toLowerCase() === "minor";

  const fileNumber = caseNumber || "FO-EV-...";

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
    if (!caseNumber) {
      return;
    }

    const loadCorrectionRequirements = async () => {
      try {
        const response = await eVisaApi.getResume(caseNumber);
        const appData = response.data.application_data;
        const normalize = (value: string) => value.trim().toLowerCase();
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

  // Validate Required Fields — documents first (Visament-style: simple after pay)
  const isRegularFormValid =
    passportRef &&
    photoRef &&
    applicantEmail &&
    caseNumber &&
    !passportError &&
    !photoError &&
    !supportingError;

  const isCorrectionFormValid =
    isCorrectionMode &&
    Boolean(caseNumber) &&
    Boolean(applicantEmail.trim()) &&
    flaggedDocuments.length > 0 &&
    flaggedDocuments.every((_, index) => Boolean(correctionFiles[`flagged-${index}`]));

  const isFormValid = isCorrectionMode ? isCorrectionFormValid : isRegularFormValid;

  const handlePassportUpload = (file: File | null) => {
    setUploadError("");
    setPassportError("");
    if (!file) {
      setPassportRef(null);
      return;
    }
    if (!PASSPORT_TYPES.has(file.type)) {
      setPassportRef(null);
      setPassportError("Passport file must be JPG, PNG, or PDF.");
      return;
    }
    if (file.size > PASSPORT_MAX_BYTES) {
      setPassportRef(null);
      setPassportError(`Passport file is too large (${formatMb(file.size)}). Maximum allowed is 5 MB.`);
      return;
    }
    setPassportRef(file);
  };

  const handlePhotoUpload = (file: File | null) => {
    setUploadError("");
    setPhotoError("");
    if (!file) {
      setPhotoRef(null);
      return;
    }
    if (!PHOTO_TYPES.has(file.type)) {
      setPhotoRef(null);
      setPhotoError("Photograph must be JPG or PNG only.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoRef(null);
      setPhotoError(`Photograph is too large (${formatMb(file.size)}). Maximum allowed is 2 MB.`);
      return;
    }
    setPhotoRef(file);
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
        setSupportingError(`Supporting file ${file.name} is too large (${formatMb(file.size)}). Maximum allowed is 5 MB each.`);
        return;
      }
    }

    setSupportingFiles(files);
  };

  const validateCorrectionFile = (docTypeOrName: string, file: File): string => {
    const hint = (docTypeOrName || "").trim().toLowerCase();
    const isPhotoDoc = hint.includes("photo") || hint.includes("photograph");
    const isPassportDoc = hint.includes("passport");

    if (isPhotoDoc) {
      if (!PHOTO_TYPES.has(file.type)) {
        return "Photograph must be JPG or PNG only.";
      }
      if (file.size > PHOTO_MAX_BYTES) {
        return `Photograph is too large (${formatMb(file.size)}). Maximum allowed is 2 MB.`;
      }
      return "";
    }

    if (isPassportDoc) {
      if (!PASSPORT_TYPES.has(file.type)) {
        return "Passport file must be JPG, PNG, or PDF.";
      }
      if (file.size > PASSPORT_MAX_BYTES) {
        return `Passport file is too large (${formatMb(file.size)}). Maximum allowed is 5 MB.`;
      }
      return "";
    }

    if (!SUPPORTING_TYPES.has(file.type)) {
      return "Document must be JPG, PNG, or PDF.";
    }
    if (file.size > SUPPORTING_MAX_BYTES) {
      return `Document is too large (${formatMb(file.size)}). Maximum allowed is 5 MB.`;
    }
    return "";
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

    if (!passportRef) {
      setPassportError("Passport bio page is required.");
    }
    if (!photoRef) {
      setPhotoError("Applicant photograph is required.");
    }
    if (!consentsAccepted) {
      setUploadError("Please accept all required consents before submitting.");
      return;
    }

    if (!isFormValid) return;

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("case_number", caseNumber);
      formData.append("email", applicantEmail);
      formData.append("passport_bio_page", passportRef as File);
      formData.append("applicant_photograph", photoRef as File);
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

  const uploadChecklist = [
    { label: "Passport bio page", done: Boolean(passportRef) && !passportError },
    { label: "Applicant photograph", done: Boolean(photoRef) && !photoError },
    { label: "Registration email", done: Boolean(applicantEmail) },
    { label: "Consent accepted", done: consentsAccepted },
  ];

  if (isSuccess) {
    return (
      <div className="flex-1 w-full bg-[linear-gradient(180deg,#eef4fc_0%,#f8fafc_55%,#ffffff_100%)] relative pb-20">
        <div className="w-full bg-[#0f2f66] py-2.5 px-4 shadow-sm">
          <div className="max-w-[1000px] mx-auto flex items-center justify-between">
            <div className="font-mono text-white text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-white/60">File No:</span> {fileNumber}
            </div>
            <span className="text-[#7ee0b8] font-semibold text-xs sm:text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Documents complete
            </span>
          </div>
        </div>
        <ProgressStepper currentStep={2} />

        <div className="max-w-[480px] mx-auto px-4 mt-10">
          <Reveal direction="up">
            <div className="bg-white rounded-[16px] border border-[#d8e7f8] shadow-[0_16px_40px_rgba(20,76,160,0.10)] p-6 sm:p-8 text-center">
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
                  className="w-full border border-[#0f2f66] text-[#0f2f66] font-semibold text-[15px] px-6 py-3 rounded-[10px] hover:bg-[#0f2f66] hover:text-white transition-colors"
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
    <div className="flex-1 w-full bg-[linear-gradient(180deg,#eef4fc_0%,#f8fafc_45%,#ffffff_100%)] relative pb-24">
      <div className="w-full bg-[#0f2f66] py-2.5 px-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto flex justify-between items-center gap-4">
          <div className="font-mono text-white text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0">
            <span className="text-white/60">File No:</span> {fileNumber}
          </div>
          <div className="text-white/75 font-body text-[11px] sm:text-xs hidden sm:flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            AES-256 encrypted uploads
          </div>
        </div>
      </div>

      <ProgressStepper currentStep={2} />

      <div className="max-w-[1000px] w-full mx-auto px-4 mt-6 lg:mt-8">
        <Reveal direction="up" delay={0.05}>
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#eaf4ff] border border-[#c5dcf7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1f4f8f] mb-2">
                <Upload className="w-3 h-3" />
                Documents
              </span>
              <h2 className="font-heading font-extrabold text-[#0f2f66] text-2xl sm:text-[28px] tracking-tight">
                {isCorrectionMode ? "Re-upload Requested Documents" : "Upload your documents"}
              </h2>
              <p className="font-body text-[#5f7391] text-sm mt-1 max-w-xl">
                {isCorrectionMode
                  ? "Upload only the documents flagged by our team."
                  : "Passport and photo are required. Supporting files are optional."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#c5dcf7] bg-white/80 px-3 py-2 text-xs text-[#1f4f8f] shrink-0">
              <Shield className="w-4 h-4 text-[#1c69dd]" />
              Secure &amp; encrypted storage
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 items-start">
            <div className="space-y-4 min-w-0">
            {isCorrectionMode ? (
              <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-[0_12px_32px_rgba(20,76,160,0.08)] overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-[#7c2d12] to-[#9a3412] border-b border-[#f5c4a8]">
                  <h3 className="font-body font-bold text-white text-base">Documents to Re-upload</h3>
                  <p className="text-white/80 text-xs mt-0.5">{flaggedDocuments.length} item(s) requested by our team</p>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  {flaggedDocuments.map((item, index) => {
                    const key = `flagged-${index}`;
                    const label = item.document_name || item.document_type || `Document ${index + 1}`;
                    const hintText = item.required_action || item.issue_reason || "Upload corrected document.";
                    const docHint = (item.document_type || item.document_name || "").toLowerCase();
                    const isPhotoDoc = docHint.includes("photo") || docHint.includes("photograph");
                    const accept = isPhotoDoc ? "image/jpeg,image/png" : ".pdf,image/jpeg,image/png";

                    return (
                      <div key={key} className="rounded-[10px] border border-[#f0d9b8] bg-[#fffaf3] p-3.5">
                        <div className="flex items-start gap-2 mb-2">
                          <FileText className="w-4 h-4 text-[#9a3412] mt-0.5 shrink-0" />
                          <div>
                            <p className="font-body font-bold text-[#0f2f66] text-sm">{label}</p>
                            {item.issue_reason ? (
                              <p className="font-body text-[11px] text-[#9a3412] mt-0.5">Reason: {item.issue_reason}</p>
                            ) : null}
                            <p className="font-body text-[11px] text-[#627d98] mt-0.5">{hintText}</p>
                          </div>
                        </div>
                        <FileDropZone
                          label={`Upload corrected ${label}`}
                          accept={accept}
                          maxSizeMsg={hintText}
                          file={correctionFiles[key] || null}
                          onUpload={(file) => handleCorrectionUpload(index, file, item.document_type || item.document_name)}
                          error={correctionErrors[key] || ""}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!isCorrectionMode ? (
              <>
                <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-[0_12px_32px_rgba(20,76,160,0.08)] overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-[#0f2f66] to-[#1a4a8a] border-b border-[#d0dff5]">
                    <h3 className="font-body font-bold text-white text-base">Required Documents</h3>
                    <p className="text-white/75 text-xs mt-0.5">Passport bio page and applicant photograph</p>
                  </div>
                  <div className="p-4 sm:p-5 grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body font-bold text-[#0f2f66] text-sm">Passport Bio Page *</p>
                        <span className="text-[10px] font-mono font-bold text-[#627d98] bg-[#f0f6ff] px-2 py-0.5 rounded">Max 5MB</span>
                      </div>
                      <FileDropZone
                        label="Upload passport photo page"
                        accept=".pdf,image/jpeg,image/png"
                        maxSizeMsg="Clear scan of passport photo page (JPG, PNG, PDF)."
                        file={passportRef}
                        onUpload={handlePassportUpload}
                        error={passportError}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body font-bold text-[#0f2f66] text-sm">Applicant Photograph *</p>
                        <span className="text-[10px] font-mono font-bold text-[#627d98] bg-[#f0f6ff] px-2 py-0.5 rounded">Max 2MB</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {["White background", "No glasses", "Recent photo", "Face visible"].map((tip) => (
                          <span key={tip} className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] border border-[#bbf7d0] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                            <CheckCircle2 className="w-3 h-3" />
                            {tip}
                          </span>
                        ))}
                      </div>
                      <FileDropZone
                        label="Upload applicant photo"
                        accept="image/jpeg,image/png"
                        maxSizeMsg="JPG or PNG only. Match government photo specs."
                        file={photoRef}
                        onUpload={handlePhotoUpload}
                        error={photoError}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-[0_12px_32px_rgba(20,76,160,0.08)] overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-[#0f2f66] to-[#1a4a8a] border-b border-[#d0dff5]">
                    <h3 className="font-body font-bold text-white text-base">Optional travel details</h3>
                    <p className="text-white/75 text-xs mt-0.5">Helpful if known — you can skip for now</p>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Email Used for Registration *</label>
                        <input
                          type="email"
                          required
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Intended Arrival Date</label>
                        <input
                          type="date"
                          value={arrivalDate}
                          onChange={(e) => setArrivalDate(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Port of Entry</label>
                        <input
                          type="text"
                          placeholder="e.g. New Delhi"
                          value={portOfEntry}
                          onChange={(e) => setPortOfEntry(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Emergency Contact</label>
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
                </div>

                <div className="bg-white rounded-[14px] border border-[#e8edf3] shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#e8edf3] bg-[#f8fafc]">
                    <h3 className="font-body font-bold text-[#334e68] text-sm">Optional — Supporting Files &amp; Notes</h3>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    <div>
                      <label className="block font-body font-semibold text-[#334e68] text-xs mb-1.5">Supporting Documents</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/jpeg,image/png"
                        onChange={(e) => handleSupportingFilesChange(Array.from(e.target.files || []))}
                        className="block w-full font-body text-sm text-[#627d98] file:mr-3 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:text-xs file:font-semibold file:bg-[#eaf4ff] file:text-[#0f2f66] hover:file:bg-[#d8e9ff]"
                      />
                      {supportingFiles.length > 0 ? (
                        <p className="text-[11px] text-[#166534] font-semibold mt-1.5">{supportingFiles.length} file(s) selected</p>
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
                </div>

                <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-sm p-4 sm:p-5 space-y-3">
                  <h3 className="font-body font-bold text-[#0f2f66] text-sm">Consent Before Submission</h3>
                  <ConsentCheckboxes mode="upload" showMinorConsent={showMinorConsent} onAcceptanceChange={setConsentsAccepted} />
                </div>
              </>
            ) : null}

            {isCorrectionMode ? (
              <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-sm p-4 sm:p-5 space-y-3">
                <h3 className="font-body font-bold text-[#0f2f66] text-sm">Consent Before Submission</h3>
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
              <p className="text-center text-sm text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</p>
            ) : null}
            </div>

            <aside className="lg:sticky lg:top-[72px] space-y-3">
              <div className="bg-white rounded-[14px] border border-[#d8e7f8] shadow-[0_10px_28px_rgba(20,76,160,0.08)] p-4">
                <h4 className="font-body font-bold text-[#0f2f66] text-sm mb-3">Upload Checklist</h4>
                <ul className="space-y-2">
                  {(isCorrectionMode
                    ? flaggedDocuments.map((item, index) => ({
                        label: item.document_name || item.document_type || `Document ${index + 1}`,
                        done: Boolean(correctionFiles[`flagged-${index}`]),
                      }))
                    : uploadChecklist
                  ).map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          item.done ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f1f5f9] text-[#94a3b8]"
                        }`}
                      >
                        {item.done ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </span>
                      <span className={item.done ? "text-[#166534] font-semibold" : "text-[#627d98]"}>{item.label}</span>
                    </li>
                  ))}
                  {isCorrectionMode ? (
                    <li className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${consentsAccepted ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f1f5f9] text-[#94a3b8]"}`}>
                        {consentsAccepted ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </span>
                      <span className={consentsAccepted ? "text-[#166534] font-semibold" : "text-[#627d98]"}>Consent accepted</span>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="bg-[#fff8e8] border border-[#f4d89a] rounded-[12px] p-3.5 text-[#3b2a08]">
                <p className="text-xs font-bold mb-1">Photo tip</p>
                <p className="text-[11px] leading-relaxed">Use a plain white background and ensure your face fills 70–80% of the frame to avoid government rejection.</p>
              </div>

              <div className="bg-[#f0f6ff] border border-[#c5dcf7] rounded-[12px] p-3.5 flex gap-2.5">
                <Lock className="w-4 h-4 text-[#1c69dd] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#1f4f8f] leading-relaxed">
                  Files are encrypted with AES-256 before storage. Only authorised FlyOCI staff can access your documents.
                </p>
              </div>
            </aside>
          </form>
        </Reveal>
      </div>

      <AnimatePresence>
        {isUploading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#0f2f66]/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-[340px] w-full text-center bg-white rounded-[16px] border border-[#d8e7f8] shadow-[0_20px_50px_rgba(20,76,160,0.18)] p-6"
            >
              <div className="w-14 h-14 rounded-full bg-[#eaf4ff] flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-[#1c69dd] animate-pulse" />
              </div>
              <h3 className="font-heading font-extrabold text-[#0f2f66] text-xl mb-1">Uploading Files</h3>
              <p className="text-xs text-[#627d98] mb-5">Please keep this tab open</p>
              <div className="w-full h-2 bg-[#e8edf3] rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#1c69dd] to-[#0f2f66] rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="font-mono text-lg font-bold text-[#0f2f66]">{Math.round(uploadProgress)}%</div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
