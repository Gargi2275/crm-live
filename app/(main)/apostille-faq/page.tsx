import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import { FadeInUp } from "@/components/FadeInUp";
import { Button } from "@/components/ui/Button";
import { apostilleFaqItems } from "@/lib/data/apostille";

export const metadata = {
  title: "Apostille Services FAQ | FlyOCI",
  description:
    "Answers to common questions about Apostille services, free pre-check, payment process, and tracking your request.",
};

export default function ApostilleFaqPage() {
  return (
    <>
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)]">
        <div className="mx-auto max-w-4xl text-center">
          <FadeInUp>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary">Apostille Services FAQ</h1>
            <p className="mt-4 text-lg text-textMuted">
              Answers to common questions about document Apostille services, the FlyOCI process, payment, and document review.
            </p>
          </FadeInUp>
        </div>
      </section>

      <section className="pb-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <FadeInUp className="rounded-2xl border border-[#dce8fa] bg-white p-3 shadow-[0_12px_28px_rgba(20,60,106,0.08)]">
            <Accordion items={apostilleFaqItems} />
          </FadeInUp>

          <FadeInUp delay={0.1} className="mt-10 rounded-2xl border border-[#d6e6ff] bg-[#f8fbff] p-7 text-center">
            <h2 className="text-2xl font-heading font-bold text-primary">Ready to Start?</h2>
            <div className="mt-4">
              <Link href="/apostille-pre-check">
                <Button>Start Free Pre-Check</Button>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
