"use client";

import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookUser,
  CheckCircle,
  ChevronDown,
  IdCard,
  MessageCircle,
  Plane,
  ShieldCheck,
  Sparkles,
  Stamp,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: "easeOut" as const },
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const quickStats = [
  { label: "Fast review", value: "24–48h", icon: Zap, color: "#2563eb" },
  { label: "Coverage", value: "OCI / e-Visa / Passport", icon: Sparkles, color: "#7c3aed" },
];

const trustBadges = [
  { text: "UK-based support", icon: CheckCircle },
  { text: "Transparent fixed fees", icon: ShieldCheck },
  { text: "Secure document uploads", icon: BadgeCheck },
  { text: "WhatsApp & email updates", icon: MessageCircle },
];

type HeroSlide = {
  src: string;
  /** Stronger scrim + text tuning for deep-sky backgrounds */
  variant?: "sky";
  objectPosition?: string;
};

const HERO_SLIDES: HeroSlide[] = [
  { src: "/hero-bg/hero-1-passport-boarding.jpg" },
  { src: "/hero-bg/hero-2-oci-card.jpg" },
  // { src: "/hero-bg/hero-3-travel-collage.jpg" },
  { src: "/hero-bg/hero-4-apostille.jpg" },
  { src: "/hero-bg/hero-5-visa-application.jpg" },
  { src: "/hero-bg/hero-airplane.jpg", variant: "sky", objectPosition: "42% center" },
];

const BACKGROUND_IMAGES = HERO_SLIDES.map((s) => s.src);

const BG_FADE_MS = 1500;
const BG_HOLD_MS = 6000;

