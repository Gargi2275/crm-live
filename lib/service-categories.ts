import type { CatalogService, PricingCategoryId } from "@/lib/public-pricing";

export type ServiceCategoryMeta = {
  title: string;
  shortTitle: string;
  description: string;
  href: string;
};

export const SERVICE_CATEGORY_META: Record<string, ServiceCategoryMeta> = {
  oci: {
    title: "OCI",
    shortTitle: "OCI",
    description:
      "Apply for a new OCI card, renew or transfer an existing one, or complete mandatory updates with guided document support.",
    href: "/services/oci",
  },
  evisa: {
    title: "Indian Visa",
    shortTitle: "Indian Visa",
    description:
      "1-year and 5-year e-Visa options prepared and checked so you submit with confidence.",
    href: "/services/indian-visa",
  },
  passport: {
    title: "Indian Passport",
    shortTitle: "Indian Passport",
    description:
      "Passport renewal support for UK and US residents, with catalog fees and category/courier options at checkout.",
    href: "/services/indian-passport",
  },
  apostille: {
    title: "Apostille",
    shortTitle: "Apostille",
    description:
      "UK and US documents legalised for use in India — same guided journey with catalog fees at checkout.",
    href: "/services/apostille",
  },
  other: {
    title: "Others",
    shortTitle: "Others",
    description: "Additional India travel and documentation support under one guided process.",
    href: "/services/others",
  },
  pan_card: {
    title: "PAN CARD SERVICE",
    shortTitle: "PAN Card",
    description: "PAN card application support as a standalone service.",
    href: "/services/others",
  },
  uncategorized: {
    title: "PAN CARD SERVICE",
    shortTitle: "PAN Card",
    description: "PAN card application support as a standalone service.",
    href: "/services/others",
  },
};

export const SERVICE_CATEGORY_ORDER: PricingCategoryId[] = [
  "oci",
  "passport",
  "evisa",
  "apostille",
  "other",
];

/** Categories shown as a centered “Others” band in menus (not a 5th grid column). */
export const SERVICE_OTHER_CATEGORY_IDS = new Set<PricingCategoryId>([
  "other",
  "pan_card",
  "uncategorized",
]);

export type ServiceCategoryGroup = {
  id: PricingCategoryId;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  services: CatalogService[];
};

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function metaForCategory(id: PricingCategoryId, categoryName: string): ServiceCategoryMeta {
  const known = SERVICE_CATEGORY_META[id];
  if (known) {
    return {
      ...known,
      // Prefer live admin category name when present.
      title: categoryName || known.title,
      shortTitle: categoryName || known.shortTitle,
    };
  }
  const label = categoryName || titleCaseSlug(id);
  return {
    title: label,
    shortTitle: label,
    description: `Browse ${label} services with clear guidance and document checks.`,
    href: "/services",
  };
}

function categorySortIndex(id: PricingCategoryId): number {
  const idx = SERVICE_CATEGORY_ORDER.indexOf(id);
  if (idx >= 0) return idx;
  if (SERVICE_OTHER_CATEGORY_IDS.has(id)) return SERVICE_CATEGORY_ORDER.indexOf("other");
  return 100 + id.localeCompare("a");
}

export function groupServicesByCategory(
  services: CatalogService[],
  options?: { exclude?: PricingCategoryId[] },
): ServiceCategoryGroup[] {
  // Hide document_audit from public category listings.
  const exclude = new Set<PricingCategoryId>(["audit", ...(options?.exclude || [])]);
  const byCategory = new Map<PricingCategoryId, CatalogService[]>();
  const orderByCategory = new Map<PricingCategoryId, number>();
  const nameByCategory = new Map<PricingCategoryId, string>();

  for (const service of services) {
    if (exclude.has(service.category)) continue;
    // Assessment lives under OCI for search/browse; keep it out of other categories.
    if (service.serviceType === "document_audit" && service.category !== "oci") continue;

    // Fold pan_card / uncategorized into the centered Others group.
    const categoryId: PricingCategoryId = SERVICE_OTHER_CATEGORY_IDS.has(service.category)
      ? "other"
      : service.category;

    const list = byCategory.get(categoryId) || [];
    list.push(service);
    byCategory.set(categoryId, list);
    const current = orderByCategory.get(categoryId);
    if (current === undefined || service.categoryDisplayOrder < current) {
      orderByCategory.set(categoryId, service.categoryDisplayOrder);
    }
    if (!nameByCategory.has(categoryId) && service.categoryName && categoryId !== "other") {
      nameByCategory.set(categoryId, service.categoryName);
    }
  }

  const ids = Array.from(byCategory.keys()).sort((a, b) => {
    const ai = categorySortIndex(a);
    const bi = categorySortIndex(b);
    if (ai !== bi) return ai - bi;
    const ao = orderByCategory.get(a) ?? 999;
    const bo = orderByCategory.get(b) ?? 999;
    if (ao !== bo) return ao - bo;
    const an = nameByCategory.get(a) || a;
    const bn = nameByCategory.get(b) || b;
    return an.localeCompare(bn);
  });

  return ids.map((id) => {
    const meta = metaForCategory(id, nameByCategory.get(id) || "");
    return {
      id,
      title: meta.title,
      shortTitle: meta.shortTitle,
      description: meta.description,
      href: meta.href,
      services: byCategory.get(id) || [],
    };
  });
}

export function splitPrimaryAndOtherServiceGroups(groups: ServiceCategoryGroup[]) {
  const primaryGroups = groups.filter((group) => !SERVICE_OTHER_CATEGORY_IDS.has(group.id));
  const otherGroups = groups.filter((group) => SERVICE_OTHER_CATEGORY_IDS.has(group.id));
  return { primaryGroups, otherGroups };
}
