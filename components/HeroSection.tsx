"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BookUser,
  IdCard,
  Plane,
  Stamp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import { formatGbp, type CatalogService } from "@/lib/public-pricing";
import { home } from "@/components/home/homeTheme";
import { HERO_CITIES } from "@/components/hero/worldData";

const HeroWorldCanvas = dynamic(() => import("@/components/hero/HeroWorldCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(51,161,253,0.16),transparent_55%),linear-gradient(180deg,#e8f3ff_0%,#f7fbff_55%,#ffffff_100%)]"
      aria-hidden
    />
  ),
});

type ServiceKey = string;

const ICON_BY_CATEGORY: Record<string, React.ComponentType<{ className?: string }>> = {
  oci: IdCard,
  evisa: Plane,
  passport: BookUser,
  apostille: Stamp,
};

const BLURB_BY_CATEGORY: Record<string, string> = {
  oci: "New card, renewal, or update",
  evisa: "Tourist e-Visa options",
  passport: "Indian passport renewal",
  apostille: "Document legalisation",
  other: "Extra travel & document help",
};

function startHrefForService(service: CatalogService): string {
  if (service.serviceType.startsWith("evisa")) return "/indian-e-visa";
  if (service.serviceType === "document_audit") return "/services";
  return `/dashboard/document-audit?start=1&service=${encodeURIComponent(service.serviceType)}`;
}

function priceLabel(service: CatalogService): string {
  if (service.isQuoteBased) return "On request";
  if (service.totalFee <= 0) return "See fee at checkout";
  return formatGbp(service.totalFee);
}

