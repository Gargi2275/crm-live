"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Globe2, Search, X } from "lucide-react";
import { home } from "@/components/home/homeTheme";
import { ParallaxBlob, ScrollReveal, StaggerItem, StaggerReveal } from "@/components/home/HomeScrollMotion";

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

function CountryMedia({
  name,
  countryCode,
  imageUrl,
}: {
  name: string;
  countryCode: string;
  imageUrl: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(imageUrl) && !broken;

  return (
    <div className="relative aspect-[5/3.4] w-full overflow-hidden rounded-[1.35rem] bg-[#e8f3fc]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-primary">
          <Globe2 className="h-8 w-8 opacity-70" />
          <span className="text-sm font-bold tracking-wide">{countryCode}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-gradient-to-t from-[#0b1f33]/55 via-[#0b1f33]/10 to-transparent opacity-80 transition duration-300 group-hover:opacity-95" />
    </div>
  );
}

export function OriginCountriesSection({
  title = "Apply for an Indian Visa from These Countries",
  subtitle = "Apply for Indian visas from the USA, UK, Canada, Australia, and other countries with FlyOCI.",
  countries,
}: OriginCountriesSectionProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((country) => {
      const badge = formatBadge(country.badge, country.country_code, country.destination_code);
      const haystack = [
        country.name,
        country.country_code,
        country.destination_code,
        country.service_label,
        country.secondary_label,
        badge,
        country.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [countries, query]);

  if (!countries.length) return null;

  return (
    <section className={`${home.sectionSoft}`}>
      <ParallaxBlob
        speed={36}
        className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.12)_0%,transparent_70%)]"
      />
      <ParallaxBlob
        speed={28}
        className="pointer-events-none absolute -left-16 bottom-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.08)_0%,transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(51,161,253,0.07),transparent_42%)]" />

      <div className={home.container}>
        <ScrollReveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className={`${home.eyebrow} mb-3`}>
                <Globe2 className="h-3.5 w-3.5" />
                Choose your nationality
              </p>
              <h2 className={home.h2}>{title}</h2>
              <p className={home.lead}>{subtitle}</p>
            </div>

            <div className="w-full max-w-md shrink-0">
              <label className="relative block">
                <span className="sr-only">Search countries</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829AB1]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search country, code, or service…"
                  className="w-full rounded-xl border border-[#D6E4F0] bg-white/90 py-3 pl-10 pr-10 text-sm text-[#102A43] shadow-[0_8px_24px_rgba(11,105,183,0.06)] outline-none backdrop-blur-sm transition placeholder:text-[#9AABB8] focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#829AB1] transition hover:bg-[#F0F6FC] hover:text-[#486581]"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
              <p className="mt-2 text-xs font-medium text-[#829AB1]">
                {query.trim()
                  ? `${filtered.length} of ${countries.length} countries`
                  : `${countries.length} countries available`}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {filtered.length ? (
          <StaggerReveal className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {filtered.map((country) => {
              const href =
                country.href ||
                (country.slug ? `/visa/india/${country.slug}` : "/services/indian-evisa");
              const badge = formatBadge(country.badge, country.country_code, country.destination_code);

              return (
                <StaggerItem key={country.id}>
                  <Link
                    href={href}
                    className="group relative flex h-full flex-col rounded-[1.75rem] border border-[#D9E8F5] bg-white p-2.5 shadow-[0_12px_32px_rgba(11,105,183,0.07)] transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_20px_40px_rgba(11,105,183,0.14)]"
                  >
                    <div className="relative overflow-hidden rounded-[1.35rem]">
                      <CountryMedia
                        name={country.name}
                        countryCode={country.country_code}
                        imageUrl={country.image_url}
                      />
                      <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-accent shadow-sm backdrop-blur-sm">
                        {badge}
                      </span>
                      <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-white">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-1 flex-col gap-1 rounded-[1.25rem] bg-[#F7FBFF] px-3.5 pb-3.5 pt-3">
                      <h3 className="font-heading text-[16px] font-bold leading-snug text-dark transition group-hover:text-accent sm:text-[17px]">
                        {country.name}
                      </h3>
                      <p className="text-[13px] font-medium leading-snug text-textMuted">
                        {country.service_label}
                      </p>
                      {country.secondary_label ? (
                        <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#7f92a6]">
                          {country.secondary_label}
                        </p>
                      ) : null}
                      <p className="mt-auto pt-3 text-[12px] font-semibold text-primary opacity-0 transition duration-300 group-hover:opacity-100">
                        View application guide
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerReveal>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-[#C5D8EA] bg-white/70 px-6 py-12 text-center">
            <p className="font-heading text-base font-semibold text-[#102A43]">No countries match</p>
            <p className="mt-1 text-sm text-[#627D98]">
              Try another name or clear the search to see all options.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-[#D9E1EA] bg-white px-4 py-2 text-sm font-semibold text-[#486581] transition hover:border-primary/40 hover:text-primary"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
