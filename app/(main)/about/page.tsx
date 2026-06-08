import { AboutContent } from "@/components/pages/AboutContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.about);

export default function AboutPage() {
  return <AboutContent />;
}
