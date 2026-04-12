import { FadeInUp } from "@/components/FadeInUp";
import Link from "next/link";

export const metadata = {
  title: "OCI Renewal / Transfer to New Passport | FlyOCI",
};

export default function OCIRenewalPage() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_70%)]">
      <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#e3efff] blur-3xl opacity-80 motion-safe:animate-pulse" />
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start relative z-10">
        <FadeInUp>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">OCI Renewal Service</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-heading font-bold text-primary leading-tight">
            OCI Renewal / Transfer to New Passport
          </h1>
          <p className="mt-4 text-base md:text-lg text-textMuted font-body max-w-3xl">
            If your passport changed or your OCI requires re-issuance, we manage the process clearly from document prep to final submission guidance.
          </p>
          <div className="mt-6 space-y-3 text-sm text-textMuted">
            <p>• Category check: renewal vs transfer</p>
            <p>• Correct forms and supporting documents</p>
            <p>• Error prevention before submission</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="rounded-2xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_36px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(30,74,135,0.13)]">
            <h2 className="text-lg font-heading font-bold text-primary">Service Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-textMuted">
              <div className="flex items-center justify-between"><span>Service fee</span><strong className="text-primary">£78</strong></div>
              <div className="flex items-center justify-between"><span>Audit credit</span><strong className="text-primary">-£15</strong></div>
              <div className="flex items-center justify-between"><span>After audit</span><strong className="text-primary">£63</strong></div>
            </div>
            <p className="mt-4 text-xs text-textMuted">Best for passport change and transfer-related OCI updates.</p>
            <Link href="/document-audit" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,105,221,0.3)]">
              Start application
            </Link>
          </div>
        </FadeInUp>
      </div>

      <div className="max-w-6xl mx-auto mt-10 grid gap-4 md:grid-cols-3">
        <FadeInUp delay={0.05} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Who This Helps</p>
          <p className="mt-2 text-sm font-semibold text-primary">Passport change and OCI transfer cases</p>
        </FadeInUp>
        <FadeInUp delay={0.1} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Common Risk</p>
          <p className="mt-2 text-sm font-semibold text-primary">Wrong route selection causes delays</p>
        </FadeInUp>
        <FadeInUp delay={0.15} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">FlyOCI Value</p>
          <p className="mt-2 text-sm font-semibold text-primary">Correct checklist before submission</p>
        </FadeInUp>
      </div>
    </section>
  );
}
