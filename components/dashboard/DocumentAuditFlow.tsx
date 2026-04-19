"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  FileText,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type AuditResult = "green" | "amber" | "red" | null;
type QuestionnaireAnswer = string;
type StepKey =  "service"| "questionnaire" | "checklist" | "payment" | "confirmation" | "result";
type DocumentStatus = "not_uploaded" | "uploaded" | "pending_reupload";

interface DocumentAuditApplicationData {
  referenceNumber?: string;
  fileNumber?: string;
  auditResult?: AuditResult;
  auditorNotes?: string;
  flaggedDocuments?: string[];
}

interface DocumentAuditFlowProps {
  application?: DocumentAuditApplicationData | null;
  onClose?: () => void;
}

interface QuestionnaireQuestion {
  id: string;
  label: string;
  type: "single" | "text";
  options?: string[];
  placeholder?: string;
}

interface ChecklistItem {
  id: string;
  documentName: string;
  description: string;
  viewSampleLink: string;
  commonMistakes: string;
  required: boolean;
}

interface ChecklistItemState {
  documentName: string;
  description: string;
  viewSampleLink: string;
  commonMistakes: string;
  required: boolean;
  status: DocumentStatus;
  uploadedFile: File | null;
}

const QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: "journeyType",
    label: "Is this your first OCI application or a conversion?",
    type: "single",
    options: ["First Time", "Conversion"],
  },
  {
    id: "nationality",
    label: "What is your current nationality?",
    type: "text",
    placeholder: "Enter nationality",
  },
  {
    id: "ageGroup",
    label: "Age group?",
    type: "single",
    options: ["Child (under 18)", "Adult", "Senior (60+)"] ,
  },
  {
    id: "maritalStatus",
    label: "Marital status?",
    type: "single",
    options: ["Single", "Married", "Divorced"],
  },
  {
    id: "nameChanged",
    label: "Any name changes since your last document?",
    type: "single",
    options: ["Yes", "No"],
  },
  {
    id: "bornOutsideCore",
    label: "Were you born outside India, UK, or US?",
    type: "single",
    options: ["Yes", "No"],
  },
];

const DEFAULT_ANSWERS = QUESTIONS.reduce<Record<string, QuestionnaireAnswer>>((accumulator, question) => {
  accumulator[question.id] = "";
  return accumulator;
}, {});

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const generateChecklist = (answers: Record<string, string>): ChecklistItem[] => {
  const items: ChecklistItem[] = [
    {
      id: "passport-bio",
      documentName: "Current Passport Bio Page",
      description: "Clear scan of your current passport photo page.",
      viewSampleLink: "#",
      commonMistakes: "Cut-off edges, glare, unreadable MRZ, or a blurred photo page.",
      required: true,
    },
    {
      id: "photo",
      documentName: "Recent Passport Photo",
      description: "A compliant photo with a plain background.",
      viewSampleLink: "#",
      commonMistakes: "Wrong background, incorrect crop, shadows, or non-compliant dimensions.",
      required: true,
    },
    {
      id: "address-proof",
      documentName: "Current Address Proof",
      description: "Recent utility bill, bank statement, or residence proof.",
      viewSampleLink: "#",
      commonMistakes: "Expired document, address mismatch, or poor scan quality.",
      required: true,
    },
  ];

  if (answers.journeyType === "Conversion") {
    items.push({
      id: "old-oci",
      documentName: "Previous OCI Card / Reference",
      description: "Needed for conversion or transfer cases.",
      viewSampleLink: "#",
      commonMistakes: "Missing file number, old passport reference, or unreadable card copy.",
      required: true,
    });
  }

  if (answers.nameChanged === "Yes") {
    items.push({
      id: "name-change-proof",
      documentName: "Name Change Proof",
      description: "Affidavit, deed poll, or other name-change evidence.",
      viewSampleLink: "#",
      commonMistakes: "Missing signature, inconsistent spelling, or outdated supporting evidence.",
      required: true,
    });
  }

  if (answers.bornOutsideCore === "Yes") {
    items.push({
      id: "birth-proof",
      documentName: "Birth / Parent Proof",
      description: "Birth certificate or parent record required for birthplace verification.",
      viewSampleLink: "#",
      commonMistakes: "Mismatch in names, dates, or country details.",
      required: true,
    });
  }

  if (answers.ageGroup === "Child (under 18)") {
    items.push({
      id: "guardian-proof",
      documentName: "Parent / Guardian Proof",
      description: "Supporting proof for a child applicant.",
      viewSampleLink: "#",
      commonMistakes: "Missing parent ID, relationship proof, or consent documentation.",
      required: true,
    });
  }

  if (answers.maritalStatus === "Married") {
    items.push({
      id: "spouse-proof",
      documentName: "Marriage Evidence",
      description: "Marriage certificate or supporting spouse evidence where relevant.",
      viewSampleLink: "#",
      commonMistakes: "Incorrect names, missing translation, or unclear certification.",
      required: false,
    });
  }

  return items;
};

