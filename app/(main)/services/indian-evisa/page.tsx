import { ServicePageLayout } from "@/components/services/ServicePageLayout";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.indianEvisa);

function EVisaPricingCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[
        { label: "1 Year", price: "£88" },
        { label: "5 Year", price: "£150" },
      ].map((tier) => (
        <div
          key={tier.label}
          className="rounded-2xl border border-[#d9e8ff] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#1c69dd]/30 hover:shadow-[0_14px_32px_rgba(28,105,221,0.12)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b5e93]">{tier.label}</p>
          <p className="mt-1 text-2xl font-black text-[#041020]">{tier.price}</p>
        </div>
      ))}
    </div>
  );
}

export default function IndianEVisaPage() {
  return (
    <ServicePageLayout
      eyebrow="Indian e-Visa Service"
      title="Indian e-Visa, 1-Year and 5-Year Options"
      description="We handle the full e-Visa journey with accurate form support, document checks, and status guidance to reduce delays."
      extraHeroContent={<EVisaPricingCards />}
      pricing={{
        title: "Quick Apply",
        lines: [
          { label: "Options", value: "1Y / 5Y" },
          { label: "Includes", value: "Govt + Service" },
          { label: "Best for", value: "Short trips", highlight: true },
        ],
        ctaLabel: "Apply for Indian e-Visa",
        ctaHref: "/dashboard/document-audit?start=1&service=evisa_1year",
      }}
      stats={[
        { label: "Best For", value: "Short-term frequent India travel" },
        { label: "Avoid", value: "Photo/passport upload rejection" },
        { label: "Support", value: "Application to approval guidance" },
      ]}
      whatWeDo={{
        title: "What We Do",
        items: [
          "Confirm the right e-Visa type based on your travel plan",
          "Complete and submit the online e-Visa application",
          "Guide you on photograph and passport scan requirements",
          "Share your e-Visa approval and explain conditions (validity, entry rules etc.)",
        ],
        footnote:
          "*Government policies and fees may change. We will confirm exact fee at the time of application.",
      }}
    />
  );
}
