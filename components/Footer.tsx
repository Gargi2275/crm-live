"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { getHubCountries, getPublicSupportEmail, type HubCountrySummary } from "@/lib/api";
import {
  SUPPORT_EMAIL as DEFAULT_SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL_HREF,
} from "@/lib/contact";
import { HUB_COUNTRIES_FALLBACK } from "@/lib/location-hub";

const links = {
  services: [
    { name: "New OCI Card", href: "/services/new-oci" },
    { name: "OCI Renewal", href: "/services/oci-renewal" },
    { name: "OCI Update", href: "/services/oci-update" },
    { name: "Indian e-Visa", href: "/indian-e-visa" },
    { name: "Passport Renewal", href: "/services/passport-renewal" },
    { name: "Apostille", href: "/apostille-services" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQs", href: "/faqs" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Terms", href: "/terms-and-conditions" },
    { name: "Privacy", href: "/privacy-policy" },
    { name: "GDPR", href: "/gdpr-compliance" },
    { name: "Refunds", href: "/refund-policy" },
    { name: "Cookies", href: "/cookies" },
    { name: "Disclaimer", href: "/disclaimer" },
  ],
};

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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    "block py-1.5 text-[16px] font-medium text-white/65 transition-colors hover:text-white";

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
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
      <h2 className="font-heading text-[15px] font-bold uppercase tracking-[0.12em] text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-0.5">
        {items.map((link) => (
          <FooterLink key={link.name} href={link.href}>
            {link.name}
          </FooterLink>
        ))}
      </div>
    </div>
  );
}

function CountriesBlock({ countries }: { countries: HubCountrySummary[] }) {
  const rows = useMemo(
    () =>
      countries
        .filter((c) => c.is_active !== false)
        .slice()
        .sort((a, b) => {
          const ao = typeof a.display_order === "number" ? a.display_order : 999;
          const bo = typeof b.display_order === "number" ? b.display_order : 999;
          if (ao !== bo) return ao - bo;
          return String(a.name).localeCompare(String(b.name));
        }),
    [countries],
  );

  const [openSlug, setOpenSlug] = useState<string>("");

  useEffect(() => {
    if (!rows.length) return;
    const firstWithCities = rows.find((c) => (c.cities || []).length > 0);
    setOpenSlug((current) => current || firstWithCities?.slug || rows[0]?.slug || "");
  }, [rows]);

  if (!rows.length) return null;

  const open = rows.find((c) => c.slug === openSlug) || rows[0];
  const cities = (open?.cities || []).filter((city) => city.is_active !== false);

  return (
    <div className="mt-10 border-t border-white/10 pt-8">
      <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-white sm:text-[22px]">
        Countries we serve
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-white/55">
        Select a country to see cities and regions.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {rows.map((country) => {
          const active = country.slug === open?.slug;
          return (
            <button
              key={country.slug}
              type="button"
              onClick={() => setOpenSlug(country.slug)}
              className={`rounded-full px-3.5 py-2 text-[14px] font-semibold transition ${
                active
                  ? "bg-white text-[#0B1B2B]"
                  : "bg-white/10 text-white/80 hover:bg-white/16 hover:text-white"
              }`}
            >
              {country.name}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading text-[17px] font-bold text-white">{open?.name}</p>
          <Link
            href={`/service/${open!.slug}`}
            className="text-[14px] font-semibold text-[#7EC4FF] transition hover:text-white"
          >
            View hub →
          </Link>
        </div>
        {cities.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/service/${open!.slug}/${city.slug}`}
                className="text-[15px] font-medium text-white/60 transition hover:text-white"
              >
                {city.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-white/45">Country-wide support available.</p>
        )}
      </div>
    </div>
  );
}

export function Footer({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/auth");
  const useCompact = compact || isDashboard;
  const [countries, setCountries] = useState<HubCountrySummary[]>([]);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);

  useEffect(() => {
    let cancelled = false;
    getPublicSupportEmail()
      .then((email) => {
        if (!cancelled && email) setSupportEmail(email);
      })
      .catch(() => {
        if (!cancelled) setSupportEmail(DEFAULT_SUPPORT_EMAIL);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (useCompact) return;
    let cancelled = false;
    getHubCountries()
      .then((rows) => {
        if (!cancelled && rows.length) setCountries(rows);
        else if (!cancelled) setCountries(FALLBACK_COUNTRIES);
      })
      .catch(() => {
        if (!cancelled) setCountries(FALLBACK_COUNTRIES);
      });
    return () => {
      cancelled = true;
    };
  }, [useCompact]);

  return (
    <footer className="bg-[#0B1B2B] text-white">
      <div className={`w-full px-5 sm:px-8 lg:px-10 xl:px-12 ${useCompact ? "py-6 sm:py-7" : "py-10 sm:py-12"}`}>
        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-4 ${useCompact ? "lg:gap-6" : "lg:gap-8 gap-8"}`}>
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex rounded-md bg-white px-2.5 py-2">
              <Image
                src="/logo.png"
                alt="FlyOCI"
                width={140}
                height={60}
                className={useCompact ? "h-9 w-auto" : "h-11 w-auto"}
                priority
              />
            </Link>
            {!useCompact ? (
              <>
                <p className="mt-5 font-heading text-[24px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[28px]">
                  Clear documents.
                  <br />
                  Confident applications.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-white/55 lg:pr-4">
                  Independent OCI, e-Visa, passport and apostille support for families and professionals.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[14px] leading-relaxed text-white/55">
                Independent OCI, e-Visa, passport and apostille support.
              </p>
            )}

            <div className={`space-y-2.5 ${useCompact ? "mt-4" : "mt-6"}`}>
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-3 text-[15px] font-medium text-white/80 transition hover:text-white"
              >
                <Mail className="h-5 w-5 shrink-0 text-[#7EC4FF]" />
                {supportEmail}
              </a>
              <a
                href={SUPPORT_PHONE_TEL_HREF}
                className="flex items-center gap-3 text-[15px] font-medium text-white/80 transition hover:text-white"
              >
                <Phone className="h-5 w-5 shrink-0 text-[#7EC4FF]" />
                {SUPPORT_PHONE_DISPLAY}
              </a>
              {!useCompact ? (
                <p className="flex items-center gap-3 text-[15px] font-medium text-white/55">
                  <MapPin className="h-5 w-5 shrink-0 text-[#7EC4FF]" />
                  UK · US · Global Indians
                </p>
              ) : null}
            </div>
          </div>

          <LinkColumn title="Services" items={links.services} />
          <LinkColumn title="Company" items={links.company} />
          <LinkColumn title="Legal" items={links.legal} />
        </div>

        {!useCompact ? <CountriesBlock countries={countries} /> : null}

        <div className={`border-t border-white/10 ${useCompact ? "mt-6 pt-4" : "mt-10 pt-5"}`}>
          <p className="text-[13px] leading-relaxed text-white/45">
            {useCompact
              ? "FlyOCI is an independent private service provider — not affiliated with government authorities."
              : "FlyOCI is an independent private service provider. We are not affiliated with the Government of India, VFS Global, embassies or consulates. Government fees are paid separately to the respective authorities."}
          </p>
          <p className="mt-3 text-[13px] font-medium text-white/50">
            © 2026 FlyOCI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
