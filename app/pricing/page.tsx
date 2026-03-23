import { FadeInUp } from "@/components/FadeInUp";
import { PricingTable } from "@/components/PricingTable";
import { CTABanner } from "@/components/CTABanner";

export const metadata = {
  title: "Pricing — FlyOCI Services",
};

export default function PricingPage() {
  const items = [
    { name: "Document Audit (Pre-Check)", price: "£15", creditApplied: "Fully credited within 30 days" },
    { name: "OCI Update (Gratis service)", price: "£50", creditApplied: "£35 (£15 credit deducted)" },
    { name: "New OCI Card Application", price: "£88", creditApplied: "£73 (£15 credit deducted)", popular: true },
    { name: "OCI Renewal / Transfer", price: "£78", creditApplied: "£63 (£15 credit deducted)" },
    { name: "Indian e-Visa — 1 Year", price: "£88 (incl. ~£32 govt fee)", creditApplied: "—" },
    { name: "Indian e-Visa — 5 Year", price: "£150 (incl. ~£70 govt fee)", creditApplied: "—" },
    { name: "Indian Passport Renewal", price: "Price on request", creditApplied: "Quoted after Document Audit" },
  ];

  return (
    <>
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-teal/5 rounded-l-full blur-3xl -z-10" />
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-6">Transparent Pricing</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            All our service fees are fixed and transparent. Government fees are either included (for e-Visa packages) or clearly mentioned separately.
          </p>
        </FadeInUp>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <PricingTable items={items} />
        </div>
      </section>

      <CTABanner />
    </>
  );
}