const buildFileNumber = () => {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `FLY-DA-${suffix}`;
};

const getFlaggedDocumentNames = (
  application: DocumentAuditApplicationData | null | undefined,
  checklist: ChecklistItem[]
) => {
  const notes = application?.auditorNotes || "";
  const explicitFlags = application?.flaggedDocuments || [];

  if (explicitFlags.length > 0) {
    return checklist.filter((item) => explicitFlags.some((flagged) => flagged.toLowerCase() === item.documentName.toLowerCase()));
  }

  if (!notes.trim()) {
    const preferredItems = checklist.filter((item) => item.required && item.id !== "address-proof");
    if (application?.auditResult === "amber") {
      return preferredItems.slice(0, 2);
    }

    if (application?.auditResult === "red") {
      return preferredItems.slice(0, 3);
    }

    return [];
  }

  const matchedItems = checklist.filter((item) => notes.toLowerCase().includes(item.documentName.toLowerCase()));

  if (matchedItems.length > 0) {
    return matchedItems;
  }

  if (application?.auditResult === "amber") {
    return checklist.filter((item) => item.required && item.id !== "address-proof").slice(0, 2);
  }

  if (application?.auditResult === "red") {
    return checklist.filter((item) => item.required).slice(0, 3);
  }

  return [];
};

