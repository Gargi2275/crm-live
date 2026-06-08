import { ContactContent } from "@/components/pages/ContactContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.contact);

export default function ContactPage() {
  return <ContactContent />;
}
