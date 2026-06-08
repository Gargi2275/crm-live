import Link from "next/link";
import { ArrowRight, HelpCircle, MessageCircle, Upload } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import { apostilleFaqItems, apostilleSimpleProcess } from "@/lib/data/apostille";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";

export const metadata = buildPageMetadata(PAGE_SEO.apostilleFaq);

export default function ApostilleFaqPage() {
  return (
    <>
      <FaqJsonLd items={apostilleFaqItems} />
      <section className="bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)] pt-24 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <FadeInUp>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f3ff] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#18518f]">
                <HelpCircle className="h-3.5 w-3.5" />
                Apostille FAQ
              </p>
              <h1 className="mt-4 font-heading text-4xl font-bold text-primary md:text-5xl">Apostille Services FAQ</h1>
              <p className="mt-4 max-w-2xl text-lg text-textMuted">
                Quick answers about document Apostille, the FlyOCI pre-check, payment, and tracking your case online.
              </p>
            </FadeInUp>

            <FadeInUp delay={0.05} className="rounded-2xl border border-[#d7e5f9] bg-white p-5 shadow-[0_10px_28px_rgba(20,60,106,0.08)] h-fit">
              <p className="text-sm font-bold text-[#0d1f3c]">Quick actions</p>
              <div className="mt-3 space-y-2">
                <Link href="/apostille-pre-check" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" /> Start pre-check</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/track-apostille" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span>Track application</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/contact-apostille-support" className="flex items-center justify-between rounded-xl border border-[#dce8fa] bg-[#f8fbff] px-3 py-2.5 text-sm font-semibold text-[#1d4d81] hover:bg-[#eef5ff]">
                  <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Contact support</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      <section className="pb-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <FadeInUp className="rounded-2xl border border-[#dce8fa] bg-white p-3 shadow-[0_12px_28px_rgba(20,60,106,0.08)]">
            <Accordion items={apostilleFaqItems} />
          </FadeInUp>

          <FadeInUp delay={0.08} className="space-y-4 h-fit">
            <div className="rounded-2xl border border-[#d7e5f9] bg-[#f8fbff] p-5">
              <p className="text-sm font-bold text-[#0d1f3c]">How FlyOCI Apostille works</p>
              <ol className="mt-3 space-y-2">
                {apostilleSimpleProcess.map((step, index) => (
                  <li key={step.title} className="flex gap-2 text-sm text-[#486581]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d6fd1] text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span><strong className="text-[#243b53]">{step.title}:</strong> {step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-[#d6e6ff] bg-white p-5 text-center">
              <h2 className="font-heading text-xl font-bold text-primary">Ready to start?</h2>
              <p className="mt-2 text-sm text-[#627d98]">Free document review before any payment.</p>
              <div className="mt-4">
                <Link href="/apostille-pre-check">
                  <Button>Start Free Pre-Check</Button>
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
