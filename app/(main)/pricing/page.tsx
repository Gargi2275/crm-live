import { FadeInUp } from "@/components/FadeInUp";
import { CTABanner } from "@/components/CTABanner";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "Pricing — FlyOCI Services",
};

export default function PricingPage() {
  const items = [
    {
      name: "OCI Update Gratis",
      standardFee: "£50",
      auditFee: "£35 with audit",
      hasDiscount: true,
      popular: false,
    },
    {
      name: "New OCI Application",
      standardFee: "£88",
      auditFee: "£73 with audit",
      hasDiscount: true,
      popular: true,
    },
    {
      name: "OCI Renewal Transfer",
      standardFee: "£78",
      auditFee: "£63 with audit",
      hasDiscount: true,
      popular: false,
    },
    {
      name: "e-Visa 1 Year",
      standardFee: "£88",
      auditFee: "No audit discount",
      hasDiscount: false,
      popular: false,
    },
    {
      name: "e-Visa 5 Year",
      standardFee: "£150",
      auditFee: "No audit discount",
      hasDiscount: false,
      popular: false,
    },
  ];

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

      <section className="pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <FadeInUp key={item.name} delay={index * 0.07}>
                <div
                  className={`h-full rounded-2xl p-6 bg-white shadow-[0_12px_30px_rgba(51,161,253,0.10)] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(51,161,253,0.16)] ${
                    item.popular ? "border-primary ring-2 ring-primary/20" : "border-primary/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <h3 className="text-xl font-heading font-bold text-primary leading-snug">{item.name}</h3>
                    {item.popular ? (
                      <span className="shrink-0 rounded-full bg-primary text-white text-[11px] px-3 py-1 font-semibold tracking-wide">
                        Most Popular
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2 mb-8">
                    <p className="text-sm text-textMuted uppercase tracking-wide font-semibold">Standard Fee</p>
                    <p className={`font-mono text-xl ${item.hasDiscount ? "text-textMuted line-through decoration-primary/60" : "text-primary font-semibold"}`}>
                      {item.standardFee}
                    </p>

                    <p className="text-sm text-textMuted uppercase tracking-wide font-semibold pt-2">Audit Credit Price</p>
                    <p className={`font-mono text-2xl font-semibold ${item.hasDiscount ? "text-primary" : "text-textMuted"}`}>
                      {item.auditFee}
                    </p>
                  </div>

                  <Link href="/contact" className="block">
                    <Button
                      variant={item.popular ? "primary" : "outline"}
                      className="w-full justify-center"
                    >
                      Select
                    </Button>
                  </Link>
                </div>
              </FadeInUp>
            ))}
          </div>

          <p className="text-xs text-textMuted mt-6 text-center">
            * Prices are per applicant and may exclude applicable government or courier charges where relevant.
          </p>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
