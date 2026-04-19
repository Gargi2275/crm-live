"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2,Check } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { ProgressStepper } from "@/components/ProgressStepper";
import { FileDropZone } from "@/components/FileDropZone";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
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

  // Validate Required Fields
  const isRegularFormValid =
    passportRef &&
    photoRef &&
    arrivalDate &&
    portOfEntry &&
    addressInIndia &&
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

  if (isSuccess) {
    return (
      <div className="flex-1 w-full bg-bg relative pb-32">
        <div className="w-full bg-white py-2 px-4 shadow-sm sticky top-[72px] z-30">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="font-mono text-primary text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-muted">File No:</span> {fileNumber}
            </div>
            <div className="text-accent font-bold text-sm flex gap-2 items-center">
              ✓ Documents Complete
            </div>
          </div>
        </div>

        <div className="w-full">
          <ProgressStepper currentStep={5} />
        </div>

        <div className="max-w-[500px] mx-auto px-4 mt-16 text-center">
          <Reveal direction="up">
            <div className="mb-6 flex justify-center h-24">
              <AnimatedCheckmark size={96} color="#16A34A" />
            </div>
            <h2 className="font-heading font-extrabold text-[#16A34A] text-[36px] sm:text-[44px] mb-4">
              Documents Received <span className="inline-block translate-y-[-4px]">✅</span>
            </h2>
            <p className="font-body text-primary text-[17px] mb-10 max-w-[400px] mx-auto leading-relaxed">
              We&apos;ll proceed with submission shortly. Check back to track your case status.
            </p>
            <div className="space-y-4">
              <motion.button
                onClick={() => router.push("/track")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-accent text-white font-bold text-[16px] px-7 py-[16px] rounded-btn shadow-btn-hover"
              >
                Track Application
              </motion.button>
                  <button
                onClick={() => setIsSuccess(false)}
                className="w-full bg-transparent border-2 border-primary text-primary font-bold text-[16px] px-7 py-[16px] rounded-btn hover:bg-primary hover:text-white transition-colors"
              >
                    {isCorrectionMode ? "Upload more corrected documents" : "Upload more documents"}
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 border-[1.5px] border-border rounded-input font-body text-[15px] bg-white outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] transition-all duration-200";

  return (
    <div className="flex-1 w-full bg-bg relative pb-32">
      {/* Sticky White Header Bar */}
     <div className="w-full bg-white py-3 px-4  z-30">
  <div className="max-w-[1200px] mx-auto flex items-center gap-6">
    
    {/* File Number */}
    <div className="font-mono text-primary text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2">
      <span className="text-muted">File No:</span> {fileNumber}
    </div>

    {/* Stepper */}
    <div className="flex-1">
      <ProgressStepper currentStep={4} />
    </div>

  </div>
</div>
      <div className="sm:hidden w-full">
         <ProgressStepper currentStep={4} />
      </div>

      <div className="max-w-[640px] mx-auto px-4 mt-10">
        <Reveal direction="up" delay={0.1}>
          <div className="mb-8">
            <h2 className="font-heading font-extrabold text-primary text-[32px] sm:text-[42px] mb-2 text-center tracking-tight">
              {isCorrectionMode ? "Re-upload Requested Documents" : "Upload Required Documents"}
            </h2>
            <p className="font-body text-muted text-[16px] text-center max-w-[440px] mx-auto">
              {isCorrectionMode
                ? "Upload only the documents requested by admin. No other documents are needed now."
                : "Application cannot be submitted until uploads are complete."}
            </p>
            <p className="font-body text-[13px] text-center text-primary/80 mt-3">
              All uploaded files are encrypted using AES-256 before secure storage.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isCorrectionMode ? (
              <div className="bg-card rounded-card shadow-card p-6 sm:p-8 space-y-4">
                <h3 className="font-body font-bold text-primary text-xl">Reupload Required Documents</h3>
                {flaggedDocuments.map((item, index) => {
                  const key = `flagged-${index}`;
                  const label = item.document_name || item.document_type || `Document ${index + 1}`;
                  const hintText = item.required_action || item.issue_reason || "Upload corrected document.";
                  const docHint = (item.document_type || item.document_name || "").toLowerCase();
                  const isPhotoDoc = docHint.includes("photo") || docHint.includes("photograph");
                  const accept = isPhotoDoc ? "image/jpeg,image/png" : ".pdf,image/jpeg,image/png";

                  return (
                    <div key={key} className="rounded-xl border border-border bg-[#FAF9F5] p-4">
                      <p className="font-body font-bold text-primary text-[15px]">{label}</p>
                      {item.issue_reason ? (
                        <p className="font-body text-[12px] text-[#8A4B08] mt-1">Reason: {item.issue_reason}</p>
                      ) : null}
                      <p className="font-body text-[12px] text-muted mt-1">Required action: {hintText}</p>
                      <div className="mt-3">
                        <FileDropZone
                          label={`Upload corrected ${label}`}
                          accept={accept}
                          maxSizeMsg={hintText}
                          file={correctionFiles[key] || null}
                          onUpload={(file) => handleCorrectionUpload(index, file, item.document_type || item.document_name)}
                          error={correctionErrors[key] || ""}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!isCorrectionMode ? (
              <>
            
            {/* Passport Card */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-[10px] bg-accent/10 text-xl flex items-center justify-center shrink-0">
                  🛂
                </div>
                <div>
                  <h3 className="font-body font-bold text-primary text-xl">Passport Bio Page *</h3>
                  <p className="font-mono text-xs text-muted font-bold tracking-wide mt-1">JPG / PNG / PDF — Max 5MB</p>
                </div>
              </div>
              <FileDropZone
                label="Upload Passport Photo Page"
                accept=".pdf,image/jpeg,image/png"
                maxSizeMsg="Upload a clear photo or scan of the photo page of your passport."
                file={passportRef}
                onUpload={handlePassportUpload}
                error={passportError}
              />
            </div>

            {/* Photo Card */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-[10px] bg-accent/10 text-xl flex items-center justify-center shrink-0">
                  📸
                </div>
                <div>
                  <h3 className="font-body font-bold text-primary text-xl">Applicant Photograph *</h3>
                  <p className="font-mono text-xs text-muted font-bold tracking-wide mt-1">JPG / PNG only — Max 2MB</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-6 font-body text-sm font-medium text-primary bg-[#FAF9F5] p-5 rounded-xl border border-border">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> White background only</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> No glasses</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> Taken within 6 months</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> Face clearly visible</div>
              </div>

              <FileDropZone
                label="Upload Applicant Photo"
                accept="image/jpeg,image/png"
                maxSizeMsg="Ensure your photo meets the requirements above to avoid delays."
                file={photoRef}
                onUpload={handlePhotoUpload}
                error={photoError}
              />
            </div>

            {/* Additional Details Form */}
            <div className="bg-card rounded-card shadow-card overflow-hidden">
               <div className="bg-primary px-6 py-5 border-b border-border">
                  <h3 className="font-body font-bold text-white text-xl">Arrival & Additional Details</h3>
               </div>
               
               <div className="p-6 sm:p-8 space-y-5">
                 <div className="grid sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Email Used for Registration *</label>
                     <input
                       type="email"
                       required
                       value={applicantEmail}
                       onChange={(e) => setApplicantEmail(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Intended Arrival Date *</label>
                     <input
                       type="date"
                       required
                       value={arrivalDate}
                       onChange={(e) => setArrivalDate(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Port of Entry *</label>
                     <input
                       type="text"
                       placeholder="e.g. New Delhi"
                       required
                       value={portOfEntry}
                       onChange={(e) => setPortOfEntry(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block font-body font-bold text-primary text-sm mb-2">Address in India *</label>
                   <textarea
                     placeholder="Hotel name or complete residential address"
                     required
                     rows={3}
                     value={addressInIndia}
                     onChange={(e) => setAddressInIndia(e.target.value)}
                     className={`${inputClasses} resize-none`}
                   />
                 </div>
                 <div>
                   <label className="block font-body font-bold text-primary text-sm mb-2">Emergency Contact (Optional)</label>
                   <input
                     type="text"
                     placeholder="Name and phone number"
                     value={emergencyContact}
                     onChange={(e) => setEmergencyContact(e.target.value)}
                     className={inputClasses}
                   />
                 </div>
               </div>
            </div>

            {/* Optional Section */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8 border border-border">
               <h3 className="font-body font-bold text-primary text-xl mb-3">Optional Information</h3>
               <p className="font-body text-sm text-muted mb-6">If you have extra supporting documents, upload them below.</p>
               
               <label className="block font-body font-bold text-primary text-sm mb-2">Supporting Documents</label>
               <input 
                  type="file" 
                  multiple 
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => handleSupportingFilesChange(Array.from(e.target.files || []))}
                  className="block w-full font-body text-sm text-muted
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-btn file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/5 file:text-primary
                  hover:file:bg-primary/10 file:transition-colors mb-6"
               />
               {supportingError && (
                 <p className="text-sm text-red-600 font-semibold mb-4">{supportingError}</p>
               )}

               <label className="block font-body font-bold text-primary text-sm mb-2">Notes to FlyOCI team</label>
               <textarea
                 placeholder="Any specific information our team should know..."
                 rows={3}
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className={`${inputClasses} resize-none`}
               />
            </div>
            </>
            ) : null}

            <motion.button
              type="submit"
              disabled={!isFormValid || isUploading}
              whileHover={isFormValid && !isUploading ? { scale: 1.02, y: -2 } : {}}
              whileTap={isFormValid && !isUploading ? { scale: 0.98 } : {}}
              className={`w-full font-bold text-[16px] px-7 py-[18px] rounded-btn shadow-[0_4px_16px_rgba(245,166,35,0.28)] flex justify-center items-center transition-all duration-300 mt-8 ${
                isFormValid && !isUploading 
                  ? "bg-accent text-white shadow-btn hover:shadow-btn-hover" 
                  : "bg-slate-300 text-white-500 shadow-none cursor-not-allowed transform-none"
              }`}
            >
              {isCorrectionMode ? "Submit Corrected Documents" : "Submit Documents"}
            </motion.button>

            {uploadError && (
              <p className="text-center text-sm text-red-600 font-semibold">{uploadError}</p>
            )}
          </form>
        </Reveal>
      </div>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-[360px] w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 relative">
                <span className="text-4xl translate-x-1">
  <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
</span>
              </div>
              
              <h3 className="font-heading font-extrabold text-primary text-2xl mb-2">Uploading Files</h3>
              
              <div className="w-full h-2.5 bg-border rounded-full overflow-hidden mb-3 relative mt-8">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-primary"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              <div className="font-mono text-xl font-bold text-primary">
                {Math.round(uploadProgress)}%
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
