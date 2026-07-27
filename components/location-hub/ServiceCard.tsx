"use client";

import Link from "next/link";
import type { HubOffering } from "@/lib/api";
import { buildHubApplyHref, formatHubMoney, shortDescription } from "@/lib/location-hub";
import { home } from "@/components/home/homeTheme";

type ServiceCardProps = {
  offering: HubOffering;
  currencySymbol: string;
  countrySlug: string;
  citySlug?: string | null;
};

export function ServiceCard({ offering, currencySymbol, countrySlug, citySlug }: ServiceCardProps) {
  const href = buildHubApplyHref({
    serviceType: offering.service.service_type,
    countrySlug,
    citySlug,
  });
  const badge = offering.is_popular
    ? "Most Popular"
    : offering.service.category?.name || null;

  return (
    <article className={`${home.card} flex h-full flex-col p-5`}>
      {badge ? (
        <span className="mb-3 inline-flex w-fit rounded-full border border-border bg-[#f3f8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
          {badge}
        </span>
      ) : null}
      <h3 className="font-heading text-lg font-bold text-dark">{offering.service.service_name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-textMuted">
        {shortDescription(offering.service.description)}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3 border-b border-border/70 pb-2">
          <dt className="text-textMuted">Processing</dt>
          <dd className="font-semibold text-dark">{offering.processing_time || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-border/70 pb-2">
          <dt className="text-textMuted">Govt fees</dt>
          <dd className="font-semibold text-dark">{formatHubMoney(currencySymbol, offering.govt_fee)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-border/70 pb-2">
          <dt className="text-textMuted">Your fees</dt>
          <dd className="font-semibold text-dark">{formatHubMoney(currencySymbol, offering.service_fee)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-textMuted">Validity</dt>
          <dd className="font-semibold text-dark">{offering.validity || "—"}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-heading text-xl font-bold text-primary">
          {formatHubMoney(currencySymbol, offering.total_fee)}
        </p>
        <Link href={href} className={home.btnDark}>
          Apply
        </Link>
      </div>
    </article>
  );
}

type ServiceGridProps = {
  offerings: HubOffering[];
  currencySymbol: string;
  countrySlug: string;
  citySlug?: string | null;
};

export function ServiceGrid({ offerings, currencySymbol, countrySlug, citySlug }: ServiceGridProps) {
  if (!offerings.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
        <p className="font-heading text-lg font-semibold text-dark">Services coming soon</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-textMuted">
          We’re configuring fees for this location. You can still start a document check from our
          main services, or talk to an expert.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/services" className={home.btnPrimary}>
            View all services
          </Link>
          <Link href="/contact" className={home.btnOutline}>
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {offerings.map((offering) => (
        <ServiceCard
          key={`${offering.service.id}-${offering.fee_source}`}
          offering={offering}
          currencySymbol={currencySymbol}
          countrySlug={countrySlug}
          citySlug={citySlug}
        />
      ))}
    </div>
  );
}
