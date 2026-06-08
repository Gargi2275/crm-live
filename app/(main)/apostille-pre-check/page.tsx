"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Copy,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

import { ApostilleTimeline } from "@/components/apostille/ApostilleTimeline";
import { FileDropZone } from "@/components/FileDropZone";
import { Button } from "@/components/ui/Button";
import { submitApostillePreCheck } from "@/lib/api";
import { authService } from "@/lib/auth";
import { APOSTILLE_DOCUMENT_TYPES } from "@/lib/apostille-ui";
import { apostilleSimpleProcess } from "@/lib/data/apostille";

const inputClass =
  "w-full rounded-xl border border-[#d8e6fc] px-4 py-3 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#486581]";

function parseDocumentCount(value: string): number {
  if (value === "5+") return 5;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ApostillePreCheckPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileNumber, setFileNumber] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryOfIssue, setCountryOfIssue] = useState("United Kingdom");

  const [documentType, setDocumentType] = useState(APOSTILLE_DOCUMENT_TYPES[0]);
  const [purpose, setPurpose] = useState("");
  const [isNotarised, setIsNotarised] = useState("not_sure");
  const [numberOfDocuments, setNumberOfDocuments] = useState("1");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const requiredDocCount = useMemo(() => parseDocumentCount(numberOfDocuments), [numberOfDocuments]);
  const [mainFiles, setMainFiles] = useState<(File | null)[]>([null]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [mainError, setMainError] = useState("");
  const [registeredAccountEmail, setRegisteredAccountEmail] = useState<string | null>(null);
  const [emailCheckState, setEmailCheckState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [emailError, setEmailError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMainFiles((prev) => {
      const next = prev.slice(0, requiredDocCount);
      while (next.length < requiredDocCount) next.push(null);
      return next;
    });
    setMainError("");
  }, [requiredDocCount]);

  useEffect(() => {
    const loggedIn = authService.isLoggedIn();
    setIsLoggedIn(loggedIn);
    if (!loggedIn) return;

    void authService
      .getProfile()
      .then((profile) => {
        const accountEmail = profile.email?.trim() || "";
        setRegisteredAccountEmail(accountEmail);
        if (accountEmail) {
          setEmail(accountEmail);
          setEmailCheckState("valid");
          setEmailError("");
        }
        const profileName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
        if (profileName) setFullName((prev) => prev || profileName);
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    const normalized = email.trim();
    if (!normalized) {
      setEmailCheckState("idle");
      setEmailError("");
      return;
    }
    if (!isValidEmailFormat(normalized)) {
      setEmailCheckState("invalid");
      setEmailError("Enter a valid email address.");
      return;
    }

    const timer = window.setTimeout(() => {
      void validateRegisteredEmail(normalized);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [email, isLoggedIn, registeredAccountEmail]);

  const validateRegisteredEmail = async (value: string): Promise<boolean> => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setEmailCheckState("idle");
      setEmailError("");
      return false;
    }
    if (!isValidEmailFormat(normalized)) {
      setEmailCheckState("invalid");
      setEmailError("Enter a valid email address.");
      return false;
    }

    if (isLoggedIn && registeredAccountEmail) {
      if (normalized !== registeredAccountEmail.trim().toLowerCase()) {
        setEmailCheckState("invalid");
        setEmailError(`Please use your registered email: ${registeredAccountEmail}`);
        return false;
      }
      setEmailCheckState("valid");
      setEmailError("");
      return true;
    }

    setEmailCheckState("checking");
    try {
      const exists = await authService.checkUserExists(normalized);
      if (!exists) {
        setEmailCheckState("invalid");
        setEmailError("No FlyOCI account found for this email. Please register or log in first.");
        return false;
      }
      setEmailCheckState("valid");
      setEmailError("");
      return true;
    } catch {
      setEmailCheckState("invalid");
      setEmailError("Could not verify this email. Please try again.");
      return false;
    }
  };

  const allMainUploaded =
    mainFiles.length === requiredDocCount && mainFiles.every((file) => Boolean(file));

  const emailIsRegistered = emailCheckState === "valid";

  const canSubmit =
    fullName.trim().length > 2 &&
    isValidEmailFormat(email) &&
    emailIsRegistered &&
    documentType.trim().length > 0 &&
    purpose.trim().length >= 3 &&
    allMainUploaded;

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (fullName.trim().length <= 2) blockers.push("Enter your full name");
    if (!isValidEmailFormat(email)) blockers.push("Enter a valid email address");
    else if (!emailIsRegistered) {
      if (emailCheckState === "checking") blockers.push("Verifying registered email…");
      else blockers.push("Use your registered FlyOCI email (log in or register first)");
    }
    if (purpose.trim().length < 3) blockers.push("Describe what the document is needed for (min. 3 characters)");
    if (!allMainUploaded) {
      blockers.push(`Upload all ${requiredDocCount} required document${requiredDocCount === 1 ? "" : "s"}`);
    }
    return blockers;
  }, [
    allMainUploaded,
    email,
    emailCheckState,
    emailIsRegistered,
    fullName,
    purpose,
    requiredDocCount,
  ]);

  const setMainFileAt = (index: number, file: File | null) => {
    setMainError("");
    setMainFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const handleSubmit = async () => {
    const emailOk = await validateRegisteredEmail(email);
    if (!canSubmit || !emailOk) {
      if (!allMainUploaded) {
        setMainError(`Please upload all ${requiredDocCount} document${requiredDocCount === 1 ? "" : "s"}.`);
      } else if (!emailOk) {
        toast.error(emailError || "Please use your registered FlyOCI email.");
      } else {
        toast.error("Please complete all required fields.");
      }
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("full_name", fullName.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("phone", phone.trim());
      formData.append("country_of_issue", countryOfIssue.trim());
      formData.append("document_type", documentType);
      formData.append("purpose", purpose.trim());
      formData.append("is_notarised", isNotarised);
      formData.append("number_of_documents", numberOfDocuments);
      formData.append("additional_notes", additionalNotes.trim());
      mainFiles.filter((file): file is File => Boolean(file)).forEach((file) => formData.append("main_documents", file));
      extraFiles.forEach((file) => formData.append("additional_documents", file));

      const result = await submitApostillePreCheck(formData);
      setFileNumber(result.file_number || "");
      setSubmitted(true);
      toast.success("Pre-check submitted successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit pre-check.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyFileNumber = async () => {
    if (!fileNumber) return;
    await navigator.clipboard.writeText(fileNumber);
    toast.success("File number copied.");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_55%)]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/apostille-services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d6fd1] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Apostille Services
          </Link>
          <Link href="/track-apostille" className="text-sm font-semibold text-[#486581] hover:text-[#1d6fd1]">
            Already have a file number? Track case →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-[#d7e5f9] bg-white shadow-[0_16px_40px_rgba(20,60,106,0.1)]">
            <div className="border-b border-[#e8eef8] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1d6fd1]">Free Pre-Check</p>
              <h1 className="mt-1 font-heading text-2xl font-bold text-primary sm:text-3xl">
                Submit Your Document for Review
              </h1>
              <p className="mt-1 text-sm text-[#627d98]">
                No payment now. Fill in everything below and submit once — we review first, then send your quote.
              </p>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 font-heading text-2xl font-bold text-primary">Pre-Check Submitted</h2>
                  <p className="mt-2 text-sm text-[#627d98]">
                    We received your documents. Our team will review and email you with the next step.
                  </p>
                  {fileNumber ? (
                    <div className="mx-auto mt-5 max-w-md rounded-2xl border border-[#c9ddff] bg-[#f8fbff] px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#627d98]">Your FlyOCI file number</p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <p className="font-mono text-xl font-bold text-[#0d1f3c]">{fileNumber}</p>
                        <button type="button" onClick={() => void copyFileNumber()} className="rounded-lg border border-[#c9ddff] bg-white p-2 text-[#1d6fd1] hover:bg-[#eef5ff]">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href={`/track-apostille?file=${encodeURIComponent(fileNumber)}&email=${encodeURIComponent(email)}`}>
                      <Button className="w-full sm:w-auto">Track My Case</Button>
                    </Link>
                    <Link href="/apostille-services">
                      <Button variant="outline" className="w-full sm:w-auto">Back to Services</Button>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#1d6fd1]">Your details</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className={labelClass}>Full name *</span>
                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="As on your document" />
                      </label>
                      <label className="sm:col-span-2">
                        <span className={labelClass}>Registered email *</span>
                        <input
                          type="email"
                          value={email}
                          readOnly={isLoggedIn && Boolean(registeredAccountEmail)}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailCheckState("idle");
                            setEmailError("");
                          }}
                          onBlur={() => {
                            void validateRegisteredEmail(email);
                          }}
                          className={`${inputClass}${emailError ? " border-rose-300 focus:border-rose-400 focus:ring-rose-200" : ""}${isLoggedIn && registeredAccountEmail ? " bg-[#f8fafc] text-[#486581]" : ""}`}
                          placeholder="you@email.com"
                        />
                        <p className="mt-1.5 text-xs text-[#627d98]">
                          {isLoggedIn && registeredAccountEmail
                            ? "Using your logged-in FlyOCI account email."
                            : "Must match a registered FlyOCI account. Log in or register if you are new."}
                        </p>
                        {emailCheckState === "checking" ? (
                          <p className="mt-1 text-xs font-medium text-[#1d6fd1]">Checking registered email…</p>
                        ) : null}
                        {emailError ? (
                          <p className="mt-1 text-xs font-medium text-rose-600">{emailError}</p>
                        ) : null}
                        {emailIsRegistered && !emailError ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">Registered email verified.</p>
                        ) : null}
                        {!isLoggedIn ? (
                          <p className="mt-2 text-xs text-[#627d98]">
                            <Link href="/login" className="font-semibold text-[#1d6fd1] hover:underline">Log in</Link>
                            {" or "}
                            <Link href="/register" className="font-semibold text-[#1d6fd1] hover:underline">register</Link>
                            {" to use your account email."}
                          </p>
                        ) : null}
                      </label>
                      <label>
                        <span className={labelClass}>Phone</span>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+44..." />
                      </label>
                      <label className="sm:col-span-2">
                        <span className={labelClass}>Country of issue</span>
                        <input value={countryOfIssue} onChange={(e) => setCountryOfIssue(e.target.value)} className={inputClass} />
                      </label>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#1d6fd1]">Document info</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className={labelClass}>Document type *</span>
                        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={`${inputClass} bg-white`}>
                          {APOSTILLE_DOCUMENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </label>
                      <label className="sm:col-span-2">
                        <span className={labelClass}>What is this document needed for? *</span>
                        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} placeholder="e.g. OCI application, marriage registration abroad" />
                      </label>
                      <label>
                        <span className={labelClass}>Is it notarised?</span>
                        <select value={isNotarised} onChange={(e) => setIsNotarised(e.target.value)} className={`${inputClass} bg-white`}>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="not_sure">Not sure</option>
                        </select>
                      </label>
                      <label>
                        <span className={labelClass}>Number of documents</span>
                        <select value={numberOfDocuments} onChange={(e) => setNumberOfDocuments(e.target.value)} className={`${inputClass} bg-white`}>
                          {["1", "2", "3", "4", "5+"].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <label className="sm:col-span-2">
                        <span className={labelClass}>Additional notes</span>
                        <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} className={inputClass} placeholder="Anything we should know before review?" />
                      </label>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#1d6fd1]">Upload documents</h2>
                    <div className="mt-4 space-y-5">
                      <div className="rounded-xl border border-[#d8e6fc] bg-[#f8fbff] px-4 py-3 text-sm text-[#486581]">
                        Upload clear scans or photos for each document you selected above
                        {" "}
                        ({requiredDocCount} upload{requiredDocCount === 1 ? "" : "s"} required
                        {numberOfDocuments === "5+" ? " — add more under optional below if needed" : ""}).
                      </div>
                      <div className="space-y-4">
                        {mainFiles.map((file, index) => (
                          <FileDropZone
                            key={`main-doc-slot-${index}`}
                            label={`Document ${index + 1} *`}
                            accept=".pdf,.jpg,.jpeg,.png"
                            maxSizeMsg="PDF, JPG or PNG up to 10MB"
                            onUpload={(uploaded) => setMainFileAt(index, uploaded)}
                            file={file}
                          />
                        ))}
                      </div>
                      {mainError ? (
                        <p className="flex items-center gap-1.5 text-sm text-rose-600">
                          <FileText className="h-4 w-4 shrink-0" />
                          {mainError}
                        </p>
                      ) : null}
                      <div>
                        <p className={labelClass}>Additional documents (optional)</p>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length) setExtraFiles((prev) => [...prev, ...files]);
                            e.currentTarget.value = "";
                          }}
                          className="block w-full text-sm text-[#486581] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef5ff] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#1d6fd1]"
                        />
                        {extraFiles.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {extraFiles.map((file, index) => (
                              <p key={`${file.name}-${index}`} className="text-xs text-[#627d98]">+ {file.name}</p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {!submitted ? (
              <div className="border-t border-[#e8eef8] px-5 py-4 sm:px-6">
                {submitBlockers.length > 0 ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Before you can submit</p>
                    <ul className="mt-2 space-y-1">
                      {submitBlockers.map((item) => (
                        <li key={item} className="text-sm text-amber-800">• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button isLoading={submitting} disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Pre-Check
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#d7e5f9] bg-white p-5 shadow-[0_10px_28px_rgba(20,60,106,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1d6fd1]">Your journey</p>
              <div className="mt-3">
                <ApostilleTimeline activeIndex={submitted ? 1 : 0} compact />
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7e5f9] bg-[#f8fbff] p-5">
              <p className="text-sm font-bold text-[#0d1f3c]">Why start with pre-check?</p>
              <ul className="mt-3 space-y-2">
                {apostilleSimpleProcess.slice(0, 3).map((item) => (
                  <li key={item.title} className="flex items-start gap-2 text-sm text-[#486581]">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fd1]" />
                    <span><strong className="text-[#243b53]">{item.title}:</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#d7e5f9] bg-white p-4 text-sm text-[#627d98]">
              <div className="flex items-center gap-2 font-semibold text-[#243b53]">
                <ShieldCheck className="h-4 w-4 text-[#1d6fd1]" />
                Secure handling
              </div>
              <p className="mt-2">Documents are encrypted and reviewed by our operations team. Payment is only requested after approval.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
