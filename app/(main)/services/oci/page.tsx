import { ServiceCategoryPageContent } from "@/components/services/ServiceCategoryPageContent";
import { getServiceCategoryPage } from "@/lib/service-category-pages";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const config = getServiceCategoryPage("oci")!;

export const metadata = buildPageMetadata(PAGE_SEO.categoryOci);

export default function OciCategoryPage() {
  return <ServiceCategoryPageContent config={config} />;
}
