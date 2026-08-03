"use client";

interface ProgressStepperProps {
  currentStep: number;
}

/** Visament-style pill tabs: Service → Payment → Documents */
const STEPS = ["Service", "Payment", "Documents"] as const;

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <li key={step}>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold ${
                  isActive
                    ? "bg-[#1A56DB] text-white shadow-sm"
                    : isDone
                      ? "border border-[#1A56DB]/30 bg-[#EFF6FF] text-[#1A56DB]"
                      : "border border-[#D5DEEA] bg-white text-[#627D98]"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-[#E8EEF6] text-[#627D98]"
                  }`}
                >
                  {index + 1}
                </span>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
