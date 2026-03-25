import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Indian e-Visa Application Service (1-Year & 5-Year) | FlyOCI",
};

export default function IndianEVisaPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden min-h-[80vh] flex flex-col items-center">
      <div className="max-w-4xl mx-auto text-center w-full">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">
            Indian e-Visa — 1-Year & 5-Year Options
          </h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8">
            If you travel occasionally or prefer not to apply for OCI yet, an Indian e-Visa can be a good option. We handle the full e-Visa process so you avoid mistakes and last-minute rejections.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2} className="my-12 grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-primary p-8 rounded-2xl shadow-sm border border-primary text-white text-center">
            <h3 className="text-xl font-heading font-bold mb-4">Indian e-Visa — 1 Year</h3>
            <p className="text-4xl font-mono font-bold text-amber-400 mb-2">£88</p>
            <p className="text-sm font-body text-gray-300">Total (includes approx. £32 govt fee)</p>
          </div>
          <div className="bg-primary p-8 rounded-2xl shadow-sm border border-primary text-white text-center relative overflow-hidden">
            <div className="absolute top-4 right-[-30px] bg-accent text-primary text-xs font-bold px-10 py-1 rotate-[45deg] z-10">POPULAR</div>
            <h3 className="text-xl font-heading font-bold mb-4">Indian e-Visa — 5 Year</h3>
            <p className="text-4xl font-mono font-bold text-amber-400 mb-2">£150</p>
            <p className="text-sm font-body text-gray-300">Total (includes approx. £70 govt fee)</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.3} className="text-left bg-white p-8 rounded-2xl border border-border mt-8">
           <h3 className="text-xl font-heading font-bold text-primary mb-4">What We Do</h3>
           <ul className="space-y-3 font-body text-textMuted text-sm">
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Confirm the right e-Visa type based on your travel plan</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Complete and submit the online e-Visa application</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Guide you on photograph and passport scan requirements</li>
             <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Share your e-Visa approval and explain conditions (validity, entry rules etc.)</li>
           </ul>
           <p className="text-xs text-textMuted mt-4 italic">*Government policies and fees may change. We will confirm exact fee at the time of application.</p>
        </FadeInUp>

        <FadeInUp delay={0.4} className="mt-12">
          <Link href="/indian-e-visa">
            <Button className="py-4 px-8 text-lg bg-primary text-white hover:bg-primary/90">Apply for Indian e-Visa</Button>
          </Link>
        </FadeInUp>
      </div>
    </section>
  );
}
