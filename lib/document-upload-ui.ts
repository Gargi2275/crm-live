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
  passport: ["passport", "identity_proof", "passport_generic", "updated_passport", "identity-proof", "passport-generic", "updated-passport"],
  proof_of_address: ["address_proof", "address", "address_generic", "proof_of_address", "address-proof", "address-generic"],
  photograph: ["photo", "photo_generic", "photo_renewal", "photo-generic", "photo-renewal"],
  old_oci: ["old_oci", "oci_card", "old-oci", "oci-card"],
  signature: ["signature"],
  other: ["document_copy", "any_existing_id", "document-copy", "any-existing-id"],
  apostille: ["document_copy", "document-copy"],
};

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
    if (docName && itemTitle && (docName.includes(itemTitle) || itemTitle.includes(docName))) {
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

    const fileName = String(doc.original_filename || doc.document_name || "").trim();
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
