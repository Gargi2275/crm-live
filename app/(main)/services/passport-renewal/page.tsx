import { FadeInUp } from "@/components/FadeInUp";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Indian Passport Renewal Service for UK & US Residents | FlyOCI",
};

export default function PassportRenewalPage() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_70%)]">
      <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#e3efff] blur-3xl opacity-80 motion-safe:animate-pulse" />
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start relative z-10">
        <FadeInUp>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Passport Renewal Service</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-heading font-bold text-primary leading-tight">
            Indian Passport Renewal for UK & US Applicants
          </h1>
          <p className="mt-4 text-base md:text-lg text-textMuted font-body max-w-3xl">
            We help you renew Indian passports with the right category, correct document set, and complete submission guidance.
          </p>
          <div className="mt-6 space-y-3 text-sm text-textMuted">
            <p>• Renewal category guidance</p>
            <p>• Form filling and checklist support</p>
            <p>• Photo/signature and VFS readiness</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="rounded-2xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_36px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(30,74,135,0.13)]">
            <h2 className="text-lg font-heading font-bold text-primary">Service Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-textMuted">
              <div className="flex items-center justify-between"><span>Pricing</span><strong className="text-primary">On request</strong></div>
              <div className="flex items-center justify-between"><span>Audit review</span><strong className="text-primary">Recommended</strong></div>
              <div className="flex items-center justify-between"><span>Support</span><strong className="text-primary">End-to-end</strong></div>
            </div>
            <p className="mt-4 text-xs text-textMuted">Fee is confirmed after evaluating your exact case route.</p>
            <Link href="/document-audit" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,105,221,0.3)]">
              Start application
            </Link>
          </div>
        </FadeInUp>
      </div>

      <div className="max-w-6xl mx-auto mt-10 grid gap-4 md:grid-cols-3">
        <FadeInUp delay={0.05} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Who This Helps</p>
          <p className="mt-2 text-sm font-semibold text-primary">Adults, children, and family renewals</p>
        </FadeInUp>
        <FadeInUp delay={0.1} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Common Delay</p>
          <p className="mt-2 text-sm font-semibold text-primary">Wrong category and incomplete forms</p>
        </FadeInUp>
        <FadeInUp delay={0.15} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">FlyOCI Value</p>
          <p className="mt-2 text-sm font-semibold text-primary">Clear checklist and renewal flow</p>
        </FadeInUp>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        <FadeInUp className="rounded-2xl border border-[#d9e8ff] bg-white p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,74,135,0.09)]">
          <h3 className="text-xl font-heading font-bold text-primary mb-4">What We Do</h3>
          <ul className="space-y-3 font-body text-textMuted text-sm">
            <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Check correct renewal category (normal, Tatkal etc. if applicable)</li>
            <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Provide complete list of required documents</li>
            <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Fill out the online application forms</li>
            <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Check photographs, signatures, and VFS/consulate guidance</li>
          </ul>
        </FadeInUp>
      </div>
    </section>
  );
}
