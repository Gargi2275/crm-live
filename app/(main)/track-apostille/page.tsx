"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function TrackApostillePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fileNumber, setFileNumber] = useState(searchParams.get("file") || "");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!fileNumber.trim()) nextErrors.fileNumber = "Please enter your FlyOCI file number";
    if (!email.trim()) nextErrors.email = "Please enter your email address";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    router.push(`/track-apostille/status?file=${encodeURIComponent(fileNumber)}&stage=under-review`);
  };

  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)]">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-heading font-bold text-primary">Track Your Apostille Application</h1>
        <p className="mt-3 text-textMuted text-lg">
          Enter your FlyOCI file number and email address to view the latest status of your request.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-[#d8e6fc] bg-white p-6 shadow-[0_12px_30px_rgba(20,60,106,0.1)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#23466f]">FlyOCI File Number</label>
              <input
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                placeholder="Example: FLY-APO-1048"
                className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
              />
              {errors.fileNumber && <p className="mt-1 text-sm text-red-600">{errors.fileNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#23466f]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter the email used during submission"
                className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="mt-6">
            <Button type="submit" className="w-full sm:w-auto">Track Application</Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-[#dce8fa] bg-white p-5">
          <h2 className="text-lg font-heading font-bold text-primary">Need help finding your file number?</h2>
          <p className="mt-2 text-sm text-[#5f7698]">
            Your file number is sent in your confirmation email after pre-check submission.
          </p>
          <Link href="/contact-apostille-support" className="mt-3 inline-flex text-sm font-semibold text-[#1d6fd1] hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
}
