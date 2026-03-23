import { FadeInUp } from "@/components/FadeInUp";

export default function CookiesPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-background relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-8">Cookies Policy</h1>
          <div className="prose prose-lg text-textMuted font-body leading-relaxed">
            <p>(Standard Cookies Policy placeholder)</p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
