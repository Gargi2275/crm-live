export type TocHeading = {
  id: string;
  text: string;
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Ensure every h2 has an id and return TOC entries. */
export function prepareBlogContent(html: string): { html: string; headings: TocHeading[] } {
  if (!html) return { html: "", headings: [] };

  const headings: TocHeading[] = [];
  const used = new Set<string>();

  const withIds = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const existing = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    let id = existing || slugifyHeading(text) || `section-${headings.length + 1}`;
    let n = 2;
    while (used.has(id)) {
      id = `${slugifyHeading(text) || "section"}-${n}`;
      n += 1;
    }
    used.add(id);
    headings.push({ id, text });

    if (existing) {
      return `<h2${attrs}>${inner}</h2>`;
    }
    const cleaned = attrs.replace(/\bid\s*=\s*["'][^"']*["']/i, "").trim();
    return `<h2 id="${id}"${cleaned ? ` ${cleaned}` : ""}>${inner}</h2>`;
  });

  return { html: withIds, headings };
}

export function formatBlogDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).replace(/ (\d{4})$/, ", $1");
}
