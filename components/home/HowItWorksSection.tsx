"use client";

import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import Link from "next/link";
import { home } from "@/components/home/homeTheme";

const STEPS = [
  {
    title: "Quick form & upload",
    description: "Tell us which service you need and upload clear photos or scans through our secure portal.",
  },
  {
    title: "Document checklist",
    description: "We guide you through what is correct, missing, or needs correction for your selected service.",
  },
  {
    title: "End-to-end handling",
    description: "Once documents are ready, we prepare forms, submission steps, and ongoing guidance.",
  },
];

export function HowItWorksSection() {
  const { assessmentFee } = usePublicPricing();
  const assessmentLabel =
    assessmentFee != null && assessmentFee > 0
      ? `£${assessmentFee % 1 === 0 ? assessmentFee.toFixed(0) : assessmentFee.toFixed(2)}`
      : null;

  return (
    <section className={home.sectionSoft}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.10)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.08)_0%,transparent_70%)]" />

      <div className={home.container}>
        <FadeInUp>
          <div className="mb-10 max-w-3xl">
            <p className={home.eyebrow}>How it works</p>
            <h2 className={`mt-2 ${home.h2}`}>A clear path from upload to completion</h2>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="grid gap-4 md:grid-cols-3">
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
        </FadeInUp>

        {assessmentLabel ? (
          <FadeInUp delay={0.2} className="mt-6">
            <div className={`${home.card} p-5`}>
              <p className="font-heading text-sm font-semibold text-dark">
                Optional early assessment: {assessmentLabel}
              </p>
              <p className="mt-1 text-sm text-textMuted">
                Available when configured — credited against eligible OCI services if you proceed within 30 days.
              </p>
            </div>
          </FadeInUp>
        ) : null}

        <FadeInUp delay={0.3} className="mt-8 text-center">
          <Link href="/services">
            <Button variant="primary" className="px-8 py-3.5 text-base shadow-btn">
              Start my application
            </Button>
          </Link>
        </FadeInUp>
      </div>
    </section>
  );
}
