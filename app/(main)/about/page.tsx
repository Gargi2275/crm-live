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
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
        <div className="absolute -top-14 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
        <FadeInUp className="text-center max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 text-primary">About FlyOCI</h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8 max-w-3xl mx-auto leading-relaxed">
            FlyOCI was created to solve a simple problem: Many families of Indian origin living in the UK and US struggle with OCI, e-Visa and Indian passport processes.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Focus</p>
              <p className="mt-1 text-sm font-semibold text-primary">OCI, e-Visa, Passport</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Approach</p>
              <p className="mt-1 text-sm font-semibold text-primary">Document-first guidance</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Audience</p>
              <p className="mt-1 text-sm font-semibold text-primary">UK & US residents</p>
            </div>
          </div>
        </FadeInUp>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-6 sm:p-7 shadow-[0_12px_28px_rgba(30,74,135,0.08)]">
                <h2 className="text-2xl font-heading font-bold text-primary">Why We Exist</h2>
                <p className="mt-3 text-textMuted leading-7">
                  Rules change frequently, forms can be confusing, and small errors can cause major delays. FlyOCI is built to make this journey predictable and manageable.
                </p>
                <div className="mt-5 space-y-3 text-sm text-textMuted">
                  <p>• Business expertise for transparent service design</p>
                  <p>• Technical expertise for secure digital workflows</p>
                  <p>• Real personal context for families applying from abroad</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#d9e8ff] bg-white p-6 sm:p-7 shadow-[0_12px_28px_rgba(30,74,135,0.08)]">
                <h2 className="text-2xl font-heading font-bold text-primary">Our Mission</h2>
                <p className="mt-3 text-textMuted leading-7">
                  We help you move faster with fewer mistakes by combining clear guidance, practical checklists, and end-to-end support.
                </p>
                <div className="mt-5 space-y-3 text-sm text-textMuted">
                  <p>• Save your time</p>
                  <p>• Reduce stress and confusion</p>
                  <p>• Minimize avoidable delays and rejections</p>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-24 bg-[#F4F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary">Our Core Values</h2>
          </FadeInUp>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <FadeInUp key={i} delay={i * 0.1}>
                <div className="bg-white rounded-3xl p-10 text-center shadow-[0_12px_26px_rgba(30,74,135,0.08)] border border-[#d9e8ff] h-full flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(30,74,135,0.12)]">
                  <div className="w-16 h-16 rounded-full bg-[#eaf3ff] text-primary flex items-center justify-center mb-6">
                    {v.icon}
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-primary mb-4">{v.title}</h3>
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
