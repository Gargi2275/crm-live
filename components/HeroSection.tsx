"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
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

const PARTICLES = [
  { left: "6%", top: "18%", size: 4, dur: 6, delay: 0, glow: false },
  { left: "14%", top: "38%", size: 3, dur: 7.5, delay: 0.8, glow: false },
  { left: "9%", top: "58%", size: 5, dur: 8, delay: 1.2, glow: true },
  { left: "48%", top: "12%", size: 3, dur: 6.5, delay: 0.4, glow: false },
  { left: "62%", top: "10%", size: 4, dur: 9, delay: 1.6, glow: true },
  { left: "88%", top: "20%", size: 3, dur: 7, delay: 0.2, glow: false },
  { left: "92%", top: "48%", size: 5, dur: 8.5, delay: 1, glow: true },
  { left: "78%", top: "68%", size: 3, dur: 7.2, delay: 1.4, glow: false },
  { left: "4%", top: "72%", size: 4, dur: 8.2, delay: 0.6, glow: false },
  { left: "28%", top: "14%", size: 2, dur: 5.5, delay: 1.8, glow: false },
  { left: "70%", top: "78%", size: 3, dur: 9.5, delay: 0.9, glow: false },
  { left: "95%", top: "34%", size: 2, dur: 6.8, delay: 2, glow: false },
  { left: "18%", top: "22%", size: 3, dur: 6.2, delay: 1.1, glow: true },
  { left: "74%", top: "42%", size: 4, dur: 7.6, delay: 1.3, glow: true },
  { left: "42%", top: "82%", size: 3, dur: 9.2, delay: 0.7, glow: false },
  { left: "86%", top: "58%", size: 2, dur: 8.4, delay: 0.85, glow: false },
] as const;

const FLOAT_ICONS = [
  { Icon: Plane, className: "left-[5%] top-[28%] hidden sm:flex", dur: 7, y: 12 },
  { Icon: IdCard, className: "right-[5%] top-[30%] hidden md:flex", dur: 8, y: 10 },
  { Icon: Stamp, className: "left-[8%] bottom-[12%] hidden lg:flex", dur: 9, y: 11 },
] as const;

const FLIGHT_PATH = "M40 78 C 200 18, 520 18, 760 78";

