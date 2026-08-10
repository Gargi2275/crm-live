"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  formatGbpAmount,
  useServiceCountryPricing,
} from "@/lib/service-country-pricing";

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
  /** Catalog service_type — enables country dropdown + live fee from /services/<id>/price/ */
  serviceType?: string;
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
  serviceType,
  pricing,
  stats,
  whoFor,
  whatYouGet,
  whatWeDo,
  processSteps,
}: ServicePageLayoutProps) {
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const { countries, countrySlug, price, loading, onCountryChange } =
    useServiceCountryPricing(serviceType);

  const pricingLines = useMemo(() => {
    if (!serviceType || !price) return pricing.lines;
    const lines: PricingLine[] = [
      {
        label: "Service fee",
        value: formatGbpAmount(price.service_fee || price.total_fee),
        highlight: true,
      },
    ];
    const audit = Number(price.audit_fee);
    if (Number.isFinite(audit) && audit > 0) {
      lines.push({
        label: "Assessment fee",
        value: formatGbpAmount(price.audit_fee),
      });
    }
    return lines;
  }, [serviceType, price, pricing.lines]);

  const startHref = useMemo(() => {
    let href = pricing.ctaHref;
    if (serviceType && countrySlug && href.startsWith("/")) {
      const url = new URL(href, "https://flyoci.local");
      url.searchParams.set("country", countrySlug);
      href = `${url.pathname}${url.search}`;
    }
    return isAuthenticated || !href.startsWith("/")
      ? href
      : `/auth/login?next=${encodeURIComponent(href)}`;
  }, [pricing.ctaHref, serviceType, countrySlug, isAuthenticated]);

  return (
    <>
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

            <motion.div variants={fadeUp} className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-[#d6e8ff] bg-white shadow-[0_16px_40px_rgba(28,105,221,0.12)]">
                <div className="h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />
                <div className="p-5 sm:p-6">
                  <h2 className="font-heading text-base font-bold text-[#041020]">
                    {pricing.title ?? "Start this service"}
                  </h2>

                  {serviceType && countries.length > 0 ? (
                    <label className="mt-4 block">
                      <span className="text-xs font-semibold text-[#627d98]">Your country</span>
                      <select
                        value={countrySlug}
                        onChange={(e) => onCountryChange(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#d6e8ff] bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#102a43] outline-none focus:border-[#1c69dd]"
                      >
                        {countries.map((country) => (
                          <option key={country.id} value={country.slug}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {loading && serviceType ? (
                      <p className="rounded-xl bg-[#f8fbff] px-3 py-2.5 text-sm text-[#829ab1]">
                        Updating price…
                      </p>
                    ) : (
                      pricingLines.map((line) => (
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
                      ))
                    )}
                  </div>
                  {price?.source === "country_override" ? (
                    <p className="mt-2 text-[11px] font-medium text-[#1c69dd]">
                      Price for {price.country_name || countrySlug}
                    </p>
                  ) : null}
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

      {(whoFor || whatYouGet || whatWeDo || (processSteps && processSteps.length > 0)) && (
        <section className="border-t border-[#e8f1ff] bg-[#f8fbff] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
            {whoFor ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5">
                <h3 className="font-heading text-lg font-bold text-[#041020]">{whoFor.title}</h3>
                <ul className="mt-3 space-y-2">
                  {whoFor.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#486581]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
                {whoFor.footnote ? (
                  <p className="mt-3 text-xs text-[#829ab1]">{whoFor.footnote}</p>
                ) : null}
              </div>
            ) : null}

            {whatWeDo ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5">
                <h3 className="font-heading text-lg font-bold text-[#041020]">{whatWeDo.title}</h3>
                <ul className="mt-3 space-y-2">
                  {whatWeDo.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#486581]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
                {whatWeDo.footnote ? (
                  <p className="mt-3 text-xs text-[#829ab1]">{whatWeDo.footnote}</p>
                ) : null}
              </div>
            ) : null}

            {whatYouGet ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5 lg:hidden">
                <h3 className="font-heading text-lg font-bold text-[#041020]">{whatYouGet.title}</h3>
                <ul className="mt-3 space-y-2">
                  {whatYouGet.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#486581]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {processSteps && processSteps.length > 0 ? (
              <div className="rounded-2xl border border-[#e2ecf8] bg-white p-5 lg:col-span-2">
                <h3 className="font-heading text-lg font-bold text-[#041020]">How it works</h3>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {processSteps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-2 rounded-xl bg-[#f8fbff] px-3 py-2.5 text-sm text-[#486581]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c69dd] text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}
