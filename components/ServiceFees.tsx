"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  creditPriceLabel,
  formatGbp,
  priceDisplay,
  type CatalogService,
} from "@/lib/public-pricing";
import { getPublicHomepageSettings, type PublicHomepageSettings } from "@/lib/api";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/home/HomeScrollMotion";

function FeeCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="h-5 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-4 w-full rounded bg-gray-50" />
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="h-3 w-14 rounded bg-gray-100" />
        <div className="mt-2 h-7 w-16 rounded bg-gray-200" />
        <div className="mt-3 h-6 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="mt-5 h-9 w-full rounded-xl bg-gray-100" />
    </div>
  );
}

function HomeFeeCard({ service, auditFee }: { service: CatalogService; auditFee: number }) {
  const credit = creditPriceLabel(service, auditFee);
  const price = priceDisplay(service);

  return (
    <article
      className={`flex h-full flex-col rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 ${
        service.isQuoteBased
          ? "border border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
          : "border border-gray-200 bg-white hover:border-[#1c69dd]/40 hover:shadow-[0_16px_40px_rgba(28,105,221,0.12)]"
      }`}
    >
      <h3 className="text-base font-heading font-bold leading-snug text-dark sm:text-lg">
        {service.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-textMuted sm:text-sm">{service.description}</p>

      <div className="mt-3 border-t border-gray-200 pt-3" />

      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Our Fee</p>
      <p className="mt-1 text-xl font-heading font-bold tabular-nums text-dark sm:text-2xl">
        {price}
      </p>

      {credit ? (
        <>
          <span className="mt-2.5 inline-flex w-fit rounded-full bg-[#e6f4ee] px-3 py-1 text-xs text-[#0f5c38]">
            {credit}
          </span>
          <p className="mt-1.5 text-xs text-[#0f5c38]">Save {formatGbp(auditFee)} with assessment credit</p>
        </>
      ) : service.governmentFee > 0 ? (
        <>
          <span className="mt-2.5 inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
            No credit
          </span>
          <p className="mt-1.5 text-xs text-gray-400">
            Includes government fee of approx. {formatGbp(service.governmentFee)}
          </p>
        </>
      ) : service.isQuoteBased ? (
        <>
          <span className="mt-2.5 inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
            Quote-based
          </span>
          <p className="mt-1.5 text-xs text-gray-400">
            {service.detailNotes[0] || "Share your case for an exact quote"}
          </p>
        </>
      ) : null}

      <div className="mt-auto pt-4">
        <Link
          href={service.href}
          className={`block w-full rounded-xl py-2 text-center text-sm font-semibold transition-colors sm:py-2.5 sm:text-base ${
            service.isQuoteBased
              ? "border border-dashed border-gray-400 text-gray-700 hover:bg-white"
              : "border border-gray-300 text-dark hover:bg-gray-50"
          }`}
        >
          {service.isQuoteBased ? `${service.cta} →` : "Select"}
        </Link>
      </div>
    </article>
  );
}

/** Home Our Services and Fees — driven by GET /public/pricing + homepage settings. */
export function ServiceFees() {
  const { services, loading, fromFallback, auditFee } = usePublicPricing();
  const [settings, setSettings] = useState<PublicHomepageSettings>({
    pricing_preview_count: 6,
    pricing_title: "Our services & fees",
    pricing_subtitle: "Transparent pricing, clearly separated from government fees where they apply.",
  });

  useEffect(() => {
    let active = true;
    void getPublicHomepageSettings().then((next) => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const eligible = services.filter((s) => s.serviceType !== "document_audit");
  const featured = eligible.filter((s) => s.showOnHomepage);
  const pool = featured.length > 0 ? featured : eligible;
  const homeServices = pool.slice(0, Math.max(1, settings.pricing_preview_count || 6));

  return (
    <section className="bg-transparent">
      <div className="w-full px-3 sm:px-4 lg:px-3">
        <ScrollReveal className="mb-8 text-center sm:mb-10">
          <h2 className="mb-3 font-heading text-[clamp(1.75rem,3.2vw,2.4rem)] font-bold tracking-[-0.02em] text-dark">
            {settings.pricing_title}
          </h2>
          <p className="mx-auto max-w-2xl font-body text-[15px] text-textMuted sm:text-base">
            {settings.pricing_subtitle}
          </p>
          {fromFallback && !loading ? (
            <p className="mt-2 text-xs font-medium text-[#9C4F17]">
              Showing cached pricing while live catalog is unavailable.
            </p>
          ) : null}
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
            {Array.from({ length: Math.min(6, settings.pricing_preview_count || 6) }).map((_, i) => (
              <FeeCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <StaggerReveal className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
            {homeServices.map((service) => (
              <StaggerItem key={String(service.id)}>
                <HomeFeeCard service={service} auditFee={auditFee} />
              </StaggerItem>
            ))}
          </StaggerReveal>
        )}

        <ScrollReveal delay={0.15} className="mt-6 text-center">
          <p className="text-xs text-textMuted">
            All prices are per applicant and exclude courier/postage where applicable.
          </p>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-[#f3f8ff]"
            >
              View full pricing
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