const HUB_CHIPS = HERO_CITIES.filter((c) => c.hub).map((c) => c.name);

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 18]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduceMotion ? 1 : 0.88]);
  const mapY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 40]);
  const { services, loading } = usePublicPricing();

  const serviceGroups = useMemo(() => {
    const visible = services.filter((row) => row.serviceType !== "document_audit");
    const byCategory = new Map<
      string,
      {
        key: ServiceKey;
        label: string;
        blurb: string;
        icon: React.ComponentType<{ className?: string }>;
        options: Array<{ label: string; href: string; price: string; serviceType: string }>;
      }
    >();

    for (const service of visible) {
      const rawKey = service.category || "other";
      const key =
        rawKey === "pan_card" || rawKey === "uncategorized" ? "other" : rawKey;
      const existing = byCategory.get(key);
      const option = {
        label: service.name,
        href: startHrefForService(service),
        price: priceLabel(service),
        serviceType: service.serviceType,
      };
      if (existing) {
        existing.options.push(option);
      } else {
        byCategory.set(key, {
          key,
          label:
            key === "other"
              ? "Others"
              : service.categoryName ||
                key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          blurb: BLURB_BY_CATEGORY[key] || service.description || "Start your application",
          icon: ICON_BY_CATEGORY[key] || Sparkles,
          options: [option],
        });
      }
    }

    const preferred = ["oci", "passport", "evisa", "apostille", "other"];
    const rows = Array.from(byCategory.values());
    rows.sort((a, b) => {
      const ai = preferred.indexOf(a.key);
      const bi = preferred.indexOf(b.key);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      if (ar !== br) return ar - br;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [services]);

  const [activeGroup, setActiveGroup] = useState<ServiceKey | null>("oci");
  const [selectedOptions, setSelectedOptions] = useState<Record<ServiceKey, string>>({});

  useEffect(() => {
    if (!serviceGroups.length) return;
    setActiveGroup((current) => {
      if (current == null) return null;
      return serviceGroups.some((g) => g.key === current) ? current : serviceGroups[0].key;
    });
    setSelectedOptions((prev) => {
      const next = { ...prev };
      for (const group of serviceGroups) {
        if (!next[group.key] || !group.options.some((o) => o.label === next[group.key])) {
          next[group.key] = group.options[0]?.label ?? "";
        }
      }
      return next;
    });
  }, [serviceGroups]);

  const active = serviceGroups.find((g) => g.key === activeGroup) ?? null;
  const selectedLabel =
    (active && selectedOptions[active.key]) || active?.options[0]?.label || "";
  const selectedOption =
    active?.options.find((o) => o.label === selectedLabel) ?? active?.options[0];
  const continueHref = selectedOption?.href ?? "/services";

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[min(100svh,920px)] overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16"
    >
      {/* Full-bleed interactive world map */}
      <motion.div
        style={reduceMotion ? undefined : { y: mapY }}
        className="pointer-events-none absolute inset-0 will-change-transform"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#e7f2ff_0%,#f4f9ff_42%,#ffffff_100%)]" />
        <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.22),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.14),transparent_70%)] blur-3xl" />

        <div className="pointer-events-auto absolute inset-y-0 right-0 w-full sm:w-[68%] lg:w-[62%]">
          <HeroWorldCanvas
            reduceMotion={Boolean(reduceMotion)}
            className="h-full min-h-[340px] w-full opacity-95 sm:min-h-full"
          />
        </div>

        {/* Soft fade so copy stays readable over the globe */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#f4f9ff_0%,rgba(244,249,255,0.92)_28%,rgba(244,249,255,0.35)_52%,transparent_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
      </motion.div>

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className={`${home.container} relative z-10 grid grid-cols-1 items-center gap-8 will-change-transform lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10`}
      >
        <div className="text-center lg:text-left">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-[clamp(2.65rem,6.4vw,4rem)] font-bold leading-none tracking-[-0.03em] text-dark"
          >
            FlyOCI
          </motion.p>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="mt-4 text-[15px] font-medium text-primary sm:text-base"
          >
            Connecting UK &amp; US families to India — with clarity
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 max-w-xl font-heading text-[clamp(1.5rem,2.9vw,2.25rem)] font-bold leading-[1.28] tracking-[-0.02em] text-dark mx-auto lg:mx-0"
          >
            OCI, e-Visa and Passport support{" "}
            <span className="text-primary">done for you across borders</span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="mt-4 max-w-lg text-[15px] font-normal leading-relaxed text-textMuted mx-auto lg:mx-0 sm:text-base"
          >
            Drag the globe, follow the flight paths, then start your application. We handle forms,
            documents and appointments end to end.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link
              href="/dashboard/document-audit?start=1"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-normal text-white shadow-btn transition hover:bg-accent hover:shadow-btn-hover"
            >
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white/80 px-5 py-3 text-sm font-normal text-dark backdrop-blur-sm transition hover:border-primary/40 hover:bg-[#f3f8ff]"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            {HUB_CHIPS.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe3f7]/80 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#3d5a73] backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(51,161,253,0.8)]" />
                {name}
              </span>
            ))}
          </motion.div>

          <p className="mt-4 text-[12px] font-normal text-[#7f92a6]">
            Independent service · Not affiliated with government or VFS
          </p>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:justify-self-end"
        >
          <div className={`${home.card} border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(18,84,150,0.1)] backdrop-blur-md`}>
            <p className="text-[11px] font-normal uppercase tracking-[0.16em] text-accent">
              Choose your path
            </p>
            <p className="mt-1.5 text-[15px] font-normal text-dark">What do you need help with?</p>

            {loading && !serviceGroups.length ? (
              <p className="mt-4 text-sm font-normal text-[#7f92a6]">Loading services…</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {serviceGroups.map((group) => {
                  const Icon = group.icon;
                  const selected = activeGroup === group.key;
                  const groupSelectedLabel =
                    selectedOptions[group.key] || group.options[0]?.label || "";
                  return (
                    <div key={group.key} className={selected ? "col-span-2" : undefined}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveGroup((current) => (current === group.key ? null : group.key))
                        }
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-primary bg-[#ecf6ff] shadow-[0_0_0_1px_rgba(51,161,253,0.25)]"
                            : "border-[#e8f0f8] bg-white/90 hover:border-[#c8ddf5]"
                        }`}
                        aria-expanded={selected}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              selected ? "bg-primary text-white" : "bg-[#ecf6ff] text-accent"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-dark">
                              {group.label}
                            </span>
                            {selected ? (
                              <span className="mt-0.5 block text-[11px] text-[#7f92a6]">
                                {group.blurb}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>

                      {selected ? (
                        <div className="mt-2 rounded-xl border border-[#e8f0f8] bg-[#f7fbff]/95 p-3">
                          <div className="flex flex-wrap gap-2">
                            {group.options.map((opt) => {
                              const isOptSelected = groupSelectedLabel === opt.label;
                              return (
                                <button
                                  key={opt.serviceType || opt.label}
                                  type="button"
                                  onClick={() =>
                                    setSelectedOptions((prev) => ({
                                      ...prev,
                                      [group.key]: opt.label,
                                    }))
                                  }
                                  title={opt.price}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    isOptSelected
                                      ? "border-primary bg-white text-primary shadow-sm"
                                      : "border-[#e8f0f8] bg-white text-[#627d98] hover:border-primary/40 hover:text-primary"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <Link href={continueHref}>
                              <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-btn transition-colors hover:bg-accent">
                                Get started
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </Link>
                            <p className="text-xs text-[#829AB1]">
                              {groupSelectedLabel}
                              {group.options.find((o) => o.label === groupSelectedLabel)?.price
                                ? ` · ${group.options.find((o) => o.label === groupSelectedLabel)?.price}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-[#7f92a6] lg:text-right">
            {reduceMotion
              ? "Motion reduced — static globe view"
              : "Drag to explore · Hover cities to highlight routes"}
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
