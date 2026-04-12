import { FadeInUp } from "@/components/FadeInUp";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Indian e-Visa Application Service (1-Year & 5-Year) | FlyOCI",
};

export default function IndianEVisaPage() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_70%)]">
      <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#e3efff] blur-3xl opacity-80 motion-safe:animate-pulse" />
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start relative z-10">
        <FadeInUp>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Indian e-Visa Service</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-heading font-bold text-primary leading-tight">
            Indian e-Visa, 1-Year and 5-Year Options
          </h1>
          <p className="mt-4 text-base md:text-lg text-textMuted font-body max-w-3xl">
            We handle the full e-Visa journey with accurate form support, document checks, and status guidance to reduce delays.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(30,74,135,0.1)]">
              <p className="text-xs uppercase tracking-[0.15em] text-primary/70">1 Year</p>
              <p className="mt-1 text-2xl font-bold text-primary">£88</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(30,74,135,0.1)]">
              <p className="text-xs uppercase tracking-[0.15em] text-primary/70">5 Year</p>
              <p className="mt-1 text-2xl font-bold text-primary">£150</p>
            </div>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="rounded-2xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_36px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(30,74,135,0.13)]">
            <h2 className="text-lg font-heading font-bold text-primary">Quick Apply</h2>
            <div className="mt-4 space-y-3 text-sm text-textMuted">
              <div className="flex items-center justify-between"><span>Options</span><strong className="text-primary">1Y / 5Y</strong></div>
              <div className="flex items-center justify-between"><span>Includes</span><strong className="text-primary">Govt + Service</strong></div>
              <div className="flex items-center justify-between"><span>Best for</span><strong className="text-primary">Short trips</strong></div>
            </div>
            <Link href="/indian-e-visa" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,105,221,0.3)]">
              Apply for Indian e-Visa
            </Link>
          </div>
        </FadeInUp>
      </div>

      <div className="max-w-6xl mx-auto mt-10 grid gap-4 md:grid-cols-3">
        <FadeInUp delay={0.05} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Best For</p>
          <p className="mt-2 text-sm font-semibold text-primary">Short-term frequent India travel</p>
        </FadeInUp>
        <FadeInUp delay={0.1} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Avoid</p>
          <p className="mt-2 text-sm font-semibold text-primary">Photo/passport upload rejection</p>
        </FadeInUp>
        <FadeInUp delay={0.15} className="rounded-xl border border-[#d9e8ff] bg-white px-5 py-4 text-left shadow-[0_10px_26px_rgba(30,74,135,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Support</p>
          <p className="mt-2 text-sm font-semibold text-primary">Application to approval guidance</p>
        </FadeInUp>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        <FadeInUp delay={0.3} className="text-left bg-white p-8 rounded-2xl border border-[#d9e8ff] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,74,135,0.09)]">
           <h3 className="text-xl font-heading font-bold text-primary mb-4">What We Do</h3>
           <ul className="space-y-3 font-body text-textMuted text-sm">
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Confirm the right e-Visa type based on your travel plan</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Complete and submit the online e-Visa application</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Guide you on photograph and passport scan requirements</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-[#1c69dd] mr-2 mt-0.5 shrink-0" /> Share your e-Visa approval and explain conditions (validity, entry rules etc.)</li>
           </ul>
           <p className="text-xs text-textMuted mt-4 italic">*Government policies and fees may change. We will confirm exact fee at the time of application.</p>
        </FadeInUp>
      </div>
    </section>
  );
}
