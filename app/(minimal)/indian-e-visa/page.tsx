"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Outfit } from "next/font/google";
import { motion } from "framer-motion";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Shield, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { useEVisa } from "@/context/EVisaContext";
import { ProgressStepper } from "@/components/ProgressStepper";
import { eVisaApi } from "@/lib/api-client";
import { EVISA_DEFAULTS } from "@/lib/evisa-config";
import { authService } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

const registrationSchema = z.object({
  visaDuration: z.enum(["1-Year", "5-Year"], { message: "Select visa duration" }),
  email: z.string().min(1, 'Email is required').email("Enter a valid email address"),
  countryCode: z.string().min(1),
  phone: z.string().min(7, "Enter a valid phone number"),
  fullName: z.string().min(2, "Enter your full name as per passport"),
  nationality: z.string().min(1, "Select your nationality"),
  countryOfResidence: z.string().min(1, "Select your country of residence"),
  purposeOfVisit: z.enum(["Tourism", "Business", "Medical", "Conference", "Other"], { message: "Select purpose of visit" }),
  consent: z.literal(true, { message: "You must agree to continue" }),
});

type RegistrationData = z.infer<typeof registrationSchema>;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const trustItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const REGISTER_DRAFT_SESSION_KEY = "flyoci:evisa-register-draft-active";

function splitPhoneNumber(combined: string): {
  countryCode: string;
  phone: string;
} {
  if (!combined || !combined.trim()) {
    return { countryCode: "+44", phone: "" };
  }

  // Check longer codes first to avoid
  // "+1" matching "+971" etc.
  const codes = [
    "+971", "+972", "+973", "+974",
    "+975", "+976", "+977", "+965",
    "+966", "+968", "+354", "+353",
    "+352", "+351", "+350",
    "+44", "+91", "+61", "+65", "+1",
  ];

  const cleaned = combined.trim();

  for (const code of codes) {
    if (cleaned.startsWith(code)) {
      return {
        countryCode: code,
        phone: cleaned.slice(code.length).trim(),
      };
    }
  }

  // Fallback if no known code found
  return { countryCode: "+44", phone: cleaned };
}

