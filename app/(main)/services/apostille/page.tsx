import { ServiceCategoryPageContent } from "@/components/services/ServiceCategoryPageContent";
import { getServiceCategoryPage } from "@/lib/service-category-pages";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const config = getServiceCategoryPage("apostille")!;

export const metadata = buildPageMetadata(PAGE_SEO.categoryApostille);

export default function ApostilleCategoryPage() {
  return <ServiceCategoryPageContent config={config} />;
}
