"use client";

import { useState } from "react";
import Link from "next/link";
import { home } from "@/components/home/homeTheme";
import { ParallaxY, ScrollReveal, StaggerItem, StaggerReveal } from "@/components/home/HomeScrollMotion";

export type OriginCountryCard = {
  id: number;
  country_code: string;
  name: string;
  slug?: string;
  destination_code: string;
  badge: string;
  service_label: string;
  href: string;
  secondary_label?: string;
  secondary_href?: string;
  image_url: string;
};

type OriginCountriesSectionProps = {
  title?: string;
  subtitle?: string;
  countries: OriginCountryCard[];
};

function formatBadge(badge: string, countryCode: string, destinationCode: string) {
  const raw = (badge || "").trim();
  if (raw.includes("→") || raw.includes("->")) {
    return raw.replace(/->/g, "→");
  }
  if (raw.includes(" - ")) {
    return raw.replace(/\s-\s/g, " → ");
  }
  const from = (countryCode || "").trim().toUpperCase();
  const to = (destinationCode || "IN").trim().toUpperCase();
  if (from) return `${from} → ${to}`;
  return raw;
}

function CountryThumb({ name, countryCode, imageUrl }: { name: string; countryCode: string; imageUrl: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(imageUrl) && !broken;

  return (
    <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-[#ecf6ff] sm:h-[96px] sm:w-[96px]">
      {showImage ? (
        <ParallaxY from={10} to={-14} className="h-[120%] w-full -mt-[10%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        </ParallaxY>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
          {countryCode}
        </div>
      )}
    </div>
  );
}

export function OriginCountriesSection({
  title = "Apply for an Indian Visa from These Countries",
  subtitle = "Apply for Indian visas from the USA, UK, Canada, Australia, and other countries with FlyOCI.",
  countries,
}: OriginCountriesSectionProps) {
  if (!countries.length) return null;

  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <ScrollReveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={home.h2}>{title}</h2>
            <p className={`${home.lead} mx-auto`}>{subtitle}</p>
          </div>
        </ScrollReveal>

        <StaggerReveal className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {countries.map((country) => {
            const href =
              country.href ||
              (country.slug ? `/visa/india/${country.slug}` : "/services/indian-evisa");
            const badge = formatBadge(country.badge, country.country_code, country.destination_code);

            return (
              <StaggerItem key={country.id}>
                <Link
                  href={href}
                  className={`group flex min-w-0 items-center gap-4 ${home.card} p-4 transition duration-200 hover:-translate-y-0.5`}
                >
                  <CountryThumb
                    name={country.name}
                    countryCode={country.country_code}
                    imageUrl={country.image_url}
                  />

                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-accent">
                      {badge}
                    </p>
                    <h3 className="mt-1 font-heading text-[15px] font-bold leading-snug text-dark sm:text-[16px]">
                      {country.name}
                    </h3>
                    <p className="mt-1 text-[13px] font-medium leading-snug text-textMuted">
                      {country.service_label}
                    </p>
                    {country.secondary_label ? (
                      <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#7f92a6]">
                        {country.secondary_label}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
