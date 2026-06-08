import HeroSection from "../../components/HeroSection";
import { DocumentAuditSection } from "@/components/home/DocumentAuditSection";
import { TrustFeaturesSection } from "@/components/home/TrustFeaturesSection";
import WhatWeDo from "@/components/WhatWeDo";
import { StepTimeline } from "@/components/StepTimeline";
import { ServiceFees } from "@/components/ServiceFees";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import { getPublicTestimonials } from "@/lib/api";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.home);

const fallbackTestimonials = [
  {
    title: "OCI Renewal Was Smooth and Stress-Free",
    quote: "FlyOCI made my parents' OCI renewal very easy. All documents were checked in advance and there were no surprises at VFS.",
    author: "Rajesh K., UK",
    service: "OCI Renewal",
    detail: "Document Audit Completed",
    rating: 5,
  },
  {
    title: "They Helped Me Pick the Right Option",
    quote: "I was confused about e-Visa vs OCI. The team explained everything clearly and suggested the right option.",
    author: "Anita P., US",
    service: "Indian e-Visa",
    detail: "Service Guidance",
    rating: 5,
  },
  {
    title: "Strong Support for First-Time Applicants",
    quote: "As a first-time applicant, I had many doubts. FlyOCI made everything easy to understand and support on email and WhatsApp was quick.",
    author: "Anita Patel",
    service: "New OCI Card",
    detail: "WhatsApp + Email Updates",
    rating: 5,
  },
  {
    title: "Audit Caught Missing Documents Early",
    quote: "The pre-check report highlighted a name mismatch and missing supporting documents before submission. That saved me a rejection and a lot of delay.",
    author: "Rishabh S., London",
    service: "Document Audit",
    detail: "Pass / Fix / Missing Report",
    rating: 5,
  },
  {
    title: "Clear Pricing and No Hidden Surprises",
    quote: "Everything was explained clearly: service fee, government fee and timeline. The process felt transparent and professionally managed.",
    author: "Parth S., Manchester",
    service: "OCI Update",
    detail: "Fixed Transparent Fees",
    rating: 5,
  },
];

