"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  HelpCircle,
  Layers,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  createAdminService,
  createAdminServiceDocument,
  createAdminServiceQuestion,
  listAdminServices,
  type AdminServiceMeta,
} from "@/lib/admin-auth";
import { clearDocumentRequirementsCache } from "@/lib/document-requirements";
import { clearQuestionnaireCache } from "@/lib/questionnaire";
import { clearPublicPricingCache } from "@/lib/public-pricing";

const fieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-[15px] leading-5 text-[#102A43] placeholder:text-[#9AA8BC] outline-none transition focus:border-[#009877] focus:ring-2 focus:ring-[#009877]/15";

const labelClass = "text-[12px] font-semibold uppercase tracking-[0.03em] text-[#486581]";

const defaultOptionsForType = (type: string): string[] => {
  if (type === "yes_no") return ["Yes", "No"];
  if (type === "text") return [];
  return ["Option 1", "Option 2"];
};

type FormState = {
  service_name: string;
  description: string;
  category: string;
  base_fee: string;
  audit_fee: string;
  is_active: boolean;
};

type DraftDoc = { key: string; name: string; is_mandatory: boolean; is_active: boolean };
type DraftQuestion = {
  key: string;
  label: string;
  help_text: string;
  options: string[];
  question_type: string;
  is_required: boolean;
  is_active: boolean;
};

function typeFromCategory(category: string) {
  const key = (category || "").toLowerCase();
  if (key.includes("apostille")) return "apostille";
  if (key.includes("passport")) return "passport_renewal";
  if (key.includes("evisa") || key.includes("e-visa") || (key.includes("visa") && !key.includes("passport"))) {
    return "evisa_1year";
  }
  if (key.includes("oci")) return "new_oci";
  if (key === "audit") return "document_audit";
  return "new_oci";
}

export default function AdminNewServicePage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const isAdmin = (adminUser?.role || "").toLowerCase() === "admin";

  const [meta, setMeta] = useState<AdminServiceMeta>({
    service_types: [],
    categories: [],
    code_keyed_types: [],
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [section, setSection] = useState<"details" | "questions" | "documents">("details");

  const [form, setForm] = useState<FormState>({
    service_name: "",
    description: "",
    category: "oci",
    base_fee: "0",
    audit_fee: "15",
    is_active: true,
  });

  const [draftDocs, setDraftDocs] = useState<DraftDoc[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocMandatory, setNewDocMandatory] = useState(true);

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionHelp, setNewQuestionHelp] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("single");
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(["Yes", "No"]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);
  const [optionDraftByKey, setOptionDraftByKey] = useState<Record<string, string>>({});

  const loadMeta = useCallback(async () => {
    try {
      const payload = await listAdminServices({ page: 1, page_size: 1, active: "all" });
      const nextMeta = payload.meta || { service_types: [], categories: [], code_keyed_types: [] };
      setMeta(nextMeta);
      const defaultCategory = nextMeta.categories[0]?.id || "oci";
      setForm((current) => ({
        ...current,
        category: current.category || defaultCategory,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories.");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadMeta();
  }, [isAdmin, loadMeta]);

  useSetAdminPageChrome(
    isAdmin
      ? {
          title: "New service",
          subtitle: "Details, questions & documents",
          icon: Layers,
          syncKey: `new-service|${form.category}|${draftQuestions.length}|${draftDocs.length}`,
          actions: (
            <button
              type="button"
              onClick={() => router.push("/admin/services")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to catalog
            </button>
          ),
        }
      : { title: "New service", icon: Layers },
  );

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.service_name.trim()) errors.service_name = "Name is required.";
    if (!form.category) errors.category = "Category is required.";
    for (const key of ["base_fee", "audit_fee"] as const) {
      if (form[key] === "" || Number.isNaN(Number(form[key]))) {
        errors[key] = "Enter a valid number.";
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSection("details");
      return false;
    }
    return true;
  };

  const pushComposerOption = () => {
    const value = newOptionInput.trim();
    if (!value) return;
    setNewQuestionOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewOptionInput("");
  };

  const addDraftQuestion = () => {
    const label = newQuestionLabel.trim();
    if (!label) {
      toast.error("Question text is required.");
      return;
    }
    const options =
      newQuestionType === "text"
        ? []
        : newQuestionType === "yes_no"
          ? ["Yes", "No"]
          : newQuestionOptions.map((item) => item.trim()).filter(Boolean);
    if (newQuestionType === "single" && options.length < 2) {
      toast.error("Add at least two choices for a multiple-choice question.");
      return;
    }
    setDraftQuestions((prev) => [
      ...prev,
      {
        key: `draft-q-${Date.now()}-${prev.length}`,
        label,
        help_text: newQuestionHelp.trim(),
        options,
        question_type: newQuestionType,
        is_required: newQuestionRequired,
        is_active: true,
      },
    ]);
    setNewQuestionLabel("");
    setNewQuestionHelp("");
    setNewQuestionType("single");
    setNewQuestionOptions(["Yes", "No"]);
    setNewOptionInput("");
    setNewQuestionRequired(true);
  };

  const addDraftDoc = () => {
    const name = newDocName.trim();
    if (!name) {
      toast.error("Document name is required.");
      return;
    }
    setDraftDocs((prev) => [
      ...prev,
      {
        key: `draft-d-${Date.now()}-${prev.length}`,
        name,
        is_mandatory: newDocMandatory,
        is_active: true,
      },
    ]);
    setNewDocName("");
    setNewDocMandatory(true);
  };

  const moveList = <T extends { key: string }>(
    list: T[],
    key: string,
    direction: -1 | 1,
  ): T[] => {
    const index = list.findIndex((item) => item.key === key);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= list.length) return list;
    const next = [...list];
    const tmp = next[index];
    next[index] = next[swapWith];
    next[swapWith] = tmp;
    return next;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await createAdminService({
        service_name: form.service_name.trim(),
        description: form.description.trim(),
        service_type: typeFromCategory(form.category),
        category: form.category,
        base_fee: form.base_fee,
        government_fee: "0",
        total_fee: form.base_fee,
        audit_fee: form.audit_fee,
        is_active: form.is_active,
      });
      if (!created?.id) {
        throw new Error("Service was created but no id was returned.");
      }

      for (const draft of draftDocs) {
        await createAdminServiceDocument(created.id, {
          name: draft.name,
          is_mandatory: draft.is_mandatory,
          is_active: draft.is_active,
        });
      }
      for (const draft of draftQuestions) {
        await createAdminServiceQuestion(created.id, {
          label: draft.label,
          help_text: draft.help_text,
          question_type: draft.question_type,
          options: draft.options,
          is_required: draft.is_required,
          is_active: draft.is_active,
        });
      }

      clearDocumentRequirementsCache();
      clearQuestionnaireCache();
      clearPublicPricingCache();

      const extras = [
        draftQuestions.length
          ? `${draftQuestions.length} question${draftQuestions.length === 1 ? "" : "s"}`
          : "",
        draftDocs.length ? `${draftDocs.length} document${draftDocs.length === 1 ? "" : "s"}` : "",
      ].filter(Boolean);
      toast.success(extras.length ? `Service created with ${extras.join(" and ")}.` : "Service created.");
      router.push("/admin/services");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create service.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">New service</h1>
        <p className="mt-2 text-sm text-[#627D98]">Access restricted to Admin.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 font-body">
      <div className="overflow-hidden rounded-[12px] border border-[#E5EAF0] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5EAF0] bg-[#F8FBFA] px-4 py-3.5 lg:px-5">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#009877]">Service catalog</p>
            <h1 className="mt-0.5 font-heading text-xl font-semibold text-[#102A43] lg:text-[22px]">
              Create a new service
            </h1>
            <p className="mt-0.5 text-[14px] text-[#627D98]">
              Fees &amp; status first — then optional questionnaire and document checklist.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-[10px] border border-[#E5EAF0] bg-white p-1">
            {(
              [
                { id: "details" as const, label: "Details" },
                { id: "questions" as const, label: `Questions (${draftQuestions.length})` },
                { id: "documents" as const, label: `Documents (${draftDocs.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition ${
                  section === tab.id
                    ? "bg-[#009877] text-white"
                    : "text-[#627D98] hover:bg-[#F5F7FA] hover:text-[#334E68]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 lg:px-5 lg:py-5">
          {section === "details" ? (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-12">
                <label className="block lg:col-span-5">
                  <span className={labelClass}>Service name</span>
                  <input
                    value={form.service_name}
                    onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
                    placeholder="e.g. New OCI Card"
                    className={fieldClass}
                  />
                  {fieldErrors.service_name ? (
                    <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.service_name}</span>
                  ) : null}
                </label>

                <label className="block lg:col-span-3">
                  <span className={labelClass}>Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className={fieldClass}
                  >
                    {meta.categories.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category ? (
                    <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.category}</span>
                  ) : null}
                </label>

                <label className="flex items-end gap-2 pb-2 lg:col-span-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-[#D9E1EA]"
                  />
                  <span className="text-[14px] font-semibold text-[#334E68]">Active on site</span>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Service fee (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.base_fee}
                    onChange={(e) => setForm((f) => ({ ...f, base_fee: e.target.value }))}
                    className={fieldClass}
                  />
                  {fieldErrors.base_fee ? (
                    <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.base_fee}</span>
                  ) : null}
                </label>
                <label className="block">
                  <span className={labelClass}>Assessment fee (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.audit_fee}
                    onChange={(e) => setForm((f) => ({ ...f, audit_fee: e.target.value }))}
                    className={fieldClass}
                  />
                  {fieldErrors.audit_fee ? (
                    <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.audit_fee}</span>
                  ) : null}
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Short description shown to staff and customers"
                  className={fieldClass}
                />
              </label>
            </div>
          ) : null}

          {section === "questions" ? (
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="space-y-3 xl:col-span-7">
                <div className="rounded-[10px] border border-[#D7E8E2] bg-[#F4FBF8] px-3.5 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#009877]/12 text-[#006F57]">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#102A43]">Smart questionnaire</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-[#627D98]">
                        Draft questions here — saved when you create the service.
                      </p>
                    </div>
                  </div>
                </div>

                {draftQuestions.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D9E1EA] bg-[#FBFCFD] px-4 py-8 text-center">
                    <HelpCircle className="mx-auto h-5 w-5 text-[#9AA8BC]" />
                    <p className="mt-2 text-sm font-semibold text-[#334E68]">No questions yet</p>
                    <p className="mt-0.5 text-[13px] text-[#627D98]">Optional — add from the panel on the right.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {draftQuestions.map((row, index) => (
                      <div
                        key={row.key}
                        className="rounded-[10px] border border-[#E5EAF0] bg-white px-3.5 py-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF7F4] text-[11px] font-bold text-[#006F57]">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2.5">
                            <div>
                              <label className={labelClass}>Question text</label>
                              <textarea
                                value={row.label}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setDraftQuestions((prev) =>
                                    prev.map((item) => (item.key === row.key ? { ...item, label: next } : item)),
                                  );
                                }}
                                rows={2}
                                className={fieldClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Helper details</label>
                              <textarea
                                value={row.help_text}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setDraftQuestions((prev) =>
                                    prev.map((item) =>
                                      item.key === row.key ? { ...item, help_text: next } : item,
                                    ),
                                  );
                                }}
                                rows={1}
                                placeholder="Optional guidance under the question"
                                className={fieldClass}
                              />
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Type</label>
                                <select
                                  value={row.question_type}
                                  onChange={(e) => {
                                    const nextType = e.target.value;
                                    setDraftQuestions((prev) =>
                                      prev.map((item) =>
                                        item.key === row.key
                                          ? {
                                              ...item,
                                              question_type: nextType,
                                              options: defaultOptionsForType(nextType),
                                            }
                                          : item,
                                      ),
                                    );
                                  }}
                                  className={fieldClass}
                                >
                                  <option value="single">Multiple choice</option>
                                  <option value="yes_no">Yes / No</option>
                                  <option value="text">Free text</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftQuestions((prev) =>
                                      prev.map((item) =>
                                        item.key === row.key
                                          ? { ...item, is_required: !item.is_required }
                                          : item,
                                      ),
                                    )
                                  }
                                  className={`w-full rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                                    row.is_required
                                      ? "border-[#009877]/30 bg-[#E8F7F2] text-[#006F57]"
                                      : "border-[#E5EAF0] bg-white text-[#627D98]"
                                  }`}
                                >
                                  {row.is_required ? "Required" : "Optional"}
                                </button>
                              </div>
                            </div>
                            {row.question_type !== "text" ? (
                              <div>
                                <label className={labelClass}>Answer choices</label>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {row.options.map((option, optionIndex) => (
                                    <span
                                      key={`${row.key}-${option}-${optionIndex}`}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1 text-[13px] font-medium text-[#334E68]"
                                    >
                                      {option}
                                      {row.question_type !== "yes_no" ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDraftQuestions((prev) =>
                                              prev.map((item) =>
                                                item.key === row.key
                                                  ? {
                                                      ...item,
                                                      options: item.options.filter((_, i) => i !== optionIndex),
                                                    }
                                                  : item,
                                              ),
                                            )
                                          }
                                          className="text-[#829AB1] hover:text-[#B42318]"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                    </span>
                                  ))}
                                </div>
                                {row.question_type === "single" ? (
                                  <div className="mt-2">
                                    <input
                                      value={optionDraftByKey[row.key] || ""}
                                      onChange={(e) =>
                                        setOptionDraftByKey((prev) => ({ ...prev, [row.key]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        e.preventDefault();
                                        const value = String(optionDraftByKey[row.key] || "").trim();
                                        if (!value) return;
                                        setDraftQuestions((prev) =>
                                          prev.map((item) =>
                                            item.key === row.key && !item.options.includes(value)
                                              ? { ...item, options: [...item.options, value] }
                                              : item,
                                          ),
                                        );
                                        setOptionDraftByKey((prev) => ({ ...prev, [row.key]: "" }));
                                      }}
                                      placeholder="Add choice and press Enter"
                                      className={fieldClass}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => setDraftQuestions((prev) => moveList(prev, row.key, -1))}
                              className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === draftQuestions.length - 1}
                              onClick={() => setDraftQuestions((prev) => moveList(prev, row.key, 1))}
                              className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftQuestions((prev) => prev.filter((item) => item.key !== row.key))
                              }
                              className="rounded-[8px] border border-[#F2C7C3] p-1.5 text-[#B42318]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[10px] border border-[#D9E1EA] bg-[#FBFCFD] p-3.5 xl:col-span-5 xl:sticky xl:top-16 xl:self-start">
                <p className="mb-2.5 text-[15px] font-semibold text-[#102A43]">Add a question</p>
                <div className="space-y-2.5">
                  <div>
                    <label className={labelClass}>Question text</label>
                    <textarea
                      value={newQuestionLabel}
                      onChange={(e) => setNewQuestionLabel(e.target.value)}
                      rows={2}
                      placeholder="e.g. Any name changes?"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Helper details</label>
                    <textarea
                      value={newQuestionHelp}
                      onChange={(e) => setNewQuestionHelp(e.target.value)}
                      rows={1}
                      placeholder="Optional tip"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Answer type</label>
                      <select
                        value={newQuestionType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setNewQuestionType(nextType);
                          setNewQuestionOptions(defaultOptionsForType(nextType));
                          setNewOptionInput("");
                        }}
                        className={fieldClass}
                      >
                        <option value="single">Multiple choice</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="text">Free text</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setNewQuestionRequired((v) => !v)}
                        className={`w-full rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                          newQuestionRequired
                            ? "border-[#009877]/30 bg-[#E8F7F2] text-[#006F57]"
                            : "border-[#E5EAF0] bg-white text-[#627D98]"
                        }`}
                      >
                        {newQuestionRequired ? "Required" : "Optional"}
                      </button>
                    </div>
                  </div>
                  {newQuestionType !== "text" ? (
                    <div>
                      <label className={labelClass}>Choices</label>
                      <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
                        {newQuestionOptions.map((option, optionIndex) => (
                          <span
                            key={`${option}-${optionIndex}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1EA] bg-white px-2.5 py-1 text-[13px] font-medium text-[#334E68]"
                          >
                            {option}
                            {newQuestionType !== "yes_no" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setNewQuestionOptions((prev) => prev.filter((_, i) => i !== optionIndex))
                                }
                                className="text-[#829AB1] hover:text-[#B42318]"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                      {newQuestionType === "single" ? (
                        <div className="flex gap-2">
                          <input
                            value={newOptionInput}
                            onChange={(e) => setNewOptionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              pushComposerOption();
                            }}
                            placeholder="Choice, then Add"
                            className={fieldClass}
                          />
                          <button
                            type="button"
                            onClick={pushComposerOption}
                            disabled={!newOptionInput.trim()}
                            className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#102A43] disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={addDraftQuestion}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#102A43] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243B53]"
                  >
                    <Plus className="h-4 w-4" />
                    Add to draft
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {section === "documents" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-2 rounded-[10px] border border-dashed border-[#D9E1EA] bg-[#FBFCFD] p-3">
                <label className="min-w-[220px] flex-[2]">
                  <span className={labelClass}>Document name</span>
                  <input
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="e.g. Passport bio page"
                    className={fieldClass}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-[14px] font-semibold text-[#334E68]">
                  <input
                    type="checkbox"
                    checked={newDocMandatory}
                    onChange={(e) => setNewDocMandatory(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D9E1EA]"
                  />
                  Mandatory
                </label>
                <button
                  type="button"
                  onClick={addDraftDoc}
                  className="inline-flex items-center gap-1 rounded-[8px] bg-[#102A43] px-3 py-2 text-sm font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add document
                </button>
              </div>

              <div className="overflow-hidden rounded-[10px] border border-[#E5EAF0]">
                <table className="w-full text-[15px]">
                  <thead className="bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Mandatory</th>
                      <th className="px-3 py-2 text-right text-[12px] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {draftDocs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-sm text-[#627D98]">
                          No documents yet — add one above.
                        </td>
                      </tr>
                    ) : (
                      draftDocs.map((row, index) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2">
                            <input
                              value={row.name}
                              onChange={(e) => {
                                const next = e.target.value;
                                setDraftDocs((prev) =>
                                  prev.map((item) => (item.key === row.key ? { ...item, name: next } : item)),
                                );
                              }}
                              className="w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-[15px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftDocs((prev) =>
                                  prev.map((item) =>
                                    item.key === row.key
                                      ? { ...item, is_mandatory: !item.is_mandatory }
                                      : item,
                                  ),
                                )
                              }
                              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                                row.is_mandatory
                                  ? "bg-[#009877]/12 text-[#006F57]"
                                  : "bg-[#F5F7FA] text-[#627D98]"
                              }`}
                            >
                              {row.is_mandatory ? "Yes" : "No"}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => setDraftDocs((prev) => moveList(prev, row.key, -1))}
                                className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === draftDocs.length - 1}
                                onClick={() => setDraftDocs((prev) => moveList(prev, row.key, 1))}
                                className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftDocs((prev) => prev.filter((item) => item.key !== row.key))
                                }
                                className="rounded-[8px] border border-[#F2C7C3] p-1.5 text-[#B42318]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 lg:px-5">
          <button
            type="button"
            onClick={() => router.push("/admin/services")}
            className="rounded-[8px] border border-[#D9E1EA] bg-white px-4 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
          >
            Cancel
          </button>
          <div className="flex flex-wrap gap-2">
            {section !== "details" ? (
              <button
                type="button"
                onClick={() =>
                  setSection(section === "documents" ? "questions" : "details")
                }
                className="rounded-[8px] border border-[#D9E1EA] bg-white px-4 py-2 text-sm font-semibold text-[#102A43]"
              >
                Back
              </button>
            ) : null}
            {section !== "documents" ? (
              <button
                type="button"
                onClick={() =>
                  setSection(section === "details" ? "questions" : "documents")
                }
                className="rounded-[8px] border border-[#009877]/30 bg-[#E8F7F2] px-4 py-2 text-sm font-semibold text-[#006F57]"
              >
                Continue
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-[8px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
