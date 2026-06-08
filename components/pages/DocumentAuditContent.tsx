"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, FileSearch } from "lucide-react";
import Link from "next/link";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";

const auditSteps = [
  "Fill short form - select your service",
  "Upload your documents securely",
  "Pay £15 audit fee online",
  "Expert review within 24-48 hours",
  "Get your report by email and WhatsApp",
  "Optionally proceed - £15 credited to OCI service fee",
];

const receiveItems = [
  "Detailed 'Pass / Fix / Missing' status for each document",
  "Clear instructions for how to correct or arrange missing documents",
  "Guidance on required affidavits, apostille, translations or bilingual certificates",
  "Recommended service type (OCI vs e-Visa vs passport renewal) if you are unsure",
  "Clear quote for the full service fee after audit",
];

const whoShouldItems = [
  "Your name or your parents' names differ across documents",
  "There have been marriage, divorce or name changes",
  "Your documents are issued from different countries",
  "You're renewing an old OCI and not sure which documents apply now",
  "You're applying for elderly parents and want everything correct",
  "You travel soon and cannot risk rejections or delays",
];

const whatIsItems = [
  "You upload documents via our secure portal",
  "We verify each one is correct and acceptable",
  "We check name mismatches, spelling errors and date discrepancies",
  "We confirm photos meet exact specification",
  "We identify if you need apostille, affidavits, bilingual certificates",
  "You get a clear written summary and next steps",
];

const selfCheckItems = [
  { title: "Passport scan is clear", text: "Ensure all corners are visible and the text is readable without glare." },
  { title: "Name details match", text: "Check that names are consistent across passport, certificates, and proofs." },
  { title: "Photo follows spec", text: "Use compliant background, crop, and brightness before uploading." },
];

