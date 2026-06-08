"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { CTABanner } from "@/components/CTABanner";
import { PageHero } from "@/components/pages/PageHero";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";

type PricingTier = {
  title: string;
  subtitle: string;
  price: string;
  credit?: string;
  creditNote?: string;
  popular?: boolean;
  dashed?: boolean;
  href: string;
  cta: string;
};

const tiers: PricingTier[] = [
  {
    title: "Document Audit",
    subtitle: "Pre-check before any application",
    price: "£15",
    credit: "Credited on OCI services",
    creditNote: "Fully deducted from New OCI, Renewal, or Update within 30 days",
    href: "/document-audit",
    cta: "Book audit",
  },
  {
    title: "New OCI Application",
    subtitle: "Most selected by first-time applicants",
    price: "£88",
    credit: "£73 with audit credit",
    creditNote: "Save £15 when you audit first",
    popular: true,
    href: "/services/new-oci",
    cta: "View service",
  },
  {
    title: "OCI Renewal / Transfer",
    subtitle: "Transfer OCI to a new passport",
    price: "£78",
    credit: "£63 with audit credit",
    creditNote: "Save £15 when you audit first",
    href: "/services/oci-renewal",
    cta: "View service",
  },
  {
    title: "OCI Update (Gratis)",
    subtitle: "Mandatory portal updates",
    price: "£50",
    credit: "£35 with audit credit",
    creditNote: "Government fee is nil — we handle the portal work",
    href: "/services/oci-update",
    cta: "View service",
  },
  {
    title: "Indian e-Visa 1 Year",
    subtitle: "Includes government fee guidance",
    price: "£88",
    creditNote: "Audit credit does not apply to e-Visa",
    href: "/services/indian-evisa",
    cta: "View service",
  },
  {
    title: "Indian e-Visa 5 Year",
    subtitle: "Longer validity for frequent travel",
    price: "£150",
    creditNote: "Audit credit does not apply to e-Visa",
    href: "/services/indian-evisa",
    cta: "View service",
  },
  {
    title: "Indian Passport Renewal",
    subtitle: "Quote based on category & courier",
    price: "On request",
    dashed: true,
    creditNote: "Share your case for an exact quote",
    href: "/services/passport-renewal",
    cta: "Get a quote",
  },
];

const notes = [
  "All service fees are per applicant unless stated otherwise.",
  "Government, VFS, and courier fees are separate where applicable.",
  "Apostille pricing is confirmed after free document pre-check.",
];

export function PricingContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageHero
        eyebrow="Transparent Pricing"
        title="Simple, Fixed Service Fees"
        description="No hidden charges. Know our fee upfront — government and VFS costs are always explained separately before you proceed."
        highlights={[
          { label: "Audit credit", value: "£15 off OCI services" },
          { label: "Payment", value: "Secure online checkout" },
          { label: "Quote-based", value: "Passport renewal only" },
        ]}
      />

      <section className="bg-white pb-16 pt-4 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6"
          >
            {tiers.map((tier) => (
              <motion.article
                key={tier.title}
                variants={pageFadeUp}
                whileHover={reduceMotion ? undefined : { y: -8, scale: 1.01 }}
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 shadow-[0_12px_32px_rgba(30,74,135,0.08)] transition-shadow hover:shadow-[0_20px_48px_rgba(28,105,221,0.14)] sm:p-7 ${
                  tier.popular
                    ? "border-[#1c69dd]/35 bg-gradient-to-br from-[#f0f7ff] to-white ring-1 ring-[#1c69dd]/15"
                    : tier.dashed
                      ? "border-dashed border-[#c5d9f5] bg-[#f8fbff]"
                      : "border-[#d9e8ff] bg-white"
                }`}
              >
                {tier.popular && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#1c69dd] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                )}
                <h3 className="pr-16 font-heading text-xl font-black text-[#041020]">{tier.title}</h3>
                <p className="mt-2 min-h-[40px] text-sm font-medium text-[#486581]">{tier.subtitle}</p>
                <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#dbeafe] to-transparent" />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">Our fee</p>
                <p className="mt-1 font-mono text-3xl font-black text-[#041020]">{tier.price}</p>
                {tier.credit && (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-bold text-[#1c69dd]">
                    {tier.credit}
                  </span>
                )}
                {tier.creditNote && (
                  <p className="mt-3 text-xs font-medium leading-relaxed text-[#627d98]">{tier.creditNote}</p>
                )}
                <Link href={tier.href} className="group mt-auto pt-6">
                  <motion.span
                    whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                      tier.popular
                        ? "bg-gradient-to-r from-[#1c69dd] to-[#2563eb] text-white shadow-[0_8px_24px_rgba(28,105,221,0.3)]"
                        : "border border-[#cfe2ff] bg-white text-[#1c69dd] hover:bg-[#f4f8ff]"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </motion.span>
                </Link>
              </motion.article>
            ))}
          </motion.div>

          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mt-12 max-w-3xl space-y-3 rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-6"
          >
            {notes.map((note) => (
              <li key={note} className="flex items-start gap-2.5 text-sm font-semibold text-[#334e68]">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                {note}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
