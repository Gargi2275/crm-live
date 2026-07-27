"use client";

import { home } from "@/components/home/homeTheme";

const FALLBACK = [
  {
    quote: "Clear checklist and quick corrections — our OCI paperwork finally felt manageable.",
    author: "Priya S.",
    detail: "OCI support",
  },
  {
    quote: "Fees were explained upfront and the team kept us updated at every step.",
    author: "Rahul M.",
    detail: "Passport renewal",
  },
  {
    quote: "Much better than piecing together portal instructions on our own.",
    author: "Ananya K.",
    detail: "Document prep",
  },
];

export function Testimonials() {
  return (
    <section className={home.sectionSoft}>
      <div className={home.container}>
        <h2 className={home.h2}>What applicants say</h2>
        <p className={home.lead}>Feedback from families who used FlyOCI for consular documentation support.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FALLBACK.map((item) => (
            <blockquote key={item.author} className={`${home.card} p-5`}>
              <p className="text-sm leading-relaxed text-dark">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-4 text-sm">
                <p className="font-semibold text-dark">{item.author}</p>
                <p className="text-textMuted">{item.detail}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
