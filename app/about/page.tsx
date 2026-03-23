import { FadeInUp } from "@/components/FadeInUp";
import { CTABanner } from "@/components/CTABanner";
import { Shield, Clock, Heart } from "lucide-react";

export const metadata = {
  title: "About FlyOCI | Trusted Visa & OCI Services",
};

export default function AboutPage() {
  const values = [
    { title: "Clarity", description: "We explain requirements in simple language", icon: <Clock /> },
    { title: "Honesty", description: "Fixed transparent fees and realistic expectations", icon: <Shield /> },
    { title: "Care", description: "Especially for elderly parents and families dealing with complex paperwork", icon: <Heart /> }
  ];

  return (
    <>
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-navy text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-saffron/10 rounded-l-full blur-3xl -z-10" />
        <FadeInUp className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">About FlyOCI</h1>
          <p className="text-xl md:text-2xl text-gray-300 font-body mb-8 max-w-3xl mx-auto leading-relaxed">
            FlyOCI was created to solve a simple problem: Many families of Indian origin living in the UK and US struggle with OCI, e-Visa and Indian passport processes.
          </p>
        </FadeInUp>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <FadeInUp>
            <div className="prose prose-lg prose-indigo mx-auto text-textMuted font-body leading-relaxed mb-16">
              <p>
                The rules keep changing, the forms are confusing and small mistakes cause big delays.
              </p>
              <p>
                We combine:
              </p>
              <ul>
                <li><strong>Business expertise</strong> — to design a clear, transparent and reliable service</li>
                <li><strong>Technical expertise</strong> — to build secure, efficient online processes</li>
                <li><strong>Personal understanding</strong> — we know what it feels like to manage India-related paperwork from abroad</li>
              </ul>
              <p className="font-heading text-navy text-2xl font-bold mt-12 mb-6">Our mission is to:</p>
              <ul>
                <li>Save you time</li>
                <li>Reduce your stress</li>
                <li>Help you avoid unnecessary travel delays and rejections</li>
              </ul>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-24 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-navy">Our Core Values</h2>
          </FadeInUp>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <FadeInUp key={i} delay={i * 0.1}>
                <div className="bg-white rounded-3xl p-10 text-center shadow-md border border-border h-full flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-saffron/10 text-saffron flex items-center justify-center mb-6">
                    {v.icon}
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-navy mb-4">{v.title}</h3>
                  <p className="text-textMuted font-body text-lg leading-relaxed">{v.description}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
