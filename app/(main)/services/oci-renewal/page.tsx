import { ServicePageLayout } from "@/components/services/ServicePageLayout";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.ociRenewal);

export default function OCIRenewalPage() {
  return (
    <ServicePageLayout
      serviceType="oci_renewal"
      eyebrow="OCI Renewal Service"
      title="OCI Renewal / Transfer to New Passport"
      description="If your passport changed or your OCI requires re-issuance, we manage the process clearly from document prep to final submission guidance."
      bulletPoints={[
        "Category check: renewal vs transfer",
        "Correct forms and supporting documents",
        "Error prevention before submission",
      ]}
      pricing={{
        lines: [{ label: "Service fee", value: "£78", highlight: true }],
        footnote: "Best for passport change and transfer-related OCI updates.",
        ctaLabel: "Start application",
        ctaHref: "/dashboard/document-audit?start=1&service=oci_renewal",
      }}
      stats={[
        { label: "Who This Helps", value: "Passport change and OCI transfer cases" },
        { label: "Common Risk", value: "Wrong route selection causes delays" },
        { label: "FlyOCI Value", value: "Correct checklist before submission" },
      ]}
    />
  );
}
