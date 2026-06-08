import { PricingContent } from "@/components/pages/PricingContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.pricing);

export default function PricingPage() {
  return <PricingContent />;
}
