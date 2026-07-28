"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CTABanner } from "@/components/CTABanner";
import { PageHero } from "@/components/pages/PageHero";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";

const steps = [
  {
    title: 'Step 1 — Choose Service or "Not Sure"',
    desc: 'Select a specific service (New OCI, Renewal, Update, e-Visa, Passport Renewal), OR choose "Not Sure — Help Me Decide" and tell us your situation. You fill a short online form with your basic details and travel plans.',
  },
  {
    title: "Step 2 — Secure Document Upload",
    desc: "Once you submit the form, you upload: Passport, OCI card (if already held), Proof of address, Marriage/birth certificate via a secure portal.",
  },
  {
    title: "Step 3 — Document Check & Application Start",
    desc: "We confirm your documents are ready and guide you through starting the application. You receive email confirmation and an optional WhatsApp welcome message.",
  },
  {
    title: "Step 4 — Expert Review & Report",
    desc: "Within 24–48 hours, our team reviews documents for errors, prepares a written report and recommended solution, and delivers it via email + WhatsApp.",
  },
  {
    title: "Step 5 — Full Service Confirmation",
    desc: "If you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update), we confirm the final fee and next steps. If you do not proceed, you keep the advice.",
  },
  {
    title: "Step 6 — Application Preparation & Submission",
    desc: "We fill forms, prepare documents, provide appointment guidance, and keep you updated on key milestones.",
  },
  {
    title: "Step 7 — Follow-up & Support",
    desc: "We support you via WhatsApp/Email until your OCI card, e-Visa, or Passport is issued and delivered.",
  },
];

export function HowItWorksContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageHero
        eyebrow="Our Process"
        title="How It Works"
        description="We designed FlyOCI so that even if you are not comfortable with online forms, you can get your OCI, visa or passport done easily. Here's the step-by-step journey."
      />

      <section className="bg-[#f7fbff] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="relative space-y-5"
          >
            <div className="pointer-events-none absolute bottom-8 left-5 top-8 hidden w-px bg-gradient-to-b from-[#1c69dd]/40 via-[#93c5fd]/30 to-transparent md:block" />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={pageFadeUp}
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.005 }}
                className="group relative rounded-2xl border border-[#d9e8ff] bg-white p-5 shadow-[0_10px_28px_rgba(30,74,135,0.08)] transition-all hover:border-[#1c69dd]/25 hover:shadow-[0_16px_40px_rgba(28,105,221,0.12)] md:p-6"
              >
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1c69dd] to-[#2563eb] font-heading text-lg font-black text-white shadow-[0_6px_18px_rgba(28,105,221,0.35)] transition-transform group-hover:scale-110 md:h-12 md:w-12">
                      {index + 1}
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <h3 className="mb-2 font-heading text-lg font-bold text-[#041020] transition-colors group-hover:text-[#1c69dd] md:text-xl">
                      {step.title}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-[#486581] md:text-base">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <Link href="/dashboard/document-audit?start=1" className="group inline-block">
              <motion.span
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-8 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(28,105,221,0.35)] transition-shadow hover:shadow-[0_16px_40px_rgba(28,105,221,0.45)]"
              >
                Start My Process
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
