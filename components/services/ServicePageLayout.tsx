"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
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
  const { isAuthenticated } = useAuth();
  const startHref =
    isAuthenticated || !pricing.ctaHref.startsWith("/")
      ? pricing.ctaHref
      : `/auth/login?next=${encodeURIComponent(pricing.ctaHref)}`;

  return (
    <>
      {/* Compact action-first hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_60%)] px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-16 top-8 h-52 w-52 rounded-full bg-[#dbeafe] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-7"
          >
            <div>
              <motion.div
                variants={fadeUp}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1c69dd] shadow-sm"
              >
                <Sparkles className="h-3 w-3" />
                {eyebrow}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-heading text-[clamp(1.7rem,3.5vw,2.55rem)] font-black leading-[1.12] tracking-[-0.03em] text-[#041020]"
              >
                {title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[#486581] sm:text-base"
              >
                {description}
              </motion.p>

              {bulletPoints && bulletPoints.length > 0 ? (
                <motion.ul variants={container} className="mt-4 space-y-2">
                  {bulletPoints.map((point) => (
                    <motion.li
                      key={point}
                      variants={fadeUp}
                      className="flex items-start gap-2 text-sm font-semibold text-[#486581]"
                    >
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {point}
                    </motion.li>
                  ))}
                </motion.ul>
              ) : null}

              {highlights && highlights.length > 0 ? (
                <motion.div variants={fadeUp} className="mt-4 flex flex-wrap gap-2">
                  {highlights.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-[#d6e8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581]"
                    >
                      <span className="text-[#829ab1]">{item.label}: </span>
                      {item.value}
                    </span>
                  ))}
                </motion.div>
              ) : null}

              {extraHeroContent ? (
                <motion.div variants={fadeUp} className="mt-4">
                  {extraHeroContent}
                </motion.div>
              ) : null}

              {/* Quick benefits under CTA area on mobile — pulled from whatYouGet */}
              {whatYouGet ? (
                <motion.div
                  variants={fadeUp}
                  className="mt-5 hidden rounded-2xl border border-[#e2ecf8] bg-[#f8fbff] p-4 lg:block"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1c69dd]">
                    {whatYouGet.title}
                  </p>
                  <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {whatYouGet.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm font-medium text-[#334e68]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1c69dd]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </div>

            {/* Pricing / start card — primary action */}
            <motion.div variants={fadeUp} className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-[#d6e8ff] bg-white shadow-[0_16px_40px_rgba(28,105,221,0.12)]">
                <div className="h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />
                <div className="p-5 sm:p-6">
                  <h2 className="font-heading text-base font-bold text-[#041020]">
                    {pricing.title ?? "Start this service"}
                  </h2>
                  <div className="mt-4 space-y-2">
                    {pricing.lines.map((line) => (
                      <div
                        key={line.label}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                          line.highlight
                            ? "border border-[#dbeafe] bg-[#f0f7ff] font-bold text-[#041020]"
                            : "bg-[#f8fbff] text-[#486581]"
                        }`}
                      >
                        <span className="font-semibold">{line.label}</span>
                        <strong className={line.highlight ? "text-[#1c69dd]" : "text-[#102a43]"}>
                          {line.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {pricing.footnote ? (
                    <p className="mt-3 text-xs leading-relaxed text-[#627d98]">{pricing.footnote}</p>
                  ) : null}
                  <Link
                    href={startHref}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c69dd] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(28,105,221,0.3)] transition hover:bg-[#1558c0]"
                  >
                    {pricing.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/services"
                    className="mt-2.5 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1c69dd] hover:bg-[#f4f8ff]"
                  >
                    Browse all services
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {stats && stats.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[#e2ecf8] bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829ab1]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#041020]">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Secondary detail — denser, below the fold */}
      {(whoFor || whatYouGet || whatWeDo || (processSteps && processSteps.length > 0)) && (
        <section className="border-t border-[#e8f1ff] bg-[#f8fbff] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
            {whoFor ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5">
                <h2 className="font-heading text-lg font-bold text-[#041020]">{whoFor.title}</h2>
                <ul className="mt-3 space-y-2">
                  {whoFor.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-medium text-[#334e68]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
                {whoFor.footnote ? (
                  <p className="mt-3 text-xs font-medium text-[#627d98]">{whoFor.footnote}</p>
                ) : null}
              </div>
            ) : null}

            {whatYouGet ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5 lg:hidden">
                <h2 className="font-heading text-lg font-bold text-[#041020]">{whatYouGet.title}</h2>
                <ul className="mt-3 space-y-2">
                  {whatYouGet.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-medium text-[#334e68]">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {whatWeDo ? (
              <div className={`rounded-2xl border border-[#e2ecf8] bg-white p-5 ${whoFor ? "" : "lg:col-span-2"}`}>
                <h2 className="font-heading text-lg font-bold text-[#041020]">{whatWeDo.title}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {whatWeDo.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-medium text-[#334e68]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
                {whatWeDo.footnote ? (
                  <p className="mt-3 text-xs font-medium text-[#627d98]">{whatWeDo.footnote}</p>
                ) : null}
              </div>
            ) : null}

            {processSteps && processSteps.length > 0 ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5 lg:col-span-2">
                <h2 className="font-heading text-lg font-bold text-[#041020]">Step-by-step process</h2>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {processSteps.map((step, i) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-xl border border-[#eef3fa] bg-[#f8fbff] px-3.5 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1c69dd] text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="pt-0.5 text-sm font-semibold leading-snug text-[#041020]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}
