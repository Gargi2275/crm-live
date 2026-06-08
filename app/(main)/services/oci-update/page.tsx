import { ServicePageLayout } from "@/components/services/ServicePageLayout";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.ociUpdate);

export default function OCIUpdatePage() {
  return (
    <ServicePageLayout
      eyebrow="OCI Update Service"
      title="Mandatory OCI Updates, Handled Professionally"
      description="Even when government fee is nil, OCI update workflows are technical. We handle the portal work, document checks, and submission accuracy."
      bulletPoints={[
        "Confirm if your case needs an update",
        "Upload-ready photo and signature checks",
        "End-to-end portal completion support",
      ]}
      pricing={{
        lines: [
          { label: "Service fee", value: "£50" },
          { label: "Audit credit", value: "-£15" },
          { label: "After audit", value: "£35", highlight: true },
        ],
        ctaLabel: "Start application",
        ctaHref: "/document-audit",
      }}
      stats={[
        { label: "Ideal For", value: "Mandatory OCI portal updates" },
        { label: "What We Prevent", value: "Photo/signature format rejection" },
        { label: "Turnaround", value: "Fast guided completion support" },
      ]}
      whatWeDo={{
        title: "What We Do",
        items: [
          "Check whether an update is required in your case",
          "Prepare and upload documents on the government portal",
          "Ensure photos and signatures meet exact specifications",
          "Guide you through additional steps or acknowledgements",
        ],
      }}
    />
  );
}
