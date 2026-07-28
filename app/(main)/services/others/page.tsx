import { ServiceCategoryPageContent } from "@/components/services/ServiceCategoryPageContent";
import { getServiceCategoryPage } from "@/lib/service-category-pages";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const config = getServiceCategoryPage("others")!;

export const metadata = buildPageMetadata(PAGE_SEO.categoryOthers);

export default function OthersCategoryPage() {
  return <ServiceCategoryPageContent config={config} />;
}
