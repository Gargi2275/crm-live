"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HubCitySummary, HubCountrySummary, HubOffering } from "@/lib/api";
import { getLocationHubFaqs } from "@/lib/location-hub-faqs";
import { buildHubApplyHref } from "@/lib/location-hub";
import { home } from "@/components/home/homeTheme";
import { HeroSection } from "@/components/location-hub/HeroSection";
import { ServiceFilterTabs } from "@/components/location-hub/ServiceFilterTabs";
import { ServiceGrid } from "@/components/location-hub/ServiceCard";
import { ComparisonTable } from "@/components/location-hub/ComparisonTable";
import { ProcessSteps } from "@/components/location-hub/ProcessSteps";
import { WhyUsGrid } from "@/components/location-hub/WhyUsGrid";
import { DIYComparisonTable } from "@/components/location-hub/DIYComparisonTable";
import { DocumentsAccordion } from "@/components/location-hub/DocumentsAccordion";
import { FAQAccordion } from "@/components/location-hub/FAQAccordion";
import { Testimonials } from "@/components/location-hub/Testimonials";

type LocationHubPageProps = {
  country: HubCountrySummary;
  city?: HubCitySummary | null;
  cities?: HubCitySummary[];
  offerings: HubOffering[];
};

export function LocationHubPage({
  country,
  city = null,
  cities = [],
  offerings,
}: LocationHubPageProps) {
  const [filter, setFilter] = useState("all");
  const locationName = city?.name || country.name;
  const faqSlug = city?.slug || country.slug;
  const currencySymbol = country.currency_symbol || "$";

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const offering of offerings) {
      const cat = offering.service.category;
      if (cat?.slug) map.set(cat.slug, cat.name);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [offerings]);

  const filtered = useMemo(() => {
    if (filter === "all") return offerings;
    return offerings.filter((o) => o.service.category?.slug === filter);
  }, [offerings, filter]);

  const featured = offerings.find((o) => o.is_popular) || offerings[0] || null;
  const primaryHref = featured
    ? buildHubApplyHref({
        serviceType: featured.service.service_type,
        countrySlug: country.slug,
        citySlug: city?.slug,
      })
    : "/services";

  return (
    <div className="bg-white">
      <HeroSection
        locationName={locationName}
        countryName={country.name}
        isCity={Boolean(city)}
        primaryHref={primaryHref}
        featured={featured}
        currencySymbol={currencySymbol}
        countrySlug={country.slug}
        citySlug={city?.slug}
      />

      <section className={home.sectionSoft}>
        <div className={home.container}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={home.h2}>Services in {locationName}</h2>
              <p className={home.lead}>Filter by category. Prices use {country.currency_code} ({currencySymbol}).</p>
            </div>
            <ServiceFilterTabs categories={categories} active={filter} onChange={setFilter} />
          </div>
          <ServiceGrid
            offerings={filtered}
            currencySymbol={currencySymbol}
            countrySlug={country.slug}
            citySlug={city?.slug}
          />
          {!offerings.length ? (
            <p className="mt-4 text-center text-sm text-textMuted">
              Browse other locations from the footer, or contact us for a custom quote.
            </p>
          ) : null}
        </div>
      </section>

      {!city && cities.length > 0 ? (
        <section className={home.sectionWhite}>
          <div className={home.container}>
            <h2 className={home.h2}>Cities we serve in {country.name}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {cities.map((item) => (
                <Link
                  key={item.slug}
                  href={`/service/${country.slug}/${item.slug}`}
                  className={home.btnOutline}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {city ? (
        <section className="border-y border-border bg-[#f8fbff] py-4">
          <div className={home.container}>
            <p className="text-sm text-textMuted">
              Viewing city pricing for <span className="font-semibold text-dark">{city.name}</span>.{" "}
              <Link href={`/service/${country.slug}`} className={home.linkAccent}>
                See all {country.name} services
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <ComparisonTable offerings={offerings} currencySymbol={currencySymbol} />
      <ProcessSteps />
      <WhyUsGrid />
      <DIYComparisonTable />
      <DocumentsAccordion offerings={offerings} />
      <Testimonials />
      <FAQAccordion faqs={getLocationHubFaqs(faqSlug)} />
    </div>
  );
}
