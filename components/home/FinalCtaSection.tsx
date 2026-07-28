"use client";

import { FadeInUp } from "@/components/FadeInUp";
import { ParallaxBlob } from "@/components/home/HomeScrollMotion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { home } from "@/components/home/homeTheme";

export function FinalCtaSection() {
  return (
    <section className={`${home.section} bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]`}>
      <ParallaxBlob
        speed={48}
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.14)_0%,transparent_70%)] blur-2xl"
      />
      <div className={home.container}>
        <FadeInUp>
          <div className="relative rounded-3xl border border-border bg-[linear-gradient(180deg,#f8fbff_0%,#ecf6ff_100%)] p-8 text-center shadow-[0_16px_40px_rgba(18,84,150,0.10)] md:p-12">
            <p className={home.eyebrow}>Ready when you are</p>
            <h2 className={`mt-3 ${home.h2}`}>Start your application</h2>
            <p className={`${home.lead} mx-auto`}>
              Choose OCI, e-Visa, passport renewal, or apostille and begin the right service flow directly.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/services">
                <Button variant="primary" className="px-8 py-3.5 text-base">
                  View services
                </Button>
              </Link>
              <Link href="/dashboard/document-audit?start=1" className={home.btnOutline}>
                Start application
              </Link>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
