import { HeroSection } from "@/components/HeroSection";
import WhatWeDo from "@/components/WhatWeDo";
import { StepTimeline } from "@/components/StepTimeline";
import { ServiceFees } from "@/components/ServiceFees";
import { Carousel } from "@/components/ui/Carousel";
import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle, FileX, Globe, MessageCircle, Shield, UserCheck } from "lucide-react";

export default function Home() {
  const steps = [
    { title: "Step 1 - Quick Online Form & Upload", description: "Tell us which service you need and upload clear photos/scans through our secure portal." },
    { title: "Step 2 - Expert Document Audit", description: "We send a written report showing what is correct, missing, or needs correction." },
    { title: "Step 3 - End-to-End Handling", description: "Once documents are ready, we prepare forms, submission steps, and ongoing guidance." },
  ];

  const features = [
    { title: "Specialised Focus", description: "We only handle OCI, Indian passports and e-Visas.", icon: <Globe /> },
    { title: "Expert Checks", description: "We reduce rejections by catching issues upfront.", icon: <Shield /> },
    { title: "Clear Comms", description: "WhatsApp & email support directly with humans.", icon: <MessageCircle /> },
    { title: "Fixed Fees", description: "Transparent pricing without surprises.", icon: <CheckCircle /> },
    { title: "Step Guidance", description: "Especially helpful for elderly or first-timers.", icon: <UserCheck /> },
  ];

  const testimonials = [
    {
      title: "OCI Renewal Was Smooth and Stress-Free",
      quote: "FlyOCI made my parents' OCI renewal very easy. All documents were checked in advance and there were no surprises at VFS.",
      author: "Rajesh K., UK",
      service: "OCI Renewal",
      detail: "Document Audit Completed",
    },
    {
      title: "They Helped Me Pick the Right Option",
      quote: "I was confused about e-Visa vs OCI. The team explained everything clearly and suggested the right option.",
      author: "Anita P., US",
      service: "Indian e-Visa",
      detail: "Service Guidance",
    },
    {
      title: "Strong Support for First-Time Applicants",
      quote: "As a first-time applicant, I had many doubts. FlyOCI made everything easy to understand and support on email and WhatsApp was quick.",
      author: "Anita Patel",
      service: "New OCI Card",
      detail: "WhatsApp + Email Updates",
    },
    {
      title: "Audit Caught Missing Documents Early",
      quote: "The pre-check report highlighted a name mismatch and missing supporting documents before submission. That saved me a rejection and a lot of delay.",
      author: "Rishabh S., London",
      service: "Document Audit",
      detail: "Pass / Fix / Missing Report",
    },
    {
      title: "Clear Pricing and No Hidden Surprises",
      quote: "Everything was explained clearly: service fee, government fee and timeline. The process felt transparent and professionally managed.",
      author: "Parth S., Manchester",
      service: "OCI Update",
      detail: "Fixed Transparent Fees",
    },
    {
      title: "Very Helpful for Family Applications",
      quote: "I was applying for elderly parents and needed help with multiple documents. The checklist and step-by-step support made it manageable.",
      author: "Navdeep V., Birmingham",
      service: "Family Support",
      detail: "Elderly Parent Guidance",
    },
  ];

  return (
    <>
      <HeroSection />

      {/* SECTION 1: What We Do */}
      <WhatWeDo />

      {/* SECTION 2: Why Document Audit First */}
      <section className="py-20 lg:py-24 bg-[#f5f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInUp>
              <p className="text-xs font-semibold tracking-widest uppercase mb-4 text-[#2b5e93]">
                Document audit
              </p>
              <h2 className="text-3xl md:text-4xl leading-snug mb-5 font-heading font-bold text-primary">
                Most OCI and visa files are rejected because of documents.
                <span className="text-[#1c69dd]"> We fix that first.</span>
              </h2>
              <p className="text-base mb-8 leading-relaxed text-textMuted">
                From our experience, more than half of applicants do not have documents in the exact required format.
                Typical issues include:
              </p>
              <ul className="flex flex-col gap-3 mb-10">
                {[
                  "Name mismatch across documents",
                  "Missing apostille or notarisation",
                  "Wrong photo size or background",
                  "Incorrect or incomplete supporting documents",
                  "Missing bilingual certificates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-primary text-[15px] font-medium">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-[#e8f1ff]">
                      <FileX className="w-3 h-3 text-[#1c69dd]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/document-audit">
                <Button variant="outline" className="text-base py-3 px-8 rounded-xl font-semibold border-[#cfe2ff] text-primary bg-white hover:bg-[#f2f8ff]">
                  Learn About Document Audit
                </Button>
              </Link>
            </FadeInUp>

            <FadeInUp delay={0.2} className="relative">
              <div className="absolute top-5 -right-2 w-full h-full rounded-3xl -z-10 bg-[#dcecff]" />
              <div className="relative z-10 rounded-3xl p-8 sm:p-10 bg-white border border-[#d4e7ff] shadow-[0_12px_40px_rgba(30,74,135,0.12)]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#e8f1ff]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2L3 5v5c0 4 2.5 6.5 6 7 3.5-.5 6-3 6-7V5L9 2z" stroke="#1c69dd" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M6.5 9l1.5 1.5L11.5 7" stroke="#1c69dd" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-primary">
                    Our 3-step safety net
                  </h3>
                </div>
                <div className="flex flex-col gap-6">
                  {[
                    { num: "1", bg: "#1c69dd", color: "#fff", label: "We review your documents before full-service payment.", icon: false },
                    { num: "2", bg: "#33A1FD", color: "#fff", label: "We tell you what is missing, what needs correction, and how to fix it.", icon: false },
                    { num: "✓", bg: "#e8f1ff", color: "#1c69dd", label: "Once documents are cleared, we proceed with your full application.", icon: true },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{ background: step.bg, color: step.color }}
                      >
                        {step.icon ? <CheckCircle className="w-4 h-4" /> : step.num}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 leading-7">
                          {step.label}
                        </p>
                        {i < arr.length - 1 && (
                          <div className="mt-5 h-px w-full bg-[#e5eeff]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-xl px-4 py-3 flex items-center gap-3 bg-[#f5f9ff] border border-[#d6e8ff]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#1c69dd]" />
                  <p className="text-[13px] text-[#2b5e93] font-semibold">
                    We are a private independent service, not a government website.
                  </p>
                </div>
              </div>
            </FadeInUp>

          </div>
        </div>
      </section>



      {/* SECTION 3: How It Works */}
      <section className="py-20 lg:py-24 bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              How It Works - Simple 3-Step Process
            </h2>
            <p className="text-textMuted font-body text-lg max-w-2xl mx-auto">
              We keep the process structured so you always know what happens next.
            </p>
          </FadeInUp>

          <StepTimeline steps={steps} />

          <FadeInUp delay={0.4} className="mt-10">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d7e7ff] bg-white p-5">
                <p className="text-sm font-semibold text-primary">Document Audit Fee: GBP 15</p>
                <p className="mt-2 text-sm text-slate-600 leading-6">
                  The audit fee is fully adjusted against your full service fee when you proceed within 30 days.
                </p>
              </div>
              <div className="rounded-2xl border border-[#d7e7ff] bg-[#f6faff] p-5">
                <p className="text-sm font-semibold text-primary">Clear Delivery</p>
                <p className="mt-2 text-sm text-slate-600 leading-6">
                  You receive guidance and updates on email and WhatsApp from document review to completion.
                </p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.6} className="text-center mt-12">
            <Link href="/document-audit">
              <Button variant="primary" className="text-lg py-4 px-8">
                Start My Application
              </Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 4: Pricing */}
      <div className="py-14 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#dbeaff] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8ff_100%)] p-4 md:p-6 shadow-[0_10px_30px_rgba(30,74,135,0.07)]">
            <ServiceFees />
          </div>
        </div>
      </div>

      {/* SECTION 5: Trust Features */}
      <section className="py-20 lg:py-24 bg-[#f8fbff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Why UK & US Families Trust Us
            </h2>
            <p className="text-textMuted max-w-3xl mx-auto">
              A specialist process, clear communication, and transparent pricing from start to finish.
            </p>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FadeInUp key={feature.title} delay={i * 0.1}>
                <div className="bg-bg-page rounded-2xl p-6 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-heading font-bold text-primary mb-2">{feature.title}</h3>
                  <p className="text-textMuted text-sm leading-relaxed">{feature.description}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Testimonials */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="mx-auto px-2 sm:px-2 lg:px-2">
          <FadeInUp className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-2">
              Our Customers Say
            </h2>
            <p className="text-textMuted font-body text-sm md:text-base max-w-3xl mx-auto">
              Real feedback from UK and US families who used FlyOCI for OCI, e-Visa, and document pre-check support.
            </p>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="rounded-1xl border border-[#dce9ff] bg-[#f6faff] p-4 md:p-4 shadow-[0_10px_28px_rgba(30,74,135,0.08)]">
              <Carousel items={testimonials} />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 7: Final CTA */}
      <section className="py-20 lg:py-18 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]">
        <div className="mx-auto">
          <FadeInUp>
            <div className="rounded-3xl border border-[#d6e7ff] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-8 md:p-12 text-center shadow-[0_16px_40px_rgba(30,74,135,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2b5e93]">Final step</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-heading font-bold text-primary">Ready to Start?</h2>
              <p className="mt-4 text-textMuted text-base md:text-lg max-w-3xl mx-auto leading-7">
                Whether you need a new OCI, OCI update, e-Visa, or passport renewal, the first step is the same: get your documents checked.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
                <Link href="/document-audit">
                  <Button variant="primary" className="text-base md:text-lg py-3.5 px-8">
                    Start My Document Audit
                  </Button>
                </Link>
                <Link href="/services" className="inline-flex items-center rounded-xl border border-[#cfe2ff] bg-white px-5 py-3 text-sm md:text-base font-semibold text-primary hover:bg-[#f3f8ff] transition-colors">
                  View Services &amp; Pricing
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
