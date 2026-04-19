import { FadeInUp } from "@/components/FadeInUp";

export const metadata = {
  title: "Disclaimer | FlyOCI",
};

export default function DisclaimerPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative overflow-hidden min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-8">Disclaimer</h1>
          <div className="prose prose-lg text-textMuted font-body leading-relaxed">
            <p>
              FlyOCI is an independent, private service provider. We are <strong>not</strong> affiliated with the Government of India, any consulate, embassy, or VFS centre.
            </p>
            <p>
              We assist clients with document preparation, form filling, and process guidance based on publicly available rules and our experience.
            </p>
            <p>
              Final decisions on applications are always made by the relevant government authorities. We do not guarantee approval or issuance of any document, visa or OCI card.
            </p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
