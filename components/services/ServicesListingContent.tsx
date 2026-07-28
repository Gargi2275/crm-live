"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { CTABanner } from "@/components/CTABanner";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import {
  priceDisplay,
  type CatalogService,
  type PricingCategoryId,
  type ServiceTypeCode,
} from "@/lib/public-pricing";
import { SERVICE_CATEGORY_PAGES } from "@/lib/service-category-pages";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
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

export function ServicesListingContent() {
  const reduceMotion = useReducedMotion();
  const { services, categories, loading, fromFallback } = usePublicPricing();
  const [activeCategory, setActiveCategory] = useState<PricingCategoryId | "all">("all");

  const visible = useMemo(() => {
    if (activeCategory === "all") return services;
    if (activeCategory === "other") {
      return services.filter(
        (s) => s.category === "other" || s.category === "pan_card" || s.category === "uncategorized",
      );
    }
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_55%)] px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[#dbeafe] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1c69dd] shadow-sm">
                <Sparkles className="h-3 w-3" />
                FlyOCI Services
              </div>
              <h1 className="font-heading text-[clamp(1.75rem,3.6vw,2.75rem)] font-black leading-[1.12] tracking-[-0.03em] text-[#041020]">
                Our Services
              </h1>
              <p className="mt-2.5 text-[15px] leading-relaxed text-[#486581] sm:text-base">
                OCI, Indian Visa, Passport, Apostille and more — choose a service and start online.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/dashboard/document-audit?start=1"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1c69dd] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(28,105,221,0.28)] transition hover:bg-[#1558c0]"
              >
                Start application
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-[#d0e0f7] bg-white px-5 py-2.5 text-sm font-bold text-[#1c69dd]"
              >
                Ask a question
              </Link>
            </div>
          </div>

          {/* Category shortcuts */}
          <div className="mt-5 flex flex-wrap gap-2">
            {SERVICE_CATEGORY_PAGES.map((row) => (
              <Link
                key={row.slug}
                href={`/services/${row.slug}`}
                className="rounded-full border border-[#d6e8ff] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#486581] transition hover:border-[#1c69dd]/40 hover:text-[#1c69dd]"
              >
                {row.title}
              </Link>
            ))}
          </div>

          <div className="mt-7 border-t border-[#e2ecf8] pt-6">
            {!loading && categories.length > 1 ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => {
                  const selected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        selected
                          ? "bg-[#1c69dd] text-white"
                          : "bg-[#f4f8ff] text-[#486581] hover:bg-[#eaf3ff]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-xl font-bold text-[#041020]">Choose a service</h2>
                <p className="mt-0.5 text-sm text-[#627d98]">Live catalog — filter by category above.</p>
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingSkeleton key={i} />
                ))}
              </div>
            ) : (
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
            )}

            {!loading && visible.length === 0 ? (
              <p className="py-10 text-center text-sm font-medium text-[#627d98]">
                No services in this category right now.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
