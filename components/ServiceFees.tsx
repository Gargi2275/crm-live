"use client";

import Link from "next/link";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  creditPriceLabel,
  formatGbp,
  priceDisplay,
  type CatalogService,
} from "@/lib/public-pricing";

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
  const popular = service.isPopular;

  return (
    <article
      className={`flex flex-col rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 ${
        popular
          ? "relative border-2 border-[#1a7f5a] bg-[#f4fbf7] hover:shadow-[0_16px_40px_rgba(26,127,90,0.18)]"
          : service.isQuoteBased
            ? "border border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
            : "border border-gray-200 bg-white hover:border-[#1c69dd]/40 hover:shadow-[0_16px_40px_rgba(28,105,221,0.12)]"
      }`}
    >
      {popular ? (
        <span className="absolute top-3 right-3 rounded-full bg-[#1a7f5a] px-2 py-1 text-[10px] font-semibold text-white sm:px-3">
          Popular
        </span>
      ) : null}

      <h3
        className={`text-base font-heading font-bold leading-snug text-primary sm:text-lg ${
          popular ? "pr-14 sm:pr-16" : ""
        }`}
      >
        {service.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-textMuted sm:text-sm">{service.description}</p>

      <div className={`mt-3 border-t pt-3 ${popular ? "border-[#cfe9de]" : "border-gray-200"}`} />

      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Our Fee</p>
      <p
        className={`mt-1 text-xl font-heading font-bold tabular-nums sm:text-2xl ${
          service.isQuoteBased && service.serviceType === "passport_renewal"
            ? "text-gray-500"
            : "text-primary"
        }`}
      >
        {price}
      </p>

      {credit ? (
        <>
          <span className="mt-2.5 inline-flex w-fit rounded-full bg-[#e6f4ee] px-3 py-1 text-xs text-[#0f5c38]">
            {credit}
          </span>
          <p className="mt-1.5 text-xs text-[#0f5c38]">Save {formatGbp(auditFee)} with audit</p>
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
            popular
              ? "bg-[#1a7f5a] text-white hover:bg-[#136648]"
              : service.isQuoteBased
                ? "border border-dashed border-gray-400 text-gray-700 hover:bg-white"
                : "border border-gray-300 text-primary hover:bg-gray-50"
          }`}
        >
          {service.isQuoteBased ? `${service.cta} →` : "Select"}
        </Link>
      </div>
    </article>
  );
}

/** Home “Our Services & Fees” — driven by GET /public/pricing. */
export function ServiceFees() {
  const { services, loading, fromFallback, auditFee } = usePublicPricing();

  // Home grid focuses on sellable services (hide document_audit — called out elsewhere).
  const homeServices = services.filter((s) => s.serviceType !== "document_audit");

  return (
    <section className="bg-transparent">
      <div className="w-full px-3 sm:px-4 lg:px-3">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="mb-3 font-heading text-[clamp(1.75rem,3.2vw,2.4rem)] font-bold tracking-[-0.02em] text-dark">
            Our services &amp; fees
          </h2>
          <p className="mx-auto max-w-2xl font-body text-[15px] text-textMuted sm:text-base">
            Transparent pricing, clearly separated from government fees where they apply.
          </p>
          {fromFallback && !loading ? (
            <p className="mt-2 text-xs font-medium text-[#9C4F17]">
              Showing cached pricing while live catalog is unavailable.
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <FeeCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {homeServices.map((service) => (
              <HomeFeeCard key={String(service.id)} service={service} auditFee={auditFee} />
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-textMuted">
          All prices are per applicant and exclude courier/postage where applicable.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-[#f3f8ff]"
          >
            View full pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
