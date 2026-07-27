"use client";

import Link from "next/link";
import type { HubOffering } from "@/lib/api";
import { buildHubApplyHref, formatHubMoney, shortDescription } from "@/lib/location-hub";
import { home } from "@/components/home/homeTheme";

type HeroSectionProps = {
  locationName: string;
  countryName: string;
  isCity?: boolean;
  primaryHref: string;
  secondaryHref?: string;
  featured?: HubOffering | null;
  currencySymbol?: string;
  countrySlug?: string;
  citySlug?: string | null;
};

export function HeroSection({
  locationName,
  countryName,
  isCity = false,
  primaryHref,
  secondaryHref = "/contact",
  featured = null,
  currencySymbol = "$",
  countrySlug = "",
  citySlug = null,
}: HeroSectionProps) {
  const headline = `Apply Online Indian Consular Services for NRI's in ${locationName}`;
  const featuredHref = featured
    ? buildHubApplyHref({
        serviceType: featured.service.service_type,
        countrySlug,
        citySlug,
      })
    : primaryHref;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f3f8ff] via-white to-[#eef6ff] pb-8 pt-24 sm:pb-10 sm:pt-28">
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(28,105,221,0.12)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.1)_0%,transparent_70%)]" />

      <div
        className={`${home.container} grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)] lg:gap-10`}
      >
        <div>
          <p className={home.eyebrow}>
            {isCity ? `${locationName}, ${countryName}` : `Serving NRIs in ${locationName}`}
          </p>
          <h1 className="mt-2 max-w-3xl font-heading text-[clamp(1.65rem,3.4vw,2.55rem)] font-bold leading-tight tracking-[-0.02em] text-dark">
            {headline}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-textMuted sm:text-[15px]">
            Document preparation, checklist guidance, and end-to-end support for OCI, passport, and
            related Indian consular services in {locationName}.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={primaryHref} className={home.btnPrimary}>
              Start application
            </Link>
            <Link href={secondaryHref} className={home.btnOutline}>
              Talk to an expert
            </Link>
          </div>

          <p className="mt-4 text-[12px] text-textMuted">
            Secure document checks · Clear fee breakdown · Specialist support
          </p>
        </div>

        {featured ? (
          <aside className={`${home.card} relative overflow-hidden p-5 sm:p-6`}>
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <h2 className="font-heading text-xl font-bold text-dark sm:text-2xl">
              {featured.service.service_name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-textMuted">
              {shortDescription(featured.service.description, 110)}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] text-dark">
              <div>
                <dt className="text-[11px] text-textMuted">Processing</dt>
                <dd className="font-semibold">{featured.processing_time || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-textMuted">Validity</dt>
                <dd className="font-semibold">{featured.validity || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-textMuted">Govt fee</dt>
                <dd className="font-semibold">{formatHubMoney(currencySymbol, featured.govt_fee)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-textMuted">Your fee</dt>
                <dd className="font-semibold">
                  {formatHubMoney(currencySymbol, featured.service_fee)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-[12px] text-textMuted">Total from</p>
                <p className="font-heading text-2xl font-bold text-primary sm:text-3xl">
                  {formatHubMoney(currencySymbol, featured.total_fee)}
                </p>
              </div>
              <Link href={featuredHref} className={home.btnPrimary}>
                Apply now
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
