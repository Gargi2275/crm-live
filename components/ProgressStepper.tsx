"use client";

import { Check } from "lucide-react";

interface ProgressStepperProps {
  currentStep: number;
}

/** Checkout progress: Service → Payment → Documents */
const STEPS = ["Service", "Payment", "Documents"] as const;

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="mx-auto w-full max-w-xl px-1 py-1">
      <ol className="relative flex w-full items-start justify-between">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          const isUpcoming = index > currentStep;
          const connectorDone = index < currentStep;

          return (
            <li key={step} className="relative z-10 flex flex-1 flex-col items-center text-center">
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-[calc(50%+18px)] top-[15px] h-[2px] w-[calc(100%-36px)] ${
                    connectorDone ? "bg-[#1A56DB]" : "bg-[#D7E2EF]"
                  }`}
                />
              ) : null}

              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition ${
                  isActive
                    ? "bg-[#1A56DB] text-white shadow-[0_0_0_4px_rgba(26,86,219,0.16)]"
                    : isDone
                      ? "bg-[#1A56DB] text-white"
                      : "border-2 border-[#D0D7E2] bg-white text-[#829AB1]"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.75} /> : index + 1}
              </span>

              <span
                className={`mt-2 text-[12px] font-semibold tracking-[-0.01em] sm:text-[13px] ${
                  isActive
                    ? "text-[#1A56DB]"
                    : isDone
                      ? "text-[#334E68]"
                      : isUpcoming
                        ? "text-[#829AB1]"
                        : "text-[#627D98]"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