async function loadTestimonials() {
  try {
    const testimonials = await getPublicTestimonials();
    if (!testimonials.length) {
      return [];
    }

    return testimonials.map((testimonial) => ({
      title: testimonial.service_type ? `${testimonial.service_type} review` : "Customer review",
      quote: testimonial.testimonial_text,
      author: testimonial.author_name?.trim() || "Verified Customer",
      service: testimonial.service_type || "FlyOCI",
      detail: `${testimonial.rating}/5 rating`,
      rating: testimonial.rating,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const testimonials = await loadTestimonials();

  const steps = [
    { title: "Step 1 - Quick Online Form & Upload", description: "Tell us which service you need and upload clear photos/scans through our secure portal." },
    { title: "Step 2 - Expert Document Audit", description: "We send a written report showing what is correct, missing, or needs correction." },
    { title: "Step 3 - End-to-End Handling", description: "Once documents are ready, we prepare forms, submission steps, and ongoing guidance." },
  ];

  return (
    <>
      <HeroSection />

      {/* SECTION 1: What We Do */}
      <WhatWeDo />

      <DocumentAuditSection />
      {/* SECTION 3: How It Works */}
  <section className="py-20 lg:py-24 relative overflow-hidden" style={{background: 'linear-gradient(160deg, #f0f6ff 0%, #fafcff 50%, #eef5ff 100%)'}}>
  {/* bg blobs */}
  <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none">
    <div style={{background: 'radial-gradient(circle, rgba(21,95,196,0.08) 0%, transparent 70%)'}} className="w-full h-full rounded-full" />
  </div>
  <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none">
    <div style={{background: 'radial-gradient(circle, rgba(21,95,196,0.06) 0%, transparent 70%)'}} className="w-full h-full rounded-full" />
  </div>

  <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">

    {/* Header */}
    <FadeInUp className="mb-12">
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 text-xs font-semibold uppercase tracking-widest border" style={{background: 'rgba(21,95,196,0.08)', borderColor: 'rgba(21,95,196,0.18)', color: '#155fc4'}}>
        <span className="w-2 h-2 rounded-full bg-[#155fc4] animate-pulse" />
        Our process
      </div>
      <h2 className="font-heading font-bold text-primary mb-4" style={{fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2rem,4vw,2.75rem)', lineHeight: 1.2, color: '#0b2a6b'}}>
        Simple. Structured. <em className="italic" style={{color: '#155fc4'}}>No surprises.</em>
      </h2>
      <p className="text-lg max-w-2xl" style={{color: '#506080'}}>
        We keep the process structured so you always know what happens next.
      </p>
    </FadeInUp>

    {/* 3 Step Cards */}
    <FadeInUp className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-3xl overflow-hidden border" style={{borderColor: 'rgba(21,95,196,0.12)'}}>
        {steps.map((step, i) => (
          <div
            key={i}
            className="relative bg-white p-8 group transition-all duration-300 hover:-translate-y-1.5 hover:z-10"
            style={{
              borderRight: i < steps.length - 1 ? '1px solid rgba(21,95,196,0.1)' : 'none',
              boxShadow: 'none',
            }}
          >
            {/* Number block */}
            <div className="relative w-12 h-12 mb-5">
              <div className="absolute inset-0 rounded-xl" style={{background: '#eef4ff', transform: 'rotate(10deg)'}} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold" style={{fontFamily: "'DM Serif Display', serif", color: '#155fc4'}}>
                {i + 1}
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color: '#155fc4'}}>
              {['Start here', 'Expert review', 'We handle it'][i]}
            </p>
            <h3 className="font-bold mb-2" style={{fontFamily: "'DM Serif Display', serif", fontSize: '1.2rem', color: '#0b2a6b', lineHeight: 1.3}}>
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{color: '#507090'}}>
              {step.description}
            </p>
            {/* Arrow connector */}
            {i < steps.length - 1 && (
              <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border items-center justify-center z-10 text-xs" style={{borderColor: 'rgba(21,95,196,0.18)', color: '#155fc4'}}>
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </FadeInUp>

    {/* 2 Info Cards */}
    <FadeInUp delay={0.4} className="mb-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-2xl border bg-white p-6 hover:shadow-lg transition-shadow duration-200" style={{borderColor: 'rgba(21,95,196,0.12)'}}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center" style={{background: '#eef4ff', color: '#155fc4'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v6" stroke="#155fc4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="#155fc4" strokeWidth="1.6"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{color: '#0b2a6b'}}>Document Audit Fee: GBP 15</p>
              <p className="text-sm leading-relaxed" style={{color: '#507090'}}>
                The audit fee is fully adjusted against your full service fee when you proceed within 30 days.
              </p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border bg-white p-6 hover:shadow-lg transition-shadow duration-200" style={{borderColor: 'rgba(21,95,196,0.12)'}}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center" style={{background: '#edfaf3', color: '#0a7a4a'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18" stroke="#0a7a4a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6h18M3 18h18" stroke="#0a7a4a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{color: '#0b2a6b'}}>Clear Delivery</p>
              <p className="text-sm leading-relaxed" style={{color: '#507090'}}>
                You receive guidance and updates on email and WhatsApp from document review to completion.
              </p>
              <p className="text-xs font-semibold mt-2" style={{color: '#155fc4'}}>Live updates</p>
            </div>
          </div>
        </div>
      </div>
    </FadeInUp>

    {/* CTA */}
    <FadeInUp delay={0.6} className="text-center">
      <Link href="/document-audit">
        <Button variant="primary" className="text-lg py-4 px-8 shadow-lg transform transition-transform hover:-translate-y-1 rounded-full">
          Start My Application
        </Button>
      </Link>
    </FadeInUp>

  </div>
</section>

      {/* SECTION 4: Pricing */}
      <div className="py-14 lg:py-16 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#dbeaff] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8ff_100%)] p-2.5 sm:p-3.5 md:p-5 shadow-[0_10px_30px_rgba(30,74,135,0.07)]">
            <ServiceFees />
          </div>
        </div>
      </div>

      <TrustFeaturesSection />

      {/* Testimonials */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
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
              <TestimonialsCarousel initialItems={testimonials} staticItems={fallbackTestimonials} />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 7: Final CTA */}
      <section className="py-20 lg:py-18 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
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
