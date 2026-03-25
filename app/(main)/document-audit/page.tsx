import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import { CheckoutButton } from "@/components/CheckoutButton";
import Link from "next/link";
import { CheckCircle, AlertTriangle, FileSearch } from "lucide-react";

export const metadata = {
  title: "Document Audit for OCI, e-Visa & Passport Applications | FlyOCI",
  description: "Avoid OCI and visa rejections with FlyOCI's expert document audit. We review your documents, highlight issues and guide you on fixes. £15 audit fully credited when you proceed.",
};

export default function DocumentAuditPage() {

  const receiveItems = [
    "Detailed 'Pass / Fix / Missing' status for each document",
    "Clear instructions for how to correct or arrange missing documents",
    "Guidance on required affidavits, apostille, translations or bilingual certificates",
    "Recommended service type (OCI vs e-Visa vs passport renewal) if you are unsure",
    "Clear quote for the full service fee after audit",
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 rounded-l-full blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto text-center">
          <FadeInUp>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-primary mb-6 leading-tight">
              Get Your OCI / Visa Documents Checked <span className="text-accent">Before You Apply</span>
            </h1>
            <p className="text-lg md:text-xl text-textMuted font-body mb-10 max-w-3xl mx-auto">
              A 15-minute mistake can cost weeks of delay. Our expert <strong>Document Audit (Pre-Check)</strong> catches problems before they reach the consulate or VFS.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <CheckoutButton />
              <Link href="/contact" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full text-lg py-4 px-8 bg-white">Still Unsure? Ask a Question</Button>
              </Link>
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
                  "Verify that each document is correct and acceptable",
                  "Check for name mismatches, spelling errors and date discrepancies",
                  "Confirm that your photographs meet the exact specification",
                  "Identify whether you need additional documents (apostille, affidavits, etc.)",
                  "Provide a clear written summary and next steps"
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-primary font-body font-medium">
                    <CheckCircle className="w-5 h-5 text-success mr-3 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeInUp>
            <FadeInUp delay={0.2} className="relative">
              <div className="aspect-square bg-[#F5F5F0] rounded-3xl p-8 flex items-center justify-center relative overflow-hidden">
                <FileSearch className="w-32 h-32 text-primary opacity-20 relative z-10" />
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-accent rounded-full blur-[60px] opacity-30 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-primary rounded-full blur-[60px] opacity-30 animate-pulse" style={{ animationDelay: '1s'}} />
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* SECTION 2: Pricing & Credit */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Simple Pricing — Fully Credited Back</h2>
          </FadeInUp>
          
          <div className="grid md:grid-cols-2 gap-8">
            <FadeInUp delay={0.1}>
              <div className="bg-white/10 rounded-2xl p-8 border border-white/20 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-accent text-primary font-bold text-xl px-4 py-2 rounded-xl">£15</span>
                  <h3 className="text-xl font-heading font-bold">Document Audit Fee</h3>
                </div>
                <p className="text-gray-300 font-body text-lg leading-relaxed">
                  The £15 fee covers our expert advisory and written report. It is <strong className="text-accent">fully deducted from your full service fee</strong> when you proceed with any FlyOCI service within 30 days.
                </p>
                <p className="text-sm text-gray-400 mt-6 italic">
                  *If you decide not to proceed after the audit, the £15 simply covers our expert advisory and written report.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 border-l-8 border-accent h-full text-primary">
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
                  <li className="flex justify-between items-center bg-accent/10 p-3 rounded-lg border border-accent/20 mt-2">
                    <span className="font-body font-bold text-amber-800">You Pay Later</span>
                    <span className="font-mono font-bold text-xl text-amber-800">£73</span>
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
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-start h-full">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mr-4 shrink-0 mt-0.5" />
                  <p className="text-primary font-body font-medium leading-relaxed">{text}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: What You Receive */}
      <section className="py-20 bg-[#F5F5F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-border">
            <h2 className="text-3xl font-heading font-bold text-primary mb-8 text-center">What You Receive from the Audit</h2>
            <div className="space-y-6">
              {receiveItems.map((item, i) => (
                <div key={i} className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4 mt-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-lg text-primary font-body leading-relaxed pt-1 flex-1 pb-6 border-b border-gray-100">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <CheckoutButton />
            </div>
          </FadeInUp>
        </div>
      </section>

    </>
  );
}
