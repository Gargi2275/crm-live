"use client";

import { FadeInUp } from "@/components/FadeInUp";

export default function CookiesPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-8">Cookie Policy</h1>
        </FadeInUp>
        <FadeInUp>
          <div className="prose prose-lg text-textMuted font-body leading-relaxed">
            <p>
              This website uses cookies to improve your experience and to help us understand how our services are used. By continuing to use this site, you agree to our use of cookies. You can manage preferences in your browser settings.
            </p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
