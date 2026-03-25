import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "OCI Update (Gratis Service) — Professional Help | FlyOCI",
};

export default function OCIUpdatePage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden min-h-[80vh] flex flex-col items-center">
      <div className="max-w-4xl mx-auto text-center w-full">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">
            Mandatory OCI Updates — We Handle the Online Complexity
          </h1>
          <p className="text-lg md:text-xl text-textMuted font-body mb-8">
            Some OCI updates on the government portal are &quot;gratis&quot; (no government fee), but the process is still technical and time-consuming. We charge a professional service fee to handle everything for you.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2} className="my-12 grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">What We Do</h3>
            <ul className="space-y-3 font-body text-textMuted text-sm">
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Check whether an update is required in your case</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Prepare and upload documents on the government portal</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Ensure photos and signatures meet exact specifications</li>
              <li className="flex items-start"><CheckCircle className="w-4 h-4 text-success mr-2 mt-0.5 shrink-0" /> Guide you through additional steps or acknowledgements</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xl font-heading font-bold text-primary mb-4">Pricing</h3>
            <p className="text-3xl font-mono font-bold text-primary mb-2">£50</p>
            <p className="text-sm font-body text-textMuted">Service Fee per applicant.</p>
            <p className="text-sm font-body text-accent font-medium mt-4">*(If you have taken a Document Audit first, the £15 credit is deducted and you pay £35 at this stage).</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.4} className="mt-8">
          <Link href="/document-audit">
            <Button className="py-4 px-8 text-lg">Update My OCI</Button>
          </Link>
        </FadeInUp>
      </div>
    </section>
  );
}
