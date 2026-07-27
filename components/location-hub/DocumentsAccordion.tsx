"use client";

import type { HubOffering } from "@/lib/api";
import { home } from "@/components/home/homeTheme";

type DocumentsAccordionProps = {
  offerings: HubOffering[];
};

export function DocumentsAccordion({ offerings }: DocumentsAccordionProps) {
  const withDocs = offerings.filter((o) => o.service.documents?.length);

  if (!withDocs.length) return null;

  return (
    <section className={home.sectionSoft}>
      <div className={home.container}>
        <h2 className={home.h2}>Documents checklist</h2>
        <p className={home.lead}>Typical requirements by service. Final checklist may vary by case.</p>
        <div className="mt-6 space-y-3">
          {withDocs.map((offering) => (
            <details
              key={`docs-${offering.service.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-white open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <span className="font-heading text-[15px] font-semibold text-dark">
                  {offering.service.service_name}
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eef4ff] text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ul className="space-y-2 border-t border-border px-5 py-4">
                {offering.service.documents.map((doc) => (
                  <li key={`${offering.service.id}-${doc.name}`} className="text-sm text-textMuted">
                    <span className="font-semibold text-dark">{doc.name}</span>
                    {doc.is_mandatory ? (
                      <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                        Required
                      </span>
                    ) : (
                      <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted">
                        Optional
                      </span>
                    )}
                    {doc.description ? (
                      <p className="mt-0.5 text-sm leading-relaxed">{doc.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