/** Soft sky + particles, floating icons, flight arc — drifts slower than scroll (parallax). */
function HeroAtmosphere({
  reduceMotion,
  parallaxY,
}: {
  reduceMotion: boolean | null;
  parallaxY: MotionValue<number>;
}) {
  return (
    <motion.div
      style={reduceMotion ? undefined : { y: parallaxY }}
      className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#ffffff_100%)]" />

      <motion.div
        className="absolute left-[16%] top-[-18%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.18),transparent_68%)] blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[6%] top-[10%] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.1),transparent_70%)] blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.25, 0.5, 0.25], y: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${
            p.glow ? "bg-primary/50 shadow-[0_0_12px_rgba(51,161,253,0.45)]" : "bg-primary/35"
          }`}
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -20, 0], opacity: [0.2, 0.85, 0.2], scale: [1, 1.35, 1] }
          }
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      {FLOAT_ICONS.map(({ Icon, className, dur, y }, i) => (
        <motion.span
          key={i}
          className={`absolute h-10 w-10 items-center justify-center rounded-2xl border border-[#d6e8f8]/70 bg-white/65 text-primary/50 shadow-[0_8px_22px_rgba(18,84,150,0.06)] backdrop-blur-[2px] ${className}`}
          animate={reduceMotion ? undefined : { y: [0, -y, 0] }}
          transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </motion.span>
      ))}

      <svg
        className="absolute left-1/2 top-16 hidden h-24 w-[min(860px,94%)] -translate-x-1/2 opacity-90 sm:top-20 md:block lg:top-24"
        viewBox="0 0 800 100"
        fill="none"
      >
        <path
          d={FLIGHT_PATH}
          stroke="rgba(51,161,253,0.32)"
          strokeWidth="1.5"
          strokeDasharray="5 8"
        >
          {!reduceMotion ? (
            <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="3.2s" repeatCount="indefinite" />
          ) : null}
        </path>
        <circle cx="40" cy="78" r="4.5" fill="#33A1FD" />
        <circle cx="760" cy="78" r="4.5" fill="#33A1FD" />
        <text x="22" y="96" fill="#5f758c" style={{ fontSize: 12, fontWeight: 600 }}>
          UK · US
        </text>
        <text x="730" y="96" fill="#5f758c" style={{ fontSize: 12, fontWeight: 600 }}>
          India
        </text>
        {!reduceMotion ? (
          <g>
            <animateMotion dur="11s" repeatCount="indefinite" path={FLIGHT_PATH} rotate="auto" />
            <g transform="scale(0.72) rotate(90)">
              <path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                fill="#0D1F2D"
                transform="translate(-12 -12)"
              />
            </g>
          </g>
        ) : (
          <circle cx="400" cy="35" r="3.5" fill="#0D1F2D" />
        )}
      </svg>
    </motion.div>
  );
}

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const atmosphereY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 56]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 20]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduceMotion ? 1 : 0.85]);
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
      className="relative overflow-hidden pt-28 pb-14 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-20"
    >
      <HeroAtmosphere reduceMotion={reduceMotion} parallaxY={atmosphereY} />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className={`${home.container} relative z-10 grid grid-cols-1 items-center gap-10 will-change-transform lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:gap-14`}
      >
        <div className="text-center lg:text-left">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-[clamp(2.5rem,6vw,3.75rem)] font-bold leading-none tracking-[-0.03em] text-dark"
          >
            FlyOCI
          </motion.p>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-4 text-[15px] font-medium text-primary sm:text-base"
          >
            Trusted support for Indian-origin families
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 max-w-2xl font-heading text-[clamp(1.55rem,3vw,2.35rem)] font-bold leading-[1.28] tracking-[-0.02em] text-dark mx-auto lg:mx-0"
          >
            Hassle-free OCI, Indian e-Visa and Passport services{" "}
            <span className="text-primary">done for you with clarity and speed</span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-xl text-[15px] font-normal leading-relaxed text-textMuted mx-auto lg:mx-0 sm:text-base"
          >
            For UK and US residents of Indian origin. We handle forms, documents and appointments so
            you avoid delays, stress and back-and-forth.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-normal text-dark transition hover:border-primary/40 hover:bg-[#f3f8ff]"
            >
              See how it works
            </Link>
          </motion.div>

          <p className="mt-5 text-[12px] font-normal text-[#7f92a6]">
            Independent service · Not affiliated with government or VFS
          </p>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
        >
          <div className={`${home.card} p-5`}>
            <p className="text-[11px] font-normal uppercase tracking-[0.16em] text-accent">Choose your path</p>
            <p className="mt-1.5 text-[15px] font-normal text-dark">What do you need help with?</p>

            {loading && !serviceGroups.length ? (
              <p className="mt-4 text-sm font-normal text-[#7f92a6]">Loading services…</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {serviceGroups.map((group) => {
                    const Icon = group.icon;
                    const selected = activeGroup === group.key;
                    const groupSelectedLabel =
                      selectedOptions[group.key] || group.options[0]?.label || "";
                    return (
                      <div
                        key={group.key}
                        className={selected ? "col-span-2" : undefined}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveGroup((current) => (current === group.key ? null : group.key))
                          }
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-primary bg-[#ecf6ff] shadow-[0_0_0_1px_rgba(51,161,253,0.25)]"
                              : "border-[#e8f0f8] bg-white hover:border-[#c8ddf5]"
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
                          <div className="mt-2 rounded-xl border border-[#e8f0f8] bg-[#f7fbff] p-3">
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
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
