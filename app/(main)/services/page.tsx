import { ServicesListingContent } from "@/components/services/ServicesListingContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.services);

export default function ServicesPage() {
  return <ServicesListingContent />;
}
