import { ServiceCategoryPageContent } from "@/components/services/ServiceCategoryPageContent";
import { getServiceCategoryPage } from "@/lib/service-category-pages";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const config = getServiceCategoryPage("indian-visa")!;

export const metadata = buildPageMetadata(PAGE_SEO.categoryIndianVisa);

export default function IndianVisaCategoryPage() {
  return <ServiceCategoryPageContent config={config} />;
}
