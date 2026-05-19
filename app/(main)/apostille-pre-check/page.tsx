"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/FileDropZone";
import { submitApostillePreCheck } from "@/lib/api";

function toApiSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const progressSteps = ["Pre-Check Form", "Review", "Approval", "Payment", "Processing"];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  documentType: string;
  purpose: string;
  notarised: string;
  numberOfDocuments: string;
  notes: string;
  declaration: boolean;
};

const defaultState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  country: "United Kingdom",
  documentType: "Birth Certificate",
  purpose: "OCI",
  notarised: "Not Sure",
  numberOfDocuments: "1",
  notes: "",
  declaration: false,
};

const fileAccept = ".pdf,.jpg,.jpeg,.png";
const validFileTypes = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);

export default function ApostillePreCheckPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState);
  const [requiredDocuments, setRequiredDocuments] = useState<(File | null)[]>([null]);
  const [extraDocuments, setExtraDocuments] = useState<(File | null)[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const reassurance = useMemo(
    () => [
      "You receive a FlyOCI file number",
      "Your document is reviewed by our team",
      "We email the next step",
      "Payment is requested only after approval",
    ],
    [],
  );

  const selectedDocCount = useMemo(() => {
    const raw = String(form.numberOfDocuments || "").trim();
    if (raw === "4+") return 4;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [form.numberOfDocuments]);

  useEffect(() => {
    setRequiredDocuments((prev) => {
      if (prev.length === selectedDocCount) return prev;
      if (prev.length > selectedDocCount) return prev.slice(0, selectedDocCount);
      return [...prev, ...Array.from({ length: selectedDocCount - prev.length }, () => null)];
    });
  }, [selectedDocCount]);

  const validateFile = (file: File | null, required = true) => {
    if (!file) return required ? "Please upload the required document(s) to continue" : "";
    if (!validFileTypes.has(file.type)) {
      return "Unsupported file format. Please upload PDF, JPG, or PNG";
    }
    return "";
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "This field is required";
    if (!form.email.trim()) {
      nextErrors.email = "This field is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = "Please enter a valid email address";
    }
    if (!form.phone.trim()) nextErrors.phone = "This field is required";

    const requiredDocErrors = requiredDocuments
      .map((file, index) => ({ index, error: validateFile(file, true) }))
      .filter((entry) => Boolean(entry.error));
    if (requiredDocErrors.length > 0) {
      nextErrors.requiredDocuments = requiredDocErrors[0].error;
    }
    extraDocuments.forEach((file, index) => {
      const extraFileError = validateFile(file, false);
      if (extraFileError) {
        nextErrors[`extraDocument_${index}`] = extraFileError;
      }
    });

    if (!form.declaration) {
      nextErrors.declaration = "Please confirm the declaration before submitting";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors((prev) => {
      const next = { ...prev };
      delete next._submit;
      return next;
    });
    if (!validate()) return;

    const extraLines = [
      `Notarised: ${form.notarised}`,
      `Number of documents: ${form.numberOfDocuments}`,
      ...requiredDocuments
        .filter((file): file is File => Boolean(file))
        .map((file, index) => `Required document ${index + 1} (filename): ${file.name}`),
      ...extraDocuments
        .filter((file): file is File => Boolean(file))
        .map((file, index) => `Extra document ${index + 1} (filename): ${file.name}`),
    ]
      .filter(Boolean)
      .join("\n");
    const notesPayload = [form.notes.trim(), extraLines].filter(Boolean).join("\n\n") || "";

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("full_name", form.fullName.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("country_of_issue", form.country);
      fd.append("document_type", toApiSlug(form.documentType));
      fd.append("purpose", toApiSlug(form.purpose));
      fd.append("is_notarised", toApiSlug(form.notarised));
      fd.append("number_of_documents", form.numberOfDocuments);
      fd.append("additional_notes", notesPayload);
      requiredDocuments.filter((f): f is File => Boolean(f)).forEach((file) => fd.append("main_documents", file, file.name));
      extraDocuments.filter((f): f is File => Boolean(f)).forEach((file) => fd.append("additional_documents", file, file.name));
      const response = await submitApostillePreCheck(fd);
      const fileNum = response.file_number || response.reference_number;
      router.push(`/apostille-pre-check/submitted?file=${encodeURIComponent(fileNum)}`);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        _submit: err instanceof Error ? err.message : "Submission failed. Please try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_72%)]">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-primary">Free Apostille Pre-Check</h1>
          <p className="mt-4 text-textMuted text-lg">
            Complete the form below and upload your document for review. We assess it and confirm the next step before any payment is requested.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#d4e4ff] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {progressSteps.map((step, idx) => (
              <span
                key={step}
                className={`rounded-full px-3 py-1.5 ${idx === 0 ? "bg-[#1d6fd1] text-white" : "bg-[#eef5ff] text-[#365c89]"}`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.35fr,0.65fr]">
          <div className="rounded-2xl border border-[#d8e6fc] bg-white p-5 sm:p-7 shadow-[0_12px_28px_rgba(20,60,106,0.08)] space-y-8">
            <div>
              <h2 className="text-xl font-heading font-bold text-primary">Your Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#23466f]">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
                  />
                  {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#23466f]">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                    className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#23466f]">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-heading font-bold text-primary">Document Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectField label="Country of Document Issue" value={form.country} onChange={(v) => setForm((prev) => ({ ...prev, country: v }))} options={["United Kingdom", "India", "Other"]} />
                <SelectField label="Document Type" value={form.documentType} onChange={(v) => setForm((prev) => ({ ...prev, documentType: v }))} options={["Birth Certificate", "Marriage Certificate", "Degree Certificate", "Affidavit", "Police Certificate", "Power of Attorney", "Other"]} />
                <SelectField label="Purpose of Apostille" value={form.purpose} onChange={(v) => setForm((prev) => ({ ...prev, purpose: v }))} options={["OCI", "Visa / Immigration", "Marriage Registration", "Education / Employment", "Legal Use", "Other"]} />
                <SelectField label="Is the Document Already Notarised?" value={form.notarised} onChange={(v) => setForm((prev) => ({ ...prev, notarised: v }))} options={["Yes", "No", "Not Sure"]} />
                <SelectField label="Number of Documents" value={form.numberOfDocuments} onChange={(v) => setForm((prev) => ({ ...prev, numberOfDocuments: v }))} options={["1", "2", "3", "4+"]} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-heading font-bold text-primary">Upload Documents</h2>
              <div className="mt-4 space-y-4">
                {requiredDocuments.map((file, index) => (
                  <FileDropZone
                    key={`required-${index}`}
                    label={`Required Document ${index + 1}`}
                    accept={fileAccept}
                    maxSizeMsg="Accepted formats: PDF, JPG, PNG"
                    onUpload={(nextFile) =>
                      setRequiredDocuments((prev) => prev.map((item, itemIndex) => (itemIndex === index ? nextFile : item)))
                    }
                    file={file}
                    error={index === 0 ? errors.requiredDocuments : undefined}
                  />
                ))}

                <div className="space-y-3 rounded-xl border border-[#dce9fb] bg-[#f8fbff] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#23466f]">Extra Documents (Optional)</p>
                    <button
                      type="button"
                      onClick={() => setExtraDocuments((prev) => [...prev, null])}
                      className="rounded-full border border-[#bfd8f5] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B69B7] hover:bg-[#eef6ff]"
                    >
                      + Add extra document
                    </button>
                  </div>
                  {extraDocuments.length === 0 ? (
                    <p className="text-xs text-[#5f7698]">You can add as many supporting files as needed.</p>
                  ) : null}
                  {extraDocuments.map((file, index) => (
                    <div key={`extra-${index}`} className="space-y-2">
                      <FileDropZone
                        label={`Extra Document ${index + 1}`}
                        accept={fileAccept}
                        maxSizeMsg="Accepted formats: PDF, JPG, PNG"
                        onUpload={(nextFile) =>
                          setExtraDocuments((prev) => prev.map((item, itemIndex) => (itemIndex === index ? nextFile : item)))
                        }
                        file={file}
                        error={errors[`extraDocument_${index}`]}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setExtraDocuments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                          className="text-xs font-semibold text-[#1d6fd1] hover:underline"
                        >
                          Remove extra document
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#23466f]">Additional Notes (Optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    placeholder="Add anything you want our team to know about your document or intended use"
                    className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#dce9fb] bg-[#f8fbff] p-4">
              <label className="flex items-start gap-2 text-sm font-medium text-[#23466f]">
                <input
                  type="checkbox"
                  checked={form.declaration}
                  onChange={(e) => setForm((prev) => ({ ...prev, declaration: e.target.checked }))}
                  className="mt-0.5 h-4 w-4"
                />
                I confirm that the uploaded document is clear and related to the request I am submitting.
              </label>
              {errors.declaration && <p className="mt-2 text-sm text-red-600">{errors.declaration}</p>}
              <p className="mt-2 text-xs text-[#5f7698]">Your request will be reviewed before any payment is requested.</p>
            </div>

            <div>
              {errors._submit ? <p className="mb-2 text-sm text-red-600">{errors._submit}</p> : null}
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit for Free Review"}
              </Button>
              <p className="mt-2 text-xs text-[#5f7698]">
                By submitting this form, you agree to be contacted regarding your Apostille pre-check request.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#d8e6fc] bg-white p-5 shadow-[0_12px_28px_rgba(20,60,106,0.08)] h-fit lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ebf3ff] px-3 py-1 text-xs font-semibold text-[#1e4e82]">
              <UploadCloud className="h-4 w-4" />
              What happens next?
            </div>
            <ul className="mt-4 space-y-3">
              {reassurance.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#335c8c]">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#1d6fd1]" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[#5f7698]">
              Please make sure your upload is clear to help avoid delays during review.
            </p>

            <div className="mt-5 rounded-xl border border-[#e4ecfa] bg-[#f9fbff] p-3 text-xs text-[#607ba1]">
              <div className="flex items-center gap-1 font-semibold text-[#2a517f]">
                <AlertCircle className="h-3.5 w-3.5" />
                Trust Reminder
              </div>
              <p className="mt-1">Free pre-check before payment. Payment is requested only after approval.</p>
              <Link href="/apostille-services" className="mt-2 inline-flex text-[#1d6fd1] hover:underline">
                Back to Apostille Services
              </Link>
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#23466f]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5 bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
