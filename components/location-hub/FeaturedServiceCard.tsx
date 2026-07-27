"use client";

import Link from "next/link";
import type { HubOffering } from "@/lib/api";
import { buildHubApplyHref, formatHubMoney, shortDescription } from "@/lib/location-hub";
import { home } from "@/components/home/homeTheme";

type FeaturedServiceCardProps = {
  offering: HubOffering;
  currencySymbol: string;
  countrySlug: string;
  citySlug?: string | null;
};

export function FeaturedServiceCard({
  offering,
  currencySymbol,
  countrySlug,
  citySlug,
}: FeaturedServiceCardProps) {
  const href = buildHubApplyHref({
    serviceType: offering.service.service_type,
    countrySlug,
    citySlug,
  });

  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <p className={home.eyebrow}>Most popular</p>
        <div className={`${home.card} mt-4 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between`}>
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {offering.service.category?.name || "Featured service"}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-dark">
              {offering.service.service_name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-textMuted">
              {shortDescription(offering.service.description, 160)}
            </p>
            <dl className="mt-4 grid gap-2 text-sm text-dark sm:grid-cols-2">
              <div>
                <dt className="text-textMuted">Processing</dt>
                <dd className="font-semibold">{offering.processing_time || "—"}</dd>
              </div>
              <div>
                <dt className="text-textMuted">Validity</dt>
                <dd className="font-semibold">{offering.validity || "—"}</dd>
              </div>
              <div>
                <dt className="text-textMuted">Govt fee</dt>
                <dd className="font-semibold">{formatHubMoney(currencySymbol, offering.govt_fee)}</dd>
              </div>
              <div>
                <dt className="text-textMuted">Your fee</dt>
                <dd className="font-semibold">{formatHubMoney(currencySymbol, offering.service_fee)}</dd>
              </div>
            </dl>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <p className="text-sm text-textMuted">Total from</p>
            <p className="font-heading text-3xl font-bold text-primary">
              {formatHubMoney(currencySymbol, offering.total_fee)}
            </p>
            <Link href={href} className={`${home.btnPrimary} mt-4`}>
              Apply now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
