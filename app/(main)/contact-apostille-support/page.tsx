import { FadeInUp } from "@/components/FadeInUp";
import { ContactForm } from "@/components/ContactForm";
import { Mail, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Contact FlyOCI Apostille Support",
};

export default function ContactApostilleSupportPage() {
  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)]">
      <div className="mx-auto max-w-7xl">
        <FadeInUp className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-5">Contact FlyOCI Apostille Support</h1>
          <p className="text-lg text-textMuted">Need help with your Apostille request? Contact our team below.</p>
        </FadeInUp>

        <div className="grid gap-10 lg:grid-cols-5">
          <FadeInUp className="lg:col-span-2 rounded-2xl border border-[#d8e6fc] bg-white p-6 shadow-[0_12px_28px_rgba(20,60,106,0.08)]">
            <h2 className="text-2xl font-heading font-bold text-primary mb-5">Support Channels</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-[#1d6fd1] mt-1" />
                <div>
                  <p className="font-semibold text-[#23466f]">Email Support</p>
                  <p className="text-sm text-[#5f7698]">support@flyoci.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-[#1d6fd1] mt-1" />
                <div>
                  <p className="font-semibold text-[#23466f]">WhatsApp Support</p>
                  <p className="text-sm text-[#5f7698]">Available on request for live updates</p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-[#5f7698]">
              If you already have a FlyOCI file number, please include it in your message for faster assistance.
            </p>
          </FadeInUp>

          <FadeInUp delay={0.1} className="lg:col-span-3 rounded-2xl border border-[#d8e6fc] bg-white p-3 shadow-[0_12px_28px_rgba(20,60,106,0.08)]">
            <ContactForm />
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
