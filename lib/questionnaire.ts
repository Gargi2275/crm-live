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
  depends_on_code?: string;
  options_by_answer?: Record<string, string[]>;
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
  depends_on_code?: string;
  options_by_answer?: Record<string, string[]>;
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
  const optionsByAnswer =
    row.options_by_answer && typeof row.options_by_answer === "object" && !Array.isArray(row.options_by_answer)
      ? Object.fromEntries(
          Object.entries(row.options_by_answer).map(([key, value]) => [
            String(key),
            Array.isArray(value) ? value.map((item) => String(item)) : [],
          ]),
        )
      : undefined;
  return {
    id: row.code,
    label: row.label,
    options,
    question_type: row.question_type,
    help_text: row.help_text || "",
    is_required: row.is_required,
    depends_on_code: (row.depends_on_code || "").trim() || undefined,
    options_by_answer: optionsByAnswer,
  };
}

/** Hide cascading questions until their parent has an answer. */
export function isQuestionVisible(
  question: Pick<JourneyQuestion, "depends_on_code">,
  answers: Record<string, string>,
): boolean {
  const parent = String(question.depends_on_code || "").trim();
  if (!parent) return true;
  return Boolean(String(answers[parent] || "").trim());
}

/** Resolve flat options, cascading map, or yes/no defaults for the current answers. */
export function resolveQuestionOptions(
  question: Pick<JourneyQuestion, "options" | "question_type" | "depends_on_code" | "options_by_answer">,
  answers: Record<string, string>,
): string[] {
  const map = question.options_by_answer;
  const parentCode = String(question.depends_on_code || "").trim();
  if (map && parentCode) {
    const parentAnswer = String(answers[parentCode] || "").trim();
    const fromMap = parentAnswer ? map[parentAnswer] : undefined;
    if (Array.isArray(fromMap) && fromMap.length) {
      return fromMap.map((item) => String(item));
    }
    // Soft match (case/spacing) for admin typos.
    if (parentAnswer) {
      const hit = Object.entries(map).find(
        ([key]) => key.trim().toLowerCase() === parentAnswer.toLowerCase(),
      );
      if (hit && Array.isArray(hit[1]) && hit[1].length) {
        return hit[1].map((item) => String(item));
      }
    }
    return [];
  }
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.map((item) => String(item));
  }
  if (question.question_type === "yes_no") return ["Yes", "No"];
  return [];
}

export function clearDependentAnswers(
  questions: Array<Pick<JourneyQuestion, "id" | "depends_on_code">>,
  changedCode: string,
  answers: Record<string, string>,
): Record<string, string> {
  const next = { ...answers };
  const queue = [changedCode];
  const cleared = new Set<string>();
  while (queue.length) {
    const parent = queue.shift()!;
    for (const question of questions) {
      if (String(question.depends_on_code || "").trim() !== parent) continue;
      if (cleared.has(question.id)) continue;
      next[question.id] = "";
      cleared.add(question.id);
      queue.push(question.id);
    }
  }
  return next;
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
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const requirements = Array.isArray(data.requirements) ? data.requirements : [];
    const checklist = requirements.map(mapRequirementToChecklistItem);
    return { questions, requirements, checklist };
  } catch (error) {
    console.warn("[questionnaire] Failed to resolve checklist for", key, error);
    return { questions: [], requirements: [], checklist: [] };
  }
}

export function clearQuestionnaireCache() {
  questionCache.clear();
}