export default function DocumentAuditFlow({ application }: DocumentAuditFlowProps) {
  const [currentStep, setCurrentStep] = useState<StepKey>("service");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionnaireAnswer>>(DEFAULT_ANSWERS);
  const [documentStates, setDocumentStates] = useState<Record<string, ChecklistItemState>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingIds, setUploadingIds] = useState<Record<string, boolean>>({});
  const [paymentAccepted, setPaymentAccepted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [confirmationFileNumber, setConfirmationFileNumber] = useState("");
  const [localMessage, setLocalMessage] = useState("Follow the questionnaire to generate your checklist.");
  const [localError, setLocalError] = useState("");
// ADD these with the other useState declarations:
const [selectedService, setSelectedService] = useState<string | null>(null);
  const currentQuestion = QUESTIONS[questionIndex];
  const checklist = useMemo(() => generateChecklist(answers), [answers]);
  const requiredChecklistItems = useMemo(() => checklist.filter((item) => item.required), [checklist]);
  const requiredUploadedCount = requiredChecklistItems.filter((item) => documentStates[item.id]?.status === "uploaded").length;
  const overallCompletion = requiredChecklistItems.length ? Math.round((requiredUploadedCount / requiredChecklistItems.length) * 100) : 0;
  const currentAnswer = answers[currentQuestion.id] || "";
  const auditResult = application?.auditResult ?? null;
  const auditorNotes = application?.auditorNotes || "No auditor notes yet.";
  const flaggedChecklistItems = getFlaggedDocumentNames(application, checklist);

  useEffect(() => {
    setDocumentStates((currentState) => {
      const nextState: Record<string, ChecklistItemState> = {};
      let changed = false;

      for (const item of checklist) {
        const existing = currentState[item.id];
        if (existing) {
          nextState[item.id] = existing;
          continue;
        }

        nextState[item.id] = {
          documentName: item.documentName,
          description: item.description,
          viewSampleLink: item.viewSampleLink,
          commonMistakes: item.commonMistakes,
          required: item.required,
          status: "not_uploaded",
          uploadedFile: null,
        };
        changed = true;
      }

      for (const key of Object.keys(currentState)) {
        if (!checklist.some((item) => item.id === key)) {
          changed = true;
        }
      }

      return changed ? nextState : currentState;
    });
  }, [checklist]);

  useEffect(() => {
    if (currentStep !== "result") return;
    if (auditResult) return;

    setLocalMessage("Audit initiated. Your documents are being reviewed.");
  }, [auditResult, currentStep]);

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }));
    setLocalError("");
  };

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) {
      setLocalError("Please answer this question before continuing.");
      return;
    }

    setLocalError("");

    if (questionIndex === QUESTIONS.length - 1) {
      setCurrentStep("checklist");
      setLocalMessage("Your personalised checklist is ready.");
      return;
    }

    setQuestionIndex((current) => current + 1);
  };

  const handleBackQuestion = () => {
    setLocalError("");

    if (questionIndex === 0) {
      return;
    }

    setQuestionIndex((current) => current - 1);
  };

  const simulateUpload = async (item: ChecklistItem, file: File) => {
    setUploadingIds((current) => ({ ...current, [item.id]: true }));
    setLocalError("");

    for (const progress of [10, 35, 65, 90, 100]) {
      setUploadProgress((current) => ({ ...current, [item.id]: progress }));
      await wait(140);
    }

    setDocumentStates((current) => ({
      ...current,
      [item.id]: {
        documentName: item.documentName,
        description: item.description,
        viewSampleLink: item.viewSampleLink,
        commonMistakes: item.commonMistakes,
        required: item.required,
        status: "uploaded",
        uploadedFile: file,
      },
    }));

    setUploadingIds((current) => ({ ...current, [item.id]: false }));
    setLocalMessage(`${item.documentName} uploaded successfully.`);
  };

  const handleUpload = async (itemId: string, selectedFile: File | null) => {
    const item = checklist.find((entry) => entry.id === itemId);
    if (!item || !selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const accepted = ["application/pdf", "image/jpeg", "image/png"];
    const acceptedByExtension = fileName.endsWith(".pdf") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png");

    if (!accepted.includes(selectedFile.type) && !acceptedByExtension) {
      setLocalError("Only PDF, JPG, or PNG files are allowed.");
      return;
    }

    await simulateUpload(item, selectedFile);
  };

  const handleContinueToPayment = () => {
    if (requiredUploadedCount !== requiredChecklistItems.length) {
      setLocalError("Upload all required documents before continuing.");
      return;
    }

    setCurrentStep("payment");
    setLocalError("");
    setLocalMessage("Review your upload summary and proceed to the audit fee.");
  };

  const handlePayment = async () => {
    if (!paymentAccepted) {
      setLocalError("Please confirm the audit fee acknowledgement first.");
      return;
    }

    setLocalError("");
    setIsProcessingPayment(true);

    await wait(1100);

    const fileNumber = application?.fileNumber || application?.referenceNumber || buildFileNumber();
    setConfirmationFileNumber(fileNumber);
    setPaymentCompleted(true);
    setIsProcessingPayment(false);
    setCurrentStep("confirmation");
    setLocalMessage("Audit initiated. Email and WhatsApp confirmation prepared.");
  };

const isChecklistFlagged = (item: ChecklistItemState | undefined): boolean => {
  if (!item) return false;

  if (flaggedChecklistItems.length > 0) {
    return flaggedChecklistItems.some(
      (flagged) => flagged.documentName.toLowerCase() === item.documentName.toLowerCase()
    );
  }

  if (!auditResult) return false;
  if (auditResult === "green") return false;

  const checklistItem = checklist.find((c) => c.documentName === item.documentName);

  if (auditResult === "amber") {
    return item.required && item.status !== "uploaded" && checklistItem?.id !== "address-proof";
  }

  return item.required && item.status !== "uploaded";
};


const SERVICES = [
  { id: "new-oci", name: "New OCI Card", description: "First-time OCI application", price: "£88" },
  { id: "oci-renewal", name: "OCI Renewal / Transfer", description: "Passport change and renewal", price: "£78" },
  { id: "oci-update", name: "OCI Update (Gratis)", description: "Mandatory update handling", price: "£50" },
  { id: "indian-evisa", name: "Indian e-Visa", description: "Travel visa pre-check", price: "£88 (1-Year) · £150 (5-Year)" },
  { id: "passport-renewal", name: "Indian Passport Renewal", description: "Renewal for UK or US residents", price: "Price on request" },
  { id: "undecided", name: "Not Sure — Help Me Decide", description: "We recommend the right route", price: "" },
];

const renderService = () => (
  <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 1 of 6</p>
    <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Which service do you need?</h3>
    <p className="mt-2 text-sm text-slate-600">Select a service to generate your personalised document checklist.</p>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map((service) => {
        const selected = selectedService === service.id;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => setSelectedService(service.id)}
            className={`relative rounded-2xl border p-4 text-left transition-all ${
              selected
                ? "border-2 border-primary bg-bg-blue"
                : "border-border bg-white hover:border-primary/40"
            }`}
          >
            {selected && (
              <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
            )}
            <p className="text-sm font-semibold text-primary">{service.name}</p>
            <p className="mt-1 text-xs text-textMuted">{service.description}</p>
            {service.price ? (
              <p className="mt-3 text-xs font-semibold text-slate-500">{service.price}</p>
            ) : null}
          </button>
        );
      })}
    </div>

    {localError ? (
      <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {localError}
      </p>
    ) : null}

    <div className="mt-6">
      <Button
        onClick={() => {
          if (!selectedService) {
            setLocalError("Please select a service before continuing.");
            return;
          }
          setLocalError("");
          setCurrentStep("questionnaire");
        }}
      >
        Continue to questions
      </Button>
    </div>
  </div>
);


  const renderQuestionnaire = () => (
    <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">

        <div className="mb-4 flex items-center gap-2">
      <span className="text-sm font-semibold text-primary">
        {SERVICES.find((s) => s.id === selectedService)?.name ?? ""}
      </span>
      <button
        type="button"
        onClick={() => setCurrentStep("service")}
        className="text-xs text-slate-500 underline hover:text-primary"
      >
        Change service
      </button>
    </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 1 of 6</p>
          <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Smart Questionnaire</h3>
          <p className="mt-2 text-sm text-slate-600">Answer one question at a time to generate your personalised document checklist.</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-bg-blue px-3 py-1 text-xs font-semibold text-primary">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </span>
      </div>

      <div className="mt-5 h-2 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-bg-page p-5 sm:p-6">
        <h4 className="text-lg sm:text-xl font-heading font-semibold text-primary">{currentQuestion.label}</h4>

        {currentQuestion.type === "text" ? (
          <div className="mt-5">
            <input
              type="text"
              value={currentAnswer}
              placeholder={currentQuestion.placeholder || "Type your answer"}
              onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {currentQuestion.options?.map((option) => {
              const isActive = currentAnswer === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateAnswer(currentQuestion.id, option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    isActive ? "border-primary bg-bg-blue text-primary" : "border-border bg-white text-slate-700 hover:border-primary/40"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {localError ? (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={handleBackQuestion} disabled={questionIndex === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNextQuestion} disabled={!currentAnswer.trim()}>
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderChecklist = () => (
    <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 2 of 6</p>
          <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Personalised Document Checklist</h3>
          <p className="mt-2 text-sm text-slate-600">Your answers generated a tailored checklist for this OCI audit.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-bg-page px-4 py-3 text-sm text-slate-600">
          Required documents: <span className="font-semibold text-primary">{requiredChecklistItems.length}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {answers.journeyType ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{answers.journeyType}</span> : null}
        {answers.ageGroup ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{answers.ageGroup}</span> : null}
        {answers.nameChanged === "Yes" ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Name-change documents needed</span> : null}
        {answers.bornOutsideCore === "Yes" ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Birth proof likely required</span> : null}
      </div>

      <div className="mt-6 grid gap-4">
        {checklist.map((item) => {
          const state = documentStates[item.id] || {
            documentName: item.documentName,
            description: item.description,
            viewSampleLink: item.viewSampleLink,
            commonMistakes: item.commonMistakes,
            required: item.required,
            status: "not_uploaded" as DocumentStatus,
            uploadedFile: null,
          };
          const isFlagged = isChecklistFlagged(state);

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                isFlagged ? "border-amber-300 bg-amber-50/60" : "border-[#dce7f8] bg-[#fcfdff]"
              }`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-base font-semibold text-primary">{state.documentName}</h4>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${state.required ? "border-slate-200 bg-white text-slate-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {state.required ? "Required" : "Optional"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{state.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <a href={state.viewSampleLink} className="text-primary hover:underline">
                      View Sample
                    </a>
                    <span className="text-slate-300">•</span>
                    <div className="group relative inline-flex items-center gap-1 text-slate-600">
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      <span>Common Mistakes</span>
                      <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-medium leading-5 text-slate-600 opacity-0 shadow-lg transition group-hover:opacity-100">
                        {state.commonMistakes}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      state.status === "uploaded"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : state.status === "pending_reupload"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {state.status === "uploaded" ? "Uploaded" : state.status === "pending_reupload" ? "Pending Re-upload" : "Not Uploaded"}
                  </span>
                  {isFlagged ? (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800">
                      Auditor flag
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-bg-blue">
                  <Upload className="mr-2 h-4 w-4" /> Upload PDF / JPG / PNG
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => handleUpload(item.id, event.target.files?.[0] || null)}
                  />
                </label>

                {state.uploadedFile ? <span className="text-sm text-slate-500">{state.uploadedFile.name}</span> : null}

                {state.status === "uploaded" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Upload progress</span>
                  <span>{uploadProgress[item.id] || (state.status === "uploaded" ? 100 : 0)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${state.status === "uploaded" ? "bg-emerald-500" : "bg-primary"}`}
                    style={{ width: `${uploadProgress[item.id] || (state.status === "uploaded" ? 100 : 0)}%` }}
                  />
                </div>
              </div>

              {uploadingIds[item.id] ? (
                <p className="mt-3 text-xs font-medium text-primary">Uploading file...</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-bg-page p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Overall completion</p>
            <p className="mt-1 text-sm text-slate-600">
              {requiredUploadedCount} of {requiredChecklistItems.length} required documents uploaded.
            </p>
          </div>
          <div className="text-2xl font-heading font-bold text-primary">{overallCompletion}%</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${overallCompletion}%` }} />
        </div>
      </div>

      {localError ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</p> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Minimum required documents must be uploaded before continuing.</p>
        <Button onClick={handleContinueToPayment} disabled={requiredUploadedCount !== requiredChecklistItems.length}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 4 of 6</p>
          <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Audit Fee Payment</h3>
          <p className="mt-2 text-sm text-slate-600">
            Our expert team will review your documents within 12–24 working hours. The £15 audit fee is fully deducted from your final fee when you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update). Audit credit does not apply to e-Visa or Passport Renewal.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Audit fee: £15
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-4 sm:p-5">
          <h4 className="font-semibold text-primary">Uploaded documents</h4>
          <div className="mt-4 space-y-3">
            {requiredChecklistItems.map((item) => {
              const state = documentStates[item.id];
              if (!state || state.status !== "uploaded") return null;

              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <span className="text-slate-700">{state.documentName}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Uploaded</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-amber-950">
          <h4 className="font-semibold text-amber-900">Audit summary</h4>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center justify-between gap-3"><span>Required docs uploaded</span><strong>{requiredUploadedCount}/{requiredChecklistItems.length}</strong></p>
            <p className="flex items-center justify-between gap-3"><span>Review time</span><strong>12–24 working hours</strong></p>
            <p className="flex items-center justify-between gap-3"><span>Audit fee</span><strong>£15</strong></p>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={paymentAccepted}
              onChange={(event) => setPaymentAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary/20"
            />
            <span>I understand this is a pre-check audit fee.</span>
          </label>
        </div>
      </div>

      {localError ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</p> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("checklist")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Checklist
        </Button>
        <Button onClick={handlePayment} isLoading={isProcessingPayment} disabled={!paymentAccepted || isProcessingPayment}>
          Pay £15
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 4 of 6</p>
          <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Audit Initiated</h3>
          <p className="mt-2 text-sm text-slate-600">Your audit payment is confirmed. Email and WhatsApp confirmation will be sent shortly.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-[#dce7f8] bg-bg-page p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">File Number</p>
          <p className="mt-2 break-all text-sm font-semibold text-primary">{confirmationFileNumber}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Expected Review</p>
          <p className="mt-2 text-sm font-semibold text-primary">12–24 working hours</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notifications</p>
          <p className="mt-2 text-sm font-semibold text-primary">Email + WhatsApp</p>
        </div>
      </div>

      {paymentCompleted ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Payment processed. Your audit has entered the review queue.
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">You can wait here or continue to track the result once admin updates the case.</p>
        <Button onClick={() => setCurrentStep("result")}>View Audit Result</Button>
      </div>
    </div>
  );

  const renderResult = () => {
    const result = auditResult;

    if (result === null) {
      return (
        <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 5 of 6</p>
              <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Audit in Progress</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Your documents are with the audit team. The result will appear here once the admin updates the application.</p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-bg-page p-4 text-sm text-slate-600">
            <p className="font-semibold text-primary">Auditor notes</p>
            <p className="mt-2">{auditorNotes}</p>
          </div>
        </div>
      );
    }

    const toneClasses = {
      green: "border-emerald-200 bg-emerald-50 text-emerald-900",
      amber: "border-amber-200 bg-amber-50 text-amber-950",
      red: "border-rose-200 bg-rose-50 text-rose-950",
    }[result];

    const badgeLabel = {
      green: "All Clear",
      amber: "Minor Fixes Needed",
      red: "Action Required",
    }[result];

    const message = {
      green: "All your documents are correct and ready to proceed.",
      amber: "1–2 documents need to be re-uploaded or corrected.",
      red: "Important documents are missing or not acceptable.",
    }[result];

    return (
      <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${toneClasses} shrink-0`}>
            {result === "green" ? <BadgeCheck className="h-5 w-5 text-emerald-700" /> : null}
            {result === "amber" ? <CircleAlert className="h-5 w-5 text-amber-700" /> : null}
            {result === "red" ? <CircleAlert className="h-5 w-5 text-rose-700" /> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 5 of 6</p>
            <h3 className="mt-1 text-2xl font-heading font-bold text-primary">Audit Result</h3>
            <p className="mt-2 text-sm text-slate-600">Result badge and next step appear here once the admin marks the audit complete.</p>
          </div>
        </div>

        <div className={`mt-6 rounded-2xl border p-5 ${toneClasses}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{badgeLabel}</p>
              <p className="mt-2 text-sm leading-6">{message}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">{result.toUpperCase()}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-bg-page p-4 sm:p-5">
            <h4 className="font-semibold text-primary">Auditor notes</h4>
            <p className="mt-2 text-sm text-slate-600">{auditorNotes}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h4 className="font-semibold text-primary">Flagged documents</h4>
            <div className="mt-4 space-y-3">
              {flaggedChecklistItems.length > 0 ? (
                flaggedChecklistItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {item.documentName}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No specific flagged documents were provided by the backend yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#dce7f8] bg-[#fcfdff] p-4 sm:p-5">
          <h4 className="font-semibold text-primary">Checklist highlights</h4>
          <div className="mt-4 grid gap-3">
            {checklist.map((item) => {
              const state = documentStates[item.id];
              const isFlagged = isChecklistFlagged(state);

              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isFlagged ? "border-amber-200 bg-amber-50" : state?.status === "uploaded" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{item.documentName}</p>
                    <p className="mt-1 text-slate-600">{item.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${state?.status === "uploaded" ? "bg-emerald-100 text-emerald-700" : isFlagged ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    {state?.status === "uploaded" ? "Uploaded" : isFlagged ? "Flagged" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {result === "green"
              ? "Next step: proceed to full payment."
              : result === "amber"
                ? "Next step: upload corrected documents."
                : "Next step: fix and re-upload the missing documents."}
          </p>
          <Button
            onClick={() => {
              if (result === "green") {
                setLocalMessage("Proceed to the full payment handoff from the dashboard card.");
                return;
              }

              setCurrentStep("questionnaire");
              setQuestionIndex(0);
              setPaymentAccepted(false);
              setPaymentCompleted(false);
              setConfirmationFileNumber("");
            }}
          >
            {result === "green"
              ? "Proceed to Full Payment"
              : result === "amber"
                ? "Upload Corrected Documents"
                : "Fix & Re-upload Documents"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#d7e5fb] bg-white p-5 sm:p-6 shadow-[0_14px_36px_rgba(30,74,135,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Document Audit Flow</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-bold text-primary">Inline audit journey</h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600">This flow stays inside the dashboard and keeps the existing card layout intact.</p>
          </div>
          {application?.referenceNumber ? (
            <div className="rounded-2xl border border-slate-200 bg-bg-page px-4 py-3 text-sm text-slate-600">
              Application: <span className="font-semibold text-primary">{application.referenceNumber}</span>
            </div>
          ) : null}
        </div>
      </div>

      {localMessage ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{localMessage}</div> : null}
{currentStep === "service" ? renderService() : null}
      {currentStep === "questionnaire" ? renderQuestionnaire() : null}
      {currentStep === "checklist" ? renderChecklist() : null}
      {currentStep === "payment" ? renderPayment() : null}
      {currentStep === "confirmation" ? renderConfirmation() : null}
      {currentStep === "result" ? renderResult() : null}
    </div>
  );
}