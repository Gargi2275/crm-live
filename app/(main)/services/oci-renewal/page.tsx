import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "OCI Renewal / Transfer to New Passport | FlyOCI",
};

export default function OCIRenewalPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden min-h-[80vh] flex flex-col items-center">
      <div className="max-w-4xl mx-auto text-center w-full">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">
            OCI Renewal / Transfer to New Passport
          </h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8">
            If your passport has changed or you fall under a category that requires re-issuance of OCI, we help transfer or renew your OCI details without confusion.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2} className="my-12 grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">How We Help You</h3>
            <ul className="space-y-3 font-body text-textMuted text-sm">
              <li>• Understand whether you need re-issuance or just an update</li>
              <li>• Prepare forms and documents based on your age and category</li>
              <li>• Avoid common errors that lead to file returns and delays</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">Pricing</h3>
            <p className="text-3xl font-mono font-bold text-primary mb-2">£78</p>
            <p className="text-sm font-body text-textMuted">Service Fee per applicant.</p>
            <p className="text-sm font-body text-accent font-medium mt-4">*(Document Audit £15 is credited against this fee. You pay £63 at application stage if audit done).</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.4} className="mt-8">
          <Link href="/document-audit">
            <Button className="py-4 px-8 text-lg">Check My OCI Renewal Requirements</Button>
          </Link>
        </FadeInUp>
      </div>
    </section>
  );
}
