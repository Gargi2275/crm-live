/**
 * Service-wise smart questionnaire — public fetch + resolve checklist.
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import {
  mapRequirementToChecklistItem,
  toBackendServiceType,
  type ChecklistDocumentItem,
  type DocumentRequirementRow,
} from "@/lib/document-requirements";

export type ServiceQuestionRow = {
  id: number;
  service_id: number;
  code: string;
  label: string;
  question_type: "single" | "yes_no" | "text" | string;
  options: string[];
  help_text?: string;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
};

export type JourneyQuestion = {
  id: string;
  label: string;
  options: string[];
  question_type?: string;
  help_text?: string;
  is_required?: boolean;
};

const questionCache = new Map<string, { rows: ServiceQuestionRow[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

export function mapQuestionToJourneyItem(row: ServiceQuestionRow): JourneyQuestion {
  const options =
    Array.isArray(row.options) && row.options.length
      ? row.options.map((item) => String(item))
      : row.question_type === "yes_no"
        ? ["Yes", "No"]
        : [];
  return {
    id: row.code,
    label: row.label,
    options,
    question_type: row.question_type,
    help_text: row.help_text || "",
    is_required: row.is_required,
  };
}

export function requirementMatchesAnswers(
  row: DocumentRequirementRow,
  answers: Record<string, string>,
): boolean {
  const qcode = String(row.show_when_question_code || "").trim();
  if (!qcode) return true;
  const value = String(answers[qcode] ?? "").trim();
  const expected = String(row.show_when_value || "").trim();
  if (!expected) return Boolean(value);
  return value === expected;
}

export async function fetchServiceQuestions(
  serviceType: string,
  options?: { force?: boolean },
): Promise<ServiceQuestionRow[]> {
  const key = toBackendServiceType(serviceType) || serviceType;
  const cached = questionCache.get(key);
  if (!options?.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.PUBLIC.SERVICE_QUESTIONS.replace(":service_type", encodeURIComponent(key))}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    const data = (json?.data || {}) as { questions?: ServiceQuestionRow[] };
    const rows = Array.isArray(data.questions) ? data.questions : [];
    questionCache.set(key, { rows, fetchedAt: Date.now() });
    return rows;
  } catch (error) {
    console.warn("[questionnaire] Failed to load questions for", key, error);
    return cached?.rows || [];
  }
}

export async function resolveServiceChecklist(
  serviceType: string,
  answers: Record<string, string>,
): Promise<{
  questions: ServiceQuestionRow[];
  requirements: DocumentRequirementRow[];
  checklist: ChecklistDocumentItem[];
}> {
  const key = toBackendServiceType(serviceType) || serviceType;
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.PUBLIC.RESOLVE_CHECKLIST.replace(":service_type", encodeURIComponent(key))}`,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ answers }),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    const data = (json?.data || {}) as {
      questions?: ServiceQuestionRow[];
      requirements?: DocumentRequirementRow[];
    };
    const requirements = Array.isArray(data.requirements) ? data.requirements : [];
    const questions = Array.isArray(data.questions) ? data.questions : [];
    return {
      questions,
      requirements,
      checklist: requirements.map(mapRequirementToChecklistItem),
    };
  } catch (error) {
    console.warn("[questionnaire] resolve-checklist failed for", key, error);
    return { questions: [], requirements: [], checklist: [] };
  }
}

export function clearQuestionnaireCache() {
  questionCache.clear();
}
