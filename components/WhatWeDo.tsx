"use client";
import { motion } from "framer-motion";
import { Poppins, Raleway } from "next/font/google";
import { ArrowRight, FileText, IdCard, Plane, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { FadeInUp } from "@/components/FadeInUp";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

type TileTheme = "green" | "blue" | "amber";

type Tile = {
  title: string;
  subtitle: string;
  theme: TileTheme;
  icon: React.ComponentType<{ className?: string }>;
};

const topTiles: Tile[] = [
  {
    title: "New OCI application",
    subtitle: "First-time OCI card, fully prepared",
    theme: "green",
    icon: FileText,
  },
  {
    title: "OCI renewal & transfer",
    subtitle: "New passport or card renewal",
    theme: "green",
    icon: RefreshCw,
  },
  {
    title: "Mandatory OCI update",
    subtitle: "Complex process — we handle it",
    theme: "blue",
    icon: ShieldCheck,
  },
  {
    title: "Indian passport renewal",
    subtitle: "UK & US residents",
    theme: "blue",
    icon: IdCard,
  },
];

const bottomTile: Tile = {
  title: "Indian e-Visa — 1-year & 5-year",
  subtitle: "e-Visa applications prepared, checked and submitted for both validity options",
  theme: "amber",
  icon: Plane,
};

function themeClasses(theme: TileTheme): { wrapper: string; iconWrap: string; icon: string } {
  if (theme === "green") {
    return {
      wrapper: "bg-[linear-gradient(180deg,#fbfdff_0%,#f4f9ff_100%)] border-[#d9e8fb]",
      iconWrap: "bg-[#edf5ff]",
      icon: "text-[#1c6fd6]",
    };
  }

  if (theme === "blue") {
    return {
      wrapper: "bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] border-[#cfe1f8]",
      iconWrap: "bg-[#e6f1ff]",
      icon: "text-[#1f5fae]",
    };
  }

  return {
    wrapper: "bg-[linear-gradient(180deg,#f8fbff_0%,#f2f8ff_100%)] border-[#d7e6fb]",
    iconWrap: "bg-[#edf5ff]",
    icon: "text-[#2a6fcb]",
  };
}

function InfoTile({ title, subtitle, theme, icon: Icon }: Tile) {
  const themeClass = themeClasses(theme);

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`group relative overflow-hidden rounded-[22px] border p-6 shadow-[0_12px_30px_rgba(22,68,130,0.10)] transition-all duration-300 hover:shadow-xl hover:scale-105 ${themeClass.wrapper}`}
    >
      <div className="absolute -top-6 -right-20 opacity-10 rotate-[25deg] text-[90px] text-[#1b67c8]">•</div>

      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl border border-white/70 ${themeClass.iconWrap} shadow-[0_10px_22px_rgba(28,105,221,0.08)]`}>
        <Icon className={`h-6 w-6 ${themeClass.icon}`} />
      </div>

      <h3 className={`${poppins.className} text-[15px] font-semibold leading-[1.35] text-[#0f3048] transition-colors group-hover:text-[#155fc4]`}>
        {title}
      </h3>
      <p className={`${raleway.className} mt-2 text-[14px] leading-[1.6] text-[#3b556a]`}>
        {subtitle}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Link href="/services" className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-[13px] font-medium text-[#155fc4] shadow-sm border border-transparent transition-colors duration-200 hover:bg-white">
          Learn more
          <ArrowRight className="w-3 h-3 text-[#155fc4]" />
        </Link>

        <div className="text-xs font-semibold text-[#4b6b88] bg-[#f1f7ff] rounded-full px-3 py-1">Trusted</div>
      </div>
    </motion.article>
  );
}

export default function WhatWeDo() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(51,120,213,0.10),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(51,120,213,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute left-[-6rem] top-10 h-56 w-56 rounded-full bg-[#dcecff] blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] bottom-8 h-64 w-64 rounded-full bg-[#e6f1ff] blur-3xl" />

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start xl:gap-14">
          <FadeInUp>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1b67c8] shadow-[0_10px_24px_rgba(51,120,213,0.08)] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                What we do
              </div>

              <h2 className={`${poppins.className} max-w-xl text-[clamp(2.1rem,4vw,3.7rem)] font-bold leading-[1.03] tracking-[-0.04em] text-[#102a43]`}>
                Everything you need for India travel &amp; OCI,
                <span className="block bg-gradient-to-r from-[#1b67c8] via-[#2f7fe3] to-[#69a9ff] bg-clip-text text-transparent">
                  in one calm, guided place
                </span>
              </h2>

              <p className={`${raleway.className} mt-5 max-w-xl text-[15px] leading-8 text-[#4c6278] sm:text-[16px]`}>
                FlyOCI is a specialist online service for UK and US residents of Indian origin. We&apos;re a
                <strong className="font-semibold text-[#163a66]"> private, independent service</strong> - not a government website.
                We prepare your application and check your documents so your file is right the first time.
              </p>

              <div className="mt-7 rounded-[24px] border border-[#dbe8fb] bg-white/80 p-5 shadow-[0_14px_36px_rgba(22,68,130,0.08)] backdrop-blur-sm">
                <ul className={`${raleway.className} grid gap-3 text-[14px] leading-6 text-[#2f445b] sm:grid-cols-2`}>
                  {[
                    "Step-by-step guidance throughout",
                    "Document check before submission",
                    "UK & US residents served",
                    "Private & independent - not government",
                  ].map((item, index) => (
                    <li key={item} className="flex items-start gap-3 rounded-xl border border-transparent bg-[#f8fbff] px-3 py-3 transition-all duration-200 hover:border-[#d5e6fb] hover:bg-white">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index < 2 ? "bg-[#1d69ca]" : "bg-[#52a77e]"}`} />
                      <span className="leading-6">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-[#f4f8ff] px-4 py-2 text-[12px] font-medium text-[#1f4f86] shadow-[0_10px_24px_rgba(51,120,213,0.08)] transition-transform transform hover:-translate-y-0.5"
                role="note"
              >
                <ArrowRight className="h-3.5 w-3.5 text-[#1b67c8]" />
                <span>Specialist support for OCI, e-Visa and passport services</span>
              </div>
            </div>
          </FadeInUp>

          <div className="relative z-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topTiles.map((tile, i) => (
                <FadeInUp key={tile.title} delay={i * 0.08}>
                  <InfoTile {...tile} />
                </FadeInUp>
              ))}
            </div>

            <FadeInUp delay={0.3} className="mt-4">
              <motion.article
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative overflow-hidden rounded-[26px] border border-[#cfe1f8] bg-gradient-to-r from-[#eaf6ff] to-[#f7fbff] p-6 shadow-[0_18px_50px_rgba(20,70,140,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-[#dff0ff] to-[#e6f6ff] text-[#0f57b8] shadow-[0_12px_28px_rgba(27,103,200,0.08)]">
                    <Plane className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`${poppins.className} text-[16px] font-semibold leading-tight text-[#0f3048] sm:text-[17px]`}>
                      Indian e-Visa - 1-year &amp; 5-year
                    </h3>
                    <p className={`${raleway.className} mt-1 text-[14px] leading-6 text-[#3b556a]`}>
                      e-Visa applications prepared, checked and submitted for both validity options.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="text-sm text-[#155fc4] font-semibold">Fast processing · Pro support</div>
                  <Link href="/services" className="inline-flex items-center gap-2 rounded-xl bg-[#155fc4] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#0e4fb2] transition-colors">
                    Book e-Visa
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
}