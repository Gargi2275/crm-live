export type StoredDocumentState = {
  status: "not_uploaded" | "uploaded" | "pending_reupload";
  fileName?: string;
  documentId?: number;
  fileUrl?: string;
  previewUrl?: string;
};

export type ChecklistItemRef = {
  id: string;
  title: string;
};

export type AuditChecklistBackendItem = {
  id?: number | string;
  checklist_item_id?: number | string;
  item_id?: number | string;
  doc_id?: string;
  document_type?: string;
  document_name?: string;
  title?: string;
  status?: string;
  verification_status?: string;
  uploaded_file_name?: string;
  file_path?: string;
};

type BackendDocumentRecord = {
  id?: number;
  document_type?: string;
  document_name?: string;
  original_filename?: string;
  file_path?: string;
};

const CHECKLIST_KEY_ALIASES: Record<string, string> = {
  photograph: "photo",
  photo: "photo",
  passport_photo: "photo",
  passportphoto: "photo",
  passport_bio_page: "passport",
  passport_bio: "passport",
  passport: "passport",
  proof_of_address: "address",
  address_proof: "address",
  birth_certificate: "proof_origin",
  proof_origin: "proof_origin",
};

const BACKEND_TYPE_TO_CHECKLIST_IDS: Record<string, string[]> = {
  passport: [
    "passport",
    "identity_proof",
    "passport_generic",
    "updated_passport",
    "identity-proof",
    "passport-generic",
    "updated-passport",
    "current_passport_all_pages",
    "current-passport-all-pages",
    "new_passport",
    "new-passport",
    "current_passport",
    "current-passport",
    "updated_passport",
    "updated-passport",
    "minor_parents_passports",
    "minor-parents-passports",
  ],
  proof_of_address: [
    "address_proof",
    "address",
    "address_generic",
    "proof_of_address",
    "address-proof",
    "address-generic",
    "address_update",
    "address-update",
    "minor_parents_address_proof",
    "minor-parents-address-proof",
  ],
  photograph: [
    "photo",
    "photo_generic",
    "photo_renewal",
    "photo-generic",
    "photo-renewal",
    "recent_photo_35x45",
    "recent-photo-35x45",
    "update_photo",
    "update-photo",
  ],
  old_oci: ["old_oci", "oci_card", "old-oci", "oci-card"],
  birth_certificate: ["proof_origin", "proof-origin", "birth_proof", "birth-proof", "minor_birth_certificate", "minor-birth-certificate"],
  signature: ["signature"],
  other: ["document_copy", "any_existing_id", "document-copy", "any-existing-id"],
  apostille: ["document_copy", "document-copy"],
};

export function looksLikeUploadedFileName(value: string | null | undefined): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return /\.(pdf|jpe?g|png|gif|webp|heic|docx?|tiff?)$/i.test(raw);
}

