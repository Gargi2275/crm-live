/** Static FAQs for location hub pages — keyed by country or city slug. */

export type LocationHubFaq = {
  question: string;
  answer: string;
};

const DEFAULT_FAQS: LocationHubFaq[] = [
  {
    question: "Which Indian consular services can I apply for from this location?",
    answer:
      "FlyOCI helps with OCI, passport renewal, apostille, and related documentation support for NRIs. Available services and fees on this page reflect what we currently offer for this location.",
  },
  {
    question: "Are government fees included in the total?",
    answer:
      "Where a government fee applies, it is shown separately from FlyOCI service fees. Some documentation services have no government fee — those rows show as blank or zero for the govt fee.",
  },
  {
    question: "How does the application process work?",
    answer:
      "Choose a service, start your application, upload clear scans, and our team guides checklist corrections and next steps through to submission readiness.",
  },
  {
    question: "Do city pages use different pricing than the country?",
    answer:
      "City pages inherit country pricing by default. A city-specific fee only appears when we have configured an override for that city and service.",
  },
];

const BY_SLUG: Record<string, LocationHubFaq[]> = {
  usa: [
    {
      question: "Can I apply for OCI services while living in the USA?",
      answer:
        "Yes. FlyOCI supports USA-based applicants with document preparation and guided filing for OCI and related Indian consular services.",
    },
    ...DEFAULT_FAQS.slice(1),
  ],
  uk: [
    {
      question: "Do you support UK-based applicants for Indian passport renewal?",
      answer:
        "Yes. UK applicants can start passport renewal and OCI journeys through FlyOCI with location-aware fee guidance where configured.",
    },
    ...DEFAULT_FAQS.slice(1),
  ],
  canada: DEFAULT_FAQS,
  australia: DEFAULT_FAQS,
  india: DEFAULT_FAQS,
};

export function getLocationHubFaqs(locationSlug: string): LocationHubFaq[] {
  const key = (locationSlug || "").trim().toLowerCase();
  return BY_SLUG[key] || DEFAULT_FAQS;
}
