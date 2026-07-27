"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileCheck2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getHubCountries, type HubCountrySummary } from "@/lib/api";
import { HUB_COUNTRIES_FALLBACK } from "@/lib/location-hub";

const links = {
  services: [
    { name: "New OCI Card", href: "/services/new-oci" },
    { name: "OCI Renewal", href: "/services/oci-renewal" },
    { name: "OCI Update", href: "/services/oci-update" },
    { name: "Indian e-Visa", href: "/indian-e-visa" },
    { name: "Passport Renewal", href: "/services/passport-renewal" },
    { name: "Apostille Services", href: "/apostille-services" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQs", href: "/faqs" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
    { name: "Verify company", href: "https://ico.org.uk/" },
  ],
  legal: [
    { name: "Terms & Conditions", href: "/terms-and-conditions" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "GDPR Compliance", href: "/gdpr-compliance" },
    { name: "Refund Policy", href: "/refund-policy" },
    { name: "Cookies", href: "/cookies" },
    { name: "Disclaimer", href: "/disclaimer" },
  ],
};

const support = [
  { icon: Mail, label: "support@flyoci.com", href: "mailto:support@flyoci.com" },
  { icon: Phone, label: "+44 20 7808 6162", href: "tel:+442078086162" },
  { icon: Clock3, label: "24–48h initial review" },
  { icon: MapPin, label: "Serving global Indians" },
];

const assurances = [
  { icon: ShieldCheck, label: "Encrypted uploads" },
  { icon: FileCheck2, label: "Document checks" },
  { icon: BadgeCheck, label: "GDPR compliant" },
  { icon: Globe2, label: "UK and US support" },
];

const FALLBACK_COUNTRIES: HubCountrySummary[] = HUB_COUNTRIES_FALLBACK.map((c, index) => ({
  id: index + 1,
  name: c.name,
  slug: c.slug,
  currency_code: "",
  currency_symbol: "",
  cities: c.cities.map((city, cityIndex) => ({
    id: cityIndex + 1,
    name: city.name,
    slug: city.slug,
  })),
}));

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className =
    "group inline-flex items-center gap-1.5 py-1 text-md text-slate-900 transition-colors hover:text-sky-600";
  const content = (
    <>
      <span>{children}</span>
      <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-sky-500" />
    </>
  );

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function LinkColumn({
  title,
  items,
}: {
  title: string;
  items: { name: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="mt-16 text-[15px] font-extrabold uppercase tracking-[0.2em] text-slate-800">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-0.5">
        {items.map((link) => (
          <FooterLink key={link.name} href={link.href}>
            {link.name}
          </FooterLink>
        ))}
      </div>
    </div>
  );
}

/** Cities We Serve — driven by hub Country/City rows from GET /api/countries/. */
function CityFooterLinks({ countries }: { countries: HubCountrySummary[] }) {
  const withCities = countries.filter((c) => (c.cities || []).length > 0);
  if (!withCities.length) return null;

  return (
    <div className="mt-14 border-t border-slate-100 pt-10">
      <h2 className="text-[15px] font-extrabold uppercase tracking-[0.2em] text-slate-800">
        Cities We Serve
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {withCities.map((country) => (
          <div key={country.slug}>
            <p className="text-sm font-bold text-slate-800">{country.name}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {(country.cities || []).map((city) => (
                <FooterLink
                  key={city.slug}
                  href={`/service/${country.slug}/${city.slug}`}
                >
                  {city.name}
                </FooterLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Footer({ compact = false }: { compact?: boolean }) {
  const [countries, setCountries] = useState<HubCountrySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    getHubCountries()
      .then((rows) => {
        if (!cancelled && rows.length) setCountries(rows);
      })
      .catch(() => {
        if (!cancelled) setCountries(FALLBACK_COUNTRIES);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="relative overflow-hidden bg-white text-slate-800">
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400" />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0ea5e9 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className={`relative mx-auto px-6 ${compact ? "py-8" : "py-16"} lg:px-8`}>
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.1fr] lg:items-start">
          <div>
            <Link href="/" className="inline-flex bg-white">
              <Image
                src="/logo.png"
                alt="FlyOCI"
                width={150}
                height={65}
                className="h-12 w-auto"
                priority
              />
            </Link>

            <p className="mt-5 max-w-sm text-md leading-7 text-slate-900">
              A private documentation assistance service for families, professionals, and frequent
              travelers who want their paperwork prepared cleanly before it reaches the official
              portal.
            </p>
            <p className="mt-3 max-w-sm text-md leading-7 text-slate-900">
              We handle the complexity of document preparation so you can focus on what matters —
              your move, your family, your future.
            </p>
          </div>

          <LinkColumn title="Services" items={links.services} />
          <LinkColumn title="Company" items={links.company} />

          <div className="flex flex-col gap-8">
            <LinkColumn title="Legal" items={links.legal} />
          </div>

          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {assurances.map((a) => (
                <div
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700"
                >
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {support.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-600">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-md text-slate-700 transition-colors hover:text-sky-600"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <p className="text-md text-slate-700">{item.label}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {!compact ? <CityFooterLinks countries={countries} /> : null}

        <div className="mt-14 border-t border-slate-100" />

        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5">
          <p className="text-md leading-6 text-slate-900">
            <span className="font-bold text-slate-900">Disclaimer:</span> FlyOCI is an independent
            private service provider offering document preparation and guidance support. We are not
            affiliated with the Government of India, VFS Global, embassies, or consulates. Government
            fees are paid separately to the respective authorities.
          </p>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-md font-semibold text-slate-900">
          Copyright © 2026 FlyOCI. All rights reserved. Maintained by{" "}
          <span className="font-semibold text-sky-600">TechnoAdviser Technologies</span>.
        </div>
      </div>
    </footer>
  );
}
