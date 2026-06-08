import { ServicePageLayout } from "@/components/services/ServicePageLayout";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.newOci);

export default function NewOCIPage() {
  return (
    <ServicePageLayout
      eyebrow="New OCI Service"
      title="New OCI Card Application"
      description="If you're applying for OCI for the first time, FlyOCI handles forms, document checks, and process guidance from start to finish."
      highlights={[
        { label: "Region", value: "UK & US Applicants" },
        { label: "Support", value: "End-to-End Guidance" },
        { label: "Benefit", value: "£15 Audit Credit" },
      ]}
      pricing={{
        lines: [
          { label: "Service fee", value: "£88" },
          { label: "Audit credit", value: "-£15" },
          { label: "After audit", value: "£73", highlight: true },
        ],
        footnote: "Government fees are paid separately as per latest rules.",
        ctaLabel: "Start application",
        ctaHref: "/document-audit",
      }}
      whoFor={{
        title: "Who Is This Service For?",
        items: [
          "Indian origin individuals with foreign nationality",
          "Children born abroad to eligible Indian origin parents",
          "Spouses of OCI / Indian origin in eligible cases",
        ],
        footnote: "We will confirm your eligibility during the Document Audit.",
      }}
      whatYouGet={{
        title: "What You Get",
        items: [
          "Form filling and profile setup",
          "Document preparation checklist",
          "VFS / appointment guidance",
          "Ongoing support until completion",
        ],
      }}
      processSteps={[
        "Document Audit (Recommended)",
        "Form Filling & Online Submission",
        "Document Preparation & Printing Checklist",
        "Appointment / VFS Guidance",
        "Ongoing Support Until OCI Card Delivery",
      ]}
    />
  );
}
