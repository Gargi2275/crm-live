/**
 * Document requirement catalog — public fetch + upload spec helpers.
 * Source: GET /api/public/services/<service_type>/document-requirements/
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

export const DEFAULT_ALLOWED_FILE_TYPES = ["pdf", "jpg", "png"] as const;

export const DOCUMENT_FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "jpg", label: "JPG / JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WEBP" },
  { value: "heic", label: "HEIC" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
] as const;

const EXT_TO_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export type DocumentRequirementRow = {
  id: number;
  service_id: number;
  code: string;
  name: string;
  description: string;
  mistakes?: string;
  sample?: string;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  allowed_file_types?: string[];
  max_file_size_mb?: number | null;
  show_when_question_code?: string;
  show_when_value?: string;
};

export type ChecklistDocumentItem = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  mistakes: string;
  sample: string;
  sampleUrl?: string | null;
  commonMistakes?: string[];
  mustHave?: string[];
  mustNot?: string[];
  specialRequirement?: "apostille" | "bilingual" | "affidavit" | null;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number | null;
};

/** UI service ids used by DocumentAuditJourney → backend service_type */
export function toBackendServiceType(serviceId: string | null | undefined): string | null {
  if (!serviceId) return null;
  const key = serviceId.trim().toLowerCase();
  const map: Record<string, string> = {
    "new-oci": "new_oci",
    "oci-renewal": "oci_renewal",
    "oci-update": "oci_update",
    "passport-renewal": "passport_renewal",
    apostille: "apostille",
    undecided: "document_audit",
    document_audit: "document_audit",
    new_oci: "new_oci",
    oci_renewal: "oci_renewal",
    oci_update: "oci_update",
    passport_renewal: "passport_renewal",
    evisa_1year: "evisa_1year",
    evisa_5year: "evisa_5year",
  };
  return map[key] || key.replace(/-/g, "_");
}

export function normalizeAllowedFileTypes(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_ALLOWED_FILE_TYPES];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    let ext = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^\./, "");
    if (!ext) continue;
    if (ext === "jpeg") ext = "jpg";
    if (!seen.has(ext)) {
      seen.add(ext);
      result.push(ext);
    }
  }
  return result.length ? result : [...DEFAULT_ALLOWED_FILE_TYPES];
}

export function fileAcceptFromTypes(types: string[] | undefined | null): string {
  const normalized = normalizeAllowedFileTypes(types);
  const parts: string[] = [];
  for (const ext of normalized) {
    parts.push(`.${ext}`);
    if (ext === "jpg") parts.push(".jpeg");
    for (const mime of EXT_TO_MIME[ext] || []) {
      parts.push(mime);
    }
  }
  return Array.from(new Set(parts)).join(",");
}

export function formatFileTypesLabel(types: string[] | undefined | null): string {
  const normalized = normalizeAllowedFileTypes(types);
  return normalized.map((ext) => ext.toUpperCase()).join(", ");
}

export function formatMaxSizeLabel(maxMb: number | null | undefined): string | null {
  if (maxMb == null || !Number.isFinite(Number(maxMb)) || Number(maxMb) <= 0) {
    return null;
  }
  const value = Number(maxMb);
  return Number.isInteger(value) ? `${value} MB` : `${value} MB`;
}

export function buildUploadSpecHint(
  types: string[] | undefined | null,
  maxMb: number | null | undefined,
): string {
  const typeLabel = formatFileTypesLabel(types);
  const sizeLabel = formatMaxSizeLabel(maxMb);
  return sizeLabel ? `${typeLabel} · max ${sizeLabel}` : typeLabel;
}

export function validateDocumentFile(
  file: File,
  options?: {
    allowedFileTypes?: string[] | null;
    maxFileSizeMb?: number | null;
  },
): string | null {
  const allowed = normalizeAllowedFileTypes(options?.allowedFileTypes);
  const name = String(file.name || "");
  const dot = name.lastIndexOf(".");
  let ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (ext === "jpeg") ext = "jpg";

  const mime = String(file.type || "").toLowerCase();
  const mimeOk = allowed.some((type) => (EXT_TO_MIME[type] || []).includes(mime));
  const extOk = Boolean(ext) && allowed.includes(ext);

  if (!extOk && !mimeOk) {
    return `Invalid file type. Allowed: ${formatFileTypesLabel(allowed)}.`;
  }

  const maxMb = options?.maxFileSizeMb;
  if (maxMb != null && Number.isFinite(Number(maxMb)) && Number(maxMb) > 0) {
    const maxBytes = Number(maxMb) * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(2);
      return `File is too large (${sizeMb} MB). Maximum allowed is ${formatMaxSizeLabel(Number(maxMb))}.`;
    }
  }

  return null;
}

export function splitGuidanceLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return String(text)
    .split(/\r?\n|•|;/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function mapRequirementToChecklistItem(row: DocumentRequirementRow): ChecklistDocumentItem {
  const allowedFileTypes = normalizeAllowedFileTypes(row.allowed_file_types);
  const maxFileSizeMb =
    row.max_file_size_mb != null && Number.isFinite(Number(row.max_file_size_mb))
      ? Number(row.max_file_size_mb)
      : null;
  const specHint = buildUploadSpecHint(allowedFileTypes, maxFileSizeMb);
  const description = row.description?.trim()
    ? row.description
    : `Accepted formats: ${specHint}.`;
  const mustHave = splitGuidanceLines(row.sample);
  const mustNot = splitGuidanceLines(row.mistakes);

  return {
    id: row.code,
    title: row.name,
    description,
    required: Boolean(row.is_mandatory),
    mistakes: row.mistakes || "",
    sample: row.sample || "",
    sampleUrl: null,
    commonMistakes: mustNot,
    mustHave,
    mustNot,
    specialRequirement: null,
    allowedFileTypes,
    maxFileSizeMb,
  };
}

const cache = new Map<string, { rows: DocumentRequirementRow[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function fetchDocumentRequirements(
  serviceType: string,
  options?: { force?: boolean },
): Promise<DocumentRequirementRow[]> {
  const key = toBackendServiceType(serviceType) || serviceType;
  const cached = cache.get(key);
  if (!options?.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.PUBLIC.DOCUMENT_REQUIREMENTS.replace(":service_type", encodeURIComponent(key))}`,
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
    const data = (json?.data || {}) as {
      requirements?: DocumentRequirementRow[];
    };
    const rows = Array.isArray(data.requirements) ? data.requirements : [];
    cache.set(key, { rows, fetchedAt: Date.now() });
    return rows;
  } catch (error) {
    console.warn("[document-requirements] Failed to load catalog for", key, error);
    return cached?.rows || [];
  }
}

export function clearDocumentRequirementsCache() {
  cache.clear();
}
