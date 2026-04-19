import Link from "next/link";
import { CheckCircle2, CircleDot, FileCheck2, ShieldCheck, ArrowRight } from "lucide-react";
import { FadeInUp } from "@/components/FadeInUp";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import {
  apostilleDocumentColumns,
  apostilleFaqItems,
  apostilleReasons,
  apostilleSimpleProcess,
  apostilleTrustBadges,
  apostilleWhyFlyOci,
} from "@/lib/data/apostille";

export const metadata = {
  title: "Apostille Services UK and India | Free Pre-Check Before Payment | FlyOCI",
  description:
    "Get your documents apostilled with FlyOCI. Free pre-check before payment. Support for UK and Indian documents including birth certificates, marriage certificates, degree certificates, affidavits, and more.",
};

export default function ApostilleServicesPage() {
  return (
    <>
      <section className="pt-24 bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_70%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#d4e4ff] bg-white/90 px-4 py-3 text-sm font-semibold text-[#124a86] shadow-[0_10px_24px_rgba(19,74,134,0.08)] sm:flex sm:items-center sm:justify-between">
            <span>Free document pre-check before payment. Start your Apostille request with confidence.</span>
            <Link href="/track-apostille" className="mt-2 inline-flex text-[#1b63b8] hover:underline sm:mt-0">
              Track Application
            </Link>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <FadeInUp>
              <p className="inline-flex rounded-full bg-[#e9f3ff] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#18518f]">
                UK and India Apostille Services
              </p>
              <h1 className="mt-5 text-4xl font-heading font-bold leading-tight text-primary sm:text-5xl">
                Get Your Documents Apostilled with Confidence
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-textMuted sm:text-lg">
                We review your document first, confirm the right route, and only then ask you to proceed.
                No unnecessary payment. No avoidable delays.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/apostille-pre-check">
                  <Button className="w-full sm:w-auto">Start Free Pre-Check</Button>
                </Link>
                <Link href="/track-apostille">
                  <Button variant="outline" className="w-full sm:w-auto">Track Existing Application</Button>
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap gap-2 text-sm text-[#325d8e]">
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Free pre-check before payment</li>
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Suitable for UK and Indian documents</li>
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Secure handling and status tracking</li>
              </ul>
            </FadeInUp>

            <FadeInUp delay={0.1} className="rounded-2xl border border-[#d7e5f9] bg-white p-6 shadow-[0_16px_36px_rgba(20,60,106,0.12)]">
              <h2 className="text-2xl font-heading font-bold text-primary">How it works</h2>
              <ol className="mt-5 space-y-3">
                {[
                  "Submit document for free review",
                  "Receive your FlyOCI file number",
                  "Pay only after approval",
                  "Track your Apostille online",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3 rounded-xl border border-[#e1ecff] bg-[#f8fbff] px-4 py-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1d6fd1] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-[#23466f]">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-[#5d7a9f]">Designed for clarity, speed, and reliable document handling.</p>
            </FadeInUp>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
          {apostilleTrustBadges.map((badge) => (
            <div key={badge} className="rounded-xl border border-[#dce8fa] bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-[#204e81]">
              {badge}
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <FadeInUp className="rounded-2xl border border-[#dfeafc] bg-white p-7 shadow-[0_12px_30px_rgba(20,60,106,0.08)]">
              <h2 className="text-3xl font-heading font-bold text-primary">What is an Apostille?</h2>
              <p className="mt-4 text-textMuted leading-relaxed">
                An apostille is an official certification used to confirm the authenticity of a document for use in another country.
                It is commonly required for immigration, OCI applications, visa use, marriage registration, educational documents,
                affidavits, and legal paperwork.
              </p>
              <p className="mt-4 text-[#315a8a] font-medium">
                FlyOCI helps you start with a free document pre-check, so you can understand the right next step before making payment.
              </p>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <h3 className="text-2xl font-heading font-bold text-primary">Common Reasons Clients Use Apostille Services</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {apostilleReasons.map((item) => (
                  <div key={item.title} className="rounded-xl border border-[#dce8fa] bg-white p-4 shadow-[0_8px_20px_rgba(20,60,106,0.08)]">
                    <p className="font-semibold text-[#1f4f83]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#5f7698]">{item.text}</p>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary">A Simple Process, Verified Before Payment</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {apostilleSimpleProcess.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-[#d8e6fc] bg-[#f8fbff] p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1d6fd1] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="mt-3 font-semibold text-[#1d4d81]">{step.title}</p>
                  <p className="mt-1 text-sm text-[#5f7698]">{step.text}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary">Why Choose FlyOCI for Apostille Services</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {apostilleWhyFlyOci.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#dce8fa] bg-white p-5 shadow-[0_8px_18px_rgba(20,60,106,0.08)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#1d6fd1]" />
                    <p className="font-semibold text-[#1d4d81]">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-[#5f7698]">{item.text}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary">Documents Commonly Submitted for Apostille</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <ul className="space-y-2">
                {apostilleDocumentColumns.left.map((item) => (
                  <li key={item} className="flex items-center gap-2 rounded-lg border border-[#e1ecff] bg-[#f9fbff] px-4 py-2 text-[#23466f]">
                    <CircleDot className="h-4 w-4 text-[#1d6fd1]" />
                    {item}
                  </li>
                ))}
              </ul>
              <ul className="space-y-2">
                {apostilleDocumentColumns.right.map((item) => (
                  <li key={item} className="flex items-center gap-2 rounded-lg border border-[#e1ecff] bg-[#f9fbff] px-4 py-2 text-[#23466f]">
                    <CircleDot className="h-4 w-4 text-[#1d6fd1]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-sm text-[#5f7698]">
              Document routes can vary depending on where the document was issued and how it will be used.
              That is why every request begins with a free pre-check.
            </p>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary">Clear Process. Pricing Confirmed After Review.</h2>
            <p className="mt-3 max-w-3xl text-textMuted">
              Your document is reviewed first. Once we confirm the appropriate Apostille route,
              we send you the service fee and next steps before payment.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#cfe2ff] bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4272a5]">Pre-Check</p>
                <p className="mt-2 text-3xl font-heading font-bold text-primary">GBP 0</p>
                <p className="mt-2 text-sm text-[#5f7698]">Free review before payment</p>
              </div>
              <div className="rounded-2xl border border-[#cfe2ff] bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4272a5]">Standard Apostille</p>
                <p className="mt-2 text-3xl font-heading font-bold text-primary">From GBP XX</p>
                <p className="mt-2 text-sm text-[#5f7698]">Price confirmed after review</p>
              </div>
              <div className="rounded-2xl border border-[#cfe2ff] bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4272a5]">Additional Requirements</p>
                <p className="mt-2 text-3xl font-heading font-bold text-primary">As Applicable</p>
                <p className="mt-2 text-sm text-[#5f7698]">Only if needed and communicated in advance</p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary text-center">Frequently Asked Questions</h2>
            <div className="mt-8 rounded-2xl border border-[#dce8fa] bg-white p-3 shadow-[0_12px_30px_rgba(20,60,106,0.08)]">
              <Accordion items={apostilleFaqItems.slice(0, 5)} />
            </div>
            <div className="mt-4 text-center">
              <Link href="/apostille-faq" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1d6fd1] hover:underline">
                View All FAQs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="pb-24 pt-10 bg-[linear-gradient(180deg,#f6faff_0%,#ffffff_90%)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeInUp className="rounded-3xl border border-[#d6e6ff] bg-white p-8 text-center shadow-[0_16px_34px_rgba(20,60,106,0.12)]">
            <FileCheck2 className="mx-auto h-9 w-9 text-[#1d6fd1]" />
            <h2 className="mt-4 text-3xl font-heading font-bold text-primary">Start with a Free Document Pre-Check</h2>
            <p className="mt-3 text-textMuted">
              Upload your document, receive your FlyOCI file number, and get reviewed before making any payment.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/apostille-pre-check">
                <Button className="w-full sm:w-auto">Start Free Pre-Check</Button>
              </Link>
              <Link href="/track-apostille">
                <Button variant="outline" className="w-full sm:w-auto">Track Application</Button>
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#5f7698]">
              FlyOCI provides guided document support and process coordination. Timelines and requirements may vary depending on document type and issuing authority.
            </p>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
