import { FadeInUp } from "@/components/FadeInUp";
import { CTABanner } from "@/components/CTABanner";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

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
      desc: 'If you proceed with any OCI service (New OCI, OCI Renewal, or OCI Update), we deduct the £15 audit from the final fee. Audit credit does not apply to e-Visa or Passport Renewal. If you do not proceed, you keep the advice.'
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
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
        <div className="absolute -top-16 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">How It Works</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            We designed FlyOCI so that even if you are not comfortable with online forms, you can get your OCI, visa or passport done easily. Here&apos;s the step-by-step journey.
          </p>
        </FadeInUp>
      </section>

      <section className="py-20 bg-[#f7fbff]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-5">
              {steps.map((step, index) => (
                <FadeInUp key={index} delay={index * 0.08} className="rounded-2xl border border-[#d9e8ff] bg-white p-5 md:p-6 shadow-[0_10px_24px_rgba(30,74,135,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(30,74,135,0.12)]">
                  <div className="flex gap-4 md:gap-5 items-start">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-primary text-white flex items-center justify-center font-heading font-bold text-lg shadow-lg shrink-0">
                      {index + 1}
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-lg md:text-xl font-heading font-bold text-primary mb-2">{step.title}</h3>
                      <p className="text-textMuted font-body text-sm md:text-base leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeInUp>
              ))}
          </div>
          
          <FadeInUp delay={0.5} className="mt-20 text-center">
            <Link href="/contact">
              <Button variant="primary" className="py-4 px-10 text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40">Start My Process</Button>
            </Link>
          </FadeInUp>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
