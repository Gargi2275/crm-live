import Link from "next/link";
import { CheckCircle2, Mail, Hash } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ApostillePreCheckSubmittedPage({
  searchParams,
}: {
  searchParams?: { file?: string };
}) {
  const fileNumber = searchParams?.file || "FLY-APO-1048";

  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)]">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-[#d7e7ff] bg-white p-8 text-center shadow-[0_16px_34px_rgba(20,60,106,0.12)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-green-700">Pre-Check Request Submitted Successfully</p>
          <h1 className="mt-3 text-4xl font-heading font-bold text-primary">Your Request Has Been Received</h1>
          <p className="mt-3 text-textMuted">Thank you. Your document has been submitted for Apostille pre-check review.</p>

          <div className="mt-8 rounded-2xl border border-[#cfe2ff] bg-[#f8fbff] p-5 text-left">
            <p className="text-sm font-semibold text-[#315f94]">Your FlyOCI File Number</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#b8d2ff] bg-white px-4 py-3">
              <Hash className="h-5 w-5 text-[#1d6fd1]" />
              <span className="text-xl font-heading font-bold text-primary">{fileNumber}</span>
            </div>
            <p className="mt-2 text-sm text-[#5f7698]">Please keep this file number safe. You can use it to track your application status.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-[#dce8fa] bg-white p-5 text-left">
            <h2 className="text-lg font-heading font-bold text-primary">What happens next?</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#375c88]">
              <li>We review your submitted document</li>
              <li>We assess the route and readiness</li>
              <li>We email you with the next step</li>
              <li>If approved, payment instructions will follow</li>
            </ul>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/track-apostille?file=${encodeURIComponent(fileNumber)}`}>
              <Button className="w-full sm:w-auto">Track My Request</Button>
            </Link>
            <Link href="/apostille-services">
              <Button variant="outline" className="w-full sm:w-auto">Back to Apostille Services</Button>
            </Link>
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-xs text-[#5f7698]">
            <Mail className="h-3.5 w-3.5" />
            A confirmation email has been sent to your registered email address. Please check your inbox and spam folder if needed.
          </p>
        </div>
      </div>
    </section>
  );
}
