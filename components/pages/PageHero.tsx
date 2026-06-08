"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { pageContainer, pageFadeUp, type PageHighlight } from "./pageMotion";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  highlights?: PageHighlight[];
  centered?: boolean;
  children?: React.ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  highlights,
  centered = true,
  children,
}: PageHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-14 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pb-16">
      <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#edf5ff] blur-3xl" />

      <motion.div
        variants={pageContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className={`relative z-10 mx-auto max-w-4xl ${centered ? "text-center" : ""}`}
      >
        {eyebrow && (
          <motion.div
            variants={pageFadeUp}
            className={`mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-sm ${centered ? "mx-auto" : ""}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </motion.div>
        )}

        <motion.h1
          variants={pageFadeUp}
          className="font-heading text-[clamp(1.85rem,4.2vw,3rem)] font-black leading-tight tracking-[-0.02em] text-[#041020]"
        >
          {title}
        </motion.h1>

        <motion.p
          variants={pageFadeUp}
          className={`mt-4 text-base font-semibold leading-relaxed text-[#334e68] sm:text-lg ${centered ? "mx-auto max-w-3xl" : "max-w-3xl"}`}
        >
          {description}
        </motion.p>

        {highlights && highlights.length > 0 && (
          <motion.div
            variants={pageContainer}
            className={`mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 ${centered ? "mx-auto max-w-3xl" : "max-w-3xl"}`}
          >
            {highlights.map((item) => (
              <motion.div
                key={item.label}
                variants={pageFadeUp}
                whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                className="rounded-2xl border border-[#d9e8ff] bg-white px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(30,74,135,0.08)] transition-shadow hover:shadow-[0_14px_32px_rgba(28,105,221,0.12)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-[#041020]">{item.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {children && (
          <motion.div variants={pageFadeUp} className="mt-8">
            {children}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
