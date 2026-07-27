import type { CatalogService, PricingCategoryId } from "@/lib/public-pricing";

export type ServiceCategoryMeta = {
  title: string;
  shortTitle: string;
  description: string;
  href: string;
};

export const SERVICE_CATEGORY_META: Record<string, ServiceCategoryMeta> = {
  oci: {
    title: "OCI Card Application & Renewal",
    shortTitle: "OCI",
    description:
      "Apply for a new OCI card, renew or transfer an existing one, or complete mandatory updates with guided document support.",
    href: "/services/new-oci",
  },
  evisa: {
    title: "Indian e-Visa Services",
    shortTitle: "e-Visa",
    description:
      "1-year and 5-year e-Visa options prepared and checked so you submit with confidence.",
    href: "/services/indian-evisa",
  },
  passport: {
    title: "Indian Passport Services",
    shortTitle: "Passport",
    description:
      "Passport renewal support for UK and US residents, with clear quotes based on your category and courier needs.",
    href: "/services/passport-renewal",
  },
  apostille: {
    title: "Apostille & Attestation",
    shortTitle: "Apostille",
    description:
      "UK and US documents legalised for use in India — start with a free document pre-check.",
    href: "/apostille-services",
  },
  audit: {
    title: "Document Audit",
    shortTitle: "Document Audit",
    description:
      "Pre-check your documents before any application so missing or incorrect papers are caught early.",
    href: "/document-audit",
  },
  other: {
    title: "Other Services",
    shortTitle: "Other",
    description: "Additional India travel and documentation support under one guided process.",
    href: "/services",
  },
};

export const SERVICE_CATEGORY_ORDER: PricingCategoryId[] = [
  "oci",
  "evisa",
  "passport",
  "apostille",
  "other",
];

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

export function groupServicesByCategory(
  services: CatalogService[],
  options?: { exclude?: PricingCategoryId[] },
): ServiceCategoryGroup[] {
  // Always hide Document Audit as a category (it is a service flow).
  const exclude = new Set<PricingCategoryId>(["audit", ...(options?.exclude || [])]);
  const byCategory = new Map<PricingCategoryId, CatalogService[]>();
  const orderByCategory = new Map<PricingCategoryId, number>();
  const nameByCategory = new Map<PricingCategoryId, string>();

  for (const service of services) {
    if (exclude.has(service.category)) continue;
    if (service.serviceType === "document_audit") continue;
    const list = byCategory.get(service.category) || [];
    list.push(service);
    byCategory.set(service.category, list);
    const current = orderByCategory.get(service.category);
    if (current === undefined || service.categoryDisplayOrder < current) {
      orderByCategory.set(service.category, service.categoryDisplayOrder);
    }
    if (!nameByCategory.has(service.category) && service.categoryName) {
      nameByCategory.set(service.category, service.categoryName);
    }
  }

  const ids = Array.from(byCategory.keys()).sort((a, b) => {
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