export function resolveChecklistDisplayTitle(
  backendItem: AuditChecklistBackendItem,
  existingTitle?: string,
): string {
  const preserved = String(existingTitle || "").trim();
  if (preserved) return preserved;

  const explicitTitle = String(backendItem.title || "").trim();
  if (explicitTitle && !looksLikeUploadedFileName(explicitTitle)) {
    return explicitTitle;
  }

  const documentName = String(backendItem.document_name || "").trim();
  if (documentName && !looksLikeUploadedFileName(documentName)) {
    return documentName;
  }

  const documentType = String(backendItem.document_type || "").trim();
  if (documentType) {
    return documentType
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return "Document";
}

export function findChecklistItemForBackendAuditItem(
  backendItem: AuditChecklistBackendItem,
  checklist: ChecklistItemRef[],
): ChecklistItemRef | null {
  const backendId = String(backendItem.id ?? backendItem.checklist_item_id ?? backendItem.item_id ?? "").trim();
  if (backendId && !/^\d+$/.test(backendId)) {
    const direct = checklist.find((item) => String(item.id) === backendId);
    if (direct) return direct;
  }

  const docType = normalizeChecklistDocKey(backendItem.document_type || "");
  if (docType) {
    for (const item of checklist) {
      const itemKey = normalizeChecklistDocKey(item.id);
      if (checklistKeysMatch(itemKey, docType)) {
        return item;
      }
    }

    const candidates = BACKEND_TYPE_TO_CHECKLIST_IDS[backendItem.document_type || ""] || [];
    for (const candidate of candidates) {
      const match = checklist.find((item) => checklistKeysMatch(item.id, candidate));
      if (match) return match;
    }
  }

  const backendName = String(backendItem.document_name || backendItem.title || "")
    .trim()
    .toLowerCase();
  if (backendName && !looksLikeUploadedFileName(backendName)) {
    for (const item of checklist) {
      const itemTitle = item.title.trim().toLowerCase();
      if (itemTitle && (backendName.includes(itemTitle) || itemTitle.includes(backendName))) {
        return item;
      }
    }
  }

  return null;
}

export function resolveBackendChecklistItemId(
  backendItem: AuditChecklistBackendItem,
  fallbackDocumentType?: string,
): string {
  const rawId = backendItem.id ?? backendItem.checklist_item_id ?? backendItem.item_id;
  if (rawId !== undefined && rawId !== null && String(rawId).trim()) {
    return String(rawId);
  }

  const documentType = String(backendItem.document_type || fallbackDocumentType || "").trim();
  if (documentType) {
    return `required-${documentType}`;
  }

  return "";
}

export function buildChecklistUploadIdMap(
  checklist: ChecklistItemRef[],
  backendItems: AuditChecklistBackendItem[],
): Record<string, string | number> {
  const nextMap: Record<string, string | number> = {};
  const usedChecklistIds = new Set<string>();

  for (const backendItem of backendItems) {
    const match = findChecklistItemForBackendAuditItem(backendItem, checklist);
    if (!match || usedChecklistIds.has(match.id)) continue;
    usedChecklistIds.add(match.id);
    nextMap[match.id] = resolveBackendChecklistItemId(backendItem);
  }

  for (const item of checklist) {
    if (nextMap[item.id]) continue;
    const normalizedId = normalizeChecklistDocKey(item.id);
    const inferredType = Object.entries(BACKEND_TYPE_TO_CHECKLIST_IDS).find(([, candidates]) =>
      candidates.some((candidate) => checklistKeysMatch(candidate, item.id) || checklistKeysMatch(candidate, normalizedId)),
    )?.[0];
    nextMap[item.id] = inferredType ? `required-${inferredType}` : item.id;
  }

  return nextMap;
}

export function documentsFromAuditChecklistItems(
  backendItems: AuditChecklistBackendItem[],
  checklist: ChecklistItemRef[],
): Record<string, StoredDocumentState> {
  const next: Record<string, StoredDocumentState> = {};
  const usedChecklistIds = new Set<string>();

  for (const backendItem of backendItems) {
    const match = findChecklistItemForBackendAuditItem(backendItem, checklist);
    if (!match || usedChecklistIds.has(match.id)) continue;

    const status = String(backendItem.status || backendItem.verification_status || "").trim().toLowerCase();
    const uploadedFileName = String(backendItem.uploaded_file_name || "").trim();
    const fileUrl = String(backendItem.file_path || "").trim();
    const isUploaded =
      Boolean(uploadedFileName || fileUrl) ||
      (status !== "" && status !== "not_uploaded");

    if (!isUploaded) continue;

    usedChecklistIds.add(match.id);
    const documentId = Number(backendItem.id);
    next[match.id] = {
      status: "uploaded",
      fileName: uploadedFileName || undefined,
      fileUrl: fileUrl || undefined,
      documentId: Number.isFinite(documentId) && documentId > 0 ? documentId : undefined,
    };
  }

  return next;
}

export function normalizeChecklistDocKey(value: string | number | null | undefined): string {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return CHECKLIST_KEY_ALIASES[raw] || raw;
}

function checklistKeysMatch(left: string, right: string): boolean {
  const a = normalizeChecklistDocKey(left);
  const b = normalizeChecklistDocKey(right);
  return a === b || a.includes(b) || b.includes(a);
}

export function inferBackendDocumentTypeFromChecklistId(checklistId: string): string {
  const raw = String(checklistId || "").trim();
  if (!raw) return "";

  const withoutRequiredPrefix = raw.startsWith("required-") ? raw.slice("required-".length) : raw;
  const normalizedId = normalizeChecklistDocKey(withoutRequiredPrefix);

  for (const [backendType, candidates] of Object.entries(BACKEND_TYPE_TO_CHECKLIST_IDS)) {
    if (candidates.some((candidate) => checklistKeysMatch(candidate, withoutRequiredPrefix) || checklistKeysMatch(candidate, normalizedId))) {
      return backendType;
    }
  }

  if (Object.prototype.hasOwnProperty.call(BACKEND_TYPE_TO_CHECKLIST_IDS, withoutRequiredPrefix)) {
    return withoutRequiredPrefix;
  }

  return "";
}

export function sanitizeChecklistTitles(checklist: ChecklistItemRef[]): ChecklistItemRef[] {
  return checklist.filter((item) => !looksLikeUploadedFileName(item.title));
}

export function mapBackendDocumentToChecklistId(
  backendDoc: BackendDocumentRecord,
  checklist: ChecklistItemRef[],
): string | null {
  const docType = normalizeChecklistDocKey(backendDoc.document_type || "");
  const docName = String(backendDoc.document_name || backendDoc.original_filename || "")
    .trim()
    .toLowerCase();

  for (const item of checklist) {
    const itemKey = normalizeChecklistDocKey(item.id);
    if (docType && checklistKeysMatch(itemKey, docType)) {
      return item.id;
    }
    const itemTitle = item.title.trim().toLowerCase();
    if (docName && !looksLikeUploadedFileName(docName) && itemTitle && (docName.includes(itemTitle) || itemTitle.includes(docName))) {
      return item.id;
    }
  }

  const candidates = BACKEND_TYPE_TO_CHECKLIST_IDS[backendDoc.document_type || ""] || [];
  for (const candidate of candidates) {
    const match = checklist.find((item) => checklistKeysMatch(item.id, candidate));
    if (match) return match.id;
  }

  return null;
}

export function mergeHydratedDocuments(
  current: Record<string, StoredDocumentState>,
  backendDocs: BackendDocumentRecord[],
  checklist: ChecklistItemRef[],
): Record<string, StoredDocumentState> {
  const next = { ...current };

  for (const doc of backendDocs) {
    const checklistId = mapBackendDocumentToChecklistId(doc, checklist);
    if (!checklistId) continue;

    const fileName = String(doc.original_filename || "").trim() || (
      looksLikeUploadedFileName(doc.document_name) ? "" : String(doc.document_name || "").trim()
    );
    const fileUrl = String(doc.file_path || "").trim();
    if (!fileName && !fileUrl) continue;

    next[checklistId] = {
      status: "uploaded",
      fileName: fileName || next[checklistId]?.fileName,
      documentId: doc.id,
      fileUrl: fileUrl || next[checklistId]?.fileUrl,
      previewUrl: next[checklistId]?.previewUrl,
    };
  }

  return next;
}
