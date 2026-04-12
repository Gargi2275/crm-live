import { FadeInUp } from "@/components/FadeInUp";
import { ContactForm } from "@/components/ContactForm";
import { Mail, MessageCircle, Clock, MapPin } from "lucide-react";

export const metadata = {
  title: "Contact FlyOCI | Support for OCI, e-Visa & Passport",
};

export default function ContactPage() {
  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
      <div className="absolute -top-16 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
      <div className="max-w-7xl mx-auto">
        <FadeInUp className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">Get in Touch</h1>
          <p className="text-lg text-textMuted font-body">
            Whether you need a Document Audit, have a question about our services, or need help deciding, we&apos;re here for you. We aim to respond within 24 hours.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Response</p>
              <p className="mt-1 text-sm font-semibold text-primary">Within 24 hours</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Channel</p>
              <p className="mt-1 text-sm font-semibold text-primary">Email + WhatsApp</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Coverage</p>
              <p className="mt-1 text-sm font-semibold text-primary">UK & US residents</p>
            </div>
          </div>
        </FadeInUp>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          <div className="lg:col-span-2 space-y-8">
            <FadeInUp delay={0.1}>
              <h2 className="text-2xl font-heading font-bold text-primary mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0 mr-4">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-1">Email Us</h3>
                    <p className="text-textMuted font-body text-sm mb-1">For general inquiries and support.</p>
                    <a href="mailto:support@flyoci.com" className="text-accent font-medium hover:underline">support@flyoci.com</a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0 mr-4">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-1">WhatsApp (Messages Only)</h3>
                    <p className="text-textMuted font-body text-sm mb-1">For quick updates and secure communication.</p>
                    <a href="https://wa.me/447000000000" className="text-primary font-medium hover:underline">+44 7000 000000</a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0 mr-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-1">Business Hours</h3>
                    <p className="text-textMuted font-body text-sm">Mon-Fri: 9:00 AM - 6:00 PM (GMT)<br/>Sat-Sun: Closed</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0 mr-4">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary mb-1">Operations</h3>
                    <p className="text-textMuted font-body text-sm">Online Service Provider<br/>Serving UK & US Residents globally.</p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>

          <div className="lg:col-span-3">
            <FadeInUp delay={0.2} className="relative z-10 rounded-2xl border border-[#d9e8ff] bg-white p-3 shadow-[0_12px_30px_rgba(30,74,135,0.09)]">
              <ContactForm />
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
}
