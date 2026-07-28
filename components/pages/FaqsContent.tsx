"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HelpCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/pages/PageHero";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";
import { FAQ_ITEMS } from "@/lib/data/faqs";

export function FaqsContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageHero
        eyebrow="Help Centre"
        title="Frequently Asked Questions"
        description="Clear answers about OCI, e-Visa, passport renewal, document checks, and how FlyOCI supports UK and US residents."
        highlights={[
          { label: "Topics", value: "OCI · e-Visa · Passport" },
          { label: "Support", value: "Email & WhatsApp" },
          { label: "Still unsure?", value: "Contact us anytime" },
        ]}
      />

      <section className="bg-white pb-20 pt-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-3"
          >
            {FAQ_ITEMS.map((item, index) => (
              <motion.details
                key={item.question}
                variants={pageFadeUp}
                className="group overflow-hidden rounded-2xl border border-[#d9e8ff] bg-white shadow-[0_8px_24px_rgba(30,74,135,0.06)] transition-all open:border-[#1c69dd]/25 open:shadow-[0_14px_36px_rgba(28,105,221,0.1)] hover:border-[#1c69dd]/20"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 sm:px-6">
                  <span className="flex items-start gap-3 text-left font-heading text-base font-bold text-[#041020] sm:text-lg">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#1c69dd]" />
                    {item.question}
                  </span>
                  <span className="mt-1 shrink-0 text-xl font-light text-[#1c69dd] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="border-t border-[#eef4fc] px-5 pb-5 pt-4 sm:px-6">
                  <p className="text-sm font-medium leading-relaxed text-[#486581] sm:text-[15px]">{item.answer}</p>
                </div>
              </motion.details>
            ))}
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 overflow-hidden rounded-3xl border border-[#d9e8ff] bg-gradient-to-br from-[#f8fbff] to-[#eef5ff] p-8 text-center shadow-[0_16px_40px_rgba(30,74,135,0.1)] sm:p-10"
          >
            <MessageCircle className="mx-auto h-10 w-10 text-[#1c69dd]" />
            <h2 className="mt-4 font-heading text-2xl font-black text-[#041020]">Didn&apos;t find your answer?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-[#486581] sm:text-base">
              Send us your question — we typically reply within 24 hours on email and WhatsApp.
            </p>
            <Link href="/contact" className="group mt-6 inline-block">
              <motion.span
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(28,105,221,0.35)]"
              >
                Contact support
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
