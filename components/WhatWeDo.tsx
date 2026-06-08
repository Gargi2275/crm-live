"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  IdCard,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stamp,
} from "lucide-react";
import Link from "next/link";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type ServiceTile = {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  glow: string;
};

const serviceTiles: ServiceTile[] = [
  {
    title: "New OCI application",
    subtitle: "First-time OCI card, fully prepared",
    href: "/services/new-oci",
    icon: FileText,
    accent: "#1c69dd",
    glow: "rgba(28,105,221,0.22)",
  },
  {
    title: "OCI renewal & transfer",
    subtitle: "New passport or card renewal",
    href: "/services/oci-renewal",
    icon: RefreshCw,
    accent: "#2563eb",
    glow: "rgba(37,99,235,0.2)",
  },
  {
    title: "Mandatory OCI update",
    subtitle: "Complex process — we handle it",
    href: "/services/oci-update",
    icon: ShieldCheck,
    accent: "#1558c0",
    glow: "rgba(21,88,192,0.2)",
  },
  {
    title: "Indian passport renewal",
    subtitle: "For UK & US residents",
    href: "/services/passport-renewal",
    icon: IdCard,
    accent: "#1d4ed8",
    glow: "rgba(29,78,216,0.2)",
  },
  {
    title: "Indian e-Visa",
    subtitle: "1-year & 5-year options prepared and checked",
    href: "/services/indian-evisa",
    icon: Plane,
    accent: "#0f4cad",
    glow: "rgba(15,76,173,0.22)",
  },
  {
    title: "Apostille & Attestation",
    subtitle: "UK/US documents legalised for use in India",
    href: "/apostille-services",
    icon: Stamp,
    accent: "#7c3aed",
    glow: "rgba(124,58,237,0.22)",
  },
];

function ServiceCard({ tile }: { tile: ServiceTile }) {
  const Icon = tile.icon;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div variants={cardItem}>
      <Link href={tile.href} className="group block h-full">
        <motion.article
          whileHover={reduceMotion ? undefined : { y: -8, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative h-full overflow-hidden rounded-[22px] border border-[#d6e8ff] bg-white p-5 shadow-[0_10px_32px_rgba(22,68,130,0.08)] transition-shadow duration-300 group-hover:shadow-[0_22px_50px_rgba(22,68,130,0.14)]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at 20% 0%, ${tile.glow}, transparent 55%)`,
            }}
          />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#eef5ff] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative flex items-start justify-between gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { rotate: [0, -6, 6, 0], scale: 1.08 }}
              transition={{ duration: 0.45 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white shadow-[0_8px_20px_rgba(28,105,221,0.12)]"
              style={{ background: `linear-gradient(135deg, ${tile.accent}18, ${tile.accent}08)` }}
            >
              <div style={{ color: tile.accent }}>
                <Icon className="h-5 w-5" />
              </div>
            </motion.div>
            <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#1c69dd]">
              Service
            </span>
          </div>

          <h3 className="relative mt-4 font-heading text-[15px] font-bold leading-snug text-[#041020] transition-colors group-hover:text-[#1c69dd]">
            {tile.title}
          </h3>
          <p className="relative mt-2 text-[13px] leading-relaxed text-[#486581]">{tile.subtitle}</p>

          <div className="relative mt-5 flex items-center gap-2 text-[13px] font-bold text-[#1c69dd]">
            <span>Explore</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </div>

          <div
            className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-500 group-hover:w-full"
            style={{ background: `linear-gradient(90deg, ${tile.accent}, transparent)` }}
          />
        </motion.article>
      </Link>
    </motion.div>
  );
}

export default function WhatWeDo() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(51,120,213,0.10),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(124,58,237,0.06),transparent_30%)]" />
      <div className="pointer-events-none absolute left-[-6rem] top-10 h-56 w-56 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute right-[-5rem] bottom-8 h-64 w-64 rounded-full bg-[#e6f1ff] blur-3xl" />

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start xl:gap-14"
        >
          <motion.div variants={cardItem} className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1b67c8] shadow-[0_10px_24px_rgba(51,120,213,0.08)]">
              <Sparkles className="h-3.5 w-3.5" />
              What we do
            </div>

            <h2 className="max-w-xl font-heading text-[clamp(2.1rem,4vw,3.7rem)] font-black leading-[1.03] tracking-[-0.04em] text-[#041020]">
              Everything you need for India travel &amp; OCI,
              <span className="mt-1 block bg-gradient-to-r from-[#1b67c8] via-[#2f7fe3] to-[#69a9ff] bg-clip-text text-transparent">
                in one calm, guided place
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-[16px] font-medium leading-8 text-[#334e68]">
              FlyOCI is a specialist online service for UK and US residents of Indian origin. We&apos;re a{" "}
              <strong className="font-bold text-[#041020]">private, independent service</strong> — not a
              government website. OCI, e-Visa, passport renewal and apostille — all under one roof.
            </p>

            <motion.div
              whileHover={reduceMotion ? undefined : { x: 4 }}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-[#f4f8ff] px-4 py-2.5 text-[13px] font-bold text-[#102a43] shadow-[0_10px_24px_rgba(51,120,213,0.08)]"
            >
              <ArrowRight className="h-3.5 w-3.5 text-[#1b67c8]" />
              <span>Specialist support for OCI, e-Visa, passport &amp; apostille</span>
            </motion.div>
          </motion.div>

          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {serviceTiles.map((tile) => (
              <ServiceCard key={tile.title} tile={tile} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
