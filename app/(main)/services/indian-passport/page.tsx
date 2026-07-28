import { ServiceCategoryPageContent } from "@/components/services/ServiceCategoryPageContent";
import { getServiceCategoryPage } from "@/lib/service-category-pages";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const config = getServiceCategoryPage("indian-passport")!;

export const metadata = buildPageMetadata(PAGE_SEO.categoryIndianPassport);

export default function IndianPassportCategoryPage() {
  return <ServiceCategoryPageContent config={config} />;
}
