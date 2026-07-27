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
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import { CTABanner } from "@/components/CTABanner";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import { priceDisplay, type CatalogService, type PricingCategoryId, type ServiceTypeCode } from "@/lib/public-pricing";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
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
    case "document_audit":
      return <ClipboardCheck />;
    default:
      return <FileText />;
  }
}

function listingPrice(service: CatalogService): string {
  if (service.serviceType === "apostille" && service.totalFee <= 0) return "Free pre-check";
  if (service.serviceType === "passport_renewal") {
    return service.totalFee > 0 ? `${priceDisplay(service)} · final quote` : "Price on request";
  }
  return `${priceDisplay(service)} service fee`;
}

function ListingSkeleton() {
  return (
    <div className="h-full rounded-[20px] border border-primary/15 bg-white p-6 sm:p-8 animate-pulse">
      <div className="mb-6 h-12 w-12 rounded-xl bg-primary/10" />
      <div className="mb-3 h-6 w-2/3 rounded bg-gray-100" />
      <div className="mb-2 h-4 w-full rounded bg-gray-50" />
      <div className="mb-6 h-4 w-5/6 rounded bg-gray-50" />
      <div className="mt-auto flex justify-between">
        <div className="h-5 w-24 rounded bg-gray-100" />
        <div className="h-5 w-20 rounded bg-gray-50" />
      </div>
    </div>
  );
}

export function ServicesListingContent() {
  const reduceMotion = useReducedMotion();
  const { services, categories, loading, fromFallback, assessmentFee } = usePublicPricing();
  const [activeCategory, setActiveCategory] = useState<PricingCategoryId | "all">("all");
  const assessmentLabel =
    assessmentFee != null && assessmentFee > 0
      ? `£${assessmentFee % 1 === 0 ? assessmentFee.toFixed(0) : assessmentFee.toFixed(2)}`
      : null;

  const visible = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-32 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[#edf5ff] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div variants={container} initial={reduceMotion ? false : "hidden"} animate="visible">
            <motion.div
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              FlyOCI Services
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-heading text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-tight tracking-[-0.02em] text-[#041020]"
            >
              Our Services
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-relaxed text-[#334e68] sm:text-lg"
            >
              FlyOCI offers end-to-end support for OCI cards, Indian e-Visas and Indian passport renewals for UK &amp; US
              residents. Choose a service below to start your application directly.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/start" className="group">
                <motion.span
                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(28,105,221,0.35)]"
                >
                  Start application
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </Link>
              {assessmentLabel ? (
                <Link href="/document-audit" className="group">
                  <motion.span
                    whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#cfe2ff] bg-white px-6 py-3.5 text-sm font-bold text-[#1c69dd] shadow-sm transition-shadow hover:shadow-md"
                  >
                    Early assessment · {assessmentLabel}
                  </motion.span>
                </Link>
              ) : (
                <Link href="/contact" className="group">
                  <motion.span
                    whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#cfe2ff] bg-white px-6 py-3.5 text-sm font-bold text-[#1c69dd] shadow-sm transition-shadow hover:shadow-md"
                  >
                    Ask a Question
                  </motion.span>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-4 pb-24 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {!loading && categories.length > 1 ? (
            <div className="sticky top-16 z-10 mb-6 rounded-2xl border border-[#e8f1ff] bg-white/95 px-3 py-3 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
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
            </div>
          ) : null}

          {fromFallback && !loading ? (
            <p className="mb-4 text-xs font-medium text-[#9C4F17]">
              Showing cached services while live catalog is unavailable.
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingSkeleton key={i} />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial={reduceMotion ? false : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
            >
              {visible.map((service) => (
                <motion.div key={String(service.id)} variants={fadeUp} className="h-full">
                  <ServiceCard
                    icon={iconFor(service.serviceType)}
                    title={service.name}
                    description={service.description}
                    href={service.href}
                    price={listingPrice(service)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && visible.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium text-[#627d98]">
              No services in this category right now.
            </p>
          ) : null}
        </div>
      </section>

      <CTABanner />
    </>
  );
}
