import { FadeInUp } from "@/components/FadeInUp";

export default function TermsPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-8">Terms and Conditions</h1>
          <div className="prose prose-lg text-textMuted font-body leading-relaxed">
            <p>Definitions (Client, Service, Fee, etc.)</p>
            <p>Scope of services (document assistance, not legal representation)</p>
            <p>Client responsibilities (accurate information, timely responses)</p>
            <p>Fees & refunds policy</p>
            <p>Limitation of liability</p>
            <p>Data usage & communication consent</p>
            <p>Changes to terms</p>
            <p>(Your developer can set this up as a standard text page; you or your lawyer can expand the legal language.)</p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
