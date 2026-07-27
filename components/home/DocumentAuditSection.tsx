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
import { usePublicPricing } from "@/hooks/usePublicPricing";
import { home } from "@/components/home/homeTheme";

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
    bg: "from-primary to-accent",
    text: "text-white",
  },
  {
    num: "2",
    title: "Clear correction report",
    label: "We tell you what is missing, what needs correction, and how to fix it.",
    bg: "from-accent to-primary",
    text: "text-white",
  },
  {
    num: "3",
    title: "Full application",
    label: "Once documents are cleared, we proceed with your full application.",
    bg: "from-[#ecf6ff] to-[#dbeafe]",
    text: "text-primary",
    done: true,
  },
];

export function DocumentAuditSection() {
  const reduceMotion = useReducedMotion();
  const { assessmentFee, loading } = usePublicPricing();

  if (loading || assessmentFee == null || assessmentFee <= 0) {
    return null;
  }

  const feeLabel = `£${assessmentFee % 1 === 0 ? assessmentFee.toFixed(0) : assessmentFee.toFixed(2)}`;

  return (
    <section className={home.sectionSoft}>
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#dcecff] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#e8f1ff] blur-3xl" />

      <div className={home.container}>
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
              className={`${home.chip} mb-5 shadow-[0_8px_24px_rgba(51,161,253,0.08)]`}
            >
              <FileSearch className="h-3.5 w-3.5" />
              Early assessment · {feeLabel}
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className={`${home.h2} mb-5`}
            >
              Most OCI and visa files are rejected because of documents.{" "}
              <span className="text-primary">We fix that first.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mb-8 text-[15px] leading-relaxed text-textMuted sm:text-base"
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
                    className="group flex items-start gap-3 rounded-2xl border border-transparent bg-white/80 px-4 py-3.5 shadow-[0_4px_16px_rgba(18,84,150,0.06)] transition-all duration-300 hover:border-border hover:bg-white"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ecf6ff] text-primary transition-transform duration-300 group-hover:scale-110">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5 text-[15px] font-semibold leading-snug text-dark">
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
                  className="inline-flex items-center gap-2.5 rounded-xl border-2 border-primary bg-white px-8 py-3.5 text-base font-bold text-primary shadow-[0_8px_28px_rgba(51,161,253,0.15)] transition-colors hover:bg-primary hover:text-white"
                >
                  Learn about early assessment
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
              className="pointer-events-none absolute -right-3 top-6 -z-10 h-full w-full rounded-3xl bg-gradient-to-br from-[#dcecff] to-[#ecf6ff] opacity-80"
            />

            <motion.article
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-[0_24px_64px_rgba(18,84,150,0.12)] sm:p-10"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ecf6ff] blur-2xl" />
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

              <div className="relative mb-8 flex items-center gap-3">
                <motion.div
                  whileHover={reduceMotion ? undefined : { rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-btn"
                >
                  <ShieldCheck className="h-5 w-5" />
                </motion.div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
                    Safety net
                  </p>
                  <h3 className="font-heading text-xl font-bold text-dark sm:text-[22px]">
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
                      <div className="absolute left-4 top-10 h-[calc(100%-12px)] w-px bg-gradient-to-b from-primary/40 to-[#dbeafe]" />
                    )}

                    <motion.div
                      whileHover={reduceMotion ? undefined : { scale: 1.12 }}
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${step.bg} ${step.text} text-sm font-bold shadow-btn`}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                    </motion.div>

                    <motion.div
                      whileHover={reduceMotion ? undefined : { x: 4 }}
                      className="group min-w-0 flex-1 rounded-2xl border border-transparent px-3 py-1 transition-all duration-300 hover:border-border hover:bg-[#f7fbff]"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                        Step {step.num}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-dark">{step.title}</p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-textMuted">
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
                className="relative mt-8 flex items-start gap-3 rounded-2xl border border-border bg-[#f7fbff] px-4 py-4"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[13px] font-semibold leading-relaxed text-dark">
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
