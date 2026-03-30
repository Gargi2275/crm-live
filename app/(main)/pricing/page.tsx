import { FadeInUp } from "@/components/FadeInUp";
import { ServiceFees } from "@/components/ServiceFees";
import { CTABanner } from "@/components/CTABanner";

export const metadata = {
  title: "Pricing — FlyOCI Services",
};

export default function PricingPage() {
  return (
    <>
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 rounded-l-full blur-3xl -z-10" />
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">Transparent Pricing</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            All our service fees are fixed and transparent. Government fees are either included (for e-Visa packages) or clearly mentioned separately.
          </p>
        </FadeInUp>
      </section>

      <ServiceFees />

      <CTABanner />
    </>
  );
}
