/**
 * Public pricing catalog — fetch + in-memory session cache (60s TTL).
 * Source: GET /api/public/pricing/
 *
 * API fields: id, service_name, description, base_fee, government_fee, total_fee,
 * audit_fee, service_type, category, processing_time_days, is_active, timestamps.
 *
 * UI still derives: href, CTA, audit-credit eligibility, marketing detail notes.
 * Docs catalog is P2 (not in API yet).
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

export type ServiceTypeCode =
  | "new_oci"
  | "oci_renewal"
  | "oci_update"
  | "apostille"
  | "evisa_1year"
  | "evisa_5year"
  | "passport_renewal"
  | "document_audit"
  | string;

export type PricingCategoryId = string;

export type PublicPricingService = {
  id: number;
  service_name: string;
  description: string;
  base_fee: string | number;
  government_fee: string | number;
  total_fee: string | number;
  audit_fee?: string | number;
  service_type: ServiceTypeCode;
  category?: PricingCategoryId | string;
  category_name?: string;
  category_display_order?: number;
  plans?: Array<{
    id?: number;
    plan_code: string;
    label: string;
    fee: string | number;
    is_default?: boolean;
    is_active?: boolean;
    display_order?: number;
  }>;
  processing_time_days: number | null;
  is_active: boolean;
  show_on_homepage?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CatalogService = {
  id: number | string;
  serviceType: ServiceTypeCode;
  name: string;
  description: string;
  baseFee: number;
  governmentFee: number;
  totalFee: number;
  auditFee: number;
  plans: Array<{ planCode: string; label: string; fee: number; isDefault: boolean }>;
  processingDays: number | null;
  category: PricingCategoryId;
  categoryName: string;
  categoryDisplayOrder: number;
  href: string;
  cta: string;
  auditCreditEligible: boolean;
  isQuoteBased: boolean;
  isPopular: boolean;
  showOnHomepage: boolean;
  /** Marketing highlights kept for View details (API has no required-docs yet). */
  detailNotes: string[];
};

export type PricingCategory = {
  id: PricingCategoryId | "all";
  label: string;
};

const CACHE_TTL_MS = 60_000;

let cache: CatalogService[] | null = null;
let cacheFromFallback = false;
let cacheFetchedAt = 0;
let inflight: Promise<{ services: CatalogService[]; fromFallback: boolean }> | null = null;

const CATEGORY_LABELS: Record<string, string> = {
  oci: "OCI",
  evisa: "Indian Visa",
  passport: "Indian Passport",
  apostille: "Apostille",
  audit: "Assessment",
  other: "Others",
  pan_card: "PAN CARD SERVICE",
  uncategorized: "PAN CARD SERVICE",
};

const DISPLAY_ORDER: ServiceTypeCode[] = [
  "document_audit",
  "new_oci",
  "oci_renewal",
  "oci_update",
  "evisa_1year",
  "evisa_5year",
  "passport_renewal",
  "apostille",
];

/** Last-known hardcoded catalog — used only when API fails or returns empty. */
export const FALLBACK_PRICING_SERVICES: PublicPricingService[] = [
  {
    id: -1,
    service_name: "Document Assessment",
    description: "Expert pre-check credited against eligible OCI services",
    base_fee: "15.00",
    government_fee: "0.00",
    total_fee: "15.00",
    audit_fee: "15.00",
    service_type: "document_audit",
    processing_time_days: 1,
    is_active: true,
  },
  {
    id: -2,
    service_name: "New OCI Card",
    description: "Most selected by first-time applicants",
    base_fee: "88.00",
    government_fee: "0.00",
    total_fee: "88.00",
    service_type: "new_oci",
    processing_time_days: 30,
    is_active: true,
  },
  {
    id: -3,
    service_name: "OCI Renewal / Transfer",
    description: "Transfer OCI to a new passport",
    base_fee: "78.00",
    government_fee: "0.00",
    total_fee: "78.00",
    service_type: "oci_renewal",
    processing_time_days: 21,
    is_active: true,
  },
  {
    id: -4,
    service_name: "OCI Update (Gratis)",
    description: "Mandatory portal updates",
    base_fee: "50.00",
    government_fee: "0.00",
    total_fee: "50.00",
    service_type: "oci_update",
    processing_time_days: 14,
    is_active: true,
  },
  {
    id: -5,
    service_name: "e-Visa 1 Year",
    description: "Includes government fee guidance",
    base_fee: "56.00",
    government_fee: "32.00",
    total_fee: "88.00",
    service_type: "evisa_1year",
    processing_time_days: null,
    is_active: true,
  },
  {
    id: -6,
    service_name: "e-Visa 5 Year",
    description: "Longer validity for frequent travel",
    base_fee: "80.00",
    government_fee: "70.00",
    total_fee: "150.00",
    service_type: "evisa_5year",
    processing_time_days: null,
    is_active: true,
  },
  {
    id: -7,
    service_name: "Indian Passport Renewal",
    description: "Fixed service fee — category & courier options at checkout",
    base_fee: "85.00",
    government_fee: "0.00",
    total_fee: "85.00",
    service_type: "passport_renewal",
    processing_time_days: 60,
    is_active: true,
  },
  {
    id: -8,
    service_name: "Apostille Services",
    description: "Document legalisation with guided checklist and checkout",
    base_fee: "79.00",
    government_fee: "0.00",
    total_fee: "79.00",
    service_type: "apostille",
    processing_time_days: 7,
    is_active: true,
  },
];

