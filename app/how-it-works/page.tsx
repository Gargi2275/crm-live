import { FadeInUp } from "@/components/FadeInUp";
import { CTABanner } from "@/components/CTABanner";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

export const metadata = {
  title: "How FlyOCI Works — From Document Check to Final Approval",
};

export default function HowItWorksPage() {
  const steps = [
    {
      title: 'Step 1 — Choose Service or "Not Sure"',
      desc: 'Select a specific service (New OCI, Renewal, Update, e-Visa, Passport Renewal), OR choose "Not Sure — Help Me Decide" and tell us your situation. You fill a short online form with your basic details and travel plans.'
    },
    {
      title: 'Step 2 — Secure Document Upload',
      desc: 'Once you submit the form, you upload: Passport, OCI card (if already held), Proof of address, Marriage/birth certificate via a secure portal.'
    },
    {
      title: 'Step 3 — Document Audit Payment',
      desc: 'Checkout for the Document Audit (£15 per applicant). On successful payment, receive an email confirmation and optional WhatsApp welcome message.'
    },
    {
      title: 'Step 4 — Expert Review & Report',
      desc: 'Within 24–48 hours, our team reviews documents for errors, prepares a written report and recommended solution, and delivers it via email + WhatsApp.'
    },
    {
      title: 'Step 5 — Full Service Confirmation',
      desc: 'If you proceed, we deduct the £15 audit from the final fee. You pay the remaining balance. If you do not proceed, you keep the advice.'
    },
    {
      title: 'Step 6 — Application Preparation & Submission',
      desc: 'We fill forms, prepare documents, provide appointment guidance, and keep you updated on key milestones.'
    },
    {
      title: 'Step 7 — Follow-up & Support',
      desc: 'We support you via WhatsApp/Email until your OCI card, e-Visa, or Passport is issued and delivered.'
    }
  ];

  return (
    <>
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-6">How It Works</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            We designed FlyOCI so that even if you are not comfortable with online forms, you can get your OCI, visa or passport done easily. Here's the step-by-step journey.
          </p>
        </FadeInUp>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
             {/* Left line tracking */}
            <div className="absolute left-6 md:left-[51px] top-0 h-full w-1 bg-gray-100 rounded-full" />
            
            <div className="space-y-12">
              {steps.map((step, index) => (
                <FadeInUp key={index} delay={index * 0.1} className="relative z-10 flex">
                  <div className="mr-6 md:mr-10 flex flex-col items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-navy text-white flex items-center justify-center font-heading font-bold text-xl md:text-2xl shadow-lg border-4 border-white shrink-0 shadow-navy/20">
                      {index + 1}
                    </div>
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl md:text-2xl font-heading font-bold text-navy mb-3">{step.title}</h3>
                    <p className="text-textMuted font-body text-base md:text-lg leading-relaxed">{step.desc}</p>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </div>
          
          <FadeInUp delay={0.5} className="mt-20 text-center">
            <Link href="/contact">
              <Button variant="primary" className="py-4 px-10 text-lg shadow-xl shadow-saffron/20 hover:shadow-saffron/40">Start My Process</Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
