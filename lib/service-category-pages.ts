import type { PricingCategoryId } from "@/lib/public-pricing";

export type ServiceCategoryPageConfig = {
  /** URL segment under /services/ */
  slug: string;
  categoryId: PricingCategoryId;
  title: string;
  eyebrow: string;
  description: string;
  highlights: string[];
  included: string[];
};

/** Static category landing shells — services inside each page come from the live catalog. */
export const SERVICE_CATEGORY_PAGES: ServiceCategoryPageConfig[] = [
  {
    slug: "oci",
    categoryId: "oci",
    title: "OCI services",
    eyebrow: "Overseas Citizenship of India",
    description:
      "New OCI, renewal, update and document assessment — guided end-to-end for UK and US residents of Indian origin.",
    highlights: ["Document pre-check", "Form guidance", "Clear fees"],
    included: [
      "Document checklist tailored to your case",
      "Assessment option before you commit",
      "Support for new OCI, renewal and updates",
      "Email and WhatsApp updates while we prepare",
    ],
  },
  {
    slug: "indian-passport",
    categoryId: "passport",
    title: "Indian Passport services",
    eyebrow: "Passport & civil documents",
    description:
      "Passport renewal and related India documentation support with catalog fees and courier options at checkout.",
    highlights: ["Catalog pricing", "Courier options", "UK & US applicants"],
    included: [
      "Clear passport renewal process",
      "Guidance on supporting documents",
      "Transparent service fees before payment",
      "Help avoiding common form mistakes",
    ],
  },
  {
    slug: "indian-visa",
    categoryId: "evisa",
    title: "Indian Visa services",
    eyebrow: "e-Visa options",
    description:
      "1-year and 5-year Indian e-Visa support with document checks so you submit with confidence.",
    highlights: ["1-year & 5-year", "Document review", "Status guidance"],
    included: [
      "Right visa type recommendation",
      "Document and photo checks",
      "Accurate form support",
      "Clear next steps after submission",
    ],
  },
  {
    slug: "apostille",
    categoryId: "apostille",
    title: "Apostille services",
    eyebrow: "Document legalisation",
    description:
      "Birth, marriage, death and other certificates legalised for use in India — same guided journey with catalog fees.",
    highlights: ["UK & US docs", "Catalog fees", "Tracked process"],
    included: [
      "Certificate apostille options",
      "Document readiness checks",
      "Transparent service pricing",
      "Progress updates by email",
    ],
  },
  {
    slug: "others",
    categoryId: "other",
    title: "Other services",
    eyebrow: "Additional support",
    description:
      "PAN card and other India travel or documentation services under the same guided FlyOCI process.",
    highlights: ["Extra services", "Clear guidance", "Same support"],
    included: [
      "PAN card and related options",
      "Straightforward application paths",
      "Document help where needed",
      "One place to start and track",
    ],
  },
];

export function getServiceCategoryPage(slug: string): ServiceCategoryPageConfig | undefined {
  return SERVICE_CATEGORY_PAGES.find((row) => row.slug === slug);
}

export function categoryPageHref(categoryId: PricingCategoryId): string {
  const match = SERVICE_CATEGORY_PAGES.find((row) => row.categoryId === categoryId);
  return match ? `/services/${match.slug}` : "/services";
}
