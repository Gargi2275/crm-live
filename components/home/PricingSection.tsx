import { ServiceFees } from "@/components/ServiceFees";
import { home } from "@/components/home/homeTheme";

export function PricingSection() {
  return (
    <section className={home.sectionSoft}>
      <div className={home.container}>
        <ServiceFees />
      </div>
    </section>
  );
}
