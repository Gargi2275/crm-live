import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { home } from "@/components/home/homeTheme";

export function FinalCtaSection() {
  return (
    <section className={`${home.section} bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]`}>
      <div className={home.container}>
        <FadeInUp>
          <div className="rounded-3xl border border-border bg-[linear-gradient(180deg,#f8fbff_0%,#ecf6ff_100%)] p-8 text-center shadow-[0_16px_40px_rgba(18,84,150,0.10)] md:p-12">
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
              <Link href="/dashboard/start" className={home.btnOutline}>
                Start application
              </Link>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
