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
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.apostilleServices);

const JOURNEY_HREF = "/dashboard/document-audit?start=1&service=apostille";
const TRACK_HREF = "/dashboard/applications";

export default function ApostilleServicesPage() {
  return (
    <>
      <section className="pt-24 bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_70%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#d4e4ff] bg-white/90 px-4 py-3 text-sm font-semibold text-[#124a86] shadow-[0_10px_24px_rgba(19,74,134,0.08)] sm:flex sm:items-center sm:justify-between">
            <span>Start your Apostille in the same guided journey as OCI and passport — catalog fees at checkout.</span>
            <Link href={TRACK_HREF} className="mt-2 inline-flex text-[#1b63b8] hover:underline sm:mt-0">
              Track application
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
                Answer a few questions, upload your documents, optionally take early assessment, then pay the published
                service fee and track progress from your dashboard.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={JOURNEY_HREF}>
                  <Button className="w-full sm:w-auto">Start application</Button>
                </Link>
                <Link href={TRACK_HREF}>
                  <Button variant="outline" className="w-full sm:w-auto">Track existing application</Button>
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap gap-2 text-sm text-[#325d8e]">
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Catalog fees at checkout</li>
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Suitable for UK and Indian documents</li>
                <li className="rounded-full border border-[#c9ddff] bg-white px-3 py-1.5">Secure handling and status tracking</li>
              </ul>
            </FadeInUp>

            <FadeInUp delay={0.1} className="rounded-2xl border border-[#d7e5f9] bg-white p-6 shadow-[0_16px_36px_rgba(20,60,106,0.12)]">
              <h2 className="text-2xl font-heading font-bold text-primary">How it works</h2>
              <ol className="mt-5 space-y-3">
                {[
                  "Start application and answer questions",
                  "Upload documents for your checklist",
                  "Optional early assessment, then pay catalog fee",
                  "Track progress from your dashboard",
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

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {apostilleTrustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4e4ff] bg-[#f7fbff] px-4 py-2 text-sm font-semibold text-[#1d4d81]"
                >
                  <ShieldCheck className="h-4 w-4 text-[#1d6fd1]" />
                  {badge}
                </span>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#f6faff_0%,#ffffff_90%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary text-center">Why people need Apostille</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-textMuted">
              Common documents that need legalisation for overseas use.
            </p>
          </FadeInUp>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apostilleReasons.map((item, index) => (
              <FadeInUp key={item.title} delay={index * 0.04}>
                <div className="h-full rounded-2xl border border-[#dce8fa] bg-white p-5 shadow-[0_10px_24px_rgba(20,60,106,0.06)]">
                  <CircleDot className="h-5 w-5 text-[#1d6fd1]" />
                  <h3 className="mt-3 text-lg font-heading font-bold text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-textMuted">{item.text}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary text-center">Simple process</h2>
          </FadeInUp>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {apostilleSimpleProcess.map((step, index) => (
              <FadeInUp key={step.title} delay={index * 0.05}>
                <div className="h-full rounded-2xl border border-[#dce8fa] bg-[#f8fbff] p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1d6fd1] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-heading font-bold text-primary">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-textMuted">{step.text}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#f6faff_0%,#ffffff_90%)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary text-center">Why FlyOCI</h2>
          </FadeInUp>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {apostilleWhyFlyOci.map((item, index) => (
              <FadeInUp key={item.title} delay={index * 0.04}>
                <div className="flex h-full gap-3 rounded-2xl border border-[#dce8fa] bg-white p-5 shadow-[0_10px_24px_rgba(20,60,106,0.06)]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fd1]" />
                  <div>
                    <h3 className="text-lg font-heading font-bold text-primary">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-textMuted">{item.text}</p>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <h2 className="text-3xl font-heading font-bold text-primary text-center">Documents we commonly handle</h2>
            <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
              <ul className="space-y-2">
                {apostilleDocumentColumns.left.map((doc) => (
                  <li key={doc} className="flex items-center gap-2 text-sm text-[#23466f]">
                    <CheckCircle2 className="h-4 w-4 text-[#1d6fd1]" />
                    {doc}
                  </li>
                ))}
              </ul>
              <ul className="space-y-2">
                {apostilleDocumentColumns.right.map((doc) => (
                  <li key={doc} className="flex items-center gap-2 text-sm text-[#23466f]">
                    <CheckCircle2 className="h-4 w-4 text-[#1d6fd1]" />
                    {doc}
                  </li>
                ))}
              </ul>
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
            <h2 className="mt-4 text-3xl font-heading font-bold text-primary">Start your Apostille application</h2>
            <p className="mt-3 text-textMuted">
              Use the same guided journey as OCI and passport — questions, documents, optional assessment, then checkout.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={JOURNEY_HREF}>
                <Button className="w-full sm:w-auto">Start application</Button>
              </Link>
              <Link href={TRACK_HREF}>
                <Button variant="outline" className="w-full sm:w-auto">Track application</Button>
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
