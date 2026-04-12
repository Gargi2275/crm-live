import { CheckCircle2, Circle } from "lucide-react";

export type ApplicationTrackerStep = {
  number: number;
  label: string;
  note: string | null;
  completed: boolean;
  active: boolean;
};

type ApplicationTrackerProps = {
  currentStep: 1 | 2 | 3 | 4 | 5;
  steps: ApplicationTrackerStep[];
};

const FIXED_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Documents audited",
  2: "Form filling in progress",
  3: "Submitted to Embassy / VFS",
  4: "Under process",
  5: "Decision / Dispatched / Collected",
};

export function ApplicationTracker({ currentStep, steps }: ApplicationTrackerProps) {
  const normalizedSteps: ApplicationTrackerStep[] = [1, 2, 3, 4, 5].map((num) => {
    const number = num as 1 | 2 | 3 | 4 | 5;
    const incoming = steps.find((step) => step.number === number);
    return {
      number,
      label: FIXED_LABELS[number],
      note: incoming?.note ?? null,
      completed: incoming?.completed ?? number < currentStep,
      active: incoming?.active ?? number === currentStep,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="font-semibold text-primary">Application Progress</h4>
      <div className="mt-4 space-y-4">
        {normalizedSteps.map((step) => (
          <div key={step.number} className="flex items-start gap-3">
            <div className="mt-0.5">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : step.active ? (
                <Circle className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${step.active ? "text-primary" : "text-slate-700"}`}>
                {step.number}. {step.label}
              </p>
              {step.note ? <p className="mt-1 text-xs text-slate-500">{step.note}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
