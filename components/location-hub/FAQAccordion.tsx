"use client";

import type { LocationHubFaq } from "@/lib/location-hub-faqs";
import { home } from "@/components/home/homeTheme";

type FAQAccordionProps = {
  faqs: LocationHubFaq[];
};

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  if (!faqs.length) return null;

  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <h2 className={home.h2}>Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={`${faq.question}-${index}`}
              className="group overflow-hidden rounded-xl border border-border bg-[#f8fbff] open:border-primary/30 open:bg-white open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
                <span className="font-heading text-[15px] font-semibold leading-snug text-dark">
                  {faq.question}
                </span>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="border-t border-border px-5 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-textMuted">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
