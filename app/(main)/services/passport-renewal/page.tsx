import { ServicePageLayout } from "@/components/services/ServicePageLayout";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.passportRenewal);

export default function PassportRenewalPage() {
  return (
    <ServicePageLayout
      eyebrow="Passport Renewal Service"
      title="Indian Passport Renewal for UK & US Applicants"
      description="We help you renew Indian passports with the right category, correct document set, and complete submission guidance."
      bulletPoints={[
        "Renewal category guidance",
        "Form filling and checklist support",
        "Photo/signature and VFS readiness",
      ]}
      pricing={{
        lines: [
          { label: "Pricing", value: "Price on request" },
          { label: "Audit review", value: "Recommended" },
          { label: "Support", value: "End-to-end", highlight: true },
        ],
        footnote: "Fee is confirmed after evaluating your exact case route.",
        ctaLabel: "Start application",
        ctaHref: "/document-audit",
      }}
      stats={[
        { label: "Who This Helps", value: "Adults, children, and family renewals" },
        { label: "Common Delay", value: "Wrong category and incomplete forms" },
        { label: "FlyOCI Value", value: "Clear checklist and renewal flow" },
      ]}
      whatWeDo={{
        title: "What We Do",
        items: [
          "Check correct renewal category (normal, Tatkal etc. if applicable)",
          "Provide complete list of required documents",
          "Fill out the online application forms",
          "Check photographs, signatures, and VFS/consulate guidance",
        ],
      }}
    />
  );
}
