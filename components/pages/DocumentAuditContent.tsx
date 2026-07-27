"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, FileSearch } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";
import { usePublicPricing } from "@/hooks/usePublicPricing";

const auditSteps = [
  "Fill short form - select your service",
  "Upload your documents securely",
  "Pay the assessment fee online",
  "Expert review within 24-48 hours",
  "Get your report by email and WhatsApp",
  "Optionally proceed — fee credited to OCI service where eligible",
];

const receiveItems = [
  "Detailed 'Pass / Fix / Missing' status for each document",
  "Clear instructions for how to correct or arrange missing documents",
  "Guidance on required affidavits, apostille, translations or bilingual certificates",
  "Recommended service type (OCI vs e-Visa vs passport renewal) if you are unsure",
  "Clear quote for the full service fee after assessment",
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
  const router = useRouter();
  const { assessmentFee, loading } = usePublicPricing();
  const feeLabel =
    assessmentFee != null && assessmentFee > 0
      ? `£${assessmentFee % 1 === 0 ? assessmentFee.toFixed(0) : assessmentFee.toFixed(2)}`
      : null;

  useEffect(() => {
    if (!loading && !feeLabel) {
      router.replace("/services");
    }
  }, [loading, feeLabel, router]);

  if (loading || !feeLabel) {
    return (
      <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-3xl text-center text-sm text-[#627d98]">
          {loading ? "Loading…" : "Redirecting to services…"}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-14 pt-24 sm:px-6 sm:pt-28 lg:px-8">
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
              Early / Initial Assessment
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
              Our early assessment highlights issues first so your application moves forward smoothly.
            </motion.p>
            <motion.div variants={pageContainer} className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Assessment Fee", value: `${feeLabel} per applicant` },
                { label: "Turnaround", value: "24-48 hours" },
                { label: "Credit", value: "Adjusted later" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={pageFadeUp}
                  className="rounded-2xl border border-[#d9e8ff] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(30,74,135,0.08)]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#041020]">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={pageFadeUp}>
            <div className="rounded-3xl border border-[#d9e8ff] bg-white p-5 shadow-[0_16px_40px_rgba(30,74,135,0.1)] sm:p-6">
              <h2 className="font-heading text-lg font-black text-[#041020]">Start Your Assessment</h2>
              <ul className="mt-4 space-y-2 text-sm font-medium text-[#486581]">
                {["Pass / Fix / Missing report", "Correction guidance", "Email & WhatsApp updates"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-3">
                <Link href="/auth/login?next=%2Fdashboard%2Fdocument-audit%3Fstart%3D1" className="group block">
                  <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-4 py-3.5 text-sm font-bold text-white">
                    Start Early Assessment — {feeLabel}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link href="/services" className="block text-center text-sm font-bold text-[#1c69dd] hover:underline">
                  Prefer to start a service directly?
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 font-heading text-2xl font-black text-[#041020]">What Is an Early / Initial Assessment?</h2>
          <p className="mb-6 max-w-3xl text-[#486581]">
            A professional pre-check of your documents before submitting your OCI, e-Visa or passport application.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {whatIsItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-[#334e68]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#f7fbff] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#d9e8ff] bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-xl bg-[#eaf3ff] px-4 py-2 text-xl font-black text-[#1c69dd]">{feeLabel}</span>
                <h3 className="font-heading text-lg font-black text-[#041020]">Assessment fee per applicant</h3>
              </div>
              <p className="text-sm text-[#486581]">
                Fee comes from the active early-assessment product in admin. Credited against eligible OCI services within 30 days when you proceed.
              </p>
            </div>
            <div className="rounded-3xl border border-[#d9e8ff] bg-white p-6">
              <h3 className="font-heading text-lg font-black text-[#041020]">What you receive</h3>
              <ul className="mt-3 space-y-2">
                {receiveItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#486581]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center font-heading text-2xl font-black text-[#041020]">Who Should Take the Assessment?</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whoShouldItems.map((item) => (
              <div key={item} className="rounded-2xl border border-[#e8f0fa] bg-[#f8fbff] p-4 text-sm font-semibold text-[#334e68]">
                <AlertTriangle className="mb-2 h-4 w-4 text-[#1c69dd]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7fbff] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center font-heading text-2xl font-black text-[#041020]">Quick self-check</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {selfCheckItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#d9e8ff] bg-white p-5">
                <h3 className="font-heading font-bold text-[#041020]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#486581]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center font-heading text-2xl font-black text-[#041020]">How it works</h2>
          <ol className="space-y-3">
            {auditSteps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-xl border border-[#e8f0fa] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334e68]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c69dd] text-xs font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-black text-[#041020]">Ready when you are</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/login?next=%2Fdashboard%2Fdocument-audit%3Fstart%3D1"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-8 py-4 text-base font-bold text-white"
            >
              Start Early Assessment — {feeLabel}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/services" className="inline-flex rounded-2xl border border-[#cfe2ff] bg-white px-6 py-4 text-base font-bold text-[#1c69dd]">
              Start a service instead
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