function slideImageClass(index: number, extra = "") {
  const isSky = HERO_SLIDES[index]?.variant === "sky";
  return [
    "absolute inset-0 h-full w-full object-cover transition-[object-position,opacity,filter,transform] ease-in-out",
    isSky ? "scale-[1.03] blur-[2px]" : "scale-100 blur-0",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
 
type ServiceKey = "oci" | "evisa" | "passport" | "apostille";

const serviceGroups: Array<{
  key: ServiceKey;
  label: string;
  tag?: string;
  icon: React.ComponentType<{ className?: string }>;
  options: Array<{ label: string; href: string }>;
}> = [
  {
    key: "oci",
    label: "OCI Services",
    tag: "Popular",
    icon: IdCard,
    options: [
      { label: "New OCI Card", href: "/services/new-oci" },
      { label: "OCI Renewal / Transfer", href: "/services/oci-renewal" },
      { label: "OCI Update (Gratis)", href: "/services/oci-update" },
    ],
  },
  {
    key: "evisa",
    label: "Indian e-Visa",
    icon: Plane,
    options: [{ label: "Indian e-Visa", href: "/services/indian-evisa" }],
  },
  {
    key: "passport",
    label: "Passport Services",
    icon: BookUser,
    options: [{ label: "Indian Passport Renewal", href: "/services/passport-renewal" }],
  },
  {
    key: "apostille",
    label: "Apostille & Attestation",
    icon: Stamp,
    options: [{ label: "Apostille & Attestation", href: "/apostille-services" }],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [topImageIndex, setTopImageIndex] = useState<number | null>(null);
  const [topImageVisible, setTopImageVisible] = useState(false);
  const activeImageRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTransitioningRef = useRef(false);
  const [activeGroup, setActiveGroup] = useState<ServiceKey | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<ServiceKey, string>>(
    () =>
      serviceGroups.reduce(
        (acc, g) => ({ ...acc, [g.key]: g.options[0]?.label ?? "" }),
        {} as Record<ServiceKey, string>,
      ),
  );

  const getHref = (key: ServiceKey) => {
    const g = serviceGroups.find((x) => x.key === key);
    if (!g) return "/services";
    return g.options.find((o) => o.label === selectedOptions[key])?.href ?? g.options[0]?.href ?? "/services";
  };

  const goToSlide = (next: number) => {
    if (isTransitioningRef.current || next === activeImageRef.current) return;
    isTransitioningRef.current = true;
    activeImageRef.current = next;
    setActiveImageIndex(next);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, BG_FADE_MS);
  };

  const startAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const next = (activeImageRef.current + 1) % BACKGROUND_IMAGES.length;
      goToSlide(next);
    }, BG_HOLD_MS);
  };

  useEffect(() => {
    BACKGROUND_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    startAutoplay();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const sliderIndex =
    topImageIndex !== null && topImageVisible ? topImageIndex : activeImageIndex;

  const activeSlide = HERO_SLIDES[sliderIndex] ?? HERO_SLIDES[0];
  const isSkySlide = activeSlide.variant === "sky";

  const handleDotClick = (index: number) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    isTransitioningRef.current = false;

    if (index === activeImageRef.current && topImageIndex === null) return;

    goToSlide(index);
    startAutoplay();
  };

  return (
    <section
      className="relative overflow-hidden bg-[#1a2f4a]"
      onMouseMove={(e) => {
        const nx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        const ny = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        mouseX.set(Math.max(-1, Math.min(1, nx)));
        mouseY.set(Math.max(-1, Math.min(1, ny)));
      }}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      {/* ── Travel / passport image background ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 overflow-hidden bg-[#1a2f4a]">
  {HERO_SLIDES.map((slide, index) => (
    <img
      key={slide.src}
      src={slide.src}
      alt=""
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        objectPosition: slide.objectPosition ?? "center",
        opacity: index === activeImageIndex ? 0.3 : 0,
        transition: `opacity ${BG_FADE_MS}ms ease-in-out`,
        willChange: "opacity",
      }}
      decoding="async"
    />
  ))}
</div>

        <div
          className={`absolute inset-0 transition-all duration-[1500ms] ${
            isSkySlide
              ? "bg-gradient-to-r from-white/88 via-white/30 to-transparent"
              : "bg-gradient-to-r from-white/98 via-white/80 to-white/20"
          }`}
        />
        <div
          className={`absolute inset-0 transition-all duration-[1500ms] ${
            isSkySlide
              ? "bg-gradient-to-b from-white/15 via-transparent to-transparent"
              : "bg-gradient-to-b from-white/40 via-transparent to-transparent"
          }`}
        />
        {!isSkySlide && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#f0f6ff]/60 via-transparent to-transparent transition-all duration-[1500ms]" />
        )}

        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-white to-transparent transition-all duration-[1500ms] ${
            isSkySlide ? "h-24 opacity-70" : "h-40"
          }`}
        />
      </div>

      {/* ── Main grid ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto grid min-h-[90vh] w-full grid-cols-1 items-center gap-8 px-4 pb-14 pt-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 lg:px-8 lg:pt-28 xl:px-14"
      >

        {/* ════════════════════════════════════════
            LEFT — Copy block
        ════════════════════════════════════════ */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">

          {/* Eyebrow */}
          <motion.div variants={item}>
            <div
              className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] shadow-sm transition-colors duration-700 ${
                isSkySlide
                  ? "border-[#1c69dd]/40 bg-white text-[#041020]"
                  : "border-[#1c69dd]/30 bg-white text-[#041020]"
              }`}
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1c69dd]/10 ring-1 ring-[#1c69dd]/20">
                <Sparkles className="h-3 w-3 text-[#1c69dd]" />
              </div>
              Trusted support for Indian-origin families
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={item}>
            <h1
              className={`font-heading text-[clamp(2.25rem,4.8vw,4.25rem)] font-black leading-[1.02] tracking-[-0.04em] transition-all duration-700 ${
                isSkySlide
                  ? "text-[#041020] drop-shadow-[0_1px_8px_rgba(255,255,255,0.85)]"
                  : "text-[#041020]"
              }`}
            >
              Hassle-free OCI,
              <span className={`mt-1 block ${isSkySlide ? "text-[#0f4cad]" : "text-[#0f4cad]"}`}>
                Indian e-Visa and
              </span>
              <span className="mt-1 block text-[#041020]">Passport services</span>
            </h1>
            <p
              className={`mt-3 text-[clamp(1rem,1.6vw,1.2rem)] font-extrabold tracking-[-0.01em] transition-all duration-700 ${
                isSkySlide
                  ? "text-[#041020] drop-shadow-[0_1px_6px_rgba(255,255,255,0.8)]"
                  : "text-[#041020]"
              }`}
            >
              done for you with clarity and speed
            </p>
          </motion.div>

          {/* Body copy */}
          <motion.p
            variants={item}
            className={`mt-4 max-w-[560px] text-[15px] font-bold leading-[1.7] sm:text-[16px] ${
              isSkySlide
                ? "text-[#102a43] drop-shadow-[0_1px_4px_rgba(255,255,255,0.75)]"
                : "text-[#102a43]"
            }`}
          >
            For UK and US residents of Indian origin. We handle forms, documents and
            appointments so you avoid delays, stress and back-and-forth.
          </motion.p>

          {/* CTA row */}
          <motion.div
            variants={item}
            className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link href="/auth/login?next=%2Findian-e-visa" className="w-full sm:w-auto">
              <button className="group relative w-full overflow-hidden rounded-2xl bg-[#1c69dd] px-7 py-4 text-[15px] text-white shadow-[0_8px_32px_rgba(28,105,221,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(28,105,221,0.5)] sm:w-auto">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start My Application
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </Link>
            <Link href="/document-audit" className="w-full sm:w-auto">
              <button className="w-full rounded-2xl border border-[#9bb8dc] bg-white px-7 py-4 text-[15px] text-[#041020] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1c69dd]/35 hover:bg-white sm:w-auto">
                Get My Documents Checked
              </button>
            </Link>
          </motion.div>

          {/* Quick stat cards */}
          <motion.div
            variants={item}
            className="mt-7 grid w-full max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -3, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.08)]"
                >
                  <div
                    className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full"
                    style={{ background: stat.color, boxShadow: `0 0 10px ${stat.color}66` }}
                  />
                  <div
                    className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: stat.color }}
                  >
                    <Icon className="h-4 w-4" />
                    {stat.label}
                  </div>
                  <p className="mt-2.5 font-heading text-[16px] font-normal leading-snug text-[#041020] text-black sm:text-[17px]">
  {stat.value}
</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
          >
            {trustBadges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-[#b8cce4] bg-white px-3.5 py-2 text-[12px] font-bold text-[#102a43] shadow-sm transition-colors hover:border-[#1c69dd]/30 hover:text-[#041020]"
                >
                  <Icon className="h-4 w-4 text-[#1c69dd]" />
                  {badge.text}
                </div>
              );
            })}
          </motion.div>

          {/* Social proof row */}
          <motion.div
            variants={item}
            className="mt-6 flex items-center gap-4"
          >
            <div className="flex -space-x-2.5">
              {[
                { initials: "RK", hue: 215 },
                { initials: "AP", hue: 235 },
                { initials: "MS", hue: 198 },
                { initials: "PS", hue: 255 },
                { initials: "NK", hue: 180 },
              ].map((av, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-sm"
                  style={{
                    background: `hsl(${av.hue}, 62%, 44%)`,
                    zIndex: 10 - i,
                  }}
                >
                  {av.initials}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1.5 text-[13px] font-black text-[#041020]">5.0</span>
              </div>
              <p className="text-[12px] font-bold text-[#102a43]">Trusted by 500+ UK &amp; US families</p>
            </div>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Services card
        ════════════════════════════════════════ */}
        <motion.aside variants={item} className="mx-auto w-full lg:mx-0">
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_20px_60px_rgba(4,12,40,0.18)]"
          >

            {/* Card header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#f4f8ff] to-white px-6 pb-4 pt-5">
              {/* Decorative accent blob */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1c69dd]/8" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-[24px] font-black leading-tight text-[#041020] sm:text-[26px]">
                    Our Services
                  </h3>
                  <p className="mt-1 text-[13px] font-bold text-[#334e68]">
                    Select a service to get started
                  </p>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1c69dd] text-white shadow-[0_6px_20px_rgba(28,105,221,0.45)]">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
              <div className="relative mt-4 h-px bg-gradient-to-r from-transparent via-[#d6e4f7] to-transparent" />
            </div>

            {/* Service list */}
            <div className="space-y-2 bg-white px-4 pb-4 pt-1 sm:px-5">
              {serviceGroups.map((group) => {
                const isOpen = activeGroup === group.key;
                const Icon = group.icon;

                return (
                  <div
                    key={group.key}
                    className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                      isOpen
                        ? "border-[#1c69dd]/25 bg-gradient-to-br from-[#eef5ff] to-[#e6f0ff] shadow-[0_4px_24px_rgba(28,105,221,0.1)]"
                        : "border-[#e8eef8] bg-[#fafcff] hover:border-[#c8d9ef] hover:bg-white"
                    }`}
                  >
                    {/* Row trigger */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveGroup((prev) => (prev === group.key ? null : group.key))
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      {/* Icon box */}
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                          isOpen
                            ? "bg-[#1c69dd] text-white shadow-[0_4px_16px_rgba(28,105,221,0.40)]"
                            : "border border-[#d9e8f8] bg-[#eef5ff] text-[#1c69dd]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Labels */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`truncate text-[14px] font-bold transition-colors ${
                              isOpen ? "text-[#041020]" : "text-[#102a43]"
                            }`}
                          >
                            {group.label}
                          </span>
                          {group.tag && (
                            <span className="hidden shrink-0 rounded-full bg-[#1c69dd]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1c69dd] sm:inline-block">
                              {group.tag}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] font-semibold text-[#486581]">
                          {group.options.length} option
                          {group.options.length > 1 ? "s" : ""} available
                        </p>
                      </div>

                      {/* Animated chevron */}
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-colors ${
                            isOpen ? "text-[#1c69dd]" : "text-[#b4c4d8]"
                          }`}
                        />
                      </motion.div>
                    </button>

                    {/* Expanded dropdown */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#1c69dd]/10 px-4 pb-4 pt-3">
                            {/* Select */}
                            <div className="relative">
                              <select
                                value={selectedOptions[group.key]}
                                onChange={(e) =>
                                  setSelectedOptions((prev) => ({
                                    ...prev,
                                    [group.key]: e.target.value,
                                  }))
                                }
                                className="w-full appearance-none rounded-xl border border-[#c8d9f0] bg-white px-4 py-2.5 pr-9 text-[13px] font-bold text-[#041020] shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus:border-[#1c69dd] focus:outline-none focus:ring-2 focus:ring-[#1c69dd]/15 transition-colors"
                              >
                                {group.options.map((opt) => (
                                  <option key={opt.label} value={opt.label}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8fa3bc]" />
                            </div>

                            {/* Get Started CTA */}
                            <Link href={getHref(group.key)}>
                              <button className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c69dd] px-5 py-3 text-[13px] font-bold text-white shadow-[0_4px_18px_rgba(28,105,221,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1558c0] hover:shadow-[0_8px_28px_rgba(28,105,221,0.52)]">
                                Get Started
                                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                              </button>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between border-t border-[#edf2fb] bg-[#f7faff] px-5 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 8px rgba(52,211,153,0.7)" }}
                />
                <span className="text-[12px] font-bold text-[#102a43]">
                  Secure &amp; encrypted
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1.5 text-[12px] font-black text-[#041020]">5.0</span>
              </div>
            </div>
          </motion.div>

          {/* Disclaimer below card */}
          <p className="mt-3 text-center text-[15px] text-semibold leading-relaxed text-black lg:text-left">
            Private independent service · Not affiliated with any government body or VFS Global
          </p>
        </motion.aside>
      </motion.div>

      {/* Slider dots — above content layer so clicks work */}
      <div className="pointer-events-auto absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-[0_8px_24px_rgba(28,105,221,0.12)]">
        {BACKGROUND_IMAGES.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Show background slide ${index + 1}`}
            aria-current={sliderIndex === index ? "true" : undefined}
            onClick={() => handleDotClick(index)}
            className={`cursor-pointer rounded-full transition-all duration-300 ${
              sliderIndex === index
                ? "h-1.5 w-5 bg-[#1c69dd] shadow-[0_0_8px_rgba(28,105,221,0.45)]"
                : "h-1.5 w-1.5 bg-[#1c69dd]/30 hover:bg-[#1c69dd]/55"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
