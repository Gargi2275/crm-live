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
        { label: "Process", value: "Start directly online" },
      ]}
      pricing={{
        lines: [
          { label: "Service fee", value: "£88", highlight: true },
        ],
        footnote: "Government fees are paid separately as per latest rules.",
        ctaLabel: "Start application",
        ctaHref: "/dashboard/document-audit?start=1&service=new_oci",
      }}
      whoFor={{
        title: "Who Is This Service For?",
        items: [
          "Indian origin individuals with foreign nationality",
          "Children born abroad to eligible Indian origin parents",
          "Spouses of OCI / Indian origin in eligible cases",
        ],
        footnote: "We confirm eligibility during your application checklist.",
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
        "Start application for New OCI",
        "Form Filling & Online Submission",
        "Document Preparation & Printing Checklist",
        "Appointment / VFS Guidance",
        "Ongoing Support Until OCI Card Delivery",
      ]}
    />
  );
}
