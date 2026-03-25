import { HeroSection } from "@/components/HeroSection";
import { ServiceCard } from "@/components/ServiceCard";
import { StepTimeline } from "@/components/StepTimeline";
import { Carousel } from "@/components/ui/Carousel";
import { CTABanner } from "@/components/CTABanner";
import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle, FileX, Globe, Shield, UserCheck } from "lucide-react";

export default function Home() {
  const services = [
    { title: "New OCI Card", description: "First-time applicants from UK & US.", icon: <UserCheck />, href: "/services/new-oci" },
    { title: "OCI Renewal", description: "Transfer to new passport.", icon: <Shield />, href: "/services/oci-renewal" },
    { title: "OCI Update", description: "Mandatory gratis updates.", icon: <CheckCircle />, href: "/services/oci-update" },
    { title: "Indian e-Visa", description: "1-year and 5-year options.", icon: <Globe />, href: "/services/indian-e-visa" },
    { title: "Passport Renewal", description: "Indian passports from abroad.", icon: <FileX />, href: "/services/passport-renewal" },
  ];

  const steps = [
    { title: "Quick Form", description: "Tell us what you need & upload documents." },
    { title: "Document Audit", description: "Expert review & report for £15 credit." },
    { title: "Application Handled", description: "We do the forms and booking." },
  ];

  const features = [
    { title: "Specialised Focus", description: "We only handle OCI, Indian passports and e-Visas.", icon: <Globe /> },
    { title: "Expert Checks", description: "We reduce rejections by catching issues upfront.", icon: <Shield /> },
    { title: "Clear Comms", description: "WhatsApp & email support directly with humans.", icon: <MessageCircle /> },
    { title: "Fixed Fees", description: "Transparent pricing without surprises.", icon: <CheckCircle /> },
    { title: "Step Guidance", description: "Especially helpful for elderly or first-timers.", icon: <UserCheck /> },
  ];

  const testimonials = [
    { quote: "FlyOCI made my parents' OCI renewal very easy. All documents were checked in advance and there were no surprises at VFS.", author: "Rajesh K., UK" },
    { quote: "I was confused about e-Visa vs OCI. The team explained everything clearly and suggested the right option.", author: "Anita P., US" },
  ];

  const pricingItems = [
    { name: "OCI Update Gratis", standardFee: "£50", auditFee: "£35 with audit", hasDiscount: true },
    { name: "New OCI Application", standardFee: "£88", auditFee: "£73 with audit", hasDiscount: true, popular: true },
    { name: "OCI Renewal Transfer", standardFee: "£78", auditFee: "£63 with audit", hasDiscount: true },
    { name: "e-Visa 1 Year", standardFee: "£88", auditFee: "No audit discount", hasDiscount: false },
    { name: "e-Visa 5 Year", standardFee: "£150", auditFee: "No audit discount", hasDiscount: false },
  ];

  const pricingRowOne = pricingItems.slice(0, 3);
  const pricingRowTwo = pricingItems.slice(3, 5);

  return (
    <>
      <HeroSection />

      {/* SECTION 1: What We Do */}
      <section className="py-24 bg-bg-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Everything You Need for India Travel
            </h2>
            <p className="text-textMuted font-body text-lg max-w-2xl mx-auto">
              FlyOCI is a specialist online service helping UK and US residents of Indian origin.
            </p>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <FadeInUp key={service.title} delay={i * 0.1}>
                <ServiceCard {...service} />
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.4} className="mt-12 text-center text-sm text-textMuted max-w-3xl mx-auto bg-white p-4 rounded-xl shadow-sm border border-border">
            We are a private, independent service. We are not a government website. We prepare your application so your file is right the first time.
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 2: Why Document Audit First? */}
      <section className="py-24 bg-[#F4F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">
                Most Files Are Rejected Because of Documents. We Fix That First.
              </h2>
              <p className="text-xl font-body font-semibold text-accent mb-8">
                More than 50% of applicants do not have their documents in the exact format required.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Name mismatch across documents",
                  "Missing apostille or notarisation",
                  "Wrong photo size or background",
                  "Missing bilingual certificates",
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-primary font-body font-medium">
                    <FileX className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/document-audit">
                <Button variant="outline" className="text-lg py-3 px-8 bg-white">
                  Learn About Document Audit
                </Button>
              </Link>
            </FadeInUp>

            <FadeInUp delay={0.2} className="relative">
              <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-[0_12px_40px_rgba(15,31,61,0.08)] border border-border relative z-10">
                <h3 className="text-2xl font-heading font-bold text-primary mb-8">Our 3-Step Safety Net</h3>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</div>
                    <p className="text-textMuted">We review your documents before you pay the full service fee.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent text-primary flex items-center justify-center font-bold shrink-0">2</div>
                    <p className="text-textMuted">We tell you exactly what is missing and how to fix it.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center font-bold shrink-0"><CheckCircle className="w-5 h-5" /></div>
                    <p className="text-textMuted">Once cleared, we proceed with your full application securely.</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-10 -right-4 w-full h-full bg-accent/10 rounded-3xl -z-10" />
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* SECTION 3: How It Works */}
      <section className="py-24 bg-bg-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              How It Works — Simple Process
            </h2>
            <p className="text-textMuted font-body text-lg max-w-2xl mx-auto">
              We handle the complex parts. You just provide the basics.
            </p>
          </FadeInUp>

          <StepTimeline steps={steps} />

          <FadeInUp delay={0.6} className="text-center mt-12">
            <Link href="/document-audit">
              <Button variant="primary" className="text-lg py-4 px-8">
                Start My Application
              </Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 4: Pricing */}
      <section className="py-24 bg-[#F7FBFF] border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Our Services & Fees
            </h2>
            <p className="text-textMuted font-body text-lg max-w-2xl mx-auto">
              We keep our pricing transparent. Government fees are clearly shown.
            </p>
          </FadeInUp>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
              {pricingRowOne.map((item, index) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[780px] mx-auto">
              {pricingRowTwo.map((item, index) => (
                <FadeInUp key={item.name} delay={(index + 3) * 0.07}>
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
          </div>

          <p className="text-xs text-textMuted mt-6 text-center">
            * Prices are per applicant and may exclude applicable government or courier charges where relevant.
          </p>

          <FadeInUp delay={0.4} className="text-center mt-12">
            <Link href="/pricing">
              <Button variant="outline" className="text-lg py-3 px-8 bg-white">
                View Full Pricing
              </Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* SECTION 5: Trust Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Why UK & US Families Trust Us
            </h2>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FadeInUp key={feature.title} delay={i * 0.1}>
                <div className="bg-bg-page rounded-2xl p-6 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-heading font-bold text-primary mb-2">{feature.title}</h3>
                  <p className="text-textMuted text-sm leading-relaxed">{feature.description}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Testimonials */}
      <section className="py-24 bg-[#F4F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Our Customers Say
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <Carousel items={testimonials} />
          </FadeInUp>
        </div>
      </section>

      <CTABanner />
    </>
  );
}

// Add Missing Icons hack to ensure page loads with the missing lucide-react icon
function MessageCircle() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg>
}
