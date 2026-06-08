import { HowItWorksContent } from "@/components/pages/HowItWorksContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.howItWorks);

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
