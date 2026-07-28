"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  FileX,
  Globe,
  Shield,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import { CTABanner } from "@/components/CTABanner";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  priceDisplay,
  type CatalogService,
  type PricingCategoryId,
  type ServiceTypeCode,
} from "@/lib/public-pricing";
import {
  SERVICE_CATEGORY_PAGES,
  type ServiceCategoryPageConfig,
} from "@/lib/service-category-pages";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function iconFor(serviceType: ServiceTypeCode): ReactNode {
  switch (serviceType) {
    case "new_oci":
      return <UserCheck />;
    case "oci_renewal":
      return <Shield />;
    case "oci_update":
      return <CheckCircle />;
    case "evisa_1year":
    case "evisa_5year":
      return <Globe />;
    case "passport_renewal":
      return <FileX />;
    case "apostille":
      return <FileText />;
    default:
      return <FileText />;
  }
}

function listingPrice(service: CatalogService): string {
  if (service.totalFee <= 0) return "See fee at checkout";
  return `${priceDisplay(service)} service fee`;
}

function ListingSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-2xl border border-[#d6e8ff] bg-white p-5">
      <div className="mb-4 h-10 w-10 rounded-xl bg-[#eff6ff]" />
      <div className="mb-2 h-5 w-3/4 rounded bg-[#eef3fa]" />
      <div className="mb-2 h-3.5 w-full rounded bg-[#f5f8fc]" />
      <div className="mb-5 h-3.5 w-5/6 rounded bg-[#f5f8fc]" />
      <div className="flex justify-between">
        <div className="h-4 w-24 rounded bg-[#eef3fa]" />
        <div className="h-4 w-16 rounded bg-[#f5f8fc]" />
      </div>
    </div>
  );
}

function matchesCategory(service: CatalogService, categoryId: PricingCategoryId): boolean {
  if (categoryId === "other") {
    return service.category === "other" || service.category === "pan_card" || service.category === "uncategorized";
  }
  return service.category === categoryId;
}

export function ServiceCategoryPageContent({ config }: { config: ServiceCategoryPageConfig }) {
  const reduceMotion = useReducedMotion();
  const { services, loading, fromFallback } = usePublicPricing();

  const visible = useMemo(
    () => services.filter((s) => matchesCategory(s, config.categoryId)),
    [services, config.categoryId],
  );

  const otherCategories = SERVICE_CATEGORY_PAGES.filter((row) => row.slug !== config.slug);

  return (
    <>
      {/* Compact hero + services in first viewport */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_55%)] px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[#dbeafe] blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-40 h-40 w-40 rounded-full bg-[#e8f1ff] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Tight intro row */}
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1c69dd] shadow-sm">
                <Sparkles className="h-3 w-3" />
                {config.eyebrow}
              </div>
              <h1 className="font-heading text-[clamp(1.75rem,3.6vw,2.75rem)] font-black leading-[1.12] tracking-[-0.03em] text-[#041020]">
                {config.title}
              </h1>
              <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[#486581] sm:text-base">
                {config.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {config.highlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1c69dd]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href="/dashboard/document-audit?start=1"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1c69dd] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(28,105,221,0.28)] transition hover:bg-[#1558c0]"
                >
                  Start application
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d0e0f7] bg-white px-5 py-2.5 text-sm font-bold text-[#1c69dd] transition hover:border-[#1c69dd]/35"
                >
                  All services
                </Link>
              </div>
            </div>

            {/* Compact benefits panel */}
            <div className="rounded-2xl border border-[#d6e8ff] bg-white/90 p-4 shadow-[0_12px_32px_rgba(28,105,221,0.08)] backdrop-blur-sm sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1c69dd]">
                What you get
              </p>
              <ul className="mt-3 space-y-2.5">
                {config.included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-[#334e68]">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Services first — same section */}
          <div className="mt-8 border-t border-[#e2ecf8] pt-7 sm:mt-9 sm:pt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-xl font-bold tracking-[-0.02em] text-[#041020] sm:text-2xl">
                  Choose a service
                </h2>
                <p className="mt-1 text-sm text-[#627d98]">
                  Live catalog — pick one to continue.
                </p>
              </div>
              {!loading ? (
                <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1c69dd]">
                  {visible.length} available
                </span>
              ) : null}
            </div>

            {fromFallback && !loading ? (
              <p className="mb-3 text-xs font-medium text-[#9C4F17]">
                Showing cached services while live catalog is unavailable.
              </p>
            ) : null}

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListingSkeleton key={i} />
                ))}
              </div>
            ) : visible.length > 0 ? (
              <motion.div
                variants={container}
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visible.map((service) => (
                  <motion.div key={String(service.id)} variants={fadeUp} className="h-full">
                    <Link
                      href={service.href}
                      className="group flex h-full flex-col rounded-2xl border border-[#d6e8ff] bg-white p-5 shadow-[0_8px_24px_rgba(28,105,221,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#1c69dd]/35 hover:shadow-[0_16px_36px_rgba(28,105,221,0.14)]"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1c69dd] transition group-hover:bg-[#1c69dd] group-hover:text-white">
                          {iconFor(service.serviceType)}
                        </span>
                        <span className="rounded-full bg-[#f4f8ff] px-2.5 py-1 text-[11px] font-bold text-[#1c69dd]">
                          {listingPrice(service)}
                        </span>
                      </div>
                      <h3 className="font-heading text-lg font-bold leading-snug text-[#041020]">
                        {service.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#627d98]">
                        {service.description || "Start with guided document checks and clear next steps."}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#1c69dd]">
                        Get started
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cfe2ff] bg-[#f8fbff] px-5 py-8 text-center">
                <p className="text-sm font-semibold text-[#486581]">
                  No live services in this category yet.
                </p>
                <Link
                  href="/services"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#1c69dd] hover:underline"
                >
                  Browse all services
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Slim category switcher */}
      <section className="border-t border-[#e8f1ff] bg-[#f8fbff] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#486581]">Browse other categories</p>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map((row) => (
              <Link
                key={row.slug}
                href={`/services/${row.slug}`}
                className="rounded-full border border-[#d6e8ff] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#486581] transition hover:border-[#1c69dd]/40 hover:text-[#1c69dd]"
              >
                {row.title}
              </Link>
            ))}
            <Link
              href="/services"
              className="rounded-full bg-[#1c69dd] px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              All services
            </Link>
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
