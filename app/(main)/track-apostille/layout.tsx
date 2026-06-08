import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.trackApostille);

export default function TrackApostilleLayout({ children }: { children: ReactNode }) {
  return children;
}
