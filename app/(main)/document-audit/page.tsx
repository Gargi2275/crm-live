import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle, AlertTriangle, FileSearch } from "lucide-react";

export const metadata = {
  title: "Document Audit for OCI, e-Visa & Passport Applications | FlyOCI",
  description: "Avoid OCI and visa rejections with FlyOCI's expert document audit. We review your documents, highlight issues and guide you on fixes. £15 audit credit applies to OCI services only.",
};

export default function DocumentAuditPage() {
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

  return (
    <>
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
        <div className="absolute -top-16 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
        <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#e8f2ff] blur-3xl opacity-80 pointer-events-none" />
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <FadeInUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Document Audit</p>
            <h1 className="mt-3 text-3xl md:text-5xl font-heading font-bold text-primary leading-tight">
              Get Your OCI / Visa Documents Checked Before You Apply
            </h1>
            <p className="mt-4 text-base md:text-lg text-textMuted font-body max-w-3xl">
              A small document mismatch can add weeks of delay. Our pre-check highlights issues early so your application moves forward smoothly.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Audit Fee</p>
                <p className="mt-1 text-sm font-semibold text-primary">£15 per applicant</p>
              </div>
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Turnaround</p>
                <p className="mt-1 text-sm font-semibold text-primary">24-48 hours</p>
              </div>
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Credit</p>
                <p className="mt-1 text-sm font-semibold text-primary">Adjusted later</p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <div className="rounded-2xl border border-[#d9e8ff] bg-white p-5 shadow-[0_14px_36px_rgba(30,74,135,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(30,74,135,0.14)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ff] text-primary">
                  <FileSearch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-primary/70 font-semibold">Start Here</p>
                  <h2 className="text-lg font-heading font-bold text-primary">Book Your Audit</h2>
                </div>
              </div>
              <div className="mt-4 space-y-2.5 text-sm text-textMuted">
                <p>Includes detailed "Pass / Fix / Missing" report</p>
                <p>Guidance for corrections and missing documents</p>
                <p>Support updates on email and WhatsApp</p>
              </div>
              <div className="mt-5 space-y-2.5">
                <Link href="/auth/login?next=%2Fdashboard" className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                  Book My Document Audit - £15
                </Link>
                <Link href="/contact" className="inline-flex w-full items-center justify-center rounded-xl border border-[#cfe2ff] bg-white px-4 py-3 text-sm font-semibold text-primary hover:bg-[#f4f8ff] transition-colors">
                  Still Unsure? Ask a Question
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 1: What is a Document Audit? */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">What Is a Document Audit?</h2>
              <p className="text-lg text-textMuted font-body mb-6">
                A Document Audit is a professional pre-check of all your documents before submitting your OCI, e-Visa or passport application.
              </p>
              <p className="text-lg text-textMuted font-body mb-8">
                You upload your documents via our secure portal. We then:
              </p>
              <ul className="space-y-4">
                {[
                  "You upload documents via our secure portal",
                  "We verify each one is correct and acceptable",
                  "We check name mismatches, spelling errors and date discrepancies",
                  "We confirm photos meet exact specification",
                  "We identify if you need apostille, affidavits, bilingual certificates",
                  "You get a clear written summary and next steps"
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-primary font-body font-medium">
                    <CheckCircle className="w-5 h-5 text-[#1c69dd] mr-3 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeInUp>
            <FadeInUp delay={0.2} className="relative">
              <div className="aspect-square bg-[#f7fbff] rounded-3xl p-8 flex items-center justify-center relative overflow-hidden border border-[#d9e8ff]">
                <FileSearch className="w-32 h-32 text-primary opacity-20 relative z-10" />
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#d7e9ff] rounded-full blur-[60px] opacity-35 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-primary rounded-full blur-[60px] opacity-30 animate-pulse" style={{ animationDelay: '1s'}} />
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f5f9ff]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">Simple Pricing — Fully Credited Back</h2>
          </FadeInUp>
          
          <div className="grid md:grid-cols-2 gap-8">
            <FadeInUp delay={0.1}>
              <div className="bg-white rounded-2xl p-8 border border-[#d9e8ff] h-full shadow-[0_12px_30px_rgba(30,74,135,0.09)]">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-[#eaf3ff] text-primary font-bold text-xl px-4 py-2 rounded-xl">£15</span>
                  <h3 className="text-xl font-heading font-bold text-primary">Document Audit Fee per applicant</h3>
                </div>
                <p className="text-textMuted font-body text-lg leading-relaxed">
                  The £15 fee covers our expert advisory and written report. It is <strong className="text-primary">fully deducted from your full service fee</strong> when you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update) within 30 days. Audit credit does not apply to e-Visa or Passport Renewal.
                </p>
                <p className="text-sm text-textMuted mt-6 italic">
                  *If you decide not to proceed after the audit, the £15 simply covers our expert advisory and written report.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 border border-[#d9e8ff] h-full text-primary shadow-[0_12px_28px_rgba(26,75,189,0.08)]">
                <h3 className="text-xl font-heading font-bold mb-6">Example: New OCI Application</h3>
                <ul className="space-y-4 mb-6">
                  <li className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-body text-textMuted">Document Audit (Now)</span>
                    <span className="font-mono font-bold">£15</span>
                  </li>
                  <li className="flex justify-between items-center text-textMuted">
                    <span className="font-body">New OCI Service (Later)</span>
                    <span className="font-mono line-through opacity-70">£88</span>
                  </li>
                  <li className="flex justify-between items-center bg-[#eaf3ff] p-3 rounded-lg border border-[#cfe2ff] mt-2">
                    <span className="font-body font-bold text-primary">You Pay Later</span>
                    <span className="font-mono font-bold text-xl text-primary">£73</span>
                  </li>
                </ul>
                <p className="text-sm font-semibold text-textMuted text-center">Because £15 is already paid as credit.</p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* SECTION 3: Who Should Take the Audit? */}
      <section className="py-20 bg-bg-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">Who Should Take the Audit?</h2>
            <p className="text-lg text-textMuted font-body max-w-2xl mx-auto">We strongly recommend a Document Audit if any of the following apply to you:</p>
          </FadeInUp>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "Your name or your parents' names differ across documents",
              "There have been marriage, divorce or name changes",
              "Your documents are issued from different countries",
              "You're renewing an old OCI and not sure which documents apply now",
              "You're applying for elderly parents and want everything correct",
              "You travel soon and cannot risk rejections or delays"
            ].map((text, i) => (
              <FadeInUp key={i} delay={i * 0.1}>
                <div className="bg-white p-6 rounded-2xl border border-border shadow-[0_10px_22px_rgba(26,75,189,0.06)] flex items-start h-full">
                  <AlertTriangle className="w-6 h-6 text-[#1c69dd] mr-4 shrink-0 mt-0.5" />
                  <p className="text-primary font-body font-medium leading-relaxed">{text}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary">Quick Self-Check</h2>
            <p className="mt-2 text-textMuted">Use these quick checks before upload to reduce corrections.</p>
          </FadeInUp>
          <div className="mt-8 space-y-3">
            {[
              { title: "Passport scan is clear", text: "Ensure all corners are visible and the text is readable without glare." },
              { title: "Name details match", text: "Check that names are consistent across passport, certificates, and proofs." },
              { title: "Photo follows spec", text: "Use compliant background, crop, and brightness before uploading." },
            ].map((item) => (
              <details key={item.title} className="group rounded-xl border border-[#d9e8ff] bg-[#f8fbff] px-4 py-3 open:bg-white transition-colors">
                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold text-primary">
                  {item.title}
                  <span className="text-[#2b5e93] text-sm transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-textMuted">{item.text}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f7fbff]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="bg-white rounded-3xl p-8 sm:p-12 shadow-[0_16px_38px_rgba(26,75,189,0.10)] border border-[#d9e8ff]">
            <h2 className="text-3xl font-heading font-bold text-primary mb-8 text-center">What You Get from the Audit</h2>
            <div className="space-y-6">
              {receiveItems.map((item, i) => (
                <div key={i} className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-[#eaf3ff] text-primary flex items-center justify-center shrink-0 mr-4 mt-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-lg text-primary font-body leading-relaxed pt-1 flex-1 pb-6 border-b border-gray-100">{item}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 6: How the Audit Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">How the Audit Works</h2>
            <p className="text-lg text-textMuted font-body">Simple 6-step process from pre-check to confident application.</p>
          </FadeInUp>

          <div className="grid md:grid-cols-2 gap-6">
            {auditSteps.map((step, i) => (
              <FadeInUp key={step} delay={i * 0.08}>
                <div className="bg-bg-page border border-border rounded-2xl p-6 h-full flex items-start gap-4 shadow-[0_8px_18px_rgba(26,75,189,0.05)]">
                  <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-primary font-body font-medium leading-relaxed pt-1">{step}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#f5f9ff]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">Ready to Prevent Costly Delays?</h2>
            <p className="text-textMuted text-lg font-body mb-8">
              Start your pre-check journey now. If you are not logged in, you will be taken to the existing login page first.
            </p>
            <Link href="/auth/login?next=%2Fdashboard" className="inline-block">
              <Button className="text-lg py-4 px-10">
                Start My Document Audit Now
              </Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

    </>
  );
}
