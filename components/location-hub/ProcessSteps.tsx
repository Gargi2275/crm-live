"use client";

import { home } from "@/components/home/homeTheme";

const STEPS = [
  {
    title: "Quick form & upload",
    description:
      "Tell us which service you need and upload clear photos or scans through our secure portal.",
  },
  {
    title: "Document checklist",
    description:
      "We guide you through what is correct, missing, or needs correction for your selected service.",
  },
  {
    title: "End-to-end handling",
    description:
      "Once documents are ready, we prepare forms, submission steps, and ongoing guidance.",
  },
];

export function ProcessSteps() {
  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <p className={home.eyebrow}>How it works</p>
        <h2 className={`mt-2 ${home.h2}`}>A clear path from upload to completion</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className={`${home.card} p-5`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Step {index + 1}
              </p>
              <h3 className="mt-1.5 font-heading text-base font-bold text-dark">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-textMuted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
