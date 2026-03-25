import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Indian Passport Renewal Service for UK & US Residents | FlyOCI",
};

export default function PassportRenewalPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden min-h-[80vh] flex flex-col items-center">
      <div className="max-w-4xl mx-auto text-center w-full">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">
            Indian Passport Renewal — For Applicants in UK & US
          </h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8">
            If you or your family members hold an Indian passport and need renewal from the UK or US, FlyOCI can help with documentation, forms and process guidance.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2} className="my-12 grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">What We Do</h3>
            <ul className="space-y-3 font-body text-textMuted text-sm">
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Check correct renewal category (normal, Tatkal etc. if applicable)</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Provide complete list of required documents</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Fill out the online application forms</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Check photographs, signatures, and VFS/consulate guidance</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border flex flex-col justify-center items-center text-center">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">Pricing</h3>
            <p className="text-2xl font-body font-bold text-primary mb-2">Price on request</p>
            <p className="text-sm font-body text-textMuted">Pricing varies depending on category and country.</p>
            <p className="text-sm font-body text-accent font-medium mt-4">*(We will confirm the fee after evaluating your case in the Document Audit).</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.4} className="mt-8">
          <Link href="/document-audit">
            <Button className="py-4 px-8 text-lg">Start Passport Renewal</Button>
          </Link>
        </FadeInUp>
      </div>
    </section>
  );
}
