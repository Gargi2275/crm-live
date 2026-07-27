"use client";

import type { PublicBlogFaq } from "@/lib/api";

type BlogFaqAccordionProps = {
  faqs: PublicBlogFaq[];
};

export function BlogFaqAccordion({ faqs }: BlogFaqAccordionProps) {
  if (!faqs.length) return null;

  return (
    <section className="py-8">
      <h2 className="font-heading text-2xl font-bold text-[#0b2a6b]">Frequently Asked Questions</h2>
      <div className="mt-5 space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={`${faq.question}-${index}`}
            className="group overflow-hidden rounded-xl border border-[#d7e4f5] bg-[#f8fbff] open:border-[#b9d2f5] open:bg-white open:shadow-[0_10px_28px_rgba(30,74,135,0.08)]"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
              <span className="font-heading text-[15px] font-semibold leading-snug text-[#0b2a6b] sm:text-base">
                {faq.question}
              </span>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-base font-light text-[#155fc4] transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="border-t border-[#e8f0fa] px-5 pb-4 pt-3">
              <p className="font-body text-sm leading-relaxed text-[#507090] sm:text-[15px]">{faq.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
