"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export type ServiceHighlight = { label: string; value: string };
export type ServiceStat = { label: string; value: string };
export type PricingLine = { label: string; value: string; highlight?: boolean };

export type ServicePageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights?: ServiceHighlight[];
  bulletPoints?: string[];
  extraHeroContent?: React.ReactNode;
  pricing: {
    title?: string;
    lines: PricingLine[];
    footnote?: string;
    ctaLabel: string;
    ctaHref: string;
  };
  stats?: ServiceStat[];
  whoFor?: { title: string; items: string[]; footnote?: string };
  whatYouGet?: { title: string; items: string[] };
  whatWeDo?: { title: string; items: string[]; footnote?: string };
  processSteps?: string[];
};

export function ServicePageLayout({
  eyebrow,
  title,
  description,
  highlights,
  bulletPoints,
  extraHeroContent,
  pricing,
  stats,
  whoFor,
  whatYouGet,
  whatWeDo,
  processSteps,
}: ServicePageLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-14 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pb-16">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#edf5ff] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-10"
          >
            <div>
              <motion.div
                variants={fadeUp}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-heading text-[clamp(1.85rem,4.2vw,2.75rem)] font-black leading-tight tracking-[-0.02em] text-[#041020]"
              >
                {title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-4 max-w-3xl text-base font-semibold leading-relaxed text-[#334e68] sm:text-lg"
              >
                {description}
              </motion.p>

              {bulletPoints && bulletPoints.length > 0 && (
                <motion.ul variants={container} className="mt-6 space-y-2.5">
                  {bulletPoints.map((point) => (
                    <motion.li
                      key={point}
                      variants={fadeUp}
                      className="flex items-start gap-2.5 text-sm font-semibold text-[#486581] sm:text-[15px]"
                    >
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {point}
                    </motion.li>
                  ))}
                </motion.ul>
              )}

              {highlights && highlights.length > 0 && (
                <motion.div
                  variants={container}
                  className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {highlights.map((item) => (
                    <motion.div
                      key={item.label}
                      variants={fadeUp}
                      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                      className="rounded-2xl border border-[#d9e8ff] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(30,74,135,0.08)] transition-shadow hover:shadow-[0_14px_32px_rgba(28,105,221,0.12)]"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#041020]">{item.value}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {extraHeroContent && (
                <motion.div variants={fadeUp} className="mt-6">
                  {extraHeroContent}
                </motion.div>
              )}
            </div>

            <motion.div variants={fadeUp}>
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -8 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="overflow-hidden rounded-3xl border border-[#d6e8ff] bg-white shadow-[0_20px_56px_rgba(30,74,135,0.12)]"
              >
                <div className="h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />
                <div className="p-6 sm:p-7">
                  <h2 className="font-heading text-lg font-black text-[#041020]">
                    {pricing.title ?? "Service Summary"}
                  </h2>
                  <div className="mt-5 space-y-3">
                    {pricing.lines.map((line) => (
                      <div
                        key={line.label}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                          line.highlight
                            ? "border border-[#dbeafe] bg-[#f0f7ff] font-bold text-[#041020]"
                            : "text-[#486581]"
                        }`}
                      >
                        <span className="font-semibold">{line.label}</span>
                        <strong className={line.highlight ? "text-[#1c69dd]" : "text-[#102a43]"}>
                          {line.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {pricing.footnote && (
                    <p className="mt-4 text-xs font-medium leading-relaxed text-[#627d98]">
                      {pricing.footnote}
                    </p>
                  )}
                  <Link href={pricing.ctaHref} className="group mt-6 block">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(28,105,221,0.35)] transition-shadow hover:shadow-[0_14px_36px_rgba(28,105,221,0.45)]"
                    >
                      {pricing.ctaLabel}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </motion.span>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {stats && stats.length > 0 && (
            <motion.div
              variants={container}
              initial={reduceMotion ? false : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  className="group rounded-2xl border border-[#d9e8ff] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(30,74,135,0.07)] transition-all hover:border-[#1c69dd]/25 hover:shadow-[0_16px_40px_rgba(28,105,221,0.12)]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-snug text-[#041020] group-hover:text-[#1c69dd]">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Who for + What you get */}
      {(whoFor || whatYouGet) && (
        <section className="bg-white py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            {whoFor && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="mb-6 font-heading text-2xl font-black text-[#041020]">{whoFor.title}</h2>
                <ul className="space-y-3">
                  {whoFor.items.map((item) => (
                    <motion.li
                      key={item}
                      whileHover={reduceMotion ? undefined : { x: 6 }}
                      className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[15px] font-semibold text-[#334e68] transition-colors hover:border-[#dbeafe] hover:bg-[#f8fbff]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
                {whoFor.footnote && (
                  <p className="mt-6 text-sm font-semibold italic text-[#2b5e93]">{whoFor.footnote}</p>
                )}
              </motion.div>
            )}

            {whatYouGet && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="mb-6 font-heading text-2xl font-black text-[#041020]">{whatYouGet.title}</h2>
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  className="rounded-2xl border border-[#d9e8ff] bg-gradient-to-br from-[#fbfdff] to-[#f0f7ff] p-6 shadow-[0_10px_32px_rgba(30,74,135,0.08)]"
                >
                  <ul className="space-y-3">
                    {whatYouGet.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm font-semibold text-[#486581] sm:text-[15px]"
                      >
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* What we do */}
      {whatWeDo && (
        <section className="bg-[#f7fbff] py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="rounded-3xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_40px_rgba(30,74,135,0.08)] sm:p-8"
            >
              <h3 className="mb-5 font-heading text-xl font-black text-[#041020] sm:text-2xl">
                {whatWeDo.title}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {whatWeDo.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl bg-[#f8fbff] px-3 py-3 text-sm font-semibold text-[#334e68] transition-colors hover:bg-[#eff6ff]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    {item}
                  </li>
                ))}
              </ul>
              {whatWeDo.footnote && (
                <p className="mt-5 text-xs font-medium italic text-[#627d98]">{whatWeDo.footnote}</p>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Process steps */}
      {processSteps && processSteps.length > 0 && (
        <section className="bg-[#f7fbff] py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-3xl border border-[#d9e8ff] bg-white p-6 shadow-[0_16px_48px_rgba(30,74,135,0.1)] sm:p-10"
            >
              <h2 className="mb-8 font-heading text-2xl font-black text-[#041020] sm:text-3xl">
                Step-by-Step Process
              </h2>
              <motion.div
                variants={container}
                initial={reduceMotion ? false : "hidden"}
                whileInView="visible"
                viewport={{ once: true }}
                className="grid gap-4 md:grid-cols-2"
              >
                {processSteps.map((step, i) => (
                  <motion.div
                    key={step}
                    variants={fadeUp}
                    whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
                    className="group flex items-start gap-4 rounded-2xl border border-[#dbe9ff] bg-[#f8fbff] p-4 transition-all hover:border-[#1c69dd]/30 hover:bg-white hover:shadow-[0_12px_32px_rgba(28,105,221,0.1)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1c69dd] to-[#2563eb] text-sm font-black text-white shadow-[0_4px_14px_rgba(28,105,221,0.3)]">
                      {i + 1}
                    </div>
                    <p className="pt-1 font-heading text-base font-bold leading-snug text-[#041020] group-hover:text-[#1c69dd] sm:text-lg">
                      {step}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
    </>
  );
}