const DETAIL_NOTES: Partial<Record<ServiceTypeCode, string[]>> = {
  document_audit: [
    "Written pass / fix / missing report",
    "Fully credited against OCI services within 30 days",
  ],
  new_oci: ["End-to-end first-time OCI support", "Assessment credit eligible"],
  oci_renewal: ["Transfer details to a new passport", "Assessment credit eligible"],
  oci_update: ["Government fee is typically nil", "We handle portal work"],
  evisa_1year: ["Government fee included in total", "Assessment credit does not apply"],
  evisa_5year: ["Government fee included in total", "Assessment credit does not apply"],
  passport_renewal: ["Fixed service fee at checkout", "Category and courier options available"],
  apostille: ["Catalog service fee at checkout", "Optional early assessment when offered"],
};

export function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function formatGbp(amount: number, opts?: { onRequest?: boolean; freeLabel?: string }): string {
  if (opts?.onRequest) return "On request";
  if (amount <= 0 && opts?.freeLabel) return opts.freeLabel;
  if (amount <= 0) return "See fee at checkout";
  return `£${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

/**
 * Early / initial assessment fee (OCI only).
 * Prefer active `document_audit` catalog row for OCI; else the selected service's `auditFee`.
 * Returns null when assessment is not offered.
 */
export function getAssessmentFeeGbp(
  services?: CatalogService[] | null,
  serviceType?: string | null,
): number | null {
  const rows = services ?? cache;
  const normalized = String(serviceType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const isOci = !normalized || normalized.includes("oci") || normalized === "document_audit";

  if (isOci) {
    const auditRow = rows?.find((row) => row.serviceType === "document_audit");
    if (auditRow) {
      const fee = auditRow.totalFee > 0 ? auditRow.totalFee : auditRow.auditFee;
      if (fee > 0) return fee;
    }
  }

  if (normalized) {
    const serviceRow = rows?.find(
      (row) => String(row.serviceType).toLowerCase().replace(/[\s-]+/g, "_") === normalized,
    );
    if (serviceRow && serviceRow.auditFee > 0) return serviceRow.auditFee;
  }
  return null;
}

export function hasAssessmentFee(services?: CatalogService[] | null): boolean {
  return getAssessmentFeeGbp(services) != null;
}

/** @deprecated Prefer getAssessmentFeeGbp(); returns 0 when assessment is not offered. */
export function getAuditFeeGbp(): number {
  return getAssessmentFeeGbp() ?? 0;
}

export function categoryForServiceType(serviceType: ServiceTypeCode): PricingCategoryId {
  const key = String(serviceType || "").toLowerCase();
  if (key === "document_audit") return "oci";
  if (key === "pan_card") return "pan_card";
  if (key === "apostille" || key.startsWith("apostille_")) return "apostille";
  if (
    key === "passport_renewal" ||
    key === "passport_services" ||
    key === "birth_reg_minor_passport" ||
    key === "surrender_indian_passport" ||
    key === "police_clearance"
  ) {
    return "passport";
  }
  if (key.startsWith("evisa") || key === "morocco_turkey_evisa") return "evisa";
  if (key === "uk_passport_renewal" || key === "express_file" || key === "express") return "other";
  if (key.includes("oci")) return "oci";
  return "other";
}

function normalizeCategory(raw: string | undefined, serviceType: ServiceTypeCode): PricingCategoryId {
  // Keep admin category slugs so drag-order and custom categories work on the public site.
  if (String(serviceType || "").toLowerCase() === "document_audit") return "oci";
  const key = (raw || "").trim().toLowerCase();
  if (!key || key === "audit") {
    // Truly uncategorized catalog rows (e.g. PAN CARD SERVICE) stay outside OCI/Visa/etc.
    if (!key && String(serviceType || "").toLowerCase() === "pan_card") {
      return "pan_card";
    }
    return categoryForServiceType(serviceType);
  }
  return key;
}

function resolveCategoryName(rawName: string | undefined, category: PricingCategoryId): string {
  const name = (rawName || "").trim();
  if (name) return name;
  return CATEGORY_LABELS[category] || category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function hrefForServiceType(serviceType: ServiceTypeCode): string {
  const key = String(serviceType || "").toLowerCase();
  if (key === "document_audit") return "/services";
  if (key === "apostille" || key.startsWith("apostille_")) return "/apostille-services";
  if (key === "oci_renewal" || key === "oci_update") return "/services/oci-renewal";
  if (key.includes("oci")) return "/services/new-oci";
  if (
    key.startsWith("evisa") ||
    key === "morocco_turkey_evisa"
  ) {
    return "/services/indian-evisa";
  }
  if (
    key.includes("passport") ||
    key === "police_clearance" ||
    key === "birth_reg_minor_passport"
  ) {
    return "/services/passport-renewal";
  }
  return `/dashboard/document-audit?start=1&service=${encodeURIComponent(key)}`;
}

export function ctaForServiceType(serviceType: ServiceTypeCode): string {
  if (serviceType === "document_audit") return "Start assessment";
  if (serviceType === "passport_renewal" || serviceType === "apostille") return "Start application";
  return "View service";
}

export function isAuditCreditEligible(serviceType: ServiceTypeCode): boolean {
  const key = String(serviceType || "").toLowerCase();
  return key.includes("oci") && key !== "document_audit";
}

export function isQuoteBased(_serviceType: ServiceTypeCode, _totalFee: number): boolean {
  // All catalog services use published fees / plans (including apostille).
  return false;
}

export function mapPublicService(raw: PublicPricingService): CatalogService {
  const serviceType = raw.service_type;
  const activePlans = (raw.plans || []).filter((plan) => plan && plan.is_active !== false);
  const defaultPlan =
    activePlans.find((plan) => plan.is_default) ||
    activePlans[0] ||
    null;
  const totalFee = defaultPlan ? toNumber(defaultPlan.fee) : toNumber(raw.total_fee);
  const auditFee = toNumber(raw.audit_fee);
  return {
    id: raw.id,
    serviceType,
    name: raw.service_name,
    description: (raw.description || "").trim() || CATEGORY_LABELS[categoryForServiceType(serviceType)],
    baseFee: toNumber(raw.base_fee),
    governmentFee: toNumber(raw.government_fee),
    totalFee,
    auditFee: auditFee > 0 ? auditFee : 0,
    plans: activePlans.map((plan) => ({
      planCode: plan.plan_code,
      label: plan.label,
      fee: toNumber(plan.fee),
      isDefault: Boolean(plan.is_default),
    })),
    processingDays: raw.processing_time_days,
    category: normalizeCategory(raw.category, serviceType),
    categoryName: resolveCategoryName(
      raw.category_name,
      normalizeCategory(raw.category, serviceType),
    ),
    categoryDisplayOrder:
      typeof raw.category_display_order === "number" && Number.isFinite(raw.category_display_order)
        ? raw.category_display_order
        : 999,
    href: hrefForServiceType(serviceType),
    cta: ctaForServiceType(serviceType),
    auditCreditEligible: isAuditCreditEligible(serviceType),
    isQuoteBased: isQuoteBased(serviceType, totalFee),
    isPopular: serviceType === "new_oci",
    showOnHomepage: Boolean(raw.show_on_homepage),
    detailNotes: DETAIL_NOTES[serviceType] ?? [],
  };
}

/** Express is a checkout fee plan — not a standalone product in the service picker. */
export function isExpressHubCatalogService(service: {
  serviceType?: string;
  category?: string;
  name?: string;
}): boolean {
  const type = String(service.serviceType || "").toLowerCase();
  const category = String(service.category || "").toLowerCase();
  const name = String(service.name || "").toLowerCase();
  return type.includes("express") || category === "express" || name.includes("express service");
}

export function sortCatalogServices(services: CatalogService[]): CatalogService[] {
  return [...services]
    .filter((row) => !isExpressHubCatalogService(row))
    .sort((a, b) => {
      const ai = DISPLAY_ORDER.indexOf(a.serviceType);
      const bi = DISPLAY_ORDER.indexOf(b.serviceType);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
}

export function buildCategories(services: CatalogService[]): PricingCategory[] {
  const present = new Map<PricingCategoryId, { order: number; label: string }>();
  for (const service of services) {
    if (service.category === "audit" || service.serviceType === "document_audit") continue;
    if (isExpressHubCatalogService(service)) continue;
    const current = present.get(service.category);
    if (!current || service.categoryDisplayOrder < current.order) {
      present.set(service.category, {
        order: service.categoryDisplayOrder,
        label: service.categoryName || CATEGORY_LABELS[service.category] || service.category,
      });
    }
  }
  const tabs: PricingCategory[] = [{ id: "all", label: "All" }];
  const ordered = Array.from(present.entries()).sort((a, b) => {
    if (a[1].order !== b[1].order) return a[1].order - b[1].order;
    return a[1].label.localeCompare(b[1].label);
  });
  for (const [id, meta] of ordered) {
    tabs.push({ id, label: meta.label });
  }
  return tabs;
}

export function creditPriceLabel(service: CatalogService, auditFee?: number): string | undefined {
  if (!service.auditCreditEligible) return undefined;
  const credit =
    auditFee && auditFee > 0
      ? auditFee
      : service.auditFee > 0
        ? service.auditFee
        : getAssessmentFeeGbp() || 0;
  if (credit <= 0) return undefined;
  const credited = Math.max(0, service.totalFee - credit);
  return `${formatGbp(credited)} with assessment credit`;
}

export function priceDisplay(service: CatalogService): string {
  return formatGbp(service.totalFee);
}

function parsePricingPayload(json: unknown): PublicPricingService[] {
  if (!json || typeof json !== "object") return [];
  const root = json as { data?: unknown; status?: string };
  const data = root.data;
  if (Array.isArray(data)) return data as PublicPricingService[];
  if (data && typeof data === "object" && Array.isArray((data as { services?: unknown }).services)) {
    return (data as { services: PublicPricingService[] }).services;
  }
  if (Array.isArray(json)) return json as PublicPricingService[];
  return [];
}

export async function fetchPublicPricing(options?: {
  force?: boolean;
}): Promise<{ services: CatalogService[]; fromFallback: boolean }> {
  const cacheFresh = cache && Date.now() - cacheFetchedAt < CACHE_TTL_MS;
  if (!options?.force && cacheFresh) {
    return { services: cache!, fromFallback: cacheFromFallback };
  }

  if (!options?.force && inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PUBLIC.PRICING}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Pricing API HTTP ${response.status}`);
      }

      const json = await response.json();
      const rows = parsePricingPayload(json).filter((row) => row && row.is_active !== false);

      if (rows.length === 0) {
        console.warn(
          "[public-pricing] API returned empty list — falling back to last-known hardcoded catalog.",
        );
        const services = sortCatalogServices(FALLBACK_PRICING_SERVICES.map(mapPublicService));
        cache = services;
        cacheFromFallback = true;
        cacheFetchedAt = Date.now();
        return { services, fromFallback: true };
      }

      const services = sortCatalogServices(rows.map(mapPublicService));
      cache = services;
      cacheFromFallback = false;
      cacheFetchedAt = Date.now();
      return { services, fromFallback: false };
    } catch (error) {
      console.warn(
        "[public-pricing] Failed to load /public/pricing — falling back to last-known hardcoded catalog.",
        error,
      );
      const services = sortCatalogServices(FALLBACK_PRICING_SERVICES.map(mapPublicService));
      cache = services;
      cacheFromFallback = true;
      cacheFetchedAt = Date.now();
      return { services, fromFallback: true };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Clear cache (tests / forced refresh). */
export function clearPublicPricingCache() {
  cache = null;
  cacheFromFallback = false;
  cacheFetchedAt = 0;
  inflight = null;
}
