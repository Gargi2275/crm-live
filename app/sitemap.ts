import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { PUBLIC_SITEMAP_PATHS } from "@/lib/seo-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_PATHS.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency || "monthly",
    priority: entry.priority ?? 0.5,
  }));
}
