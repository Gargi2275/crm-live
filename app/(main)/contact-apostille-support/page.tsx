import Link from "next/link";
import { ArrowRight, Clock3, Mail, MessageCircle, Search, Upload } from "lucide-react";
import { FadeInUp } from "@/components/FadeInUp";
import { ContactForm } from "@/components/ContactForm";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.contactApostilleSupport);

const supportCards = [
  {
    title: "Email support",
    detail: "support@flyoci.com",
    hint: "Best for document questions and case updates.",
    icon: Mail,
  },
  {
    title: "WhatsApp support",
    detail: "Available on request",
    hint: "Quick status checks once your file number is active.",
    icon: MessageCircle,
  },
  {
    title: "Typical response",
    detail: "Within 1 business day",
    hint: "Include your FlyOCI file number for faster help.",
    icon: Clock3,
  },
];

export default function ContactApostilleSupportPage() {
  return (
    <section className="bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <FadeInUp className="mb-8 max-w-3xl">
          <p className="inline-flex rounded-full bg-[#e9f3ff] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#18518f]">
            Apostille Support
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold text-primary md:text-5xl">Contact FlyOCI Apostille Support</h1>
          <p className="mt-4 text-lg text-textMuted">
            Need help with your Apostille request, quote, payment, or tracking? Reach our team below.
          </p>
        </FadeInUp>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {supportCards.map((card) => {
            const Icon = card.icon;
            return (
              <FadeInUp key={card.title} className="rounded-2xl border border-[#d8e6fc] bg-white p-4 shadow-[0_8px_22px_rgba(20,60,106,0.07)]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1d4d81]">
                  <Icon className="h-4 w-4 text-[#1d6fd1]" />
                  {card.title}
                </div>
                <p className="mt-2 text-sm font-semibold text-[#243b53]">{card.detail}</p>
                <p className="mt-1 text-xs text-[#627d98]">{card.hint}</p>
              </FadeInUp>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <FadeInUp className="rounded-2xl border border-[#d8e6fc] bg-white p-3 shadow-[0_12px_28px_rgba(20,60,106,0.08)]">
            <ContactForm />
          </FadeInUp>

          <FadeInUp delay={0.08} className="space-y-4 h-fit">
            <div className="rounded-2xl border border-[#d7e5f9] bg-[#f8fbff] p-5">
              <p className="text-sm font-bold text-[#0d1f3c]">Self-service options</p>
              <div className="mt-3 space-y-2">
                <Link href="/track-apostille" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-white px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Track my case</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/apostille-pre-check" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-white px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Start pre-check</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/apostille-faq" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-white px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span>Read FAQ</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[#d8e6fc] bg-white p-4 text-sm text-[#627d98]">
              If you already submitted a pre-check, include your <strong className="text-[#243b53]">FlyOCI file number</strong> and the email used during submission.
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