export default function RegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateData, resetData } = useEVisa();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [hasActiveDraftSession, setHasActiveDraftSession] = useState(false);
  const [draftSessionChecked, setDraftSessionChecked] = useState(false);
  const [resumeApplication, setResumeApplication] = useState<{
    case_number: string;
    application_status: string;
    current_stage: string;
    service_name: string;
    application_date: string | null;
    created_at: string;
    updated_at: string;
    email_confirmed: boolean;
    payment_confirmed: boolean;
    consent_captured: boolean;
  } | null>(null);
  const [applicationRecord, setApplicationRecord] = useState<{
    reference_number?: string;
    application_status?: string;
    unified_status?: string;
    stage?: string;
    kanban_stage?: string | null;
    current_stage?: string;
    application_date?: string | null;
    submission_date?: string | null;
    approval_date?: string | null;
    completion_date?: string | null;
    created_at?: string;
    updated_at?: string;
    notes?: string;
    audit_logs?: Array<{
      action?: string;
      timestamp?: string;
      actor?: string;
      metadata?: {
        subject?: string;
        description?: string;
        message?: string;
        notes?: string;
      };
    }>;
    admin_messages?: Array<{
      created_at?: string;
      subject?: string;
      message?: string;
    }>;
    reupload_requests?: Array<{
      created_at?: string;
      note?: string;
      flagged_documents?: Array<{
        document_type?: string;
        document_name?: string;
        issue_reason?: string;
        required_action?: string;
      }>;
    }>;
    service_name?: string;
    audit_result?: "pending" | "green" | "amber" | "red" | string;
    auditor_notes?: string;
    correction_requested_at?: string | null;
    flagged_documents?: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      issue?: string;
      required_action?: string;
      status?: string;
    }>;
    latest_audit_findings?: Array<{
      id?: number;
      document_type?: string;
      document_name?: string;
      finding_description?: string;
      required_action?: string;
      priority?: string;
    }>;
  } | null>(null);
  const [documents, setDocuments] = useState<Array<{
    id: number;
    document_type: string;
    document_name?: string;
    original_filename?: string;
    stored_filename?: string;
    verification_status: string;
    upload_date: string | null;
    created_at?: string;
    updated_at: string;
  }>>([]);
  const [reuploadingDocumentKey, setReuploadingDocumentKey] = useState("");
  const [reuploadConfirmationMessage, setReuploadConfirmationMessage] = useState("");
  const loadedResumeCaseRef = useRef("");
  const processedResumeMagicRef = useRef("");
  const initializedCleanStateRef = useRef(false);
  const lastSavedDetailsRef = useRef("");
  const magicToken = (searchParams.get("magic") || "").trim();
  const caseFromQuery = (searchParams.get("case") || "").trim().toUpperCase();
  const resumeMode = searchParams.get("resume") === "1";
  const detailsMode = searchParams.get("view") === "details";
  const isExistingCase = Boolean(caseFromQuery);
  const isReadOnlyApplication = searchParams.get("readonly") === "1";
  const shouldHydrateFromPersistedState = Boolean(magicToken || caseFromQuery || resumeMode || detailsMode || hasActiveDraftSession);
  const nationalityOptions = new Set(["British", "American", "Canadian", "Indian", "Other"]);
  const residenceOptions = new Set([
    "United Kingdom",
    "United States",
    "Canada",
    "Australia",
    "UAE",
    "Singapore",
    "Other",
  ]);
  const purposeOptions = new Set(["Tourism", "Business", "Medical", "Conference", "Other"]);

  const { register, handleSubmit, control, setValue, watch, reset, resetField } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      visaDuration: shouldHydrateFromPersistedState ? data.visaDuration || undefined : undefined,
      email: shouldHydrateFromPersistedState ? data.email || "" : "",
      countryCode: shouldHydrateFromPersistedState ? data.countryCode || "+44" : "+44",
      phone: shouldHydrateFromPersistedState ? data.phone || "" : "",
      fullName: shouldHydrateFromPersistedState ? data.fullName || "" : "",
      nationality: shouldHydrateFromPersistedState && data.nationality && nationalityOptions.has(data.nationality) ? (data.nationality as RegistrationData["nationality"]) : undefined,
      countryOfResidence: shouldHydrateFromPersistedState && data.countryOfResidence && residenceOptions.has(data.countryOfResidence) ? (data.countryOfResidence as RegistrationData["countryOfResidence"]) : undefined,
      purposeOfVisit: shouldHydrateFromPersistedState && data.purposeOfVisit && purposeOptions.has(data.purposeOfVisit) ? (data.purposeOfVisit as RegistrationData["purposeOfVisit"]) : undefined,
      consent: shouldHydrateFromPersistedState && data.consentAccepted ? true : undefined,
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDraft = sessionStorage.getItem(REGISTER_DRAFT_SESSION_KEY) === "1";
    setHasActiveDraftSession(hasDraft);
    setDraftSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!draftSessionChecked) {
      return;
    }

    // Fresh registration should start blank unless this tab has an active draft session.
    if (shouldHydrateFromPersistedState) {
      initializedCleanStateRef.current = false;
      return;
    }
    if (initializedCleanStateRef.current) {
      return;
    }

    initializedCleanStateRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(REGISTER_DRAFT_SESSION_KEY);
    }

    resetData();
    reset({
      visaDuration: undefined,
      email: "",
      countryCode: "+44",
      phone: "",
      fullName: "",
      nationality: undefined,
      countryOfResidence: undefined,
      purposeOfVisit: undefined,
      consent: undefined,
    });
    loadedResumeCaseRef.current = "";
    processedResumeMagicRef.current = "";

    // Profile prefill runs AFTER reset
    // so it never gets wiped
    if (!authService.isLoggedIn()) return;

    const prefillFromProfile = async () => {
      try {
        const res = await authenticatedFetch(
          `${API_BASE_URL}/auth/me/`,
          { method: "GET" }
        );
        if (!res.ok) return;

        const json = await res.json().catch(() => ({}));
        const coreUser = (json as any)?.data?.core_user;
        if (!coreUser) return;

        console.log("[prefillFromProfile] coreUser data:", coreUser);

        // Phone
        const rawPhone = coreUser.phone_number || "";
        console.log("[prefillFromProfile] rawPhone:", rawPhone);
        if (rawPhone) {
          const { countryCode, phone } =
            splitPhoneNumber(rawPhone);
          console.log("[prefillFromProfile] split phone:", { countryCode, phone });
          setValue("countryCode", countryCode);
          setValue("phone", phone);
          updateData({ phone, countryCode });
        }

        // Nationality and Country of Residence
        const nationality = coreUser.nationality || "";
        const country = coreUser.country || "";
        console.log("[prefillFromProfile] nationality:", nationality, "country:", country);

        // Email
        if (coreUser.email) {
          setValue("email", coreUser.email);
          updateData({ email: coreUser.email });
        }

        // Full name
        const fullName = [
          coreUser.first_name || "",
          coreUser.last_name || "",
        ].filter(Boolean).join(" ").trim();
        if (fullName) {
          setValue("fullName", fullName);
          updateData({ fullName });
        }

      } catch {
        // Silent fail
      }
    };

    void prefillFromProfile();
  }, [draftSessionChecked, shouldHydrateFromPersistedState, resetData, reset]);

  useEffect(() => {
    if (!hasActiveDraftSession || caseFromQuery || magicToken || resumeMode || detailsMode) {
      return;
    }

    const nationality = nationalityOptions.has(data.nationality || "") ? (data.nationality as RegistrationData["nationality"]) : undefined;
    const countryOfResidence = residenceOptions.has(data.countryOfResidence || "") ? (data.countryOfResidence as RegistrationData["countryOfResidence"]) : undefined;
    const purposeOfVisit = purposeOptions.has(data.purposeOfVisit || "") ? (data.purposeOfVisit as RegistrationData["purposeOfVisit"]) : undefined;

    reset({
      visaDuration: data.visaDuration || undefined,
      email: data.email || "",
      countryCode: data.countryCode || "+44",
      phone: data.phone || "",
      fullName: data.fullName || "",
      nationality,
      countryOfResidence,
      purposeOfVisit,
      consent: data.consentAccepted ? true : undefined,
    });
  }, [hasActiveDraftSession, caseFromQuery, magicToken, resumeMode, detailsMode, data, reset]);

  const applyRegistrationPrefill = (caseNumber: string, prefill?: {
    visaDuration?: "1-Year" | "5-Year";
    email?: string;
    countryCode?: string;
    phone?: string;
    phone_number?: string;
    fullName?: string;
    nationality?: string;
    countryOfResidence?: string;
    purposeOfVisit?: "Tourism" | "Business" | "Medical" | "Conference" | "Other" | "";
    consent?: boolean;
    minimalPrefillOnly?: boolean;
  }) => {
    if (prefill?.minimalPrefillOnly) {
      const visaDuration = prefill?.visaDuration === "5-Year" ? "5-Year" : "1-Year";
      const email = prefill?.email || "";
      const fullName = prefill?.fullName || "";

      setValue("visaDuration", visaDuration);
      setValue("email", email);
      setValue("countryCode", "+44");
      setValue("phone", "");
      setValue("fullName", fullName);
      resetField("nationality");
      resetField("countryOfResidence");
      resetField("purposeOfVisit");
      resetField("consent");

      updateData({
        fileNumber: caseNumber || null,
        visaDuration,
        email,
        phone: "",
        countryCode: "+44",
        fullName,
        nationality: "",
        countryOfResidence: "",
        purposeOfVisit: "",
        consentAccepted: false,
        isEmailConfirmed: false,
        hasPaid: false,
        hasUploaded: false,
      });
      return;
    }

    const visaDuration = prefill?.visaDuration === "5-Year" ? "5-Year" : "1-Year";
    const nationality = nationalityOptions.has(prefill?.nationality || "") ? (prefill?.nationality as RegistrationData["nationality"]) : undefined;
    const countryOfResidence = residenceOptions.has(prefill?.countryOfResidence || "") ? (prefill?.countryOfResidence as RegistrationData["countryOfResidence"]) : undefined;
    const purposeOfVisit = purposeOptions.has(prefill?.purposeOfVisit || "") ? (prefill?.purposeOfVisit as RegistrationData["purposeOfVisit"]) : "Tourism";
    const rawCombined = (prefill as any)?.phone_number || "";
    const splitCombined = rawCombined && !prefill?.phone ? splitPhoneNumber(rawCombined) : null;
    const resolvedCountryCode = rawCombined && !prefill?.phone
      ? splitCombined?.countryCode || "+44"
      : (prefill?.countryCode || watch("countryCode") || data.countryCode || "+44");
    const resolvedPhone = rawCombined && !prefill?.phone
      ? splitCombined?.phone || ""
      : ((prefill?.phone && prefill.phone.trim()) || watch("phone") || data.phone || "");

    console.log("[applyRegistrationPrefill] prefill data:", prefill);
    console.log("[applyRegistrationPrefill] parsed values:", { visaDuration, nationality, countryOfResidence, purposeOfVisit });
    if (rawCombined) {
      const split = splitPhoneNumber(rawCombined);
      console.log("[applyRegistrationPrefill] rawCombined phone:", rawCombined, "split:", split);
    }

    setValue("visaDuration", visaDuration);
    setValue("email", prefill?.email || "");
    setValue("countryCode", resolvedCountryCode, { shouldValidate: true, shouldDirty: true });
    setValue("phone", resolvedPhone, { shouldValidate: true, shouldDirty: true });
    setValue("fullName", prefill?.fullName || "");
    if (nationality) {
      setValue("nationality", nationality);
    }
    if (countryOfResidence) {
      setValue("countryOfResidence", countryOfResidence);
    }
    setValue("purposeOfVisit", purposeOfVisit);
    if (prefill?.consent) {
      setValue("consent", true);
    }

    updateData({
      fileNumber: caseNumber || null,
      visaDuration,
      email: prefill?.email || "",
      phone: resolvedPhone,
      countryCode: resolvedCountryCode,
      fullName: prefill?.fullName || "",
      nationality: nationality || "",
      countryOfResidence: countryOfResidence || "",
      purposeOfVisit,
      consentAccepted: Boolean(prefill?.consent),
      isEmailConfirmed: false,
      hasPaid: false,
      hasUploaded: false,
    });

    if (detailsMode) {
      lastSavedDetailsRef.current = JSON.stringify({
        case_number: caseNumber || "",
        email: prefill?.email || "",
        confirm_email: prefill?.email || "",
        mobile_number: `${resolvedCountryCode}${resolvedPhone}`,
        full_name: prefill?.fullName || "",
        nationality: nationality || "",
        country_of_residence: countryOfResidence || "",
        purpose_of_visit: purposeOfVisit,
        visa_duration: visaDuration,
        consent: true,
      });
    }
  };

  useEffect(() => {
    if (!magicToken) {
      return;
    }

    if (processedResumeMagicRef.current === magicToken) {
      return;
    }
    processedResumeMagicRef.current = magicToken;

    const verifyAndResume = async () => {
      try {
        const verifyRes = await authService.verifyMagicLink(magicToken);
        const caseFromMagic = (verifyRes.data.case_number || caseFromQuery || "").trim().toUpperCase();
        const resumeUrl = verifyRes.data.resume_url || (caseFromMagic ? `/indian-e-visa?case=${encodeURIComponent(caseFromMagic)}` : "/indian-e-visa");

        if (!caseFromMagic) {
          router.replace(resumeUrl);
          return;
        }

        const response = await eVisaApi.getResume(caseFromMagic);
        setResumeApplication(response.data.application_data || null);
        if (response.data.next_step === "registration") {
          applyRegistrationPrefill(caseFromMagic, response.data.registration_prefill);
          router.replace(`/indian-e-visa?case=${encodeURIComponent(caseFromMagic)}`);
          return;
        }

        router.replace(response.data.resume_url || resumeUrl);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to resume application.");
      }
    };

    void verifyAndResume();
  }, [magicToken, router, caseFromQuery]);

  useEffect(() => {
    if (!caseFromQuery) {
      return;
    }
    if (!authService.isLoggedIn()) {
      return;
    }
    if (loadedResumeCaseRef.current === caseFromQuery) {
      return;
    }
    loadedResumeCaseRef.current = caseFromQuery;

    const hydrateFromResume = async () => {
      try {
        const response = await eVisaApi.getResume(caseFromQuery);
        setResumeApplication(response.data.application_data || null);
        const shouldApplyResumePrefill = Boolean(magicToken || resumeMode || detailsMode);
        if ((response.data.next_step === "registration" && shouldApplyResumePrefill) || detailsMode) {
          applyRegistrationPrefill(caseFromQuery, response.data.registration_prefill);
        } else if (response.data.next_step === "registration") {
          // First-time open should not auto-prefill registration fields.
          resetData();
          reset({
            visaDuration: undefined,
            email: "",
            countryCode: "+44",
            phone: "",
            fullName: "",
            nationality: undefined,
            countryOfResidence: undefined,
            purposeOfVisit: undefined,
            consent: undefined,
          });
        } else {
          router.replace(response.data.resume_url || `/indian-e-visa?case=${encodeURIComponent(caseFromQuery)}`);
        }
      } catch {
        // Keep local context values if resume fetch fails.
      }
    };

    void hydrateFromResume();
  }, [caseFromQuery, detailsMode, magicToken, resumeMode, router]);

  useEffect(() => {
    const subscription = watch((values) => {
      if (!caseFromQuery && !magicToken && !resumeMode && typeof window !== "undefined") {
        const hasDraftInput = Boolean(
          values.email ||
          values.phone ||
          values.fullName ||
          values.nationality ||
          values.countryOfResidence ||
          values.purposeOfVisit ||
          values.visaDuration ||
          values.consent
        );
        if (hasDraftInput) {
          sessionStorage.setItem(REGISTER_DRAFT_SESSION_KEY, "1");
          setHasActiveDraftSession(true);
        }
      }

      updateData({
        fileNumber: caseFromQuery || data.fileNumber,
        visaDuration: (values.visaDuration as "1-Year" | "5-Year" | undefined) ?? data.visaDuration,
        email: values.email ?? data.email,
        phone: values.phone ?? data.phone,
        countryCode: values.countryCode ?? data.countryCode,
        fullName: values.fullName ?? data.fullName,
        nationality: values.nationality ?? data.nationality,
        countryOfResidence: values.countryOfResidence ?? data.countryOfResidence,
        purposeOfVisit: values.purposeOfVisit ?? data.purposeOfVisit,
        consentAccepted: values.consent ?? data.consentAccepted,
      });
    });

    return () => subscription.unsubscribe();
  }, [watch, updateData, caseFromQuery, magicToken, resumeMode, data]);

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);
    setHasSubmitError(false);
    
    try {
      if (isExistingCase) {
        const updateResponse = await eVisaApi.updateRegistration({
          case_number: caseFromQuery,
          email: data.email,
          confirm_email: data.email,
          mobile_number: `${data.countryCode}${data.phone}`,
          full_name: data.fullName,
          nationality: data.nationality,
          country_of_residence: data.countryOfResidence,
          purpose_of_visit: data.purposeOfVisit,
          visa_duration: data.visaDuration,
          consent: data.consent,
        });

        toast.success(updateResponse.message || "Application details updated.");
        updateData({
          fileNumber: caseFromQuery,
          visaDuration: data.visaDuration,
          email: data.email,
          phone: data.phone,
          countryCode: data.countryCode,
          fullName: data.fullName,
          nationality: data.nationality,
          countryOfResidence: data.countryOfResidence,
          purposeOfVisit: data.purposeOfVisit,
          consentAccepted: true,
        });

        if (!detailsMode && updateResponse.data.resume_url) {
          router.replace(updateResponse.data.resume_url);
        }
        return;
      }

      const response = await eVisaApi.register({
        email: data.email,
        confirm_email: data.email,
        mobile_number: `${data.countryCode}${data.phone}`,
        full_name: data.fullName,
        nationality: data.nationality,
        country_of_residence: data.countryOfResidence,
        purpose_of_visit: data.purposeOfVisit,
        visa_duration: data.visaDuration,
        consent: data.consent,
      });

      const fileNumber = response.data.case_number;
      toast.success(response.message || "Registration successful.");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(REGISTER_DRAFT_SESSION_KEY);
      }
      
      updateData({
        fileNumber,
        visaDuration: data.visaDuration,
        email: data.email,
        phone: data.phone,
        countryCode: data.countryCode,
        fullName: data.fullName,
        nationality: data.nationality,
        countryOfResidence: data.countryOfResidence,
        purposeOfVisit: data.purposeOfVisit,
        consentAccepted: true,
        otpExpiresInMinutes: response.data.otp_expires_in_minutes ?? EVISA_DEFAULTS.otpExpiresInMinutes,
        resendCooldownSeconds: response.data.resend_cooldown_seconds ?? EVISA_DEFAULTS.resendCooldownSeconds,
        maxResends: response.data.max_resends ?? EVISA_DEFAULTS.maxResends,
        isEmailConfirmed: false,
        hasPaid: false,
        hasUploaded: false,
      });

      const backendConfirmUrl = response.data.confirm_url;
      const cooldownSeconds = response.data.resend_cooldown_seconds ?? EVISA_DEFAULTS.resendCooldownSeconds;
      if (backendConfirmUrl) {
        const separator = backendConfirmUrl.includes("?") ? "&" : "?";
        router.push(`${backendConfirmUrl}${separator}cooldown=${encodeURIComponent(String(cooldownSeconds))}`);
      } else {
        router.push(`/indian-e-visa/confirm-email?case=${encodeURIComponent(fileNumber)}&cooldown=${encodeURIComponent(String(cooldownSeconds))}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
      setHasSubmitError(true);
      setTimeout(() => setHasSubmitError(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const extractFirstErrorMessage = (formErrors: FieldErrors<RegistrationData>): string => {
    for (const error of Object.values(formErrors)) {
      if (!error) continue;
      if (typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
      }
      if (typeof error === "object") {
        const nested = extractFirstErrorMessage(error as FieldErrors<RegistrationData>);
        if (nested) return nested;
      }
    }
    return "Please check the form details and try again.";
  };

  const onError = (formErrors: FieldErrors<RegistrationData>) => {
    toast.error(extractFirstErrorMessage(formErrors));
    setHasSubmitError(true);
    setTimeout(() => setHasSubmitError(false), 500);
  };

  const detailsSnapshot = watch();
  const detailsMissingCount = [
    detailsSnapshot.fullName,
    detailsSnapshot.phone,
    detailsSnapshot.email,
    detailsSnapshot.countryOfResidence,
    detailsSnapshot.nationality,
  ].filter((value) => {
    if (typeof value === "boolean") return value !== true;
    return !value;
  }).length;

  const displayField = (value?: string) => value && value.trim() ? value : "Not provided";
  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
  };
  const formatBackendLabel = (value?: string | null) => {
    if (!value) return "-";
    return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  };
  const cleanedApplicationNote = useMemo(() => {
    const raw = (applicationRecord?.notes || "").trim();
    if (!raw) return "";

    // Some backend updates can store serialized payload JSON in notes; don't show that to users.
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return "";
      }
    } catch {
      // Non-JSON notes are fine.
    }

    const lowered = raw.toLowerCase();
    if (
      lowered.includes("registration snapshot") ||
      (lowered.includes("purpose:") && lowered.includes("mobile_number")) ||
      (lowered.includes("full_name") && lowered.includes("country_of_residence"))
    ) {
      return "";
    }
    if (raw.startsWith("{") && lowered.includes("case_number") && lowered.includes("purpose_of_visit")) {
      return "";
    }

    return raw;
  }, [applicationRecord?.notes]);
  const pipelineStageRaw =
    applicationRecord?.stage ||
    applicationRecord?.kanban_stage ||
    applicationRecord?.current_stage ||
    resumeApplication?.current_stage ||
    "registered";
  const applicationStageLabel = formatBackendLabel(pipelineStageRaw);

  const resolvedDashboardStatus = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    if (["ready_for_submission", "submitted", "delivered"].includes(stageNormalized)) {
      return formatBackendLabel(stageNormalized);
    }
    if (stageNormalized === "review_pending") {
      return "Under Review";
    }
    return formatBackendLabel(applicationRecord?.unified_status || applicationRecord?.application_status || resumeApplication?.application_status || "under_review");
  })();

  const isPendingDocumentUpload = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    const statusNormalized = String(applicationRecord?.unified_status || applicationRecord?.application_status || resumeApplication?.application_status || "").toLowerCase();

    return (
      ["document_upload_pending", "pending_docs"].includes(stageNormalized) ||
      ["document_upload_pending", "pending_docs"].includes(statusNormalized)
    );
  })();

  const resolvedDashboardMessage = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    const statusNormalized = String(applicationRecord?.unified_status || applicationRecord?.application_status || "").toLowerCase();
    if (["document_upload_pending", "pending_docs"].includes(stageNormalized) || ["document_upload_pending", "pending_docs"].includes(statusNormalized)) {
      return "Your application is pending document upload. Please upload required documents to continue.";
    }
    if (stageNormalized === "ready_for_submission") {
      return "Your documents are approved and your application is ready for submission.";
    }
    if (stageNormalized === "submitted") {
      return "Your application has been submitted. We will update you when a decision is received.";
    }
    if (stageNormalized === "delivered") {
      return "Your application is complete. You will receive your final e-Visa document and completion update shortly on your registered email.";
    }
    if (String(applicationRecord?.unified_status || applicationRecord?.application_status || "").toLowerCase() === "reuploaded_pending_review") {
      return "Corrected documents received. Your re-upload is pending admin review.";
    }
    return cleanedApplicationNote || "Your application is being processed. We will update you as soon as there is progress.";
  })();

  useEffect(() => {
    if (!detailsMode || !caseFromQuery || !authService.isLoggedIn()) {
      return;
    }

   const fetchApplicationExtras = async () => {
  try {
    const [detailRes, docsRes, profileRes] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(caseFromQuery)}/`, { method: "GET" }),
      authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(caseFromQuery)}/documents/`, { method: "GET" }),
      authenticatedFetch(`${API_BASE_URL}/auth/me/`, { method: "GET" }),
    ]);

    const detailJson = await detailRes.json().catch(() => ({}));
    const docsJson = await docsRes.json().catch(() => ({}));

    if (detailRes.ok) {
      setApplicationRecord(((detailJson as { data?: unknown }).data || null) as {
        reference_number?: string;
        stage?: string;
        kanban_stage?: string | null;
        application_status?: string;
        unified_status?: string;
        current_stage?: string;
        application_date?: string | null;
        submission_date?: string | null;
        approval_date?: string | null;
        completion_date?: string | null;
        created_at?: string;
        updated_at?: string;
        notes?: string;
        service_name?: string;
        audit_result?: "pending" | "green" | "amber" | "red" | string;
        auditor_notes?: string;
        correction_requested_at?: string | null;
        flagged_documents?: Array<{
          document_type?: string;
          document_name?: string;
          issue_reason?: string;
          issue?: string;
          required_action?: string;
          status?: string;
        }>;
        latest_audit_findings?: Array<{
          id?: number;
          document_type?: string;
          document_name?: string;
          finding_description?: string;
          required_action?: string;
          priority?: string;
        }>;
      });
    }

    if (docsRes.ok) {
      setDocuments((((docsJson as { data?: unknown[] }).data || []) as Array<{
        id: number;
        document_type: string;
        verification_status: string;
        upload_date: string | null;
        updated_at: string;
      }>));
    }

    // ✅ Fill missing fields from profile (only on first load, not on interval refetches)
    if (profileRes.ok) {
      const profileJson = await profileRes.json().catch(() => ({}));
      const coreUser = (profileJson as any)?.data?.core_user;
      console.log("[FETCH EXTRAS] coreUser received:", coreUser);
      
      if (coreUser) {
        if (!watch("phone") && coreUser.phone_number) {
          const { countryCode, phone } = splitPhoneNumber(coreUser.phone_number);
          console.log("[FETCH EXTRAS] about to setValue phone:", phone, "countryCode:", countryCode);
          setValue("countryCode", countryCode);
          setValue("phone", phone);
          console.log("[FETCH EXTRAS] after setValue - watch phone:", watch("phone"), "watch countryCode:", watch("countryCode"));
        }

        const residenceMap: Record<string, string> = {
          "Australia": "Australia",
          "United Kingdom": "United Kingdom",
          "United States": "United States",
          "Canada": "Canada",
          "UAE": "UAE",
          "Singapore": "Singapore",
        };
        if (!watch("countryOfResidence") && coreUser.country) {
          const mapped = residenceMap[coreUser.country] ?? "Other";
          setValue("countryOfResidence", mapped as RegistrationData["countryOfResidence"]);
        }
      }
    }

  } catch {
    // Keep showing available resume data if docs/details fetch fails.
  }
};


    void fetchApplicationExtras();

    const intervalId = window.setInterval(() => {
      void fetchApplicationExtras();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [detailsMode, caseFromQuery]);



  
  useEffect(() => {
    if (!detailsMode) return;
    if (!watch("visaDuration")) {
      setValue("visaDuration", "1-Year");
    }
    if (!watch("purposeOfVisit")) {
      setValue("purposeOfVisit", "Tourism");
    }
  }, [detailsMode, setValue, watch]);

  const inputClasses = () =>
    detailsMode
      ? "w-full px-4 py-3 border rounded-[14px] font-body text-[14px] bg-[#f1f2f6] outline-none transition-all duration-200 border-[#d7dbe8] focus:border-[#7f86a5] focus:shadow-[0_0_0_3px_rgba(127,134,165,0.2)] disabled:opacity-50 disabled:bg-gray-100 text-[#303a52]"
      : "w-full px-3 py-2.5 border rounded-lg font-body text-[12px] bg-[#f8fafd] outline-none transition-all duration-200 border-[#d7e3f2] focus:border-[#1a56db] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.16)] disabled:opacity-50 disabled:bg-gray-50";

  const isPaymentConfirmed = resumeApplication?.payment_confirmed === true;
  const isEmailConfirmed = resumeApplication?.email_confirmed === true;
  const isFormLocked = detailsMode && isPaymentConfirmed && isEmailConfirmed;
  const isEVisaCorrectionRequested =
    String(applicationRecord?.application_status || "").toLowerCase() === "correction_requested" ||
    String(applicationRecord?.current_stage || "").toLowerCase() === "correction_requested" ||
    String(applicationRecord?.unified_status || "").toLowerCase() === "pending_docs";
  const hasAnyFlaggedDocuments =
    Array.isArray(applicationRecord?.flagged_documents) && applicationRecord.flagged_documents.length > 0;
  const latestReuploadRequest = useMemo(() => {
    const requests = Array.isArray(applicationRecord?.reupload_requests) ? applicationRecord.reupload_requests : [];
    if (requests.length === 0) {
      return null;
    }
    return [...requests].sort((left, right) => {
      const leftTs = new Date(left.created_at || "").getTime();
      const rightTs = new Date(right.created_at || "").getTime();
      return rightTs - leftTs;
    })[0] || null;
  }, [applicationRecord?.reupload_requests]);

  const activeFlaggedDocuments = useMemo(() => {
    const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

    const pickActive = (source: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      issue?: string;
      required_action?: string;
      status?: string;
    }>) => {
      const filtered = source.filter((item) => {
        const status = normalize(item.status);
        return !["reuploaded", "resolved", "done"].includes(status);
      });

      const deduped = filtered.reduce((acc, item) => {
        const key = normalize(item.document_type) || normalize(item.document_name);
        if (!key) return acc;
        acc.set(key, item);
        return acc;
      }, new Map<string, (typeof filtered)[number]>());

      return Array.from(deduped.values());
    };

    const latestRequested = Array.isArray(latestReuploadRequest?.flagged_documents)
      ? latestReuploadRequest.flagged_documents
      : [];
    const latestActive = pickActive(latestRequested);
    if (latestActive.length > 0) {
      return latestActive;
    }

    const fallbackRequested = Array.isArray(applicationRecord?.flagged_documents)
      ? applicationRecord.flagged_documents
      : [];
    return pickActive(fallbackRequested);
  }, [latestReuploadRequest, applicationRecord?.flagged_documents]);
  const correctionRequestedAtMs = useMemo(() => {
    const candidate =
      applicationRecord?.correction_requested_at ||
      latestReuploadRequest?.created_at ||
      "";
    const parsed = candidate ? new Date(candidate).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }, [
    applicationRecord?.correction_requested_at,
    latestReuploadRequest?.created_at,
  ]);
  const pendingFlaggedDocuments = useMemo(() => {
    const flaggedItems = activeFlaggedDocuments;
    if (flaggedItems.length === 0) {
      return [];
    }

    const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

    return flaggedItems.filter((flagged) => {
      const flaggedType = normalize(flagged.document_type);
      const flaggedName = normalize(flagged.document_name);

      const latestMatch = documents
        .filter((doc) => {
          const docType = normalize(doc.document_type);
          const docName = normalize(doc.document_name);
          const originalName = normalize(doc.original_filename);
          const storedName = normalize(doc.stored_filename);

          const matchType = Boolean(flaggedType) && docType === flaggedType;
          const matchName =
            Boolean(flaggedName) &&
            (docName === flaggedName || originalName === flaggedName || storedName === flaggedName);

          return matchType || matchName;
        })
        .sort((a, b) => {
          const aTs = new Date(a.upload_date || a.created_at || a.updated_at || "").getTime();
          const bTs = new Date(b.upload_date || b.created_at || b.updated_at || "").getTime();
          return bTs - aTs;
        })[0];

      if (!latestMatch) {
        return true;
      }

      const latestUploadedAt = new Date(
        latestMatch.upload_date || latestMatch.created_at || latestMatch.updated_at || "",
      ).getTime();

      if (!Number.isFinite(latestUploadedAt) || correctionRequestedAtMs <= 0) {
        return true;
      }

      return latestUploadedAt <= correctionRequestedAtMs;
    });
  }, [activeFlaggedDocuments, documents, correctionRequestedAtMs]);
  const canShowInteractiveCorrection =
    pendingFlaggedDocuments.length > 0 &&
    (isEVisaCorrectionRequested || applicationRecord?.audit_result === "amber");
  const adminMessages = useMemo(() => {
    const messagesFromApi = Array.isArray(applicationRecord?.admin_messages) ? applicationRecord.admin_messages : [];
    if (messagesFromApi.length > 0) {
      return messagesFromApi;
    }

    const auditLogs = Array.isArray(applicationRecord?.audit_logs) ? applicationRecord.audit_logs : [];
    return auditLogs
      .filter((item) => String(item.action || "").toLowerCase() === "admin_customer_message")
      .map((item) => ({
        created_at: item.timestamp,
        subject: item.metadata?.subject || "FlyOCI update",
        message: item.metadata?.description || item.metadata?.message || "",
      }))
      .filter((item) => item.message.trim().length > 0);
  }, [applicationRecord?.admin_messages, applicationRecord?.audit_logs]);
  const latestReuploadRequestNote = useMemo(() => latestReuploadRequest?.note || "", [latestReuploadRequest]);

  const fieldDisabledClass = isReadOnlyApplication ? "opacity-90" : "";
  
  const shouldShowField = (value?: string | null) => {
    if (!detailsMode) return true;
    return value && value.trim() ? true : false;
  };

  const handleCorrectionReupload = async (
    flaggedDocumentName: string,
    file: File,
    documentKey: string,
  ) => {
    const caseNumber = (caseFromQuery || data.fileNumber || "").trim().toUpperCase();
    const applicantEmail = (watch("email") || data.email || "").trim();

    if (!caseNumber) {
      toast.error("Case number is missing.");
      return;
    }
    if (!applicantEmail) {
      toast.error("Email is required to submit re-upload.");
      return;
    }

    const formData = new FormData();
    formData.append("case_number", caseNumber);
    formData.append("email", applicantEmail);
    formData.append("flagged_document_name", flaggedDocumentName);
    formData.append("document", file);

    try {
      setReuploadingDocumentKey(documentKey);
      setReuploadConfirmationMessage("");

      const response = await fetch(`${API_BASE_URL}/evisa/correction-resubmit/`, {
        method: "POST",
        body: formData,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (json as { message?: string }).message || "Failed to submit correction re-upload.";
        throw new Error(message);
      }

      const responseData = (json as {
        data?: {
          application_status?: string;
          document?: {
            id?: number;
            document_type?: string;
            document_name?: string;
            original_filename?: string;
            uploaded_at?: string | null;
            verification_status?: string;
          };
        };
      }).data;

      setReuploadConfirmationMessage("Re-upload submitted, our team will review shortly");
      setApplicationRecord((prev) => {
        if (!prev) return prev;
        const nextApplicationStatus = responseData?.application_status || prev.application_status;
        return {
          ...prev,
          application_status: nextApplicationStatus,
          unified_status:
            String(nextApplicationStatus || "").toLowerCase() === "reuploaded_pending_review"
              ? "reuploaded_pending_review"
              : prev.unified_status,
        };
      });

      if (responseData?.document?.id && responseData.document.document_type) {
        setDocuments((prev) => [
          {
            id: responseData.document?.id || 0,
            document_type: responseData.document?.document_type || "other",
            document_name: responseData.document?.document_name || responseData.document?.original_filename || file.name || flaggedDocumentName,
            original_filename: responseData.document?.original_filename || file.name,
            verification_status: responseData.document?.verification_status || "pending",
            upload_date: responseData.document?.uploaded_at || new Date().toISOString(),
            updated_at: responseData.document?.uploaded_at || new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success("Correction document uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit correction re-upload.");
    } finally {
      setReuploadingDocumentKey("");
    }
  };

  if (detailsMode) {
    const applicantName = detailsSnapshot.fullName || data.fullName || "Applicant";
    const appId = caseFromQuery || "N/A";

    return (
      <div className={`${outfit.className} min-h-screen bg-[#eef4ff] text-[#0f1f3d]`}>
        <div className="border-b border-[#d4e3ff] bg-[#eaf2ff]">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-[#6982ab]">
              Dashboard / Application / <span className="text-[#143974] font-semibold">{applicantName}</span>
            </p>
            <p className="text-[12px] text-[#7994bf] font-medium">Application ID: {appId}</p>
          </div>
        </div>

        <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          <section className="rounded-2xl border border-[#d4e3ff] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,59,120,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#5e7599]">
              <p>
                Application: <span className="font-semibold text-[#173c78]">{resumeApplication?.service_name || "e-Visa Application"}</span>
              </p>
              <p>
                Status: <span className="font-semibold text-[#173c78]">{resolvedDashboardStatus}</span> · Stage: <span className="font-semibold text-[#173c78]">{applicationStageLabel}</span>
              </p>
              <p>
                Updated: <span className="font-semibold text-[#173c78]">{formatDate(applicationRecord?.updated_at || resumeApplication?.updated_at)}</span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <h3 className="text-[16px] font-semibold text-[#173c78]">Application Status</h3>
              <span className="text-[12px] font-semibold text-[#5f7ca8] uppercase">{resolvedDashboardStatus}</span>
            </div>
            <div className="p-4 sm:p-5 bg-[#f8fbff] space-y-3">
              <p className="text-[13px] text-[#1d2f4f]">{resolvedDashboardMessage}</p>
              {isPendingDocumentUpload ? (
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                  className="rounded-lg bg-[#0f2f66] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Upload Documents
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <h3 className="text-[16px] font-semibold text-[#173c78]">Admin Messages</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8bab]">Latest updates from team</span>
            </div>
            <div className="p-4 sm:p-5 space-y-3 bg-[#f8fbff]">
              {adminMessages.length > 0 ? (
                adminMessages.slice().reverse().map((messageItem, index) => (
                  <div key={`${messageItem.created_at || "msg"}-${index}`} className="rounded-xl border border-[#d9e4f7] bg-white p-3">
                    <p className="text-[13px] font-semibold text-[#1d2f4f]">{messageItem.subject || "FlyOCI update"}</p>
                    <p className="mt-1 text-[12px] text-[#5e7599] whitespace-pre-wrap">{messageItem.message}</p>
                    {messageItem.created_at ? <p className="mt-1 text-[11px] text-[#8aa0bf]">{formatDate(messageItem.created_at)}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#5e7599]">No admin messages yet.</p>
              )}
            </div>
          </section>

          {!resumeApplication?.payment_confirmed ? (
          <section className="rounded-2xl border border-[#f0d89d] bg-[#fff6de] border-l-[3px] border-l-[#e6a72f] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe2a8] text-[#a66800]">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-[#5f3a00]">Payment Required to Activate Application</h2>
                <p className="mt-1 text-[13px] text-[#8a6a2d]">
                  Complete payment to unlock all sections and continue with full application processing.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/payment?case=${encodeURIComponent(caseFromQuery)}`)}
                  className="mt-3 rounded-lg bg-[#0f2f66] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Complete Payment Now
                </button>
              </div>
            </div>
          </section>
          ) : (
          <section className="rounded-2xl border border-[#b8e6c2] bg-[#ecfff1] border-l-[3px] border-l-[#24a148] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#1f6b35]">Payment Confirmed</h2>
                <p className="mt-1 text-[13px] text-[#3b7a4c]">
                  Your application is in progress as per backend stage updates.
                </p>
              </div>
            </div>
          </section>
          )}

          {isEVisaCorrectionRequested && !hasAnyFlaggedDocuments && documents.length > 0 ? (
          <section className="rounded-2xl border border-[#f0d89d] bg-[#fff6de] border-l-[3px] border-l-[#e6a72f] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe2a8] text-[#a66800]">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-[#5f3a00]">Action Required: Re-upload Documents</h2>
                <p className="mt-1 text-[13px] text-[#8a6a2d]">
                  Our team requested updated documents for your e-Visa application. Please re-upload from the upload step.
                </p>
                {latestReuploadRequestNote ? (
                  <p className="mt-2 text-[12px] text-[#7b5b23]">
                    Admin note: <span className="font-semibold">{latestReuploadRequestNote}</span>
                  </p>
                ) : null}
                {applicationRecord?.notes ? (
                  <p className="mt-2 text-[12px] text-[#7b5b23]">
                    Latest note: <span className="font-semibold">{applicationRecord.notes}</span>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                  className="mt-3 rounded-lg bg-[#0f2f66] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Re-upload Documents
                </button>
              </div>
            </div>
          </section>
          ) : null}

          {(applicationRecord?.audit_result && applicationRecord.audit_result !== "pending") || canShowInteractiveCorrection ? (
          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Audit Result</h3>
              </div>
              <span className="text-[12px] font-semibold text-[#5f7ca8] uppercase">{applicationRecord?.audit_result || "PENDING"}</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5 space-y-3">
              <p className="text-[13px] text-[#1d2f4f]">
                {applicationRecord?.audit_result === "green"
                  ? "All checks passed. You can proceed to the next step."
                  : "Corrections are required before approval. Please upload corrected documents."}
              </p>
              {applicationRecord?.auditor_notes ? (
                <div className="rounded-xl border border-[#d9e4f7] bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Auditor Notes</p>
                  <p className="mt-2 text-[13px] text-[#1d2f4f] whitespace-pre-wrap">{applicationRecord?.auditor_notes}</p>
                </div>
              ) : null}
              {/* // FLYOCI-FIX: BUG-5 */}
              {canShowInteractiveCorrection ? (
                <div className="space-y-2">
                  <h4 className="text-[14px] font-semibold text-[#173c78]">Reupload Required Documents</h4>
                  <button
                    type="button"
                    onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                    className="rounded-lg bg-[#0f2f66] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0c2551]"
                  >
                    Open Upload Page
                  </button>
                  {pendingFlaggedDocuments.map((item, index) => {
                    const documentLabel = item.document_name || item.document_type || `Document ${index + 1}`;
                    const documentKey = `${documentLabel}-${index}`;
                    const isUploading = reuploadingDocumentKey === documentKey;

                    return (
                    <div key={documentKey} className="rounded-xl border border-[#d9e4f7] bg-white px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#1d2f4f]">{documentLabel}</p>
                      <p className="text-[12px] text-[#6c84ab] mt-1">Issue: {item.issue_reason || item.issue || "Correction required."}</p>
                      <p className="text-[12px] text-[#6c84ab]">Required action: {item.required_action || "Please upload corrected document."}</p>
                      <div className="mt-3">
                        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#123c84] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0f2f66] disabled:cursor-not-allowed disabled:opacity-70">
                          {isUploading ? "Uploading..." : `Upload ${documentLabel}`}
                          <input
                            type="file"
                            className="hidden"
                            disabled={isUploading || Boolean(reuploadingDocumentKey)}
                            onChange={(event) => {
                              const selectedFile = event.target.files?.[0];
                              if (selectedFile) {
                                void handleCorrectionReupload(documentLabel, selectedFile, documentKey);
                              }
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    );
                  })}
                  {reuploadConfirmationMessage ? (
                    <p className="text-[12px] font-semibold text-[#1f6b35]">{reuploadConfirmationMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
          ) : null}

          <div className="space-y-5">
            <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[18px] font-semibold text-[#173c78]">1. Applicant Personal Details</h3>
              </div>
              <span className="text-[13px] font-semibold text-[#d04b63]">{detailsMissingCount} items missing</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shouldShowField(detailsSnapshot.fullName || data.fullName) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Full name</label>
                    <input {...register("fullName")} disabled={isFormLocked} className={`mt-2 ${inputClasses()}`} placeholder="Enter full name" />
                  </div>
                )}
                
                {(detailsMode ||shouldShowField(detailsSnapshot.phone || data.phone) || shouldShowField(detailsSnapshot.countryCode || data.countryCode)) && (() => {
                  console.log("[DETAILS GRID RENDER] phone:", detailsSnapshot.phone, "countryCode:", detailsSnapshot.countryCode, "isFormLocked:", isFormLocked);
                  return (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Mobile number</label>
                    <div className="mt-2 flex gap-2">
                      <select {...register("countryCode")} disabled={false} style={isFormLocked ? {pointerEvents: "none", opacity: 0.7} : {}} className={`${inputClasses()} w-[96px]`}>
                        <option value="+44">+44</option>
                        <option value="+1">+1</option>
                        <option value="+91">+91</option>
                        <option value="+971">+971</option>
                        <option value="+65">+65</option>
                        <option value="+61">+61</option>
                      </select>
                      <input {...register("phone")} disabled={false} style={isFormLocked ? {pointerEvents: "none", opacity: 0.7} : {}} className={`${inputClasses()} flex-1`} placeholder="Enter mobile number" />
                    </div>
                  </div>
                  );
                })()}


                {shouldShowField(detailsSnapshot.email || data.email) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Email</label>
                    <input {...register("email")} disabled={isFormLocked} type="email" className={`mt-2 ${inputClasses()}`} placeholder="Enter email" />
                  </div>
                )}
                {(detailsMode || shouldShowField(detailsSnapshot.countryOfResidence || data.countryOfResidence)) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Country of residence</label>
                    <select {...register("countryOfResidence")} disabled={isFormLocked} className={`mt-2 ${inputClasses()}`}>
                      <option value="">Select country</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="UAE">UAE</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                {(detailsMode || shouldShowField(detailsSnapshot.nationality || data.nationality)) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Nationality</label>
                    <select {...register("nationality")} disabled={isFormLocked} className={`mt-2 ${inputClasses()}`}>
                      <option value="">Select nationality</option>
                      <option value="British">British</option>
                      <option value="American">American</option>
                      <option value="Canadian">Canadian</option>
                      <option value="Indian">Indian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Case number</label>
                  <p className="mt-2 min-h-[48px] rounded-lg bg-[#edf3ff] px-3 py-2 text-[14px] font-semibold text-[#1d2f4f] flex items-center">
                    {displayField(caseFromQuery || data.fileNumber || "")}
                  </p>
                </div>
              </div>

              <input type="hidden" {...register("visaDuration")} />
              <input type="hidden" {...register("purposeOfVisit")} />
              <input type="hidden" {...register("consent")} />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-lg bg-[#edf3ff] px-4 py-2 text-[13px] font-semibold text-[#1d3f74]">
                  {isSubmitting ? "Saving changes..." : "Auto-save is on"}
                </div>
                <p className="text-[12px] text-[#6d88b1]">
                  Changes update the application record automatically.
                </p>
              </div>
            </div>
          </section>
          </div>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Documents Received</h3>
              </div>
              <span className="text-[12px] font-semibold text-[#5f7ca8]">{documents.length} document(s)</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5">
              {documents.length === 0 ? (
                <p className="text-[13px] text-[#6f88ae]">No documents received yet for this application.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-[#d9e4f7] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1d2f4f]">{formatBackendLabel(doc.document_type)}</p>
                      <p className="text-[12px] text-[#6c84ab]">Status: <span className="font-semibold">{formatBackendLabel(doc.verification_status)}</span></p>
                      <p className="text-[12px] text-[#6c84ab]">Uploaded: <span className="font-semibold">{formatDate(doc.upload_date || doc.updated_at)}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Backend Application Data</h3>
              </div>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Application date", value: formatDate(applicationRecord?.application_date || resumeApplication?.application_date) },
                { label: "Submission date", value: formatDate(applicationRecord?.submission_date) },
                { label: "Approval date", value: formatDate(applicationRecord?.approval_date) },
                { label: "Completion date", value: formatDate(applicationRecord?.completion_date) },
                { label: "Current stage", value: applicationStageLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#d9e4f7] bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">{item.label}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#1d2f4f]">{item.value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 sm:col-span-2 lg:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Verification Summary</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Email: <span className="text-[#355f9b]">{resumeApplication?.email_confirmed ? "Confirmed" : "Pending"}</span></p>
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Payment: <span className="text-[#355f9b]">{resumeApplication?.payment_confirmed ? "Confirmed" : "Pending"}</span></p>
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Consent: <span className="text-[#355f9b]">{resumeApplication?.consent_captured ? "Captured" : "Pending"}</span></p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#f0f5fc] text-black pb-6 sm:pb-8 pt-6 sm:pt-8 overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-[#56a7ff]/30 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 12, 0], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-20 right-0 h-48 w-48 rounded-full bg-[#9cc8ff]/35 blur-3xl"
        animate={{ x: [0, -22, 0], y: [0, -10, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {!detailsMode && (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-1 sm:mb-2">
          <ProgressStepper currentStep={0} />
        </div>
      )}

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className={`grid grid-cols-1 ${detailsMode ? "" : "lg:grid-cols-[0.38fr_0.62fr]"} gap-6 lg:gap-8 items-stretch`}>
          <aside className={`${detailsMode ? "hidden" : "px-1 sm:px-2 lg:px-0 lg:pr-2 h-full"}`}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -3 }}
              className="max-w-[430px] lg:max-w-none h-full rounded-xl border border-[#dde8f5] bg-white/95 backdrop-blur-sm p-5 sm:p-6 flex flex-col shadow-[0_20px_48px_rgba(23,72,145,0.08)]"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-[#e8f0fe] border border-[#c7dafb] text-[#1a56db] px-3 py-1.5 rounded-full font-body text-xs font-semibold mb-5">
                <span className="h-2 w-2 rounded-full bg-[#1a56db]" />
                Indian e-Visa assistance
              </motion.div>

              <motion.h1 variants={itemVariants} className="font-heading text-[22px] sm:text-[24px] lg:text-[26px] font-semibold leading-tight text-[#0f1f3d] mb-3">
                Apply for <span className="italic text-[#1a56db]">Indian e-Visa</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="font-body text-[13px] text-[#6b7d92] mb-6">
                Fast, secure assistance for UK & US travellers
              </motion.p>

              <motion.p variants={itemVariants} className="font-body text-[12px] text-[#6b7d92] mb-6 max-w-[420px] leading-relaxed">
                Register in under 60 seconds. Complete payment to upload documents. We submit on your behalf.
              </motion.p>

              <motion.div variants={itemVariants} className="hidden sm:block space-y-4 mb-6">
                {[
                  "Choose visa type",
                  "Use email you check regularly",
                  "Enter passport name exactly",
                  "Pay to unlock upload",
                ].map((item, idx) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-[#1a56db] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="font-body text-[13px] text-[#6b7d92] leading-relaxed">{item}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="hidden sm:block mt-auto space-y-3">
                <details className="group rounded-lg border border-[#d7e3f2] bg-[#f8fafd] p-3">
                  <summary className="cursor-pointer list-none font-body text-[12px] font-semibold text-[#0f1f3d] flex items-center justify-between">
                    Why we ask these details
                    <span className="text-[#7b8fa7] group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-2 font-body text-[11px] text-[#6b7d92] leading-relaxed">
                    This helps us prepare your application correctly and reduce delays caused by document mismatches.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#d7e3f2] bg-[#f8fafd] p-3">
                  <summary className="cursor-pointer list-none font-body text-[12px] font-semibold text-[#0f1f3d] flex items-center justify-between">
                    What happens next
                    <span className="text-[#7b8fa7] group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-2 font-body text-[11px] text-[#6b7d92] leading-relaxed">
                    After registration you complete payment, then upload passport and photo for submission.
                  </p>
                </details>

                <div className="bg-white border border-[#c9dbf3] rounded-xl p-3">
                <p className="font-body text-[11px] text-[#74889f] leading-relaxed">
                  We assist with preparation and submission of your Indian e-Visa application based on the information and documents you provide. Independent service. Not affiliated with the Government of India.
                </p>
                </div>
              </motion.div>
            </motion.div>
          </aside>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`relative ${detailsMode ? "bg-[#ececf4] border border-[#dadde9] rounded-2xl p-5 sm:p-6 lg:p-7" : "bg-white/95 backdrop-blur-sm border border-[#dde8f5] rounded-xl border-t-[3px] border-t-[#1a56db] p-5 sm:p-6 lg:p-7 h-full lg:max-h-[860px] lg:overflow-y-auto lg:pr-4 shadow-[0_24px_54px_rgba(20,76,160,0.10)]"}`}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-3 top-3 hidden sm:block"
              animate={{ rotate: [0, 8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-4 w-4 text-[#1a56db]/40" />
            </motion.div>
            <div className="mb-5">
              {detailsMode && (
                <div className="mb-4 rounded-xl border border-[#c7dafb] bg-[#eef4ff] px-4 py-3 text-[12px] text-[#1a56db] font-semibold">
                  Application Details Form loaded. You can update and save this information.
                </div>
              )}
              {isReadOnlyApplication && (
                <div className="mb-4 rounded-xl border border-[#c7dafb] bg-[#eef4ff] px-4 py-3 text-[12px] text-[#1a56db] font-semibold">
                  View only mode: this application is prefilled and locked for editing.
                </div>
              )}
              <h3 className="font-heading text-[22px] sm:text-[24px] font-semibold leading-tight text-[#0f1f3d] mb-2">
                {detailsMode ? (
                  <>
                    Application <span className="italic text-[#1a56db]">Details Form</span>
                  </>
                ) : (
                  <>
                    Apply for <span className="italic text-[#1a56db]">Indian e-Visa</span>
                  </>
                )}
              </h3>
              <p className="font-body text-[13px] text-[#6b7d92] mb-2">
                {detailsMode ? "Review or update applicant details in form format." : "Fast, secure assistance for UK & US travellers"}
              </p>
              {detailsMode && caseFromQuery && (
                <p className="inline-flex items-center rounded-full border border-[#d3e2f9] bg-[#f4f8ff] px-3 py-1 text-[11px] font-semibold text-[#1a56db] mb-2">
                  Case: {caseFromQuery}
                </p>
              )}
              <p className="font-body text-[12px] text-[#6b7d92] leading-relaxed mb-2">
                Register in under 60 seconds. Complete payment to upload documents. We submit on your behalf.
              </p>
              {detailsMode && (
                <div className="mt-2 mb-1 rounded-xl border border-[#d6d9e6] bg-[#f7f8fc] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-heading text-[36px] leading-none text-[#4452ff]">|</h4>
                    <h4 className="font-heading text-[30px] sm:text-[34px] font-semibold text-[#1f2940] flex-1">1. Applicant Personal Details</h4>
                    <span className="rounded-full bg-[#ffe9ec] px-3 py-1 text-[13px] font-semibold text-[#df5c6f]">
                      {detailsMissingCount} Items Missing
                    </span>
                  </div>
                </div>
              )}
              <p className="font-body text-[11px] text-[#8a9bb0] leading-relaxed">
                We assist with preparation and submission of your Indian e-Visa application based on the information and documents you provide. Independent service. Not affiliated with the Government of India.
              </p>
            </div>
            <div className="w-full h-[1px] bg-[#e5edf7] mb-5" />

            <form onSubmit={handleSubmit(onSubmit, onError)} className={`space-y-4 ${detailsMode ? "rounded-2xl border border-[#d6d9e6] bg-[#f7f8fc] p-4 sm:p-5" : ""}`}>
              
              {!detailsMode && (
                <div>
                  <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Select visa duration *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      name="visaDuration"
                      control={control}
                      render={({ field }) => (
                        <>
                          <button
                            type="button"
                            disabled={isReadOnlyApplication}
                            onClick={() => field.onChange("1-Year")}
                            className={`relative rounded-[10px] border p-3 text-left transition-all ${
                              field.value === "1-Year"
                                ? "border-[#1a56db] bg-[#f0f6ff]"
                                : "border-[#d7e3f2] bg-white"
                            }`}
                          >
                            <span className="absolute top-2 right-2 bg-[#1a56db] text-white text-[9px] px-2 py-0.5 rounded-full font-semibold">Popular</span>
                            <p className="font-body text-[12px] text-[#6b7d92]">1-year e-Visa</p>
                            <p className="font-mono text-[22px] font-bold text-[#1a56db] mt-1">£88</p>
                          </button>

                          <button
                            type="button"
                            disabled={isReadOnlyApplication}
                            onClick={() => field.onChange("5-Year")}
                            className={`rounded-[10px] border p-3 text-left transition-all ${
                              field.value === "5-Year"
                                ? "border-[#1a56db] bg-[#f0f6ff]"
                                : "border-[#d7e3f2] bg-white"
                            }`}
                          >
                            <p className="font-body text-[12px] text-[#6b7d92]">5-year e-Visa</p>
                            <p className="font-mono text-[22px] font-bold text-[#1a56db] mt-1">£150</p>
                          </button>
                        </>
                      )}
                    />
                  </div>
                </div>
              )}

              {detailsMode && (
                <>
                  <input type="hidden" {...register("visaDuration")} />
                  <input type="hidden" {...register("purposeOfVisit")} />
                  <input type="hidden" {...register("consent")} />
                </>
              )}

              <div>
                <p className="font-body text-[10px] tracking-[0.14em] uppercase text-[#8da1b8] font-semibold mb-2">{detailsMode ? "Personal Details" : "Contact Details"}</p>
                <div className="h-[1px] bg-[#e5edf7]" />
              </div>

              {/* Email */}
             <div className="grid sm:grid-cols-1 gap-4">
  <div>
    <label className={`block font-body font-semibold ${detailsMode ? "uppercase tracking-wide text-[#66728a] text-[12px]" : "text-[#0f1f3d] text-[12px]"} mb-2`}>
      Email address *
    </label>
    <input
      {...register("email")}
      type="email"
      disabled={isSubmitting || isReadOnlyApplication}
      readOnly={isReadOnlyApplication}
      placeholder="your@email.com"
      className={inputClasses() + " " + fieldDisabledClass}
    />
  </div>
</div>
              {/* Field 4: Mobile */}
              <div>
                <label className={`block font-body font-semibold ${detailsMode ? "uppercase tracking-wide text-[#66728a] text-[12px]" : "text-[#0f1f3d] text-[12px]"} mb-2`}>Mobile number *</label>
                <div className="flex gap-2.5">
                  <select
                    {...register("countryCode")}
                    disabled={isSubmitting || isReadOnlyApplication}
                    className={`${detailsMode ? "w-[160px] px-3 py-3 border border-[#d7dbe8] rounded-[14px] font-body text-[13px] bg-[#f1f2f6] outline-none focus:border-[#7f86a5] focus:shadow-[0_0_0_3px_rgba(127,134,165,0.2)] transition-all duration-200" : "w-[140px] px-3 py-2.5 border border-[#d7e3f2] rounded-lg font-body text-[12px] bg-[#f8fafd] outline-none focus:border-[#1a56db] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.16)] transition-all duration-200"} ${fieldDisabledClass}`}
                  >
                    <option value="+44">+44 🇬🇧 UK</option>
                    <option value="+1">+1 🇺🇸 US</option>
                    <option value="+91">+91 🇮🇳 IN</option>
                    <option value="+971">+971 🇦🇪 UAE</option>
                    <option value="+65">+65 🇸🇬 SG</option>
                    <option value="+61">+61 🇦🇺 AU</option>
                  </select>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register("phone")}
                      type="tel"
                      disabled={isSubmitting || isReadOnlyApplication}
                      readOnly={isReadOnlyApplication}
                      placeholder="e.g. 7700 900000"
                      className={inputClasses() + " " + fieldDisabledClass}
                    />
                  </div>
                </div>
              </div>

              {!detailsMode && (
              <div>
                <p className="font-body text-[10px] tracking-[0.14em] uppercase text-[#8da1b8] font-semibold mb-2">Travel Details</p>
                <div className="h-[1px] bg-[#e5edf7]" />
              </div>
              )}

              {/* Field 5: Full Name */}
              <div>
                <label className={`block font-body font-semibold ${detailsMode ? "uppercase tracking-wide text-[#66728a] text-[12px]" : "text-[#0f1f3d] text-[12px]"} mb-2`}>Full name (as per passport) *</label>
                <input
                  {...register("fullName")}
                  type="text"
                  disabled={isSubmitting || isReadOnlyApplication}
                  readOnly={isReadOnlyApplication}
                  placeholder="As per your passport"
                  className={inputClasses() + " " + fieldDisabledClass}
                />
              </div>

              {/* Fields 6 & 7: Nationality and Residence */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-body font-semibold ${detailsMode ? "uppercase tracking-wide text-[#66728a] text-[12px]" : "text-[#0f1f3d] text-[12px]"} mb-2`}>Nationality *</label>
                  <select
                    {...register("nationality")}
                    disabled={isSubmitting || isReadOnlyApplication}
                    className={inputClasses() + " bg-white " + fieldDisabledClass}
                  >
                    <option value="">Select...</option>
                    <option value="British">British</option>
                    <option value="American">American</option>
                    <option value="Canadian">Canadian</option>
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-body font-semibold ${detailsMode ? "uppercase tracking-wide text-[#66728a] text-[12px]" : "text-[#0f1f3d] text-[12px]"} mb-2`}>Country of residence *</label>
                  <select
                    {...register("countryOfResidence")}
                    disabled={isSubmitting || isReadOnlyApplication}
                    className={inputClasses() + " bg-white " + fieldDisabledClass}
                  >
                    <option value="">Select...</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="UAE">UAE</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {!detailsMode && (
                <>
                  <div>
                    <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-3">Purpose of visit *</label>
                    <Controller
                      name="purposeOfVisit"
                      control={control}
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-1.5">
                          {["Tourism", "Business", "Medical", "Conference", "Other"].map((item) => {
                            const active = field.value === item;
                            return (
                              <motion.button
                                key={item}
                                type="button"
                                disabled={isReadOnlyApplication}
                                onClick={() => field.onChange(item)}
                                className={`px-2.5 py-1.5 rounded-full border text-[10px] sm:text-[11px] font-body transition-all ${
                                  active
                                    ? "bg-[#e8f0fe] border-[#1a56db] text-[#1a56db]"
                                    : "bg-white border-[#d7e3f2] text-[#6b7d92]"
                                }`}
                              >
                                {item}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <motion.label
                      whileHover={{ y: -1 }}
                      className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors bg-[#f8fafd] border-[#d7e3f2]">
                      <input
                        type="checkbox"
                        {...register("consent")}
                        disabled={isSubmitting || isReadOnlyApplication}
                        className="mt-0.5 w-4 h-4 rounded border-[#c8d7ea] text-[#1a56db] focus:ring-[#1a56db]"
                      />
                      <span className="font-body text-[11px] text-[#6b7d92] leading-relaxed select-none">
                        I agree to the <span className="text-[#1a56db] font-semibold">Terms & Privacy Policy</span> and consent to be contacted.
                      </span>
                    </motion.label>
                  </div>
                </>
              )}

              {/* Legal Disclaimer Box */}
              {!detailsMode && (
                <motion.div
                  whileHover={{ y: -1 }}
                  className="bg-[#f8fafd] border border-[#d7e3f2] rounded-lg p-3 flex gap-3 text-primary mt-1"
                >
                  <Shield className="w-4 h-4 shrink-0 text-[#1a56db] mt-0.5" />
                  <p className="font-body text-[11px] leading-relaxed text-[#6b7d92]">
                    Independent service. Not affiliated with the Government of India.
                  </p>
                </motion.div>
              )}

              {/* Submit CTA */}
              <motion.button
                type="submit"
                disabled={isSubmitting || isReadOnlyApplication}
                animate={hasSubmitError ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                whileHover={!isSubmitting ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isSubmitting ? { scale: 0.97 } : {}}
                className={`relative overflow-hidden w-full bg-[#1a56db] text-white font-semibold text-[12px] px-6 py-3 rounded-[9px] hover:bg-[#1648b5] flex justify-center items-center transition-all ${
                  isSubmitting || isReadOnlyApplication ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed transform-none" : ""
                }`}
              >
                {!isSubmitting && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                    animate={{ x: ["-10%", "230%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
                  />
                )}
                {isReadOnlyApplication ? (
                  <>
                    <span className="relative z-10">View Application</span>
                  </>
                ) : detailsMode ? (
                  <span className="relative z-10">Update Personal Details</span>
                ) : isExistingCase ? (
                  <span className="relative z-10">Save Details</span>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating your case...
                  </>
                ) : (
                  <span className="relative z-10">Continue to payment →</span>
                )}
              </motion.button>

            </form>

            {/* Trust row */}
            {!detailsMode && (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 font-body text-[10px] text-[#7b8fa7] font-medium tracking-wide"
              >
                <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />Secure & encrypted</motion.span>
                <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />WhatsApp updates</motion.span>
                <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />Expert review</motion.span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
