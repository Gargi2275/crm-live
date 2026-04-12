import { FadeInUp } from "@/components/FadeInUp";
import { ServiceFees } from "@/components/ServiceFees";
import { CTABanner } from "@/components/CTABanner";
import { ShieldCheck, ReceiptText, Clock3 } from "lucide-react";

export const metadata = {
  title: "Pricing — FlyOCI Services",
};

export default function PricingPage() {
  return (
    <>
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
        <div className="absolute -top-16 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">Transparent Pricing</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            All our service fees are fixed and transparent. Government fees are either included (for e-Visa packages) or clearly mentioned separately.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <div className="flex items-center gap-2 text-primary"><ReceiptText className="h-4 w-4" /><p className="text-[11px] uppercase tracking-[0.14em] font-semibold">Clarity</p></div>
              <p className="mt-1 text-sm font-semibold text-primary">No hidden pricing lines</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-4 w-4" /><p className="text-[11px] uppercase tracking-[0.14em] font-semibold">Confidence</p></div>
              <p className="mt-1 text-sm font-semibold text-primary">Service + government split</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <div className="flex items-center gap-2 text-primary"><Clock3 className="h-4 w-4" /><p className="text-[11px] uppercase tracking-[0.14em] font-semibold">Updated</p></div>
              <p className="mt-1 text-sm font-semibold text-primary">Reviewed with policy changes</p>
            </div>
          </div>
        </FadeInUp>
      </section>

      <ServiceFees />

      <CTABanner />
    </>
  );
}
