"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Globe2, HelpCircle, Search, Sparkles, TimerReset } from "lucide-react";

type ActionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: "blue" | "green" | "amber" | "slate";
  icon: React.ReactNode;
};

const toneStyles: Record<ActionCardProps["tone"], { chip: string; icon: string; button: string }> = {
  blue: {
    chip: "border-[#CFE4F8] bg-[#EAF5FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  green: {
    chip: "border-[#CFE4F8] bg-[#F2F8FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  amber: {
    chip: "border-[#CFE4F8] bg-[#F2F8FF] text-[#2B5E93]",
    icon: "bg-[#EAF5FF] text-[#0B69B7]",
    button: "bg-[#0B69B7] text-white hover:bg-[#095A9D]",
  },
  slate: {
    chip: "border-[#CFE4F8] bg-white text-[#2B5E93]",
    icon: "bg-[#F2F8FF] text-[#0B69B7]",
    button: "bg-white text-[#0B69B7] border border-[#CFE4F8] hover:bg-[#F2F8FF]",
  },
};

function ActionCard({ eyebrow, title, description, href, cta, tone, icon }: ActionCardProps) {
  const styles = toneStyles[tone];

  return (
    <article className="group rounded-[24px] border border-[#DCE7F8] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(30,74,135,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.chip}`}>
          {eyebrow}
        </span>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}>
          {icon}
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-heading font-semibold tracking-tight text-[#102A43]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#486581]">{description}</p>
      <Link
        href={href}
        className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${styles.button}`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">Loading dashboard...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-heading font-bold text-primary">Please log in</h1>
          <p className="mb-4 text-textMuted">Your session is not active. Log in to access your dashboard.</p>
          <Link href="/auth/login" className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 font-semibold text-white">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] bg-bg-page px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="relative overflow-hidden rounded-[30px] border border-[#d7e5fb] bg-white px-6 py-7 shadow-[0_18px_48px_rgba(30,74,135,0.08)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-[#EAF5FF] to-transparent opacity-90" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE4F8] bg-[#EAF5FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2B5E93]">
                <Sparkles className="h-3.5 w-3.5" />
                FlyOCI Dashboard
              </div>
              <h1 className="mt-4 text-3xl font-heading font-semibold tracking-tight text-[#102A43] sm:text-4xl">
                Welcome{user?.first_name ? `, ${user.first_name}` : ""}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#486581] sm:text-base">
                Pick the path you need. The dashboard is now a simple starting point that helps you begin quickly and continue without confusion.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <Link href="/dashboard/document-audit" className="inline-flex items-center justify-center rounded-full bg-[#0B69B7] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#095A9D]">
                Start application
              </Link>
              <Link href="/dashboard/applications" className="inline-flex items-center justify-center rounded-full border border-[#D9E1EA] bg-white px-4 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-[#F8FAFC]">
                View existing cases
              </Link>
              <Link href="/track" className="inline-flex items-center justify-center rounded-full border border-[#CFE4F8] bg-[#EAF5FF] px-4 py-3 text-sm font-semibold text-[#0B69B7] transition-colors hover:bg-[#DDEEFF]">
                Track application
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">1. Choose service</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Select OCI, passport, or eVisa from the service page.</p>
            </div>
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">2. Fill the form</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Answer a short guided flow and upload documents.</p>
            </div>
            <div className="rounded-[18px] border border-[#DCE7F8] bg-[#FCFDFF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2B5E93]">3. Track progress</p>
              <p className="mt-2 text-sm leading-6 text-[#486581]">Return anytime to check status and next steps.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            eyebrow="Indian eVisa"
            title="Apply for or resume your eVisa"
            description="Open the dedicated eVisa journey to continue a draft or begin a new application."
            href="/indian-e-visa"
            cta="Open eVisa"
            tone="amber"
            icon={<Globe2 className="h-5 w-5" />}
          />

          {/* <ActionCard
            eyebrow="Track OCI / Passport"
            title="Check your saved applications"
            description="View your OCI and passport cases, pick up where you left off, and continue the journey."
            href="/dashboard/applications"
            cta="Open cases"
            tone="green"
            icon={<Search className="h-5 w-5" />}
          /> */}

          {/* <ActionCard
            eyebrow="Track eVisa"
            title="Track an eVisa application"
            description="Use the tracking page for case number, OTP, or magic-link access."
            href="/track"
            cta="Track now"
            tone="slate"
            icon={<TimerReset className="h-5 w-5" />}
          /> */}
        </div>

        {/* <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-[#DCE7F8] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.06)]">
            <div className="flex items-center gap-2 text-[#2B5E93]">
              <HelpCircle className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Not sure where to begin?</p>
            </div>
            <h2 className="mt-3 text-xl font-heading font-semibold text-[#102A43]">Use the guided form start</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#486581]">
              The quickest path is the application flow. It asks only what is needed, keeps the process focused, and moves you toward the right service faster.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/document-audit" className="inline-flex items-center rounded-full bg-[#102A43] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Start guided form
              </Link>
              <Link href="/auth/login" className="inline-flex items-center rounded-full border border-[#D9E1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#102A43] transition-colors hover:bg-[#F8FAFC]">
                My account
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DCE7F8] bg-[#FCFDFF] p-6 shadow-[0_12px_32px_rgba(30,74,135,0.04)]">
            <div className="flex items-center gap-2 text-[#2B5E93]">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Built for clarity</p>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#486581]">
              <p>• One page to choose the next action.</p>
              <p>• Four clear paths instead of many mixed buttons.</p>
              <p>• Start forms faster and track them later.</p>
            </div>
          </div>
        </div> */}

      </div>
    </section>
  );
}