import { DocumentAuditContent } from "@/components/pages/DocumentAuditContent";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.documentAudit);

export default function DocumentAuditPage() {
  return <DocumentAuditContent />;
}
