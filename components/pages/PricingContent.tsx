"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { CTABanner } from "@/components/CTABanner";
import { PageHero } from "@/components/pages/PageHero";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  creditPriceLabel,
  formatGbp,
  priceDisplay,
  type CatalogService,
  type PricingCategoryId,
} from "@/lib/public-pricing";

const notes = [
  "All service fees are per applicant unless stated otherwise.",
  "Government, VFS, and courier fees are separate where applicable.",
  "Apostille pricing is confirmed after free document pre-check.",
];

function PricingCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[#d9e8ff] bg-white p-5 sm:p-6 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-[#e8f1ff]" />
      <div className="mt-3 h-4 w-full rounded bg-[#f0f5ff]" />
      <div className="mt-5 h-px bg-[#edf3ff]" />
      <div className="mt-4 h-3 w-16 rounded bg-[#e8f1ff]" />
      <div className="mt-2 h-8 w-24 rounded bg-[#dbeafe]" />
      <div className="mt-4 h-10 w-full rounded-2xl bg-[#f0f5ff]" />
    </div>
  );
}

function PricingCard({
  service,
  auditFee,
  reduceMotion,
}: {
  service: CatalogService;
  auditFee: number;
  reduceMotion: boolean | null;
}) {
  const [open, setOpen] = useState(false);
  const credit = creditPriceLabel(service, auditFee);
  const price = priceDisplay(service);

  return (
    <motion.article
      variants={pageFadeUp}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className={`relative flex flex-col overflow-hidden rounded-3xl border p-5 shadow-[0_12px_32px_rgba(30,74,135,0.08)] transition-shadow hover:shadow-[0_16px_40px_rgba(28,105,221,0.12)] sm:p-6 ${
        service.isPopular
          ? "border-[#1c69dd]/35 bg-gradient-to-br from-[#f0f7ff] to-white ring-1 ring-[#1c69dd]/15"
          : service.isQuoteBased
            ? "border-dashed border-[#c5d9f5] bg-[#f8fbff]"
            : "border-[#d9e8ff] bg-white"
      }`}
    >
      {service.isPopular && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#1c69dd] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <Sparkles className="h-3 w-3" />
          Popular
        </span>
      )}

      <h3 className="pr-16 font-heading text-lg font-black leading-snug text-[#041020] sm:text-xl">
        {service.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-[#486581]">
        {service.description}
      </p>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-[#dbeafe] to-transparent" />

      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">Our fee</p>
      <p className="mt-1 font-mono text-2xl font-black text-[#041020] sm:text-3xl">{price}</p>

      {credit ? (
        <span className="mt-2.5 inline-flex w-fit rounded-full bg-[#eaf3ff] px-2.5 py-1 text-xs font-bold text-[#1c69dd]">
          {credit}
        </span>
      ) : service.governmentFee > 0 ? (
        <span className="mt-2.5 inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
          Incl. govt ~{formatGbp(service.governmentFee)}
        </span>
      ) : null}

      {(service.detailNotes.length > 0 || service.processingDays) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1c69dd] hover:underline"
            aria-expanded={open}
          >
            View details
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open ? (
            <ul className="mt-2 space-y-1.5 rounded-xl border border-[#e8f1ff] bg-[#f8fbff] px-3 py-2.5">
              {service.processingDays ? (
                <li className="text-xs font-medium text-[#486581]">
                  Typical processing: {service.processingDays} days
                </li>
              ) : null}
              {service.detailNotes.map((note) => (
                <li key={note} className="text-xs font-medium leading-relaxed text-[#627d98]">
                  {note}
                </li>
              ))}
              {service.auditCreditEligible ? (
                <li className="text-xs font-medium text-[#627d98]">
                  Save {formatGbp(auditFee)} when you audit first
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

      <Link href={service.href} className="group mt-auto pt-4">
        <span
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
            service.isPopular
              ? "bg-gradient-to-r from-[#1c69dd] to-[#2563eb] text-white shadow-[0_8px_24px_rgba(28,105,221,0.3)]"
              : "border border-[#cfe2ff] bg-white text-[#1c69dd] hover:bg-[#f4f8ff]"
          }`}
        >
          {service.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.article>
  );
}

export function PricingContent() {
  const reduceMotion = useReducedMotion();
  const { services, categories, loading, fromFallback, auditFee } = usePublicPricing();
  const [activeCategory, setActiveCategory] = useState<PricingCategoryId | "all">("all");

  const visible = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  return (
    <>
      <PageHero
        eyebrow="Transparent Pricing"
        title="Simple, Fixed Service Fees"
        description="No hidden charges. Know our fee upfront — government and VFS costs are always explained separately before you proceed."
        highlights={[
          { label: "Audit credit", value: `${formatGbp(auditFee)} off OCI services` },
          { label: "Payment", value: "Secure online checkout" },
          { label: "Quote-based", value: "Passport & apostille" },
        ]}
      />

      <section className="bg-white pb-16 pt-4 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!loading && categories.length > 1 ? (
            <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-[#e8f1ff] bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => {
                  const selected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        selected
                          ? "bg-[#1c69dd] text-white"
                          : "bg-[#f4f8ff] text-[#486581] hover:bg-[#eaf3ff]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {fromFallback && !loading ? (
            <p className="mb-4 text-xs font-medium text-[#9C4F17]">
              Showing cached pricing while live catalog is unavailable.
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PricingCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <motion.div
              variants={pageContainer}
              initial={reduceMotion ? false : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
            >
              {visible.map((service) => (
                <PricingCard
                  key={String(service.id)}
                  service={service}
                  auditFee={auditFee}
                  reduceMotion={reduceMotion}
                />
              ))}
            </motion.div>
          )}

          {!loading && visible.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium text-[#627d98]">
              No services in this category right now.
            </p>
          ) : null}

          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mt-10 max-w-3xl space-y-2.5 rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-5 sm:p-6"
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
