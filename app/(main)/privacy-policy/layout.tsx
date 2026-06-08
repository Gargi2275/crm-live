import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.privacyPolicy);

export default function PrivacyPolicyLayout({ children }: { children: ReactNode }) {
  return children;
}
