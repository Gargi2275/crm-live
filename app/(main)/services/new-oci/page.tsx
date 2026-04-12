import { FadeInUp } from "@/components/FadeInUp";
import Link from "next/link";

export const metadata = {
  title: "New OCI Card Application Service | FlyOCI",
  description: "Apply for a new OCI card from the UK or US with FlyOCI. We handle forms, documentation and guidance end-to-end for a smooth experience.",
};

export default function NewOCIPage() {
  const processSteps = [
    "Document Audit (Recommended)",
    "Form Filling & Online Submission",
    "Document Preparation & Printing Checklist",
    "Appointment / VFS Guidance",
    "Ongoing Support Until OCI Card Delivery",
  ];

  return (
    <>
      <section className="relative overflow-hidden pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_68%)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#dfeeff] blur-3xl opacity-80 motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#edf5ff] blur-3xl opacity-90" />
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start relative z-10">
          <FadeInUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">New OCI Service</p>
            <h1 className="mt-3 text-3xl md:text-4xl font-heading font-bold text-primary leading-tight">
              New OCI Card Application
            </h1>
            <p className="mt-4 text-base md:text-lg text-textMuted font-body max-w-3xl">
              If you&apos;re applying for OCI for the first time, FlyOCI handles forms, document checks, and process guidance from start to finish.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Region</p>
                <p className="mt-1 text-sm font-semibold text-primary">UK & US Applicants</p>
              </div>
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Support</p>
                <p className="mt-1 text-sm font-semibold text-primary">End-to-End Guidance</p>
              </div>
              <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(30,74,135,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Benefit</p>
                <p className="mt-1 text-sm font-semibold text-primary">£15 Audit Credit</p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <div className="rounded-2xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_36px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(30,74,135,0.13)]">
              <h2 className="text-lg font-heading font-bold text-primary">Service Summary</h2>
              <div className="mt-4 space-y-3 text-sm text-textMuted">
                <div className="flex items-center justify-between"><span>Service fee</span><strong className="text-primary">£88</strong></div>
                <div className="flex items-center justify-between"><span>Audit credit</span><strong className="text-primary">-£15</strong></div>
                <div className="flex items-center justify-between"><span>After audit</span><strong className="text-primary">£73</strong></div>
              </div>
              <p className="mt-4 text-xs text-textMuted">Government fees are paid separately as per latest rules.</p>
              <Link href="/document-audit" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,105,221,0.3)]">
                Start application
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
          <FadeInUp>
            <h2 className="text-2xl font-heading font-bold text-primary mb-6">Who Is This Service For?</h2>
            <ul className="space-y-4 text-textMuted font-body">
              <li>• Indian origin individuals with foreign nationality</li>
              <li>• Children born abroad to eligible Indian origin parents</li>
              <li>• Spouses of OCI / Indian origin in eligible cases</li>
            </ul>
            <p className="mt-6 text-sm italic text-[#2b5e93]">We will confirm your eligibility during the Document Audit.</p>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <h2 className="text-2xl font-heading font-bold text-primary mb-6">What You Get</h2>
            <div className="rounded-2xl border border-[#d9e8ff] p-6 bg-[#fbfdff] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,74,135,0.09)]">
              <div className="space-y-4 text-sm text-textMuted">
                <p>• Form filling and profile setup</p>
                <p>• Document preparation checklist</p>
                <p>• VFS / appointment guidance</p>
                <p>• Ongoing support until completion</p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-[#f7fbff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="bg-white p-8 sm:p-12 rounded-3xl shadow-[0_14px_36px_rgba(30,74,135,0.1)] border border-[#d9e8ff]">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-8 text-left">Step-by-Step Process</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {processSteps.map((step, i) => (
                <div key={i} className="flex items-center p-4 bg-[#f8fbff] rounded-xl border border-[#dbe9ff] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#bdd8ff]">
                  <div className="w-8 h-8 bg-primary rounded-full text-white flex items-center justify-center font-bold shrink-0 mr-4">
                    {i + 1}
                  </div>
                  <p className="font-heading font-semibold text-primary text-lg">{step}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
