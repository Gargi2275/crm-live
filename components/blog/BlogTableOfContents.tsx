"use client";

import type { TocHeading } from "@/lib/blog";

type BlogTableOfContentsProps = {
  headings: TocHeading[];
};

export function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="rounded-2xl border border-[#d7e4f5] bg-white p-5 shadow-[0_12px_32px_rgba(15,40,80,0.06)] lg:sticky lg:top-28"
    >
      <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#155fc4]">
        Table of Contents
      </p>
      <ol className="space-y-0 border-l border-[#dce8f7] pl-3.5">
        {headings.map((h, index) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="group flex gap-2.5 py-2 text-[13px] font-medium leading-snug text-[#4a617a] transition-colors hover:text-[#155fc4]"
            >
              <span className="mt-0.5 shrink-0 text-[11px] font-bold text-[#9bb0c7] group-hover:text-[#155fc4]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
