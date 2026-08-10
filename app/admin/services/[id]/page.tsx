"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  Layers,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  createAdminServiceCountryPricing,
  createAdminServiceDocument,
  createAdminServiceFeePlan,
  createAdminServiceQuestion,
  createAdminServiceReminder,
  deleteAdminServiceCountryPricing,
  deleteAdminServiceDocument,
  deleteAdminServiceQuestion,
  deleteAdminServiceReminder,
  getAdminService,
  listAdminServiceCountryPricing,
  listAdminServiceDocuments,
  listAdminServiceFeePlans,
  listAdminServiceQuestions,
  listAdminServiceReminders,
  listAdminServices,
  reorderAdminServiceDocuments,
  reorderAdminServiceQuestions,
  updateAdminService,
  updateAdminServiceCountryPricing,
  updateAdminServiceDocument,
  updateAdminServiceFeePlan,
  updateAdminServiceQuestion,
  updateAdminServiceReminder,
  type AdminCountryPricingOffering,
  type AdminDocumentRequirement,
  type AdminService,
  type AdminServiceMeta,
  type AdminServiceQuestion,
  type AdminServiceReminder,
} from "@/lib/admin-auth";
import {
  DOCUMENT_FILE_TYPE_OPTIONS,
  clearDocumentRequirementsCache,
  formatFileTypesLabel,
  formatMaxSizeLabel,
  normalizeAllowedFileTypes,
} from "@/lib/document-requirements";
import { clearQuestionnaireCache } from "@/lib/questionnaire";
import { DEFAULT_COUNTRY_OPTIONS } from "@/lib/country-states";
import { clearPublicPricingCache } from "@/lib/public-pricing";

const fieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-[15px] leading-5 text-[#102A43] placeholder:text-[#9AA8BC] outline-none transition focus:border-[#009877] focus:ring-2 focus:ring-[#009877]/15";

const labelClass = "text-[12px] font-semibold uppercase tracking-[0.03em] text-[#486581]";

const questionTypeLabel = (type: string) => {
  if (type === "yes_no") return "Yes / No";
  if (type === "text") return "Free text";
  if (type === "country") return "Country → State";
  return "Multiple choice";
};

const defaultOptionsForType = (type: string): string[] => {
  if (type === "yes_no") return ["Yes", "No"];
  if (type === "text") return [];
  if (type === "country") return [];
  return ["Option 1", "Option 2"];
};

type FormState = {
  service_name: string;
  description: string;
  category: string;
  base_fee: string;
  audit_fee: string;
  is_active: boolean;
  show_on_homepage: boolean;
};

const emptyForm = (): FormState => ({
  service_name: "",
  description: "",
  category: "",
  base_fee: "0",
  audit_fee: "",
  is_active: true,
  show_on_homepage: false,
});

type ExpressFeeRow = {
  serviceId: number;
  serviceName: string;
  serviceType: string;
  planId: number | null;
  fee: string;
  isActive: boolean;
};

const isExpressHubService = (row: AdminService | null | undefined) => {
  if (!row) return false;
  const type = String(row.service_type || "").toLowerCase();
  const category = String(row.category || "").toLowerCase();
  const name = String(row.service_name || "").toLowerCase();
  return type.includes("express") || category === "express" || name.includes("express service");
};

export default function AdminEditServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = Number(params?.id);
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/services");
  const validId = Number.isFinite(serviceId) && serviceId > 0;

  const [meta, setMeta] = useState<AdminServiceMeta>({
    service_types: [],
    categories: [],
    code_keyed_types: [],
  });
  const [service, setService] = useState<AdminService | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [section, setSection] = useState<"details" | "questions" | "documents" | "reminders" | "country-pricing">(
    "details",
  );

  const [form, setForm] = useState<FormState>(emptyForm());

  const [expressFeeRows, setExpressFeeRows] = useState<ExpressFeeRow[]>([]);
  const [expressFeesLoading, setExpressFeesLoading] = useState(false);
  const [expressFeesSaving, setExpressFeesSaving] = useState(false);

  const [docRows, setDocRows] = useState<AdminDocumentRequirement[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsSaving, setDocsSaving] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocMandatory, setNewDocMandatory] = useState(true);
  const [newDocFileTypes, setNewDocFileTypes] = useState<string[]>(["pdf", "jpg", "png"]);
  const [newDocMaxSizeMb, setNewDocMaxSizeMb] = useState("5");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocMustInclude, setNewDocMustInclude] = useState("");
  const [newDocMustNot, setNewDocMustNot] = useState("");
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

  const [questionRows, setQuestionRows] = useState<AdminServiceQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsSaving, setQuestionsSaving] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionHelp, setNewQuestionHelp] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("single");
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(["Yes", "No"]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);
  const [newDependsOnCode, setNewDependsOnCode] = useState("");
  const [newCascadeDraftByParent, setNewCascadeDraftByParent] = useState<Record<string, string>>({});
  const [optionDraftByKey, setOptionDraftByKey] = useState<Record<string, string>>({});
  const [expandedQuestionKey, setExpandedQuestionKey] = useState<string | null>(null);

  const [reminderRows, setReminderRows] = useState<AdminServiceReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [remindersSaving, setRemindersSaving] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDays, setNewReminderDays] = useState("3");
  const [newReminderSubject, setNewReminderSubject] = useState("");
  const [newReminderBody, setNewReminderBody] = useState("");
  const [expandedReminderKey, setExpandedReminderKey] = useState<string | null>(null);

  const [countryOfferings, setCountryOfferings] = useState<AdminCountryPricingOffering[]>([]);
  const [hubCountries, setHubCountries] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [countryBaseFee, setCountryBaseFee] = useState("");
  const [countryBaseAuditFee, setCountryBaseAuditFee] = useState("");
  const [countryPricingLoading, setCountryPricingLoading] = useState(false);
  const [countryPricingSaving, setCountryPricingSaving] = useState(false);
  const [newCountryId, setNewCountryId] = useState("");
  const [newCountryServiceFee, setNewCountryServiceFee] = useState("");
  const [newCountryAuditFee, setNewCountryAuditFee] = useState("");
  const [newCountryName, setNewCountryName] = useState("");
  const [countryMode, setCountryMode] = useState<"existing" | "new">("existing");

  const resetQuestionComposer = () => {
    setNewQuestionLabel("");
    setNewQuestionHelp("");
    setNewQuestionOptions(["Yes", "No"]);
    setNewOptionInput("");
    setNewQuestionType("single");
    setNewQuestionRequired(true);
    setNewDependsOnCode("");
    setNewCascadeDraftByParent({});
  };

  const resetDocComposer = () => {
    setNewDocName("");
    setNewDocMandatory(true);
    setNewDocFileTypes(["pdf", "jpg", "png"]);
    setNewDocMaxSizeMb("5");
    setNewDocDescription("");
    setNewDocMustInclude("");
    setNewDocMustNot("");
  };

  const resetReminderComposer = () => {
    setNewReminderTitle("");
    setNewReminderDays("3");
    setNewReminderSubject("");
    setNewReminderBody("");
  };

  const loadMeta = useCallback(async () => {
    try {
      const payload = await listAdminServices({ page: 1, page_size: 1, active: "all" });
      setMeta(payload.meta || { service_types: [], categories: [], code_keyed_types: [] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories.");
    }
  }, []);

  const loadExpressFeeMatrix = useCallback(async (hub: AdminService) => {
    if (!isExpressHubService(hub)) {
      setExpressFeeRows([]);
      return;
    }
    setExpressFeesLoading(true);
    try {
      const payload = await listAdminServices({ page: 1, page_size: 200, active: "all" });
      const targets = (payload.services || []).filter((row) => {
        if (row.id === hub.id) return false;
        const type = String(row.service_type || "").toLowerCase();
        if (type === "document_audit") return false;
        if (type.startsWith("evisa")) return false;
        if (type.includes("express")) return false;
        return true;
      });

      const rows: ExpressFeeRow[] = [];
      for (const target of targets) {
        const plans = await listAdminServiceFeePlans(target.id);
        const express = plans.find((plan) => String(plan.plan_code || "").toLowerCase() === "express");
        rows.push({
          serviceId: target.id,
          serviceName: target.service_name,
          serviceType: target.service_type,
          planId: express?.id ?? null,
          fee: express ? String(express.fee ?? "") : "",
          isActive: express ? Boolean(express.is_active) : true,
        });
      }
      rows.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
      setExpressFeeRows(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load express fees by service.");
      setExpressFeeRows([]);
    } finally {
      setExpressFeesLoading(false);
    }
  }, []);

  const loadService = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    try {
      const row = await getAdminService(serviceId);
      if (!row) {
        setNotFound(true);
        return;
      }
      setService(row);
      setForm({
        service_name: row.service_name || "",
        description: row.description || "",
        category: row.category || "",
        base_fee: String(row.base_fee ?? "0"),
        audit_fee: String(row.audit_fee ?? "15"),
        is_active: Boolean(row.is_active),
        show_on_homepage: Boolean(row.show_on_homepage),
      });
      void loadExpressFeeMatrix(row);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load service.");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [serviceId, validId, loadExpressFeeMatrix]);

  const loadDocuments = useCallback(async () => {
    if (!validId) return;
    setDocsLoading(true);
    try {
      const rows = await listAdminServiceDocuments(serviceId);
      setDocRows(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load documents.");
      setDocRows([]);
    } finally {
      setDocsLoading(false);
    }
  }, [serviceId, validId]);

  const loadQuestions = useCallback(async () => {
    if (!validId) return;
    setQuestionsLoading(true);
    try {
      const rows = await listAdminServiceQuestions(serviceId);
      setQuestionRows(rows);
      if (rows.length > 0) {
        setExpandedQuestionKey((current) => current || String(rows[0].id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load questions.");
      setQuestionRows([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [serviceId, validId]);

  const loadReminders = useCallback(async () => {
    if (!validId) return;
    setRemindersLoading(true);
    try {
      const rows = await listAdminServiceReminders(serviceId);
      setReminderRows(rows);
      if (rows.length > 0) {
        setExpandedReminderKey((current) => current || String(rows[0].id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reminders.");
      setReminderRows([]);
    } finally {
      setRemindersLoading(false);
    }
  }, [serviceId, validId]);

  const loadCountryPricing = useCallback(async () => {
    if (!validId) return;
    setCountryPricingLoading(true);
    try {
      const payload = await listAdminServiceCountryPricing(serviceId);
      setCountryOfferings(payload?.offerings || []);
      setHubCountries(payload?.countries || []);
      setCountryBaseFee(payload?.base_fee || "");
      setCountryBaseAuditFee(payload?.audit_fee || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load country pricing.");
      setCountryOfferings([]);
      setHubCountries([]);
    } finally {
      setCountryPricingLoading(false);
    }
  }, [serviceId, validId]);

  useEffect(() => {
    if (!accessReady || !canAccess) return;
    if (!validId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    void loadMeta();
    void loadService();
    void loadDocuments();
    void loadQuestions();
    void loadReminders();
    void loadCountryPricing();
  }, [
    accessReady,
    canAccess,
    validId,
    loadMeta,
    loadService,
    loadDocuments,
    loadQuestions,
    loadReminders,
    loadCountryPricing,
  ]);

  useSetAdminPageChrome(
    canAccess
      ? {
          title: "Edit service",
          subtitle: service?.service_name || "Details, questions & documents",
          icon: Layers,
          syncKey: `edit-service|${serviceId}|${questionRows.length}|${docRows.length}|${canAccess ? 1 : 0}`,
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
      : { title: "Edit service", icon: Layers },
  );

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.service_name.trim()) errors.service_name = "Name is required.";
    if (form.base_fee === "" || Number.isNaN(Number(form.base_fee))) {
      errors.base_fee = "Enter a valid number.";
    }
    // Assessment fee is optional — empty means 0.
    if (form.audit_fee.trim() !== "" && Number.isNaN(Number(form.audit_fee))) {
      errors.audit_fee = "Enter a valid number.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSection("details");
      return false;
    }
    return true;
  };

  const saveDetails = async () => {
    if (!service || !validate()) return;
    setSaving(true);
    try {
      const updated = await updateAdminService(service.id, {
        service_name: form.service_name.trim(),
        description: form.description.trim(),
        category: form.category || null,
        base_fee: form.base_fee,
        audit_fee: form.audit_fee.trim() === "" ? "0" : form.audit_fee,
        total_fee: form.base_fee,
        government_fee: "0",
        is_active: form.is_active,
        show_on_homepage: form.show_on_homepage,
      });
      if (updated) setService(updated);
      if (isExpressHubService(updated || service)) {
        await saveExpressFeeMatrix();
      }
      clearDocumentRequirementsCache();
      clearQuestionnaireCache();
      clearPublicPricingCache();
      toast.success("Service updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const saveExpressFeeMatrix = async () => {
    if (!expressFeeRows.length) return;
    setExpressFeesSaving(true);
    try {
      for (const row of expressFeeRows) {
        const feeNum = Number(row.fee);
        const hasFee = row.fee !== "" && Number.isFinite(feeNum) && feeNum >= 0;
        if (row.planId) {
          await updateAdminServiceFeePlan(row.serviceId, row.planId, {
            fee: hasFee ? feeNum : 0,
            label: "Express Service",
            is_active: Boolean(row.isActive && hasFee && feeNum > 0),
            plan_code: "express",
          });
        } else if (hasFee && feeNum > 0) {
          await createAdminServiceFeePlan(row.serviceId, {
            plan_code: "express",
            label: "Express Service",
            fee: feeNum,
            is_default: false,
            is_active: Boolean(row.isActive),
          });
        }
      }
      if (service) await loadExpressFeeMatrix(service);
      clearPublicPricingCache();
    } finally {
      setExpressFeesSaving(false);
    }
  };

  const moveList = <T extends { id: number }>(list: T[], id: number, direction: -1 | 1): T[] | null => {
    const sorted = [...list].sort((a, b) => (a as unknown as { display_order: number }).display_order - (b as unknown as { display_order: number }).display_order || a.id - b.id);
    const index = sorted.findIndex((item) => item.id === id);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return null;
    const next = [...sorted];
    const tmp = next[index];
    next[index] = next[swapWith];
    next[swapWith] = tmp;
    return next;
  };

  const patchDoc = async (row: AdminDocumentRequirement, patch: Record<string, unknown>) => {
    setDocsSaving(true);
    try {
      const updated = await updateAdminServiceDocument(serviceId, row.id, patch);
      setDocRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      clearDocumentRequirementsCache();
      clearPublicPricingCache();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update document.");
      await loadDocuments();
    } finally {
      setDocsSaving(false);
    }
  };

  const toggleNewDocFileType = (value: string) => {
    setNewDocFileTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const addDoc = async () => {
    const name = newDocName.trim();
    if (!name) {
      toast.error("Document name is required.");
      return;
    }
    if (newDocFileTypes.length === 0) {
      toast.error("Select at least one file type.");
      return;
    }
    const maxSizeRaw = newDocMaxSizeMb.trim();
    let maxFileSizeMb: number | null = null;
    if (maxSizeRaw) {
      const parsed = Number(maxSizeRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error("Max size must be a positive number (MB).");
        return;
      }
      maxFileSizeMb = parsed;
    }
    setDocsSaving(true);
    try {
      const created = await createAdminServiceDocument(serviceId, {
        name,
        is_mandatory: newDocMandatory,
        is_active: true,
        allowed_file_types: newDocFileTypes,
        max_file_size_mb: maxFileSizeMb,
        description: newDocDescription.trim(),
        sample: newDocMustInclude.trim(),
        mistakes: newDocMustNot.trim(),
      });
      if (created) setDocRows((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
      resetDocComposer();
      setShowAddDocForm(false);
      if (created) setExpandedDocId(created.id);
      clearDocumentRequirementsCache();
      toast.success("Document added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add document.");
    } finally {
      setDocsSaving(false);
    }
  };

  const removeDoc = async (row: AdminDocumentRequirement) => {
    setDocsSaving(true);
    try {
      await deleteAdminServiceDocument(serviceId, row.id);
      setDocRows((prev) => prev.filter((item) => item.id !== row.id));
      clearDocumentRequirementsCache();
      toast.success("Document removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove document.");
    } finally {
      setDocsSaving(false);
    }
  };

  const moveDoc = async (row: AdminDocumentRequirement, direction: -1 | 1) => {
    const next = moveList(docRows, row.id, direction);
    if (!next) return;
    const orderedIds = next.map((item) => item.id);
    setDocRows(next.map((item, i) => ({ ...item, display_order: i + 1 })));
    setDocsSaving(true);
    try {
      const refreshed = await reorderAdminServiceDocuments(serviceId, orderedIds);
      setDocRows(refreshed);
      clearDocumentRequirementsCache();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder.");
      await loadDocuments();
    } finally {
      setDocsSaving(false);
    }
  };

  const patchQuestion = async (row: AdminServiceQuestion, patch: Record<string, unknown>) => {
    setQuestionsSaving(true);
    try {
      const updated = await updateAdminServiceQuestion(serviceId, row.id, patch);
      setQuestionRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      clearQuestionnaireCache();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update question.");
      await loadQuestions();
    } finally {
      setQuestionsSaving(false);
    }
  };

  const pushComposerOption = () => {
    const value = newOptionInput.trim();
    if (!value) return;
    setNewQuestionOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewOptionInput("");
  };

  const addQuestion = async () => {
    const label = newQuestionLabel.trim();
    if (!label) {
      toast.error("Question text is required.");
      return;
    }
    const optionsByAnswer: Record<string, string[]> = {};
    if (newDependsOnCode) {
      for (const [parent, raw] of Object.entries(newCascadeDraftByParent)) {
        const children = raw
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
        if (children.length) optionsByAnswer[parent] = children;
      }
    }
    const isCascading = Boolean(newDependsOnCode && Object.keys(optionsByAnswer).length);
    const options =
      newQuestionType === "text"
        ? []
        : newQuestionType === "yes_no"
          ? ["Yes", "No"]
          : newQuestionOptions.map((item) => item.trim()).filter(Boolean);
    if (newQuestionType === "country" && options.length < 1) {
      toast.error("Add at least one country.");
      return;
    }
    if (newQuestionType === "single" && options.length < 2 && !isCascading) {
      toast.error("Add at least two choices, or configure cascading options by parent answer.");
      return;
    }
    if (newQuestionType === "single" && newDependsOnCode && !isCascading) {
      toast.error("Add at least one parent answer with child options for cascading.");
      return;
    }
    setQuestionsSaving(true);
    try {
      const created = await createAdminServiceQuestion(serviceId, {
        label,
        help_text: newQuestionHelp.trim(),
        options,
        question_type: newQuestionType,
        is_required: newQuestionRequired,
        is_active: true,
        depends_on_code: newQuestionType === "country" ? "" : newDependsOnCode || "",
        options_by_answer: newQuestionType === "country" ? {} : optionsByAnswer,
      });
      if (created) {
        setQuestionRows((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
        setExpandedQuestionKey(String(created.id));
      }
      resetQuestionComposer();
      clearQuestionnaireCache();
      toast.success("Question added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add question.");
    } finally {
      setQuestionsSaving(false);
    }
  };

  const saveQuestionOptions = async (row: AdminServiceQuestion, options: string[]) => {
    const cleaned = options.map((item) => item.trim()).filter(Boolean);
    const hasCascade =
      Boolean(String(row.depends_on_code || "").trim()) &&
      Object.keys(row.options_by_answer || {}).length > 0;
    if (row.question_type === "single" && cleaned.length < 2 && !hasCascade) {
      toast.error("Multiple choice needs at least two options.");
      return;
    }
    if (row.question_type === "country" && cleaned.length < 1) {
      toast.error("Add at least one country.");
      return;
    }
    await patchQuestion(row, { options: cleaned });
  };

  const removeQuestion = async (row: AdminServiceQuestion) => {
    setQuestionsSaving(true);
    try {
      await deleteAdminServiceQuestion(serviceId, row.id);
      setQuestionRows((prev) => prev.filter((item) => item.id !== row.id));
      clearQuestionnaireCache();
      toast.success("Question removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove question.");
    } finally {
      setQuestionsSaving(false);
    }
  };

  const moveQuestion = async (row: AdminServiceQuestion, direction: -1 | 1) => {
    const next = moveList(questionRows, row.id, direction);
    if (!next) return;
    const orderedIds = next.map((item) => item.id);
    setQuestionRows(next.map((item, i) => ({ ...item, display_order: i + 1 })));
    setQuestionsSaving(true);
    try {
      const refreshed = await reorderAdminServiceQuestions(serviceId, orderedIds);
      setQuestionRows(refreshed);
      clearQuestionnaireCache();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder.");
      await loadQuestions();
    } finally {
      setQuestionsSaving(false);
    }
  };

  const patchReminder = async (row: AdminServiceReminder, patch: Record<string, unknown>) => {
    setRemindersSaving(true);
    try {
      const updated = await updateAdminServiceReminder(serviceId, row.id, patch);
      setReminderRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reminder.");
      await loadReminders();
    } finally {
      setRemindersSaving(false);
    }
  };

  const addReminder = async () => {
    const title = newReminderTitle.trim();
    const emailSubject = newReminderSubject.trim();
    const emailBody = newReminderBody.trim();
    const delayDays = Number.parseInt(newReminderDays, 10);
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (!Number.isFinite(delayDays) || delayDays < 1) {
      toast.error("Send after (days) must be at least 1.");
      return;
    }
    if (!emailSubject) {
      toast.error("Email subject is required.");
      return;
    }
    if (!emailBody) {
      toast.error("Email message is required.");
      return;
    }
    setRemindersSaving(true);
    try {
      const created = await createAdminServiceReminder(serviceId, {
        title,
        delay_days: delayDays,
        email_subject: emailSubject,
        email_body: emailBody,
        is_active: true,
      });
      if (created) {
        setReminderRows((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
        setExpandedReminderKey(String(created.id));
      }
      resetReminderComposer();
      toast.success("Reminder added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add reminder.");
    } finally {
      setRemindersSaving(false);
    }
  };

  const removeReminder = async (row: AdminServiceReminder) => {
    setRemindersSaving(true);
    try {
      await deleteAdminServiceReminder(serviceId, row.id);
      setReminderRows((prev) => prev.filter((item) => item.id !== row.id));
      toast.success("Reminder removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove reminder.");
    } finally {
      setRemindersSaving(false);
    }
  };

  if (!accessReady) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <p className="text-sm text-[#627D98]">Checking access…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">Edit service</h1>
        <p className="mt-2 text-sm text-[#627D98]">
          Access restricted. Ask an admin to grant the Services or Categories module for your role.
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">Service not found</h1>
        <p className="mt-2 text-sm text-[#627D98]">
          This service may have been deleted. Head back to the catalog to pick another one.
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin/services")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to catalog
        </button>
      </div>
    );
  }

  if (loading || !service) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <p className="text-sm text-[#627D98]">Loading service…</p>
      </div>
    );
  }

  const sortedDocs = [...docRows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  const sortedQuestions = [...questionRows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  const sortedReminders = [...reminderRows].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  const sectionOrder = ["details", "questions", "documents", "reminders", "country-pricing"] as const;
  const sectionIndex = sectionOrder.indexOf(section);
  const usedCountryIds = new Set(countryOfferings.map((row) => row.country_id));
  const availableHubCountries = hubCountries.filter((row) => !usedCountryIds.has(row.id));

  const addCountryPricing = async () => {
    if (countryMode === "existing" && !newCountryId) {
      toast.error("Choose a country, or pick “+ New country…”.");
      return;
    }
    if (countryMode === "new" && !newCountryName.trim()) {
      toast.error("Type the country name.");
      return;
    }
    if (newCountryServiceFee.trim() === "" || Number.isNaN(Number(newCountryServiceFee))) {
      toast.error("Enter a valid service fee.");
      return;
    }
    setCountryPricingSaving(true);
    try {
      await createAdminServiceCountryPricing(serviceId, {
        ...(countryMode === "existing"
          ? { country_id: Number(newCountryId) }
          : { new_country_name: newCountryName.trim() }),
        service_fee: newCountryServiceFee,
        audit_fee: newCountryAuditFee.trim() === "" ? null : newCountryAuditFee,
        is_active: true,
      });
      setNewCountryId("");
      setNewCountryName("");
      setNewCountryServiceFee("");
      setNewCountryAuditFee("");
      setCountryMode("existing");
      await loadCountryPricing();
      toast.success(countryMode === "new" ? "Country and price saved." : "Country price saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save country price.");
    } finally {
      setCountryPricingSaving(false);
    }
  };

  const saveCountryOffering = async (row: AdminCountryPricingOffering) => {
    setCountryPricingSaving(true);
    try {
      await updateAdminServiceCountryPricing(serviceId, row.id, {
        service_fee: row.service_fee,
        audit_fee: row.audit_fee,
        is_active: row.is_active,
      });
      await loadCountryPricing();
      toast.success("Saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setCountryPricingSaving(false);
    }
  };

  const removeCountryOffering = async (row: AdminCountryPricingOffering) => {
    if (!window.confirm(`Remove the special price for ${row.country_name}?`)) return;
    setCountryPricingSaving(true);
    try {
      await deleteAdminServiceCountryPricing(serviceId, row.id);
      await loadCountryPricing();
      toast.success("Removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove.");
    } finally {
      setCountryPricingSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3 font-body">
      <div className="overflow-hidden rounded-[12px] border border-[#E5EAF0] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5EAF0] bg-[#F8FBFA] px-4 py-3.5 lg:px-5">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#009877]">Service catalog</p>
            <h1 className="mt-0.5 font-heading text-xl font-semibold text-[#102A43] lg:text-[22px]">
              Edit {service.service_name}
            </h1>
            <p className="mt-0.5 text-[14px] text-[#627D98]">
              Fees &amp; status apply to public pricing when active.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-[10px] border border-[#E5EAF0] bg-white p-1">
            {(
              [
                { id: "details" as const, label: "Details" },
                { id: "questions" as const, label: `Questions (${sortedQuestions.length})` },
                { id: "documents" as const, label: `Documents (${sortedDocs.length})` },
                { id: "reminders" as const, label: `Reminders (${sortedReminders.length})` },
                { id: "country-pricing" as const, label: `Country prices (${countryOfferings.length})` },
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
                  <span className={labelClass}>Category <span className="font-normal text-[#829AB1]">(optional)</span></span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className={fieldClass}
                  >
                    <option value="">No category</option>
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.show_on_homepage}
                  onChange={(e) => setForm((f) => ({ ...f, show_on_homepage: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#D9E1EA]"
                />
                <span className="text-[14px] font-semibold text-[#334E68]">
                  Show on homepage pricing teaser
                </span>
              </label>

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
                    min="0"
                    placeholder="0"
                    value={form.audit_fee}
                    onChange={(e) => setForm((f) => ({ ...f, audit_fee: e.target.value }))}
                    className={fieldClass}
                  />
                  {fieldErrors.audit_fee ? (
                    <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.audit_fee}</span>
                  ) : (
                    <span className="mt-1 block text-xs text-[#627D98]">
                      Leave empty for £0. If set above £0, customers pay assessment first; otherwise they pay the full service fee.
                    </span>
                  )}
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

              {isExpressHubService(service) ? (
                <div className="rounded-[10px] border border-[#D7E8E2] bg-[#F4FBF8] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold text-[#102A43]">Express fee by service</p>
                      <p className="mt-0.5 text-[13px] text-[#627D98]">
                        Set a different Express price for each service. These appear on that service&apos;s checkout.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={expressFeesLoading || expressFeesSaving || saving}
                      onClick={() => {
                        void (async () => {
                          try {
                            await saveExpressFeeMatrix();
                            toast.success("Express fees saved.");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed to save express fees.");
                          }
                        })();
                      }}
                      className="rounded-[8px] border border-[#009877]/30 bg-white px-3 py-1.5 text-[13px] font-semibold text-[#006F57] hover:bg-[#EAF7F3] disabled:opacity-60"
                    >
                      {expressFeesSaving ? "Saving…" : "Save express fees"}
                    </button>
                  </div>

                  {expressFeesLoading ? (
                    <p className="mt-3 text-sm text-[#627D98]">Loading services…</p>
                  ) : expressFeeRows.length === 0 ? (
                    <p className="mt-3 text-sm text-[#627D98]">No other services found to attach Express fees.</p>
                  ) : (
                    <div className="mt-3 overflow-hidden rounded-[8px] border border-[#D9E1EA] bg-white">
                      <div className="grid grid-cols-[minmax(0,1fr)_120px_88px] gap-2 border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#627D98]">
                        <span>Service</span>
                        <span>Express fee (£)</span>
                        <span>Active</span>
                      </div>
                      <div className="divide-y divide-[#EEF2F6]">
                        {expressFeeRows.map((row) => (
                          <div
                            key={row.serviceId}
                            className="grid grid-cols-[minmax(0,1fr)_120px_88px] items-center gap-2 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-[#102A43]">{row.serviceName}</p>
                              <p className="truncate text-[11px] text-[#829AB1]">{row.serviceType}</p>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.fee}
                              onChange={(e) =>
                                setExpressFeeRows((current) =>
                                  current.map((item) =>
                                    item.serviceId === row.serviceId ? { ...item, fee: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-[14px] text-[#102A43] outline-none focus:border-[#009877] focus:ring-2 focus:ring-[#009877]/15"
                            />
                            <label className="inline-flex items-center gap-2 text-[13px] text-[#334E68]">
                              <input
                                type="checkbox"
                                checked={row.isActive}
                                onChange={(e) =>
                                  setExpressFeeRows((current) =>
                                    current.map((item) =>
                                      item.serviceId === row.serviceId
                                        ? { ...item, isActive: e.target.checked }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-4 w-4 rounded border-[#D9E1EA]"
                              />
                              On
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
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
                        Changes save instantly — no need to press Save.
                      </p>
                    </div>
                  </div>
                </div>

                {questionsLoading ? (
                  <p className="rounded-[10px] border border-[#E5EAF0] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#627D98]">
                    Loading questions…
                  </p>
                ) : sortedQuestions.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D9E1EA] bg-[#FBFCFD] px-4 py-8 text-center">
                    <HelpCircle className="mx-auto h-5 w-5 text-[#9AA8BC]" />
                    <p className="mt-2 text-sm font-semibold text-[#334E68]">No questions yet</p>
                    <p className="mt-0.5 text-[13px] text-[#627D98]">Add one from the panel on the right.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedQuestions.map((row, index) => {
                      const key = String(row.id);
                      const expanded = expandedQuestionKey === key;
                      const options = Array.isArray(row.options) ? row.options : [];
                      return (
                        <div
                          key={row.id}
                          className={`overflow-hidden rounded-[10px] border bg-white transition ${
                            expanded ? "border-[#009877]/40 ring-1 ring-[#009877]/15" : "border-[#E5EAF0]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 px-3.5 py-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF7F4] text-[11px] font-bold text-[#006F57]">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setExpandedQuestionKey(expanded ? null : key)}
                                className="w-full text-left"
                              >
                                <p className="text-[14px] font-semibold leading-snug text-[#102A43]">{row.label}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-[#F0F4F8] px-2 py-0.5 text-[11px] font-medium text-[#486581]">
                                    {questionTypeLabel(row.question_type)}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      row.is_required
                                        ? "bg-[#009877]/12 text-[#006F57]"
                                        : "bg-[#F0F4F8] text-[#627D98]"
                                    }`}
                                  >
                                    {row.is_required ? "Required" : "Optional"}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      row.is_active ? "bg-[#E8F7F2] text-[#006F57]" : "bg-[#F5F7FA] text-[#829AB1]"
                                    }`}
                                  >
                                    {row.is_active ? "Active" : "Hidden"}
                                  </span>
                                  {row.question_type !== "text" ? (
                                    <span className="text-[11px] text-[#829AB1]">
                                      {options.length} choice{options.length === 1 ? "" : "s"}
                                    </span>
                                  ) : null}
                                  {row.depends_on_code ? (
                                    <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#3730A3]">
                                      Cascades from {row.depends_on_code}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                disabled={questionsSaving || index === 0}
                                onClick={() => void moveQuestion(row, -1)}
                                className="rounded-[8px] border border-[#E5EAF0] p-1.5 text-[#627D98] hover:bg-[#F5F7FA] disabled:opacity-30"
                                aria-label="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={questionsSaving || index === sortedQuestions.length - 1}
                                onClick={() => void moveQuestion(row, 1)}
                                className="rounded-[8px] border border-[#E5EAF0] p-1.5 text-[#627D98] hover:bg-[#F5F7FA] disabled:opacity-30"
                                aria-label="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={questionsSaving}
                                onClick={() => void removeQuestion(row)}
                                className="rounded-[8px] border border-[#F2C7C3] p-1.5 text-[#B42318] hover:bg-[#FFF1F0]"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="space-y-3 border-t border-[#EEF2F6] bg-[#FBFCFD] px-3.5 py-3.5">
                              <div>
                                <label className={labelClass}>Question text</label>
                                <textarea
                                  defaultValue={row.label}
                                  key={`${row.id}-label-${row.label}`}
                                  disabled={questionsSaving}
                                  rows={2}
                                  onBlur={(e) => {
                                    const next = e.target.value.trim();
                                    if (!next || next === row.label) return;
                                    void patchQuestion(row, { label: next });
                                  }}
                                  className={fieldClass}
                                />
                                <p className="mt-1.5 text-[11px] text-[#829AB1]">
                                  Code: <span className="font-medium text-[#486581]">{row.code}</span>
                                </p>
                              </div>

                              <div>
                                <label className={labelClass}>Helper details</label>
                                <textarea
                                  defaultValue={row.help_text || ""}
                                  key={`${row.id}-help-${row.help_text || ""}`}
                                  disabled={questionsSaving}
                                  rows={1}
                                  placeholder="Optional guidance under the question"
                                  onBlur={(e) => {
                                    const next = e.target.value.trim();
                                    if (next === (row.help_text || "").trim()) return;
                                    void patchQuestion(row, { help_text: next });
                                  }}
                                  className={fieldClass}
                                />
                              </div>

                              <div className="grid gap-2.5 sm:grid-cols-3">
                                <div>
                                  <label className={labelClass}>Type</label>
                                  <select
                                    value={row.question_type}
                                    disabled={questionsSaving}
                                    onChange={(e) => {
                                      const nextType = e.target.value;
                                      const patch: Record<string, unknown> = { question_type: nextType };
                                      if (nextType === "yes_no") patch.options = ["Yes", "No"];
                                      if (nextType === "text") patch.options = [];
                                      if (nextType === "country") {
                                        // Do not auto-seed a long country list — admin adds only what is needed.
                                        patch.options = row.options?.length ? row.options : [];
                                        patch.depends_on_code = "";
                                        patch.options_by_answer = {};
                                      }
                                      void patchQuestion(row, patch);
                                    }}
                                    className={fieldClass}
                                  >
                                    <option value="single">Multiple choice</option>
                                    <option value="yes_no">Yes / No</option>
                                    <option value="text">Free text</option>
                                    <option value="country">Country → State dropdown</option>
                                  </select>
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    disabled={questionsSaving}
                                    onClick={() => void patchQuestion(row, { is_required: !row.is_required })}
                                    className={`w-full rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                                      row.is_required
                                        ? "border-[#009877]/30 bg-[#E8F7F2] text-[#006F57]"
                                        : "border-[#E5EAF0] bg-white text-[#627D98]"
                                    }`}
                                  >
                                    {row.is_required ? "Required" : "Optional"}
                                  </button>
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    disabled={questionsSaving}
                                    onClick={() => void patchQuestion(row, { is_active: !row.is_active })}
                                    className={`w-full rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                                      row.is_active
                                        ? "border-[#009877]/30 bg-[#E8F7F2] text-[#006F57]"
                                        : "border-[#E5EAF0] bg-white text-[#627D98]"
                                    }`}
                                  >
                                    {row.is_active ? "Active" : "Hidden"}
                                  </button>
                                </div>
                              </div>

                              {row.question_type === "single" ? (
                                <div className="space-y-2.5 rounded-[8px] border border-[#E5EAF0] bg-[#FBFCFD] p-3">
                                  <div>
                                    <label className={labelClass}>Depends on (cascading)</label>
                                    <select
                                      value={row.depends_on_code || ""}
                                      disabled={questionsSaving}
                                      onChange={(e) => {
                                        const parentCode = e.target.value;
                                        const parent = sortedQuestions.find((item) => item.code === parentCode);
                                        const seeded: Record<string, string[]> = {};
                                        for (const parentOption of parent?.options || []) {
                                          seeded[parentOption] = row.options_by_answer?.[parentOption] || [];
                                        }
                                        void patchQuestion(row, {
                                          depends_on_code: parentCode,
                                          options_by_answer: parentCode ? seeded : {},
                                        });
                                      }}
                                      className={fieldClass}
                                    >
                                      <option value="">None — flat choices only</option>
                                      {sortedQuestions
                                        .filter((item) => item.id !== row.id)
                                        .map((item) => (
                                          <option key={item.id} value={item.code}>
                                            {item.label} ({item.code})
                                          </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-[11px] text-[#829AB1]">
                                      Example: Country question first, then State with options mapped per country.
                                    </p>
                                  </div>
                                  {row.depends_on_code ? (
                                    <div className="space-y-2">
                                      <label className={labelClass}>Options by parent answer</label>
                                      {(
                                        (() => {
                                          const parent = sortedQuestions.find((item) => item.code === row.depends_on_code);
                                          const keys = Array.from(
                                            new Set([
                                              ...(parent?.options || []),
                                              ...Object.keys(row.options_by_answer || {}),
                                            ]),
                                          );
                                          return keys.length ? keys : ["United Kingdom", "United States"];
                                        })()
                                      ).map((parentAnswer) => {
                                        const children = (row.options_by_answer || {})[parentAnswer] || [];
                                        return (
                                          <div key={`${row.id}-${parentAnswer}`} className="rounded-[8px] border border-[#E5EAF0] bg-white p-2.5">
                                            <p className="text-[12px] font-semibold text-[#102A43]">When parent = {parentAnswer}</p>
                                            <textarea
                                              defaultValue={children.join(", ")}
                                              key={`${row.id}-${parentAnswer}-${children.join("|")}`}
                                              disabled={questionsSaving}
                                              rows={2}
                                              placeholder="England, Scotland, Wales…"
                                              onBlur={(e) => {
                                                const nextChildren = e.target.value
                                                  .split(/[,\n]/)
                                                  .map((item) => item.trim())
                                                  .filter(Boolean);
                                                const prevChildren = children;
                                                if (nextChildren.join("|") === prevChildren.join("|")) return;
                                                const nextMap = { ...(row.options_by_answer || {}) };
                                                if (nextChildren.length) nextMap[parentAnswer] = nextChildren;
                                                else delete nextMap[parentAnswer];
                                                void patchQuestion(row, {
                                                  depends_on_code: row.depends_on_code || "",
                                                  options_by_answer: nextMap,
                                                });
                                              }}
                                              className={fieldClass}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {row.question_type !== "text" ? (
                                <div>
                                  <label className={labelClass}>
                                    {row.question_type === "country" ? "Countries" : "Answer choices"}
                                  </label>
                                  {row.question_type === "country" ? (
                                    <p className="mb-2 text-[11px] leading-relaxed text-[#829AB1]">
                                      Add only countries users may pick. If you add a single country (e.g. India), the journey auto-locks it and only asks for state. States are loaded from the country API — do not enter states as choices here.
                                    </p>
                                  ) : null}
                                  <div className="space-y-2">
                                    {options.map((option, optionIndex) => (
                                      <div key={`${row.id}-${option}-${optionIndex}`} className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D9E1EA] bg-white text-[11px] font-semibold text-[#627D98]">
                                          {String.fromCharCode(65 + optionIndex)}
                                        </span>
                                        <input
                                          defaultValue={option}
                                          disabled={questionsSaving || row.question_type === "yes_no"}
                                          onBlur={(e) => {
                                            const next = e.target.value.trim();
                                            if (!next || next === option) return;
                                            const nextOptions = [...options];
                                            nextOptions[optionIndex] = next;
                                            void saveQuestionOptions(row, nextOptions);
                                          }}
                                          className={fieldClass}
                                        />
                                        {row.question_type !== "yes_no" ? (
                                          <button
                                            type="button"
                                            disabled={
                                              questionsSaving ||
                                              (row.question_type === "country"
                                                ? options.length <= 1
                                                : options.length <= 2)
                                            }
                                            onClick={() => {
                                              const nextOptions = options.filter((_, i) => i !== optionIndex);
                                              void saveQuestionOptions(row, nextOptions);
                                            }}
                                            className="rounded-[8px] border border-[#F2C7C3] p-2 text-[#B42318] hover:bg-[#FFF1F0] disabled:opacity-30"
                                            aria-label="Remove choice"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                  {row.question_type === "single" || row.question_type === "country" ? (
                                    <div className="mt-2 flex gap-2">
                                      <input
                                        value={optionDraftByKey[key] || ""}
                                        onChange={(e) =>
                                          setOptionDraftByKey((prev) => ({ ...prev, [key]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key !== "Enter") return;
                                          e.preventDefault();
                                          const value = String(optionDraftByKey[key] || "").trim();
                                          if (!value) return;
                                          void saveQuestionOptions(row, [...options, value]);
                                          setOptionDraftByKey((prev) => ({ ...prev, [key]: "" }));
                                        }}
                                        placeholder={
                                          row.question_type === "country"
                                            ? "Add another country"
                                            : "Add another choice"
                                        }
                                        className={fieldClass}
                                      />
                                      <button
                                        type="button"
                                        disabled={questionsSaving || !String(optionDraftByKey[key] || "").trim()}
                                        onClick={() => {
                                          const value = String(optionDraftByKey[key] || "").trim();
                                          if (!value) return;
                                          void saveQuestionOptions(row, [...options, value]);
                                          setOptionDraftByKey((prev) => ({ ...prev, [key]: "" }));
                                        }}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-[8px] bg-[#102A43] px-3 py-2 text-sm font-semibold text-white hover:bg-[#243B53] disabled:opacity-40"
                                      >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-[12px] text-[#829AB1]">
                                      Yes / No choices are fixed for this question type.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="rounded-[8px] border border-[#E5EAF0] bg-white px-3 py-2.5 text-[13px] text-[#627D98]">
                                  Free-text questions collect a typed answer — no choices needed.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
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
                        <option value="country">Country → State dropdown</option>
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
                  {newQuestionType === "country" ? (
                    <div className="space-y-2 rounded-[8px] border border-[#E5EAF0] bg-white p-2.5">
                      <p className="text-[12px] text-[#486581]">
                        Add the countries applicants can pick. States/regions load automatically — no cascading setup needed.
                      </p>
                      <label className={labelClass}>Countries</label>
                      <div className="flex flex-wrap gap-1.5">
                        {newQuestionOptions.map((option) => (
                          <span
                            key={option}
                            className="inline-flex items-center gap-1 rounded-full border border-[#D9E1EA] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#334E68]"
                          >
                            {option}
                            <button
                              type="button"
                              onClick={() =>
                                setNewQuestionOptions((prev) => prev.filter((item) => item !== option))
                              }
                              className="text-[#829AB1] hover:text-[#B42318]"
                              aria-label={`Remove ${option}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const next = newOptionInput.trim();
                            if (!next) return;
                            setNewQuestionOptions((prev) =>
                              prev.includes(next) ? prev : [...prev, next],
                            );
                            setNewOptionInput("");
                          }}
                          placeholder="Type a country and press Enter"
                          className={fieldClass}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = newOptionInput.trim();
                            if (!next) return;
                            setNewQuestionOptions((prev) =>
                              prev.includes(next) ? prev : [...prev, next],
                            );
                            setNewOptionInput("");
                          }}
                          className="shrink-0 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#486581]"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <p className="w-full text-[11px] text-[#829AB1]">
                          Add only the countries this service needs (e.g. just India). States load from the country API at runtime — do not list states here.
                        </p>
                        {DEFAULT_COUNTRY_OPTIONS.filter((c) => !newQuestionOptions.includes(c))
                          .slice(0, 6)
                          .map((country) => (
                          <button
                            key={country}
                            type="button"
                            onClick={() =>
                              setNewQuestionOptions((prev) =>
                                prev.includes(country) ? prev : [...prev, country],
                              )
                            }
                            className="rounded-full border border-dashed border-[#C5D0DC] px-2.5 py-1 text-[11px] font-semibold text-[#627D98] hover:border-[#009877] hover:text-[#006F57]"
                          >
                            + {country}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {newQuestionType === "single" ? (
                    <div className="space-y-2 rounded-[8px] border border-[#E5EAF0] bg-white p-2.5">
                      <div>
                        <label className={labelClass}>Depends on (optional cascading)</label>
                        <select
                          value={newDependsOnCode}
                          onChange={(e) => {
                            const parentCode = e.target.value;
                            setNewDependsOnCode(parentCode);
                            const parent = sortedQuestions.find((item) => item.code === parentCode);
                            const nextDraft: Record<string, string> = {};
                            for (const option of parent?.options || []) {
                              nextDraft[option] = newCascadeDraftByParent[option] || "";
                            }
                            setNewCascadeDraftByParent(nextDraft);
                          }}
                          className={fieldClass}
                        >
                          <option value="">None</option>
                          {sortedQuestions.map((item) => (
                            <option key={item.id} value={item.code}>
                              {item.label} ({item.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      {newDependsOnCode ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-[#627D98]">
                            Enter child options for each parent answer (comma-separated). Flat choices below are optional.
                          </p>
                          {Object.keys(newCascadeDraftByParent).length === 0 ? (
                            <p className="text-[12px] text-amber-700">
                              Parent question has no choices yet — add choices on the parent first.
                            </p>
                          ) : (
                            Object.keys(newCascadeDraftByParent).map((parentAnswer) => (
                              <div key={parentAnswer}>
                                <label className={labelClass}>When parent = {parentAnswer}</label>
                                <textarea
                                  value={newCascadeDraftByParent[parentAnswer] || ""}
                                  onChange={(e) =>
                                    setNewCascadeDraftByParent((prev) => ({
                                      ...prev,
                                      [parentAnswer]: e.target.value,
                                    }))
                                  }
                                  rows={2}
                                  placeholder="Option A, Option B, Option C"
                                  className={fieldClass}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {newQuestionType !== "text" && newQuestionType !== "country" ? (
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
                    disabled={questionsSaving}
                    onClick={() => void addQuestion()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#102A43] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243B53] disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Add question
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {section === "documents" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-heading font-semibold text-[#102A43]">
                    Documents ({sortedDocs.length})
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#829AB1]">
                    Compact list — click a row to edit description, file types, and tips.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDocForm((open) => !open)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#102A43] px-3 py-2 text-sm font-semibold text-white"
                >
                  {showAddDocForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showAddDocForm ? "Close" : "Add document"}
                </button>
              </div>

              {showAddDocForm ? (
                <div className="space-y-3 rounded-[10px] border border-dashed border-[#D9E1EA] bg-[#FBFCFD] p-3">
                  <p className="text-[12px] font-semibold text-[#334E68]">New checklist document</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[220px] flex-[2]">
                      <span className={labelClass}>Document name</span>
                      <input
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="e.g. Passport bio page"
                        className={fieldClass}
                      />
                    </label>
                    <label className="w-[120px]">
                      <span className={labelClass}>Max size (MB)</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={newDocMaxSizeMb}
                        onChange={(e) => setNewDocMaxSizeMb(e.target.value)}
                        placeholder="e.g. 5"
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
                      disabled={docsSaving}
                      onClick={() => void addDoc()}
                      className="inline-flex items-center gap-1 rounded-[8px] bg-[#009877] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Save document
                    </button>
                  </div>
                  <div>
                    <span className={labelClass}>Allowed file types</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {DOCUMENT_FILE_TYPE_OPTIONS.map((option) => {
                        const checked = newDocFileTypes.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                              checked
                                ? "border-[#009877]/40 bg-[#E8F7F2] text-[#006F57]"
                                : "border-[#E5EAF0] bg-white text-[#627D98]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleNewDocFileType(option.value)}
                              className="sr-only"
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className={labelClass}>Description</span>
                    <textarea
                      value={newDocDescription}
                      onChange={(e) => setNewDocDescription(e.target.value)}
                      rows={2}
                      placeholder="Short intro on the applicant upload page"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className={labelClass}>Must include</span>
                      <p className="mb-1 text-[11px] text-[#829AB1]">One tip per line</p>
                      <textarea
                        value={newDocMustInclude}
                        onChange={(e) => setNewDocMustInclude(e.target.value)}
                        rows={3}
                        placeholder="Use full, clear PDF or high-resolution image."
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <span className={labelClass}>Must not</span>
                      <p className="mb-1 text-[11px] text-[#829AB1]">One tip per line</p>
                      <textarea
                        value={newDocMustNot}
                        onChange={(e) => setNewDocMustNot(e.target.value)}
                        rows={3}
                        placeholder="Uploading partial pages or unreadable scans."
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[10px] border border-[#E5EAF0]">
                <table className="w-full text-[14px]">
                  <thead className="bg-[#F5F7FA] text-[#486581]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Document</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Specs</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Required</th>
                      <th className="px-3 py-2 text-left text-[12px] font-semibold">Active</th>
                      <th className="px-3 py-2 text-right text-[12px] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {docsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#627D98]">
                          Loading documents…
                        </td>
                      </tr>
                    ) : sortedDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#627D98]">
                          No documents yet — click Add document.
                        </td>
                      </tr>
                    ) : (
                      sortedDocs.map((row, index) => {
                        const rowTypes = normalizeAllowedFileTypes(row.allowed_file_types);
                        const sizeLabel = formatMaxSizeLabel(row.max_file_size_mb);
                        const expanded = expandedDocId === row.id;
                        const tipCount =
                          (String(row.sample || "").trim() ? 1 : 0) + (String(row.mistakes || "").trim() ? 1 : 0);
                        return (
                          <Fragment key={row.id}>
                            <tr className={expanded ? "bg-[#F8FCFF]" : "hover:bg-[#FBFCFD]"}>
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDocId(expanded ? null : row.id)}
                                  className="flex w-full items-start gap-2 text-left"
                                >
                                  <ChevronDown
                                    className={`mt-0.5 h-4 w-4 shrink-0 text-[#829AB1] transition ${
                                      expanded ? "rotate-180" : ""
                                    }`}
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-semibold text-[#102A43]">{row.name}</span>
                                    <span className="block text-[11px] text-[#8A9BB0]">{row.code}</span>
                                  </span>
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-[12px] text-[#486581]">
                                {formatFileTypesLabel(rowTypes)}
                                {sizeLabel ? ` · max ${sizeLabel}` : ""}
                                {tipCount ? ` · tips set` : ""}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  disabled={docsSaving}
                                  onClick={() => void patchDoc(row, { is_mandatory: !row.is_mandatory })}
                                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                                    row.is_mandatory
                                      ? "bg-[#009877]/12 text-[#006F57]"
                                      : "bg-[#F5F7FA] text-[#627D98]"
                                  }`}
                                >
                                  {row.is_mandatory ? "Yes" : "No"}
                                </button>
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  disabled={docsSaving}
                                  onClick={() => void patchDoc(row, { is_active: !row.is_active })}
                                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                                    row.is_active ? "bg-[#009877]/12 text-[#006F57]" : "bg-[#F5F7FA] text-[#627D98]"
                                  }`}
                                >
                                  {row.is_active ? "On" : "Off"}
                                </button>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={docsSaving || index === 0}
                                    onClick={() => void moveDoc(row, -1)}
                                    className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                                    aria-label="Move up"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={docsSaving || index === sortedDocs.length - 1}
                                    onClick={() => void moveDoc(row, 1)}
                                    className="rounded-[8px] border border-[#E5EAF0] p-1.5 disabled:opacity-30"
                                    aria-label="Move down"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={docsSaving}
                                    onClick={() => void removeDoc(row)}
                                    className="rounded-[8px] border border-[#F2C7C3] p-1.5 text-[#B42318]"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expanded ? (
                              <tr className="bg-[#F8FCFF]">
                                <td colSpan={5} className="px-3 pb-3 pt-0">
                                  <div className="ml-6 space-y-3 rounded-[10px] border border-[#D9E1EA] bg-white p-3">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                      <label>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#8A9BB0]">
                                          Document name
                                        </span>
                                        <input
                                          defaultValue={row.name}
                                          key={`${row.id}-${row.name}`}
                                          disabled={docsSaving}
                                          onBlur={(e) => {
                                            const next = e.target.value.trim();
                                            if (!next || next === row.name) return;
                                            void patchDoc(row, { name: next });
                                          }}
                                          className="mt-0.5 w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-[14px]"
                                        />
                                      </label>
                                      <label className="inline-flex items-end gap-1.5 text-[12px] text-[#486581]">
                                        Max MB
                                        <input
                                          type="number"
                                          min="0.1"
                                          step="0.1"
                                          defaultValue={row.max_file_size_mb ?? ""}
                                          key={`${row.id}-size-${row.max_file_size_mb ?? "none"}`}
                                          disabled={docsSaving}
                                          onBlur={(e) => {
                                            const raw = e.target.value.trim();
                                            const current =
                                              row.max_file_size_mb == null ? "" : String(row.max_file_size_mb);
                                            if (raw === current) return;
                                            if (!raw) {
                                              void patchDoc(row, { max_file_size_mb: null });
                                              return;
                                            }
                                            const parsed = Number(raw);
                                            if (!Number.isFinite(parsed) || parsed <= 0) {
                                              toast.error("Max size must be a positive number (MB).");
                                              e.target.value = current;
                                              return;
                                            }
                                            void patchDoc(row, { max_file_size_mb: parsed });
                                          }}
                                          className="w-[72px] rounded-[8px] border border-[#D9E1EA] px-2 py-1.5 text-[13px]"
                                          placeholder="—"
                                        />
                                      </label>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#8A9BB0]">
                                        Allowed file types
                                      </span>
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {DOCUMENT_FILE_TYPE_OPTIONS.map((option) => {
                                          const checked = rowTypes.includes(option.value);
                                          return (
                                            <button
                                              key={`${row.id}-${option.value}`}
                                              type="button"
                                              disabled={docsSaving}
                                              onClick={() => {
                                                const next = checked
                                                  ? rowTypes.filter((item) => item !== option.value)
                                                  : [...rowTypes, option.value];
                                                if (!next.length) {
                                                  toast.error("Keep at least one file type.");
                                                  return;
                                                }
                                                void patchDoc(row, { allowed_file_types: next });
                                              }}
                                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold disabled:opacity-60 ${
                                                checked
                                                  ? "bg-[#009877]/12 text-[#006F57]"
                                                  : "bg-[#F5F7FA] text-[#8A9BB0]"
                                              }`}
                                            >
                                              {option.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <label>
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#8A9BB0]">
                                        Description
                                      </span>
                                      <textarea
                                        defaultValue={row.description || ""}
                                        key={`${row.id}-desc-${row.description || ""}`}
                                        disabled={docsSaving}
                                        rows={2}
                                        onBlur={(e) => {
                                          const next = e.target.value.trim();
                                          if (next === (row.description || "").trim()) return;
                                          void patchDoc(row, { description: next });
                                        }}
                                        placeholder="Short intro shown to the applicant"
                                        className="mt-0.5 w-full rounded-[8px] border border-[#D9E1EA] px-2.5 py-2 text-[13px] text-[#334E68]"
                                      />
                                    </label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <label>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#006F57]">
                                          Must include
                                        </span>
                                        <textarea
                                          defaultValue={row.sample || ""}
                                          key={`${row.id}-sample-${row.sample || ""}`}
                                          disabled={docsSaving}
                                          rows={3}
                                          onBlur={(e) => {
                                            const next = e.target.value.trim();
                                            if (next === (row.sample || "").trim()) return;
                                            void patchDoc(row, { sample: next });
                                          }}
                                          placeholder="One tip per line"
                                          className="mt-0.5 w-full rounded-[8px] border border-[#B7EBD8] bg-[#F3FBF8] px-2.5 py-2 text-[13px] text-[#334E68]"
                                        />
                                      </label>
                                      <label>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#B42318]">
                                          Must not
                                        </span>
                                        <textarea
                                          defaultValue={row.mistakes || ""}
                                          key={`${row.id}-mistakes-${row.mistakes || ""}`}
                                          disabled={docsSaving}
                                          rows={3}
                                          onBlur={(e) => {
                                            const next = e.target.value.trim();
                                            if (next === (row.mistakes || "").trim()) return;
                                            void patchDoc(row, { mistakes: next });
                                          }}
                                          placeholder="One tip per line"
                                          className="mt-0.5 w-full rounded-[8px] border border-[#F2C7C3] bg-[#FFF8F7] px-2.5 py-2 text-[13px] text-[#334E68]"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {section === "reminders" ? (
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="space-y-3 xl:col-span-7">
                <div className="rounded-[10px] border border-[#D7E8E2] bg-[#F4FBF8] px-3.5 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#009877]/12 text-[#006F57]">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#102A43]">Customer reminders</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-[#627D98]">
                        Email goes this many days after the application is started. Each reminder sends once.
                        Placeholders: {"{reference_number}"}, {"{file_number}"}, {"{amount_due}"}, {"{sent_at}"}, {"{service_name}"}, {"{customer_name}"}.
                      </p>
                    </div>
                  </div>
                </div>

                {remindersLoading ? (
                  <p className="rounded-[10px] border border-[#E5EAF0] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#627D98]">
                    Loading reminders…
                  </p>
                ) : sortedReminders.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D9E1EA] bg-[#FBFCFD] px-4 py-8 text-center">
                    <Bell className="mx-auto h-5 w-5 text-[#9AA8BC]" />
                    <p className="mt-2 text-sm font-semibold text-[#334E68]">No reminders yet</p>
                    <p className="mt-0.5 text-[13px] text-[#627D98]">Add one from the panel on the right.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedReminders.map((row, index) => {
                      const key = String(row.id);
                      const expanded = expandedReminderKey === key;
                      return (
                        <div
                          key={row.id}
                          className={`overflow-hidden rounded-[10px] border bg-white transition ${
                            expanded ? "border-[#009877]/40 ring-1 ring-[#009877]/15" : "border-[#E5EAF0]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 px-3.5 py-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF7F4] text-[11px] font-bold text-[#006F57]">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setExpandedReminderKey(expanded ? null : key)}
                                className="w-full text-left"
                              >
                                <p className="text-[14px] font-semibold leading-snug text-[#102A43]">{row.title}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-[#F0F4F8] px-2 py-0.5 text-[11px] font-medium text-[#486581]">
                                    After {row.delay_days} day{row.delay_days === 1 ? "" : "s"}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      row.is_active ? "bg-[#E8F7F2] text-[#006F57]" : "bg-[#F5F7FA] text-[#829AB1]"
                                    }`}
                                  >
                                    {row.is_active ? "Active" : "Off"}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-[12px] text-[#829AB1]">{row.email_subject}</p>
                              </button>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                disabled={remindersSaving}
                                onClick={() => void removeReminder(row)}
                                className="rounded-[8px] border border-[#F2C7C3] p-1.5 text-[#B42318] hover:bg-[#FFF1F0]"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="space-y-3 border-t border-[#EEF2F6] bg-[#FBFCFD] px-3.5 py-3.5">
                              <div>
                                <label className={labelClass}>Title</label>
                                <input
                                  defaultValue={row.title}
                                  key={`${row.id}-title-${row.title}`}
                                  disabled={remindersSaving}
                                  onBlur={(e) => {
                                    const next = e.target.value.trim();
                                    if (!next || next === row.title) return;
                                    void patchReminder(row, { title: next });
                                  }}
                                  className={fieldClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Send after (days)</label>
                                <input
                                  type="number"
                                  min={1}
                                  defaultValue={row.delay_days}
                                  key={`${row.id}-days-${row.delay_days}`}
                                  disabled={remindersSaving}
                                  onBlur={(e) => {
                                    const next = Number.parseInt(e.target.value, 10);
                                    if (!Number.isFinite(next) || next < 1 || next === row.delay_days) return;
                                    void patchReminder(row, { delay_days: next });
                                  }}
                                  className={fieldClass}
                                />
                                <p className="mt-1 text-[11px] text-[#829AB1]">
                                  Email goes this many days after the application is started.
                                </p>
                              </div>
                              <div>
                                <label className={labelClass}>Email subject</label>
                                <input
                                  defaultValue={row.email_subject}
                                  key={`${row.id}-subject-${row.email_subject}`}
                                  disabled={remindersSaving}
                                  onBlur={(e) => {
                                    const next = e.target.value.trim();
                                    if (!next || next === row.email_subject) return;
                                    void patchReminder(row, { email_subject: next });
                                  }}
                                  className={fieldClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Email message</label>
                                <textarea
                                  defaultValue={row.email_body}
                                  key={`${row.id}-body-${row.email_body}`}
                                  disabled={remindersSaving}
                                  rows={5}
                                  onBlur={(e) => {
                                    const next = e.target.value.trim();
                                    if (!next || next === row.email_body.trim()) return;
                                    void patchReminder(row, { email_body: next });
                                  }}
                                  className={fieldClass}
                                />
                              </div>
                              <button
                                type="button"
                                disabled={remindersSaving}
                                onClick={() => void patchReminder(row, { is_active: !row.is_active })}
                                className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                                  row.is_active
                                    ? "border-[#009877]/30 bg-[#E8F7F2] text-[#006F57]"
                                    : "border-[#E5EAF0] bg-white text-[#627D98]"
                                }`}
                              >
                                {row.is_active ? "Active" : "Off"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-[10px] border border-[#D9E1EA] bg-[#FBFCFD] p-3.5 xl:col-span-5 xl:sticky xl:top-16 xl:self-start">
                <p className="mb-2.5 text-[15px] font-semibold text-[#102A43]">Add a reminder</p>
                <div className="space-y-2.5">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      placeholder="e.g. Upload nudge"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Send after (days)</label>
                    <input
                      type="number"
                      min={1}
                      value={newReminderDays}
                      onChange={(e) => setNewReminderDays(e.target.value)}
                      className={fieldClass}
                    />
                    <p className="mt-1 text-[11px] text-[#829AB1]">
                      Email goes this many days after the application is started.
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Email subject</label>
                    <input
                      value={newReminderSubject}
                      onChange={(e) => setNewReminderSubject(e.target.value)}
                      placeholder="What the customer sees in their inbox"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email message</label>
                    <textarea
                      value={newReminderBody}
                      onChange={(e) => setNewReminderBody(e.target.value)}
                      rows={5}
                      placeholder="Use {customer_name}, {service_name}, {reference_number}, {file_number}, {amount_due}, {sent_at}."
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={remindersSaving}
                    onClick={() => void addReminder()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#009877] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Add reminder
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {section === "country-pricing" ? (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-[#D7EFE8] bg-[#F3FBF8] px-4 py-3">
                <p className="text-sm font-semibold text-[#102A43]">
                  Default price (everyone): £{countryBaseFee || "—"}
                  {Number(countryBaseAuditFee) > 0 ? ` · assessment £${countryBaseAuditFee}` : ""}
                </p>
                <p className="mt-1 text-sm text-[#486581]">
                  Want a different price for one country? Add it below. Customers from that country see that price;
                  everyone else keeps the default.
                </p>
              </div>

              {countryPricingLoading ? (
                <p className="text-sm text-[#829AB1]">Loading…</p>
              ) : (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5EAF0]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[12px] font-semibold uppercase tracking-wide text-[#829AB1]">
                      <tr>
                        <th className="px-3 py-2">Country</th>
                        <th className="px-3 py-2">Price (£)</th>
                        <th className="px-3 py-2">Assessment (£)</th>
                        <th className="px-3 py-2">On</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {countryOfferings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-[#829AB1]">
                            No special country prices yet.
                          </td>
                        </tr>
                      ) : (
                        countryOfferings.map((row) => (
                          <tr key={row.id} className="border-t border-[#E5EAF0]">
                            <td className="px-3 py-2 font-semibold text-[#102A43]">{row.country_name}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={row.service_fee}
                                onChange={(e) =>
                                  setCountryOfferings((prev) =>
                                    prev.map((item) =>
                                      item.id === row.id ? { ...item, service_fee: e.target.value } : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Same as default"
                                value={row.audit_fee ?? ""}
                                onChange={(e) =>
                                  setCountryOfferings((prev) =>
                                    prev.map((item) =>
                                      item.id === row.id
                                        ? { ...item, audit_fee: e.target.value === "" ? null : e.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.is_active}
                                onChange={(e) =>
                                  setCountryOfferings((prev) =>
                                    prev.map((item) =>
                                      item.id === row.id ? { ...item, is_active: e.target.checked } : item,
                                    ),
                                  )
                                }
                                className="h-4 w-4 rounded border-[#D9E1EA]"
                                title="Turn this country price on or off"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={countryPricingSaving}
                                  onClick={() => void saveCountryOffering(row)}
                                  className="rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={countryPricingSaving}
                                  onClick={() => void removeCountryOffering(row)}
                                  className="rounded-[8px] border border-[#F2C7C3] px-2.5 py-1.5 text-xs font-semibold text-[#B42318] disabled:opacity-60"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-[10px] border border-[#E5EAF0] bg-white p-4">
                <p className="text-sm font-semibold text-[#102A43]">Add a country price</p>
                <p className="mt-1 text-xs text-[#829AB1]">
                  Pick a country from the list, or type a new country name.
                </p>

                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Pick country</span>
                      <select
                        value={countryMode === "existing" ? newCountryId : "__new__"}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__new__") {
                            setCountryMode("new");
                            setNewCountryId("");
                          } else {
                            setCountryMode("existing");
                            setNewCountryId(value);
                            setNewCountryName("");
                          }
                        }}
                        className={fieldClass}
                      >
                        <option value="">Choose…</option>
                        {availableHubCountries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name}
                          </option>
                        ))}
                        <option value="__new__">+ New country…</option>
                      </select>
                    </label>

                    {countryMode === "new" ? (
                      <label className="block">
                        <span className={labelClass}>Country name</span>
                        <input
                          type="text"
                          value={newCountryName}
                          onChange={(e) => setNewCountryName(e.target.value)}
                          placeholder="e.g. United Arab Emirates"
                          className={fieldClass}
                        />
                      </label>
                    ) : (
                      <div className="hidden md:block" />
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Price for this country (£)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newCountryServiceFee}
                        onChange={(e) => setNewCountryServiceFee(e.target.value)}
                        placeholder={countryBaseFee || "0"}
                        className={fieldClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Assessment fee (£) — optional</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Leave blank = use default"
                        value={newCountryAuditFee}
                        onChange={(e) => setNewCountryAuditFee(e.target.value)}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={countryPricingSaving}
                  onClick={() => void addCountryPricing()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-3 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Save country price
                </button>
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
          <div className="flex flex-wrap items-center gap-2">
            {sectionIndex > 0 ? (
              <button
                type="button"
                onClick={() => setSection(sectionOrder[sectionIndex - 1])}
                className="rounded-[8px] border border-[#D9E1EA] bg-white px-4 py-2 text-sm font-semibold text-[#102A43]"
              >
                Back
              </button>
            ) : null}
            {sectionIndex < sectionOrder.length - 1 ? (
              <button
                type="button"
                onClick={() => setSection(sectionOrder[sectionIndex + 1])}
                className="rounded-[8px] border border-[#009877]/30 bg-[#E8F7F2] px-4 py-2 text-sm font-semibold text-[#006F57]"
              >
                Continue
              </button>
            ) : null}
            {section === "details" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDetails()}
                className="rounded-[8px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            ) : (
              <span className="text-xs text-[#829AB1]">Changes save instantly.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
