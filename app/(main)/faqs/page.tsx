import { FaqsContent } from "@/components/pages/FaqsContent";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { FAQ_ITEMS } from "@/lib/data/faqs";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.faqs);

export default function FAQsPage() {
  return (
    <>
      <FaqJsonLd items={FAQ_ITEMS} />
      <FaqsContent />
    </>
  );
}
