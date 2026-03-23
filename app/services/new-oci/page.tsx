import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "New OCI Card Application Service | FlyOCI",
  description: "Apply for a new OCI card from the UK or US with FlyOCI. We handle forms, documentation and guidance end-to-end for a smooth experience.",
};

export default function NewOCIPage() {
  const processSteps = [
    "Document Audit (Recommended)",
    "Form Filling & Online Submission",
    "Document Preparation & Printing Checklist",
    "Appointment / VFS Guidance",
    "Ongoing Support Until OCI Card Delivery",
  ];

  return (
    <>
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden text-center">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-6">
            New OCI Card Application
          </h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8 max-w-3xl mx-auto">
            If you&apos;re eligible for Overseas Citizen of India (OCI) status and applying for the first time, FlyOCI helps you complete the process with confidence.
          </p>
        </FadeInUp>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12">
          <FadeInUp>
            <h2 className="text-2xl font-heading font-bold text-navy mb-6">Who Is This Service For?</h2>
            <ul className="space-y-4 text-textMuted font-body">
              <li>• Indian origin individuals with foreign nationality</li>
              <li>• Children born abroad to eligible Indian origin parents</li>
              <li>• Spouses of OCI / Indian origin in eligible cases</li>
            </ul>
            <p className="mt-6 text-sm italic text-saffron">We will confirm your eligibility during the Document Audit.</p>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <h2 className="text-2xl font-heading font-bold text-navy mb-6">Pricing</h2>
            <div className="bg-navy p-6 rounded-2xl text-white">
              <p className="text-3xl font-mono font-bold mb-2">£88 <span className="text-lg font-body font-normal opacity-80">service fee</span></p>
              <p className="text-sm text-gray-300 mb-6">Government fees are paid directly as per the latest rules.</p>
              <div className="bg-saffron/20 p-4 rounded-xl border border-saffron/30">
                <p className="text-sm font-medium text-amber-100">£15 Document Audit Credit</p>
                <p className="text-xs text-gray-300 mt-1">If you&apos;ve already done the audit, you pay only £73 at the full application stage.</p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="py-16 bg-[#F5F5F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-border">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-navy mb-8 text-center">Step-by-Step Process</h2>
            <div className="space-y-6 max-w-2xl mx-auto">
              {processSteps.map((step, i) => (
                <div key={i} className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-8 h-8 bg-teal rounded-full text-white flex items-center justify-center font-bold shrink-0 mr-4">
                    {i + 1}
                  </div>
                  <p className="font-heading font-semibold text-navy text-lg">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/document-audit">
                <Button className="py-4 px-8 text-lg">Start with Document Audit</Button>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
