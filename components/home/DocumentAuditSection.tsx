"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const auditIssues = [
  "Name mismatch across documents",
  "Missing apostille or notarisation",
  "Wrong photo size or background",
  "Incorrect or incomplete supporting documents",
  "Missing bilingual certificates",
];

const safetySteps = [
  {
    num: "1",
    title: "Pre-payment review",
    label: "We review your documents before full-service payment.",
    bg: "from-[#1c69dd] to-[#2563eb]",
    text: "text-white",
  },
  {
    num: "2",
    title: "Clear correction report",
    label: "We tell you what is missing, what needs correction, and how to fix it.",
    bg: "from-[#33A1FD] to-[#1c69dd]",
    text: "text-white",
  },
  {
    num: "3",
    title: "Full application",
    label: "Once documents are cleared, we proceed with your full application.",
    bg: "from-[#eff6ff] to-[#dbeafe]",
    text: "text-[#1c69dd]",
    done: true,
  },
];

export function DocumentAuditSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_50%,#f8fbff_100%)] py-5 lg:py-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#e8f1ff] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #c8dcff 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy & issues */}
          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-[0_8px_24px_rgba(28,105,221,0.08)]"
            >
              <FileSearch className="h-3.5 w-3.5" />
              Document audit
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="mb-5 font-heading text-[clamp(1.85rem,3.8vw,2.75rem)] font-black leading-snug tracking-[-0.02em] text-[#041020]"
            >
              Most OCI and visa files are rejected because of documents.{" "}
              <span className="text-[#1c69dd]">We fix that first.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mb-8 text-base font-semibold leading-relaxed text-[#334e68] sm:text-[17px]"
            >
              From our experience, more than half of applicants do not have documents in the exact
              required format. Typical issues include:
            </motion.p>

            <motion.ul variants={container} className="mb-10 flex flex-col gap-3">
              {auditIssues.map((item, i) => (
                <motion.li key={item} variants={fadeUp}>
                  <motion.div
                    whileHover={reduceMotion ? undefined : { x: 6, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                    className="group flex items-start gap-3 rounded-2xl border border-transparent bg-white/70 px-4 py-3.5 shadow-[0_4px_16px_rgba(30,74,135,0.06)] transition-all duration-300 hover:border-[#c8dcff] hover:bg-white hover:shadow-[0_12px_32px_rgba(28,105,221,0.12)]"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] text-[#1c69dd] shadow-inner transition-transform duration-300 group-hover:scale-110">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5 text-[15px] font-bold leading-snug text-[#102a43] group-hover:text-[#041020]">
                      {item}
                    </span>
                  </motion.div>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={fadeUp}>
              <Link href="/document-audit" className="group inline-flex">
                <motion.span
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-[#1c69dd] bg-white px-8 py-3.5 text-base font-bold text-[#1c69dd] shadow-[0_8px_28px_rgba(28,105,221,0.15)] transition-colors hover:bg-[#1c69dd] hover:text-white"
                >
                  Learn About Document Audit
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right — 3-step safety net card */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -right-3 top-6 -z-10 h-full w-full rounded-3xl bg-gradient-to-br from-[#c8dcff] to-[#dbeafe] opacity-80"
            />

            <motion.article
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative overflow-hidden rounded-3xl border border-white/70 bg-white p-8 shadow-[0_24px_64px_rgba(30,74,135,0.14)] sm:p-10"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#eff6ff] blur-2xl" />
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />

              <div className="relative mb-8 flex items-center gap-3">
                <motion.div
                  whileHover={reduceMotion ? undefined : { rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1c69dd] to-[#2563eb] text-white shadow-[0_8px_24px_rgba(28,105,221,0.35)]"
                >
                  <ShieldCheck className="h-5 w-5" />
                </motion.div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#486581]">
                    Safety net
                  </p>
                  <h3 className="font-heading text-xl font-black text-[#041020] sm:text-[22px]">
                    Our 3-step safety net
                  </h3>
                </div>
              </div>

              <motion.div
                variants={container}
                initial={reduceMotion ? false : "hidden"}
                whileInView="visible"
                viewport={{ once: true }}
                className="relative flex flex-col gap-0"
              >
                {safetySteps.map((step, i) => (
                  <motion.div key={step.num} variants={fadeUp} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < safetySteps.length - 1 && (
                      <div className="absolute left-4 top-10 h-[calc(100%-12px)] w-px bg-gradient-to-b from-[#1c69dd]/40 to-[#dbeafe]" />
                    )}

                    <motion.div
                      whileHover={reduceMotion ? undefined : { scale: 1.12 }}
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${step.bg} ${step.text} text-sm font-black shadow-[0_4px_14px_rgba(28,105,221,0.25)]`}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                    </motion.div>

                    <motion.div
                      whileHover={reduceMotion ? undefined : { x: 4 }}
                      className="group min-w-0 flex-1 rounded-2xl border border-transparent px-3 py-1 transition-all duration-300 hover:border-[#dbeafe] hover:bg-[#f8fbff]"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1c69dd]">
                        Step {step.num}
                      </p>
                      <p className="mt-0.5 text-sm font-black text-[#041020]">{step.title}</p>
                      <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-[#486581] group-hover:text-[#334e68]">
                        {step.label}
                      </p>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial={reduceMotion ? false : "hidden"}
                whileInView="visible"
                viewport={{ once: true }}
                className="relative mt-8 flex items-start gap-3 rounded-2xl border border-[#d6e8ff] bg-gradient-to-r from-[#f5f9ff] to-[#eef5ff] px-4 py-4"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                <p className="text-[13px] font-bold leading-relaxed text-[#102a43]">
                  We are a private independent service, not a government website.
                </p>
              </motion.div>
            </motion.article>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