export function DocumentAuditContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-14 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#edf5ff] blur-3xl" />

        <motion.div
          variants={pageContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="relative z-10 mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-10"
        >
          <div>
            <motion.div
              variants={pageFadeUp}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-sm"
            >
              <FileSearch className="h-3.5 w-3.5" />
              Document Audit
            </motion.div>

            <motion.h1
              variants={pageFadeUp}
              className="font-heading text-[clamp(1.85rem,4.2vw,2.75rem)] font-black leading-tight tracking-[-0.02em] text-[#041020]"
            >
              Get Your OCI / Visa Documents Checked Before You Apply
            </motion.h1>

            <motion.p
              variants={pageFadeUp}
              className="mt-4 max-w-3xl text-base font-semibold leading-relaxed text-[#334e68] sm:text-lg"
            >
              A small document mismatch can add weeks of delay. Our pre-check highlights issues early so your application moves forward smoothly.
            </motion.p>

            <motion.div variants={pageContainer} className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Audit Fee", value: "£15 per applicant" },
                { label: "Turnaround", value: "24-48 hours" },
                { label: "Credit", value: "Adjusted later" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={pageFadeUp}
                  whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                  className="rounded-2xl border border-[#d9e8ff] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(30,74,135,0.08)] transition-shadow hover:shadow-[0_14px_32px_rgba(28,105,221,0.12)]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#041020]">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={pageFadeUp}>
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -8 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="overflow-hidden rounded-3xl border border-[#d6e8ff] bg-white shadow-[0_20px_56px_rgba(30,74,135,0.12)]"
            >
              <div className="h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#1c69dd]">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">Start Here</p>
                    <h2 className="font-heading text-lg font-black text-[#041020]">Book Your Audit</h2>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm font-medium text-[#486581]">
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    Includes detailed &quot;Pass / Fix / Missing&quot; report
                  </li>
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    Guidance for corrections and missing documents
                  </li>
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    Support updates on email and WhatsApp
                  </li>
                </ul>
                <div className="mt-6 space-y-3">
                  <Link href="/auth/login?next=%2Fdashboard" className="group block">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(28,105,221,0.35)]"
                    >
                      Book My Document Audit — £15
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </motion.span>
                  </Link>
                  <Link href="/contact" className="block">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      className="flex w-full items-center justify-center rounded-2xl border border-[#cfe2ff] bg-white px-4 py-3.5 text-sm font-bold text-[#1c69dd] transition-colors hover:bg-[#f4f8ff]"
                    >
                      Still Unsure? Ask a Question
                    </motion.span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* What is */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="mb-6 font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]">
                What Is a Document Audit?
              </h2>
              <p className="mb-4 text-base font-semibold leading-relaxed text-[#486581] sm:text-lg">
                A Document Audit is a professional pre-check of all your documents before submitting your OCI, e-Visa or passport application.
              </p>
              <p className="mb-6 text-base font-semibold text-[#486581]">You upload your documents via our secure portal. We then:</p>
              <ul className="space-y-3">
                {whatIsItems.map((item) => (
                  <motion.li
                    key={item}
                    whileHover={reduceMotion ? undefined : { x: 6 }}
                    className="flex items-start gap-3 rounded-xl px-3 py-2 font-semibold text-[#334e68] transition-colors hover:bg-[#f8fbff]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              className="relative aspect-square overflow-hidden rounded-3xl border border-[#d9e8ff] bg-[#f7fbff] p-8"
            >
              <FileSearch className="relative z-10 mx-auto h-32 w-32 text-[#1c69dd] opacity-20" />
              <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-[#d7e9ff] blur-[60px] opacity-40 motion-safe:animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-[#1c69dd] blur-[60px] opacity-25 motion-safe:animate-pulse" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#f7fbff] py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]"
          >
            Simple Pricing — Fully Credited Back
          </motion.h2>

          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 md:gap-8"
          >
            <motion.div
              variants={pageFadeUp}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="h-full rounded-3xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.09)] sm:p-8"
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="rounded-xl bg-[#eaf3ff] px-4 py-2 text-xl font-black text-[#1c69dd]">£15</span>
                <h3 className="font-heading text-lg font-black text-[#041020] sm:text-xl">Document Audit Fee per applicant</h3>
              </div>
              <p className="font-medium leading-relaxed text-[#486581]">
                The £15 fee covers our expert advisory and written report. It is{" "}
                <strong className="text-[#041020]">fully deducted from your full service fee</strong> when you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update) within 30 days. Audit credit does not apply to e-Visa or Passport Renewal.
              </p>
              <p className="mt-6 text-sm italic text-[#627d98]">
                *If you decide not to proceed after the audit, the £15 simply covers our expert advisory and written report.
              </p>
            </motion.div>

            <motion.div
              variants={pageFadeUp}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="h-full rounded-3xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.09)] sm:p-8"
            >
              <h3 className="mb-6 font-heading text-xl font-black text-[#041020]">Example: New OCI Application</h3>
              <ul className="mb-6 space-y-3">
                <li className="flex items-center justify-between rounded-xl border border-[#e8f0fa] bg-[#f8fbff] p-3">
                  <span className="font-medium text-[#486581]">Document Audit (Now)</span>
                  <span className="font-mono font-bold text-[#041020]">£15</span>
                </li>
                <li className="flex items-center justify-between p-3 text-[#627d98]">
                  <span>New OCI Service (Later)</span>
                  <span className="font-mono line-through opacity-70">£88</span>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-[#cfe2ff] bg-[#eaf3ff] p-3">
                  <span className="font-bold text-[#041020]">You Pay Later</span>
                  <span className="font-mono text-xl font-black text-[#1c69dd]">£73</span>
                </li>
              </ul>
              <p className="text-center text-sm font-semibold text-[#486581]">Because £15 is already paid as credit.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Who should */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]">Who Should Take the Audit?</h2>
            <p className="mx-auto mt-3 max-w-2xl font-medium text-[#486581]">
              We strongly recommend a Document Audit if any of the following apply to you:
            </p>
          </motion.div>

          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            {whoShouldItems.map((text) => (
              <motion.div
                key={text}
                variants={pageFadeUp}
                whileHover={reduceMotion ? undefined : { y: -5 }}
                className="group flex h-full items-start gap-3 rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-5 transition-all hover:border-[#1c69dd]/25 hover:bg-white hover:shadow-[0_12px_32px_rgba(28,105,221,0.1)]"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#1c69dd] transition-transform group-hover:scale-110" />
                <p className="font-semibold leading-relaxed text-[#334e68]">{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Self check */}
      <section className="bg-[#f7fbff] py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-heading text-2xl font-black text-[#041020] sm:text-3xl">Quick Self-Check</h2>
            <p className="mt-2 font-medium text-[#486581]">Use these quick checks before upload to reduce corrections.</p>
          </motion.div>

          <div className="mt-8 space-y-3">
            {selfCheckItems.map((item, i) => (
              <motion.details
                key={item.title}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl border border-[#d9e8ff] bg-white px-5 py-4 open:shadow-[0_8px_24px_rgba(30,74,135,0.08)] transition-all hover:border-[#1c69dd]/20"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-[#041020]">
                  {item.title}
                  <span className="text-[#1c69dd] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm font-medium text-[#486581]">{item.text}</p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            className="rounded-3xl border border-[#d9e8ff] bg-gradient-to-br from-white to-[#f8fbff] p-8 shadow-[0_16px_48px_rgba(30,74,135,0.1)] sm:p-12"
          >
            <h2 className="mb-8 text-center font-heading text-2xl font-black text-[#041020] sm:text-3xl">
              What You Get from the Audit
            </h2>
            <div className="space-y-4">
              {receiveItems.map((item) => (
                <motion.div
                  key={item}
                  whileHover={reduceMotion ? undefined : { x: 6 }}
                  className="flex items-start gap-4 border-b border-[#e8f0fa] pb-4 last:border-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3ff] text-[#1c69dd]">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="flex-1 pt-0.5 font-semibold leading-relaxed text-[#334e68]">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works steps */}
      <section className="bg-[#f7fbff] py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]">How the Audit Works</h2>
            <p className="mt-2 font-medium text-[#486581]">Simple 6-step process from pre-check to confident application.</p>
          </motion.div>

          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 sm:gap-6"
          >
            {auditSteps.map((step, i) => (
              <motion.div
                key={step}
                variants={pageFadeUp}
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
                className="group flex h-full items-start gap-4 rounded-2xl border border-[#dbe9ff] bg-white p-5 transition-all hover:border-[#1c69dd]/30 hover:shadow-[0_12px_32px_rgba(28,105,221,0.1)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1c69dd] to-[#2563eb] text-sm font-black text-white shadow-[0_4px_14px_rgba(28,105,221,0.3)]">
                  {i + 1}
                </div>
                <p className="pt-1 font-semibold leading-relaxed text-[#334e68] group-hover:text-[#041020]">{step}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-14 sm:py-16">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
        >
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]">
            Ready to Prevent Costly Delays?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-medium text-[#486581]">
            Start your pre-check journey now. If you are not logged in, you will be taken to the existing login page first.
          </p>
          <Link href="/auth/login?next=%2Fdashboard" className="group mt-8 inline-block">
            <motion.span
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-8 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(28,105,221,0.35)]"
            >
              Start My Document Audit Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </motion.span>
          </Link>
        </motion.div>
      </section>
    </>
  );
}
