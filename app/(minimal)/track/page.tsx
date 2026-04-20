"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Download, MessageCircle, Mail, CheckCircle2, Circle, Upload } from "lucide-react";

import { OTPInput } from "@/components/OTPInput";
import {
  eVisaApi,
  TrackApplicationResponse,
  TrackDocumentsResponse,
  TrackTimelineStep,
} from "@/lib/api-client";
import { authService } from "@/lib/auth";

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Awaiting";
  }

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return "Awaiting";
  }

  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatusLabel(label: string | null | undefined): string {
  const raw = (label || "").trim().toLowerCase();
  const map: Record<string, string> = {
    draft: "Registered",
    registered: "Registered",
    "email": "Email Confirmed",
    "email confirmed": "Email Confirmed",
    "payment": "Payment Confirmed",
    "payment confirmed": "Payment Confirmed",
    "docs": "Documents Received",
    "documents": "Documents Received",
    "documents received": "Documents Received",
    "in preparation": "In Preparation",
    "submitted to authorities": "Submitted",
    submitted: "Submitted",
    "decision received": "Decision Received",
    closed: "Completed",
    completed: "Completed",
  };

  return map[raw] || label || "-";
}

export default function TrackPage() {
  const TRACK_SESSION_STORAGE_KEY = "flyoci:track-session";
  const TRACK_DRAFT_STORAGE_KEY = "flyoci:track-draft";
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCase = (searchParams.get("case") || "").trim();
  const otpFromUrl = (searchParams.get("otp") || "").trim();
  const magicToken = (searchParams.get("magic") || "").trim();

  const [caseNumber, setCaseNumber] = useState(initialCase);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isMagicVerifying, setIsMagicVerifying] = useState(false);
  const [isMagicSending, setIsMagicSending] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "error" | "success">("idle");
  const [trackingOtp, setTrackingOtp] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [magicEmail, setMagicEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [summary, setSummary] = useState<TrackApplicationResponse["data"] | null>(null);
  const [documents, setDocuments] = useState<TrackDocumentsResponse["data"]>([]);
  const [timeline, setTimeline] = useState<TrackTimelineStep[]>([]);
  const verifiedMagicTokenRef = useRef<string>("");

  const isDashboardVisible = !!summary;

  useEffect(() => {
    if (!summary || !authService.isLoggedIn()) {
      return;
    }

    const resolvedCase = (summary.file_number || caseNumber || "").trim();
    if (!resolvedCase) {
      return;
    }

    const nextUrl = `/indian-e-visa?case=${encodeURIComponent(resolvedCase)}&view=details`;
    const timeoutId = window.setTimeout(() => {
      router.replace(nextUrl);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [summary, caseNumber, router]);

  const hasMissingDocuments = useMemo(() => {
    if (!documents.length) {
      return false;
    }

    return documents.some((doc) => ["rejected", "needs_correction", "pending"].includes(doc.verification_status));
  }, [documents]);

  const canUploadMissingDocuments = Boolean(summary?.actions?.can_upload_missing_documents || hasMissingDocuments);
  const canDownloadAcknowledgement = Boolean(summary?.actions?.download_acknowledgement_available && summary?.actions?.acknowledgement_url);
  const canPayNow = Boolean(summary?.actions?.can_pay_now && summary?.actions?.payment_url);
  const isAuditSkipped = Boolean(summary?.audit_skipped && summary?.audit_skip_disclaimer_accepted);

  const resolvedKanbanStage = useMemo(() => {
    const fromApi = (summary?.kanban_stage || "").trim().toUpperCase();
    if (fromApi) return fromApi;

    const internal = (summary?.internal_status || "").trim().toUpperCase();
    const map: Record<string, string> = {
      DRAFT: "NEW_LEAD",
      REGISTERED: "NEW_LEAD",
      EMAIL_CONFIRMED: "PAYMENT_PENDING",
      PAYMENT_PENDING: "PAYMENT_PENDING",
      PAID: "DOCUMENT_UPLOAD_PENDING",
      DOCS_RECEIVED: "AUDIT_PENDING",
      CORRECTION_REQUESTED: "DOCUMENTS_REQUIRED",
      IN_PREPARATION: "FORM_FILLING",
      SUBMITTED: "SUBMITTED",
      DECISION_RECEIVED: "DELIVERED",
      CLOSED: "DELIVERED",
    };
    return map[internal] || "NEW_LEAD";
  }, [summary?.kanban_stage, summary?.internal_status]);

  const correctionAgeHours = useMemo(() => {
    if (!summary?.correction_requested_at) return 0;
    const ts = new Date(summary.correction_requested_at).getTime();
    if (!Number.isFinite(ts)) return 0;
    return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60)));
  }, [summary?.correction_requested_at]);

  const fetchTrackingDashboard = async (referenceNumber: string, otp: string) => {
    const [applicationRes, timelineRes, docsRes] = await Promise.all([
      eVisaApi.getTrackApplication(referenceNumber, otp),
      eVisaApi.getTrackTimeline(referenceNumber, otp),
      eVisaApi.getTrackDocuments(referenceNumber, otp),
    ]);

    setSummary(applicationRes.data);
    setTimeline(timelineRes.data?.length ? timelineRes.data : applicationRes.data.timeline || []);
    setDocuments(docsRes.data || []);
    setOtpStatus("success");
    setOtpStep(false);
    setError("");
  };

  const saveTrackingSession = (referenceNumber: string, otp: string, expiresAtMs: number, resumePath: string) => {
    try {
      localStorage.setItem(
        TRACK_SESSION_STORAGE_KEY,
        JSON.stringify({
          caseNumber: referenceNumber,
          otp,
          expiresAtMs,
          resumeUrl: resumePath,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  };

  const clearTrackingSession = () => {
    try {
      localStorage.removeItem(TRACK_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  useEffect(() => {
    if (magicToken) return;

    try {
      const raw = localStorage.getItem(TRACK_DRAFT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        caseNumber?: string;
        registeredEmail?: string;
        registeredPhone?: string;
        magicEmail?: string;
      };

      if (!initialCase && parsed.caseNumber) {
        setCaseNumber(parsed.caseNumber);
      }
      if (parsed.registeredEmail) {
        setRegisteredEmail(parsed.registeredEmail);
      }
      if (parsed.registeredPhone) {
        setRegisteredPhone(parsed.registeredPhone);
      }
      if (parsed.magicEmail) {
        setMagicEmail(parsed.magicEmail);
      }
    } catch {
      // Ignore invalid draft payloads.
    }
  }, [magicToken, initialCase]);

  useEffect(() => {
    if (magicToken) return;

    try {
      localStorage.setItem(
        TRACK_DRAFT_STORAGE_KEY,
        JSON.stringify({
          caseNumber,
          registeredEmail,
          registeredPhone,
          magicEmail,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [magicToken, caseNumber, registeredEmail, registeredPhone, magicEmail]);

  useEffect(() => {
    if (magicToken) return;

    let mounted = true;
    const restoreSession = async () => {
      try {
        if (initialCase && otpFromUrl) {
          if (!mounted) return;
          setCaseNumber(initialCase);
          setTrackingOtp(otpFromUrl);
          setMessage("Restoring your tracking dashboard...");
          await fetchTrackingDashboard(initialCase, otpFromUrl);
          return;
        }

        const raw = localStorage.getItem(TRACK_SESSION_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          caseNumber?: string;
          otp?: string;
          expiresAtMs?: number;
          resumeUrl?: string;
        };

        const expiresAtMs = Number(parsed.expiresAtMs || 0);
        if (!parsed.caseNumber || !parsed.otp || !expiresAtMs || Date.now() >= expiresAtMs) {
          clearTrackingSession();
          return;
        }

        if (!mounted) return;
        setCaseNumber(parsed.caseNumber);
        setTrackingOtp(parsed.otp);
        setResumeUrl(parsed.resumeUrl || `/indian-e-visa?case=${encodeURIComponent(parsed.caseNumber)}`);
        setMessage("Restoring your secure tracking session...");
        await fetchTrackingDashboard(parsed.caseNumber, parsed.otp);
      } catch {
        clearTrackingSession();
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [magicToken, initialCase, otpFromUrl]);

  useEffect(() => {
  if (!magicToken) return;

  // prevent duplicate verify (Strict Mode safe)
  if (verifiedMagicTokenRef.current === magicToken) {
    return;
  }
  verifiedMagicTokenRef.current = magicToken;

  const verifyAndLoad = async () => {
    setIsMagicVerifying(true);
    setError("");
    setMessage("Verifying your magic link...");

    try {
      const verifyRes = await authService.verifyMagicLink(magicToken);

      const nextStep = verifyRes.data.next_step || "track";
      const resumeUrl = verifyRes.data.resume_url;
      if (nextStep !== "track") {
        router.replace(resumeUrl || "/indian-e-visa");
        return;
      }

      const caseFromResponse = verifyRes.data.case_number || caseNumber;
      const otpFromResponse = verifyRes.data.tracking_otp || "";

      if (!caseFromResponse || !otpFromResponse) {
        throw new Error("Magic link verified but tracking session could not be started.");
      }

      setCaseNumber(caseFromResponse);
      setTrackingOtp(otpFromResponse);
      const resumePath = resumeUrl || `/indian-e-visa?case=${encodeURIComponent(caseFromResponse)}`;
      setResumeUrl(resumePath);

      const expiresInMs = (Number(verifyRes.data.tracking_otp_expires_in_minutes) || 10) * 60 * 1000;
      saveTrackingSession(caseFromResponse, otpFromResponse, Date.now() + expiresInMs, resumePath);

      await fetchTrackingDashboard(caseFromResponse, otpFromResponse);

      setMessage("Magic link verified. Tracking dashboard loaded.");

      // Keep OTP in URL to ensure refresh can restore dashboard even across tabs.
      router.replace(`/track?case=${encodeURIComponent(caseFromResponse)}&otp=${encodeURIComponent(otpFromResponse)}`);

    } catch (magicErr) {
      setError(magicErr instanceof Error ? magicErr.message : "Magic link verification failed.");
    } finally {
      setIsMagicVerifying(false);
    }
  };

  void verifyAndLoad();

}, [magicToken, caseNumber, initialCase, router]);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedCase = caseNumber.trim().toUpperCase();
    const trimmedEmail = registeredEmail.trim();
    const trimmedPhone = registeredPhone.trim();

    if (!trimmedCase) {
      setError("Enter your file number.");
      return;
    }

    if (!trimmedEmail) {
      setError("Enter your registered email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!trimmedPhone) {
      setError("Enter your registered mobile number.");
      return;
    }

    if (!/^\+?[0-9\s()-]{8,20}$/.test(trimmedPhone)) {
      setError("Enter a valid mobile number.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await eVisaApi.trackRequestOtp(trimmedCase, {
        email: trimmedEmail,
        phone: trimmedPhone,
      });

      setCaseNumber(trimmedCase);
      setOtpStep(true);
      setOtpStatus("idle");
      setMessage(response.message || "OTP sent to your registered email.");
    } catch (otpReqErr) {
      setError(otpReqErr instanceof Error ? otpReqErr.message : "Could not send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otpCode: string) => {
    const code = (otpCode || "").replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setOtpStatus("error");
      setError("Enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const verifyRes = await eVisaApi.trackVerifyOtp(caseNumber, code);
      const otp = verifyRes.data.otp;
      setTrackingOtp(otp);
      const resumePath = resumeUrl || `/indian-e-visa?case=${encodeURIComponent(caseNumber)}`;
      saveTrackingSession(caseNumber, otp, Date.now() + (10 * 60 * 1000), resumePath);
      await fetchTrackingDashboard(caseNumber, otp);
      setMessage("OTP verified. Dashboard loaded.");
    } catch (verifyErr) {
      setOtpStatus("error");
      setError(verifyErr instanceof Error ? verifyErr.message : "OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    const email = magicEmail.trim();
    const normalizedCase = caseNumber.trim().toUpperCase();
    const caseForRequest = normalizedCase.startsWith("FO-EV-") ? normalizedCase : "";
    if (!email) {
      setError("Enter your registered email to receive magic link.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsMagicSending(true);
    setError("");
    setMessage("");
    try {
      const response = await eVisaApi.requestMagicLink(caseForRequest, email);
      setMessage(response.message || "Magic link sent. Please check your inbox.");
      if (response.data?.case_number) {
        setCaseNumber(response.data.case_number);
      }
    } catch (magicErr) {
      setError(magicErr instanceof Error ? magicErr.message : "Failed to send magic link.");
    } finally {
      setIsMagicSending(false);
    }
  };

  const handleDownloadAcknowledgement = () => {
    if (!summary?.actions?.download_acknowledgement_available || !summary.actions.acknowledgement_url) {
      setMessage("Acknowledgement is not available yet.");
      return;
    }

    window.open(summary.actions.acknowledgement_url, "_blank", "noopener,noreferrer");
  };

  const handleUploadMissingDocuments = (documentType?: string) => {
    if (!summary?.actions?.can_upload_missing_documents) {
      setMessage("No additional uploads are required at this time.");
      return;
    }

    const baseUploadUrl = summary.actions.upload_url || `/dashboard/document-audit?reference=${encodeURIComponent(summary.reference_number || summary.file_number)}&resume=1`;
    if (!documentType) {
      router.push(baseUploadUrl);
      return;
    }

    const url = new URL(baseUploadUrl, window.location.origin);
    url.searchParams.set("document_type", documentType);
    router.push(`${url.pathname}${url.search}`);
  };

  const handleContactWhatsApp = () => {
    const raw = summary?.actions?.support_whatsapp || "+447000000000";
    const cleaned = raw.replace(/\D+/g, "");
    window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer");
  };

  const handleContactEmail = () => {
    const email = summary?.actions?.support_email || "support@flyoci.com";
    window.location.href = `mailto:${email}?subject=Tracking%20Support%20(${encodeURIComponent(caseNumber)})`;
  };

  const handleResumeApplication = () => {
    const fallback = caseNumber ? `/indian-e-visa?case=${encodeURIComponent(caseNumber)}` : "/indian-e-visa";
    if (summary?.actions?.can_upload_missing_documents) {
      router.push(summary.actions.upload_url || resumeUrl || fallback);
      return;
    }

    // Avoid stale resume URLs saved from older stage state (e.g. before upload completed).
    router.push(fallback);
  };

  const handlePayNow = () => {
    if (!summary?.actions?.payment_url) {
      setMessage("Payment link is not available yet.");
      return;
    }
    router.push(summary.actions.payment_url);
  };

  const resetTracking = () => {
    setSummary(null);
    setTimeline([]);
    setDocuments([]);
    setTrackingOtp("");
    setOtpStep(false);
    setOtpStatus("idle");
    setMessage("");
    setError("");
    setResumeUrl("");
    clearTrackingSession();
  };

  return (
    <div className="flex-1 w-full bg-bg relative pb-24">
      {!isDashboardVisible ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full pt-10">
          <h1 className="font-heading font-extrabold text-[#0f1f3d] text-[40px] sm:text-[42px] text-center">
            Track your <span className="italic text-[#1a56db]">application</span>
          </h1>
          <p className="font-body text-center text-[#627a96] text-[14px] mt-2">Use your file number + registered email + registered mobile, or open your magic link.</p>

          {isMagicVerifying && (
            <p className="font-body text-center text-[#2d66dc] text-[13px] mt-2">Verifying magic link...</p>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[12px] border border-[#d6e4f4] bg-white p-4">
              <p className="font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em]">Manual access</p>

              <form onSubmit={handleRequestOtp} className="mt-3">
                <label className="font-body text-[12px] text-[#17345d] font-semibold">File number</label>
                <input
                  type="text"
                  placeholder="FO-EV-2026-000123"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-[8px] border border-[#d8e4f3] bg-[#f8fbff] px-3 py-2.5 font-mono text-[14px] outline-none"
                />

                <label className="mt-3 block font-body text-[12px] text-[#17345d] font-semibold">Registered email</label>
                <input
                  type="email"
                  placeholder="registered@email.com"
                  value={registeredEmail}
                  onChange={(e) => setRegisteredEmail(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-[#d8e4f3] bg-[#f8fbff] px-3 py-2.5 font-body text-[14px] outline-none"
                />

                <label className="mt-3 block font-body text-[12px] text-[#17345d] font-semibold">Registered mobile number</label>
                <input
                  type="tel"
                  placeholder="+44 7700 900123"
                  value={registeredPhone}
                  onChange={(e) => setRegisteredPhone(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-[#d8e4f3] bg-[#f8fbff] px-3 py-2.5 font-body text-[14px] outline-none"
                />

                {!otpStep ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 w-full rounded-[10px] bg-[#2d66dc] py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </button>
                ) : (
                  <div className="mt-4">
                    <p className="font-body text-[12px] text-[#627a96] mb-2">Enter 6-digit OTP</p>
                    <OTPInput onComplete={handleOtpComplete} error={otpStatus === "error"} success={otpStatus === "success"} />
                  </div>
                )}
              </form>
            </div>

            <div className="rounded-[12px] border border-[#d6e4f4] bg-white p-4">
              <p className="font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em]">Magic link access</p>
              <div className="mt-2 rounded-[10px] border border-[#b9d5f5] bg-[#f1f7ff] p-3">
                <p className="font-body text-[12px] font-semibold text-[#1d4f89]">Use the secure link sent to your email</p>
                <p className="font-body text-[10px] text-[#6584ac]">Open your latest tracking magic link to skip manual OTP.</p>
              </div>

              <label className="mt-3 block font-body text-[12px] text-[#17345d] font-semibold">Registered email</label>
              <input
                type="email"
                placeholder="registered@email.com"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                className="mt-1 w-full rounded-[8px] border border-[#d8e4f3] bg-[#f8fbff] px-3 py-2.5 font-body text-[14px] outline-none"
              />
              <p className="mt-2 font-body text-[10px] text-[#6584ac]">Use the same email used during registration.</p>
              <button
                type="button"
                onClick={handleMagicLinkRequest}
                disabled={isMagicSending || isMagicVerifying}
                className="mt-3 w-full rounded-[10px] border border-[#b9d5f5] bg-white py-2.5 text-[14px] font-semibold text-[#2d66dc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMagicSending ? "Sending..." : "Send magic link"}
              </button>
            </div>
          </div>

          {message && <p className="mt-4 text-center font-body text-[12px] text-[#2d66dc]">{message}</p>}
          {error && <p className="mt-2 text-center font-body text-[12px] text-red-600">{error}</p>}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full pt-8">
          <button
            onClick={resetTracking}
            className="flex items-center gap-2 text-muted hover:text-primary font-body font-bold text-sm mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Search
          </button>

          <div className="bg-white rounded-[14px] border border-[#e7f0fb]">
            <div className="px-4 py-4 border-b border-[#e7f0fb]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-body text-[14px] font-semibold text-[#17345d]">{summary?.applicant_name || "Applicant"}</p>
                  <span className="mt-1 inline-flex items-center rounded-[8px] border border-[#cfe0f7] bg-[#f5f9ff] px-2 py-1 font-mono text-[10px] font-semibold text-[#2f6fe8]">
                    {summary?.file_number || caseNumber}
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#f2d8ac] bg-[#fff6e8] px-3 py-1 text-[10px] font-semibold text-[#a86500]">
                  {normalizeStatusLabel(summary?.user_facing_status || "In preparation")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3 p-3">
              <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                <div className="mb-3 rounded-[10px] border border-[#d8e4f3] bg-[#f8fbff] p-3">
                  {resolvedKanbanStage === "AUDIT_PENDING" && !canPayNow && (
                    <div className="space-y-1.5">
                      <p className="font-body text-[13px] font-semibold text-[#17345d] inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Your documents are being reviewed</p>
                      <p className="font-body text-[12px] text-[#486581]">We will update you within 4 hours.</p>
                    </div>
                  )}

                  {resolvedKanbanStage === "DOCUMENTS_REQUIRED" && summary?.audit_result === "amber" && (
                    <div className="space-y-2">
                      <p className="font-body text-[13px] font-semibold text-[#B45309]">Action Required - Please Fix Your Documents</p>
                      <p className="font-body text-[12px] text-[#486581]">We found some issues. Please re-upload the following documents:</p>
                      {(summary.findings || []).map((finding) => (
                        <div key={finding.id} className="rounded-[8px] border border-[#FCD9B0] bg-[#FFF8ED] px-2.5 py-2">
                          <p className="font-body text-[12px] font-semibold text-[#8A4B08]">{finding.document_name || finding.document_type}</p>
                          <p className="font-body text-[11px] text-[#9A6100]">Issue: {finding.finding_description}</p>
                          <p className="font-body text-[11px] text-[#9A6100]">Required: {finding.required_action}</p>
                          <button
                            onClick={() => handleUploadMissingDocuments(finding.document_type)}
                            className="mt-1.5 rounded-[6px] border border-[#d5e3f5] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#1f4f8f]"
                          >
                            Re-upload this document
                          </button>
                        </div>
                      ))}
                      {correctionAgeHours > 48 && (
                        <p className="font-body text-[11px] font-semibold text-[#B42318]">Warning: correction request is older than 48 hours.</p>
                      )}
                      <button
                        onClick={() => handleUploadMissingDocuments()}
                        className="rounded-[8px] border border-[#d5e3f5] bg-white px-3 py-2 text-[11px] font-semibold text-[#1f4f8f] inline-flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" /> Re-upload documents
                      </button>
                    </div>
                  )}

                  {resolvedKanbanStage === "DOCUMENTS_REQUIRED" && summary?.audit_result === "red" && summary?.status === "rejected" && (
                    <div className="space-y-2">
                      <p className="font-body text-[13px] font-semibold text-[#B42318]">Application Rejected</p>
                      <p className="font-body text-[12px] text-[#486581]">Unfortunately your application cannot proceed. Reason: {summary?.auditor_notes || "Please contact support."}</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={handleContactEmail} className="rounded-[8px] border border-[#d5e3f5] bg-white px-3 py-2 text-[11px] font-semibold text-[#1f4f8f] inline-flex items-center gap-2"><Mail className="h-4 w-4" /> Contact Support</button>
                        <button onClick={handleContactWhatsApp} className="rounded-[8px] border border-[#cfe8d9] bg-[#edf9f2] px-3 py-2 text-[11px] font-semibold text-[#1e7348] inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                      </div>
                    </div>
                  )}

                  {(resolvedKanbanStage === "AUDIT_COMPLETED" || resolvedKanbanStage === "PAYMENT_PENDING" || (resolvedKanbanStage === "AUDIT_PENDING" && canPayNow)) && (
                    <div className="space-y-2">
                      <p className="font-body text-[13px] font-semibold text-[#17345d]">
                        {isAuditSkipped ? "Audit skipped. Complete Your Payment" : "Complete Your Payment"}
                      </p>
                      <p className="font-body text-[12px] text-[#486581]">
                        {isAuditSkipped
                          ? `You chose to skip audit. Pay GBP ${summary?.amount_due_major || "0.00"} to proceed.`
                          : `Pay GBP ${summary?.amount_due_major || "0.00"} to proceed with your application.`}
                      </p>
                      <button onClick={handlePayNow} className="rounded-[8px] border border-[#d5e3f5] bg-white px-3 py-2 text-[11px] font-semibold text-[#1f4f8f]">Pay GBP {summary?.amount_due_major || "0.00"}</button>
                    </div>
                  )}

                  {resolvedKanbanStage === "DOCUMENT_UPLOAD_PENDING" && (
                    <div className="space-y-2">
                      <p className="font-body text-[13px] font-semibold text-[#17345d]">Upload Your Documents</p>
                      <p className="font-body text-[12px] text-[#486581]">Payment confirmed! Please upload your required documents.</p>
                      <button onClick={() => handleUploadMissingDocuments()} className="rounded-[8px] border border-[#d5e3f5] bg-white px-3 py-2 text-[11px] font-semibold text-[#1f4f8f] inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Documents</button>
                    </div>
                  )}

                  {resolvedKanbanStage === "FORM_FILLING" && (
                    <div className="space-y-1.5">
                      <p className="font-body text-[13px] font-semibold text-[#17345d]">Application In Progress</p>
                      <p className="font-body text-[12px] text-[#486581]">Our team is preparing your application for submission. Estimated: 2-3 working days.</p>
                    </div>
                  )}

                  {resolvedKanbanStage === "SUBMITTED" && (
                    <div className="space-y-1.5">
                      <p className="font-body text-[13px] font-semibold text-[#17345d]">Application Submitted to Authorities</p>
                      <p className="font-body text-[12px] text-[#486581]">Your application has been submitted. Estimated processing time is 8-10 weeks.</p>
                      <p className="font-body text-[11px] text-[#8ea4bf]">Government reference: {summary?.government_reference || "Awaiting"}</p>
                    </div>
                  )}

                  {resolvedKanbanStage === "DELIVERED" && (
                    <div className="space-y-1.5">
                      <p className="font-body text-[13px] font-semibold text-[#17345d]">Application Complete!</p>
                      <p className="font-body text-[12px] text-[#486581]">Your OCI card has been approved. Check your email for next steps.</p>
                      <p className="font-body text-[11px] text-[#8ea4bf]">Completion date: {formatDateTime(summary?.updated_at)}</p>
                    </div>
                  )}
                </div>

                <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Status Timeline</p>

                <div className="space-y-2.5">
                  {timeline.map((row) => {
                    const isDone = row.state === "done";
                    const isActive = row.state === "active";
                    return (
                      <div key={row.key} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 h-[16px] w-[16px] rounded-full flex items-center justify-center ${
                            isDone
                              ? "bg-[#2b65dc] text-white"
                              : isActive
                                ? "border border-[#f0b44e] bg-[#fff6e8] text-[#a86500]"
                                : "border border-[#d3deed] bg-[#f8fbff] text-[#9ab0c9]"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className={`font-body text-[12px] font-semibold ${isDone ? "text-[#183d70]" : isActive ? "text-[#a86500]" : "text-[#8ea4bf]"}`}>
                            {normalizeStatusLabel(row.label)}
                          </p>
                          <p className="font-body text-[10px] text-[#8ea4bf]">{formatDateTime(row.timestamp)}</p>

                          {isActive && (
                            <div className="mt-1.5 rounded-[8px] border border-[#f0cf95] bg-[#fff7e9] px-2 py-1.5">
                              <p className="font-body text-[10px] text-[#9a6100]">
                                {summary?.latest_update || "Your application is being prepared for submission."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                  <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Application Summary</p>
                  <div className="space-y-1.5">
                    <p className="font-body text-[11px] text-[#8ba1bb]">File Number</p>
                    <p className="font-mono text-[11px] font-semibold text-[#2f6fe8]">{summary?.file_number}</p>
                    <p className="font-body text-[11px] text-[#8ba1bb] mt-1">Applicant Name</p>
                    <p className="font-body text-[12px] font-semibold text-[#183d70]">{summary?.applicant_name || "-"}</p>
                    <p className="font-body text-[11px] text-[#8ba1bb] mt-1">Visa Type</p>
                    <p className="font-body text-[12px] font-semibold text-[#183d70]">{summary?.service || "-"}</p>
                  </div>
                </div>

                <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                  <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Latest Update</p>
                  <div className="rounded-[8px] border border-[#d7e6fb] bg-[#f5f9ff] px-2.5 py-2">
                    <p className="font-body text-[12px] text-[#1f4f8f]">{summary?.latest_update || "Your latest status update is available."}</p>
                  </div>
                  <p className="font-body text-[10px] text-[#8ea4bf] mt-1">Updated: {formatDateTime(summary?.updated_at)}</p>
                </div>

                <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                  <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Actions</p>
                  <div className="space-y-2">
                    <button
                      onClick={handleResumeApplication}
                      className="w-full rounded-[8px] border border-[#c7dafb] bg-[#eaf2ff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#164eac] hover:bg-[#deecff] transition-colors inline-flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" /> Resume application
                    </button>

                    {canUploadMissingDocuments && (
                      <button
                        onClick={() => handleUploadMissingDocuments()}
                        className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" /> Upload missing documents
                      </button>
                    )}

                    {canDownloadAcknowledgement && (
                      <button
                        onClick={handleDownloadAcknowledgement}
                        className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" /> Download acknowledgement
                      </button>
                    )}

                    <button
                      onClick={handleContactWhatsApp}
                      className="w-full rounded-[8px] border border-[#cfe8d9] bg-[#edf9f2] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1e7348] hover:bg-[#e4f6ec] transition-colors inline-flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp support
                    </button>

                    <button
                      onClick={handleContactEmail}
                      className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" /> Email support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {trackingOtp && <p className="mt-3 text-[10px] text-[#8ea4bf]">Secure tracking session active.</p>}
          {message && <p className="mt-3 text-[12px] text-[#2d66dc]">{message}</p>}
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
        </motion.div>
      )}

      {isLoading && (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#17345d] text-white px-4 py-2 text-sm shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
        </div>
      )}
    </div>
  );
}
