"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, useSpring } from "framer-motion";
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
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
const trustBadges = [
  { text: "UK-based support", icon: CheckCircle },
  { text: "Transparent fixed fees", icon: ShieldCheck },
  { text: "Secure document uploads", icon: BadgeCheck },
  { text: "WhatsApp & email updates", icon: MessageCircle },
];

const quickStats = [
  { label: "Fast review", value: "24–48h", icon: Zap, color: "#60a5fa" },
  { label: "Support", value: "WhatsApp + Email", icon: MessageCircle, color: "#34d399" },
  { label: "Coverage", value: "OCI / e-Visa / Passport", icon: Sparkles, color: "#a78bfa" },
];

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
  // Parallax motion values (normalized -1..1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const bgX = useTransform(mouseX, [-1, 1], [-24, 24]);
  const bgY = useTransform(mouseY, [-1, 1], [-12, 12]);
  const orb1X = useTransform(mouseX, [-1, 1], [-40, 40]);
  const orb1Y = useTransform(mouseY, [-1, 1], [-20, 20]);
  const orb2X = useTransform(mouseX, [-1, 1], [30, -30]);
  const orb2Y = useTransform(mouseY, [-1, 1], [12, -12]);

  // Smooth springs for nicer motion
  const springBgX = useSpring(bgX, { stiffness: 140, damping: 24 });
  const springBgY = useSpring(bgY, { stiffness: 140, damping: 24 });
  const springOrb1X = useSpring(orb1X, { stiffness: 140, damping: 26 });
  const springOrb1Y = useSpring(orb1Y, { stiffness: 140, damping: 26 });
  const springOrb2X = useSpring(orb2X, { stiffness: 140, damping: 26 });
  const springOrb2Y = useSpring(orb2Y, { stiffness: 140, damping: 26 });
  const [activeGroup, setActiveGroup] = useState<ServiceKey | null>("oci");
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

  return (
    <section
      className="relative overflow-hidden"
      onMouseMove={(e) => {
        // normalize mouse position to -1..1
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

      {/* ── Background image — untouched ── */}
      <div
        className="absolute inset-0"
      >
        <Image
          src="/hero_section_banner.jpeg"
          alt="OCI assistance banner"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Multi-layer overlay: deep dark left → semi-transparent right */}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(4,10,28,0.95)_0%,rgba(5,18,54,0.86)_35%,rgba(10,36,100,0.60)_60%,rgba(18,54,150,0.22)_100%)]" />
        {/* Top vignette */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      {/* ── Ambient glow orbs ── */}
      <motion.div
        className="pointer-events-none absolute left-[-10%] top-[-8%] h-[60vw] w-[60vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 65%)",
          filter: "blur(60px)",
          translateX: springOrb1X as any,
          translateY: springOrb1Y as any,
        }}
        animate={{ x: [0, 22, 0], y: [0, -16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-10%] right-[15%] h-[45vw] w-[45vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 65%)",
          filter: "blur(70px)",
          translateX: springOrb2X as any,
          translateY: springOrb2Y as any,
        }}
        animate={{ x: [0, -18, 0], y: [0, 18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Main grid ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto grid min-h-[90vh] w-full grid-cols-1 items-center gap-8 px-4 pb-14 pt-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 lg:px-6 lg:pt-28 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-12 xl:px-10"
      >

        {/* ════════════════════════════════════════
            LEFT — Copy block
        ════════════════════════════════════════ */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:pr-6 xl:pr-10">

          {/* Eyebrow */}
          <motion.div variants={item}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-400/30 ring-1 ring-sky-400/40">
                <Sparkles className="h-2.5 w-2.5 text-sky-50" />
              </div>
              Trusted support for Indian-origin families
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={item}>
            <h1 className="font-heading text-[clamp(2.25rem,4.6vw,4.3rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-white">
              Hassle-free OCI,
              <span
                className="mt-1 block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(92deg, #7dd3fc 0%, #bfdbfe 50%, #e0f2fe 100%)",
                }}
              >
                Indian e-Visa and
              </span>
              <span
                className="mt-1 block bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(92deg, #93c5fd 0%, #dbeafe 100%)",
                }}
              >
                Passport services
              </span>
            </h1>
            <p className="mt-3 text-[clamp(0.95rem,1.5vw,1.1rem)] font-semibold tracking-[-0.01em] text-sky-100/90">
              done for you with clarity and speed
            </p>
          </motion.div>

          {/* Body copy */}
          <motion.p
            variants={item}
            className="mt-4 max-w-[500px] text-[14px] leading-[1.7] text-slate-100/80 sm:text-[15px]"
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
              <button className="group relative w-full overflow-hidden rounded-2xl bg-[#1c69dd] px-7 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_32px_rgba(28,105,221,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(28,105,221,0.7)] sm:w-auto">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start My Application
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
                {/* Shimmer layer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </Link>
            <Link href="/document-audit" className="w-full sm:w-auto">
              <button className="w-full rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-[14px] font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/16 hover:border-white/40 sm:w-auto">
                Get My Documents Checked
              </button>
            </Link>
          </motion.div>

          {/* Quick stat cards */}
          <motion.div
            variants={item}
            className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/8 p-3.5 backdrop-blur-md"
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 28px rgba(0,0,0,0.22)" }}
                >
                  {/* Colored glow dot top-right */}
                  <div
                    className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full"
                    style={{ background: stat.color, boxShadow: `0 0 10px ${stat.color}99` }}
                  />
                  <div
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: stat.color }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {stat.label}
                  </div>
                  <p className="mt-2.5 font-heading text-[15px] font-bold leading-snug text-white sm:text-[16px]">
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={item}
            className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start"
          >
            {trustBadges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white/90"
                >
                  <Icon className="h-3.5 w-3.5 text-sky-300/80" />
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
            {/* Avatar stack */}
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
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 text-[9px] font-bold text-white ring-1 ring-inset ring-white/10"
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
                <span className="ml-1.5 text-[11px] font-bold text-sky-50">5.0</span>
              </div>
              <p className="text-[10.5px] text-sky-100/70">Trusted by 500+ UK &amp; US families</p>
            </div>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Services card
        ════════════════════════════════════════ */}
        <motion.aside variants={item} className="mx-auto w-full max-w-[450px] lg:mx-0">
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_40px_100px_rgba(4,12,40,0.55),0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl"
          >

            {/* Card header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#f4f8ff] to-white px-6 pb-4 pt-5">
              {/* Decorative accent blob */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1c69dd]/8" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-[22px] font-bold leading-tight text-[#0d1f3c] sm:text-[24px]">
                    Our Services
                  </h3>
                  <p className="mt-1 text-[11.5px] text-[#7a8fa8]">
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
                            className={`truncate text-[13px] font-semibold transition-colors ${
                              isOpen ? "text-[#0d1f3c]" : "text-[#243b53]"
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
                        <p className="mt-0.5 text-[11px] text-[#8fa3bc]">
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
                                className="w-full appearance-none rounded-xl border border-[#c8d9f0] bg-white px-4 py-2.5 pr-9 text-[12px] font-medium text-[#0d1f3c] shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus:border-[#1c69dd] focus:outline-none focus:ring-2 focus:ring-[#1c69dd]/15 transition-colors"
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
                              <button className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c69dd] px-5 py-3 text-[12.5px] font-semibold text-white shadow-[0_4px_18px_rgba(28,105,221,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1558c0] hover:shadow-[0_8px_28px_rgba(28,105,221,0.52)]">
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
                <span className="text-[11px] font-medium text-[#6b80a0]">
                  Secure &amp; encrypted
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1.5 text-[10.5px] font-semibold text-[#4a5568]">5.0</span>
              </div>
            </div>
          </motion.div>

          {/* Disclaimer below card */}
          <p className="mt-3 text-center text-[10.5px] leading-relaxed text-sky-100/55 lg:text-left">
            Private independent service · Not affiliated with any government body or VFS Global
          </p>
        </motion.aside>
      </motion.div>
    </section>
  );
}