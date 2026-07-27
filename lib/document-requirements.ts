/**
 * Document requirement catalog — public fetch + hardcoded fallback.
 * Source: GET /api/public/services/<service_type>/document-requirements/
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

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
  specialRequirement?: "apostille" | "bilingual" | "affidavit" | null;
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

export function mapRequirementToChecklistItem(row: DocumentRequirementRow): ChecklistDocumentItem {
  return {
    id: row.code,
    title: row.name,
    description: row.description || "",
    required: Boolean(row.is_mandatory),
    mistakes: row.mistakes || "",
    sample: row.sample || "",
    sampleUrl: null,
    commonMistakes: row.mistakes ? [row.mistakes] : [],
    specialRequirement: null,
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
