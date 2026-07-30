"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";

export type LoginShellStage = "email" | "existingOtp" | "newDetails" | "newOtp";

type LoginShellProps = {
  stage: LoginShellStage;
  stageLabel: string;
  children: ReactNode;
};

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Secure OTP", text: "Email verification locks your session." },
  { icon: FileCheck2, title: "Pick up anytime", text: "Resume applications from your dashboard." },
  { icon: CheckCircle2, title: "UK & US ready", text: "Built for NRI OCI and e-Visa flows." },
];

export function LoginShell({ stage, stageLabel, children }: LoginShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* Spacer so page scroll height matches fixed shell (avoids parent layout gaps) */}
      <div className="h-[100dvh]" aria-hidden />

      {/* Fill everything below the fixed navbar — no leftover white at bottom */}
      <section className="fixed inset-x-0 bottom-0 top-20 z-10 bg-white">
        <div className="grid h-full w-full lg:grid-cols-2">
          {/* Left panel */}
          <aside className="relative hidden h-full overflow-hidden lg:block">
            <Image
              src="/auth-login-hero.jpg"
              alt=""
              fill
              priority
              sizes="50vw"
              className="object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,28,64,0.55)_0%,rgba(10,40,96,0.78)_55%,rgba(8,28,64,0.92)_100%)]" />

            {!reduceMotion ? (
              <motion.div
                aria-hidden
                className="absolute -right-16 top-24 h-56 w-56 rounded-full bg-[#35a1fd]/20 blur-3xl"
                animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}

            <div className="relative z-10 flex h-full flex-col justify-center px-10 py-10 text-white xl:px-14">
              <div className="max-w-md text-white xl:max-w-lg">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm xl:text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  Secure customer login
                </p>
                <h2 className="mt-5 font-heading text-[2.2rem] font-bold leading-[1.12] tracking-[-0.03em] !text-white xl:text-[2.75rem]">
                  Your OCI &amp; e-Visa workspace
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-white/90 xl:text-base">
                  Sign in with email OTP to track applications, upload documents, and continue where you left off.
                </p>

                <ul className="mt-7 space-y-2.5 xl:mt-8 xl:space-y-3">
                  {TRUST_POINTS.map(({ icon: Icon, title, text }, index) => (
                    <motion.li
                      key={title}
                      initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + index * 0.08, duration: 0.35 }}
                      className="flex gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 text-white backdrop-blur-sm xl:p-3.5"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white xl:h-10 xl:w-10">
                        <Icon className="h-4 w-4 text-white xl:h-[18px] xl:w-[18px]" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white xl:text-[15px]">{title}</span>
                        <span className="mt-0.5 block text-[12px] text-white/80 xl:text-[13px]">{text}</span>
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <p className="mt-6 text-[12px] font-medium text-white/70 xl:text-[13px]">
                  Current step · <span className="font-semibold text-white">{stageLabel}</span>
                </p>
              </div>
            </div>
          </aside>

          {/* Right panel — form vertically + horizontally centered */}
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-12">
            <div className="mb-5 w-full max-w-[420px] lg:hidden xl:max-w-[480px]">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image src="/logo.png" alt="FlyOCI" width={36} height={36} className="h-9 w-9 object-contain" />
                <span className="font-heading text-xl font-bold text-[#0f2a52]">FlyOCI</span>
              </Link>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[420px] xl:max-w-[500px]"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

type StepRailProps = {
  stage: LoginShellStage;
};

export function LoginStepRail({ stage }: StepRailProps) {
  const steps =
    stage === "newDetails" || stage === "newOtp"
      ? [
          { id: "email", label: "Email" },
          { id: "details", label: "Details" },
          { id: "otp", label: "OTP" },
        ]
      : [
          { id: "email", label: "Email" },
          { id: "otp", label: "Verify" },
        ];

  const activeIndex =
    stage === "email"
      ? 0
      : stage === "newDetails"
        ? 1
        : stage === "existingOtp" || stage === "newOtp"
          ? steps.length - 1
          : 0;

  return (
    <ol className="mt-4 flex items-center gap-2 xl:mt-5">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors xl:h-10 xl:w-10 xl:text-sm ${
                done
                  ? "bg-[#00a37a] text-white"
                  : active
                    ? "bg-[#1c64c8] text-white shadow-[0_8px_16px_rgba(28,100,200,0.28)]"
                    : "bg-[#e8f0fa] text-[#6b849f]"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4 xl:h-5 xl:w-5" /> : index + 1}
            </div>
            <span
              className={`truncate text-sm font-semibold xl:text-base ${
                active || done ? "text-[#102c5a]" : "text-[#829ab1]"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className={`mx-1 hidden h-px flex-1 sm:block ${done ? "bg-[#00a37a]/50" : "bg-[#d7e4f4]"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function LoginPrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={reduceMotion || disabled ? undefined : { y: -1 }}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.98 }}
      className={`w-full rounded-2xl bg-[linear-gradient(135deg,#0f3f88_0%,#1c64c8_55%,#2d7fe0_100%)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(28,100,200,0.28)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 xl:py-4 xl:text-[15px] ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function LoginSecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border border-[#d5e3f5] bg-white px-4 py-3.5 text-sm font-semibold text-[#334E68] transition hover:bg-[#f5f9ff] xl:py-4 xl:text-[15px] ${className}`}
    >
      {children}
    </button>
  );
}

export const loginFieldWrap =
  "flex items-center gap-3 rounded-2xl border border-[#d5e3f5] bg-[#f8fbff] px-4 py-3.5 transition focus-within:border-[#1c64c8] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#1c64c8]/12 xl:py-4";

export const loginInputClass =
  "w-full bg-transparent text-sm text-[#102A43] outline-none placeholder:text-[#9AA8BC] xl:text-[15px]";
