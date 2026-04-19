import { FadeInUp } from "@/components/FadeInUp";

export default function PrivacyPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-8">Privacy Policy</h1>
          <div className="prose prose-lg text-textMuted font-body leading-relaxed">
            <p>What information we collect (name, contact details, document copies)</p>
            <p>How we use it (to provide services, comply with regulations)</p>
            <p>How long we store it</p>
            <p>Third-party processors (payment gateway, hosting, CRM etc.)</p>
            <p>Rights of the user (access, correction, deletion where applicable)</p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
