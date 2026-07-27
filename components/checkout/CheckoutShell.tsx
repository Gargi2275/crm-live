"use client";

import { ReactNode } from "react";
import { ProgressStepper } from "@/components/ProgressStepper";

type CheckoutShellProps = {
  title: string;
  subtitle?: string;
  currentStep?: number;
  showStepper?: boolean;
  form: ReactNode;
  summary: ReactNode;
};

/** Form left (narrower, side space) + sticky order summary flush right (untouched). */
export function CheckoutShell({
  title,
  subtitle,
  currentStep = 0,
  showStepper = true,
  form,
  summary,
}: CheckoutShellProps) {
  return (
    <div className="w-full bg-[#F4F6F9] text-[#102A43]">
      <div className="flex w-full items-start gap-5 pb-8 pt-2 sm:gap-6">
        {/* Form column: side space + slightly reduced width; summary stays flush right */}
        <div className="min-w-0 flex-1 px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[820px]">
            {showStepper ? (
              <div className="mb-4">
                <ProgressStepper currentStep={currentStep} />
              </div>
            ) : null}

            <section className="rounded-2xl border border-[#E4EAF2] bg-white p-5 sm:p-6">
              <h1 className="text-[22px] font-semibold leading-tight text-[#0F1F3D]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[13px] text-[#627D98]">{subtitle}</p> : null}
              <div className="mt-5">{form}</div>
            </section>

            <div className="mt-4 lg:hidden">{summary}</div>
          </div>
        </div>

        <aside
          className="sticky top-24 z-10 hidden w-[300px] shrink-0 self-start border-l border-[#E4EAF2] bg-white lg:block xl:w-[320px]"
          style={{ height: "calc(100dvh - 6.5rem)" }}
        >
          <div className="flex h-full w-full flex-col">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

type OrderSummaryLine = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  amountLabel: string;
};

type OrderSummaryCardProps = {
  lines: OrderSummaryLine[];
  totalLabel: string;
  footerNote?: string;
};

export function OrderSummaryCard({ lines, totalLabel, footerNote }: OrderSummaryCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#E4EAF2] bg-white p-5">
      <h2 className="text-[16px] font-semibold text-[#0F1F3D]">Order summary</h2>
      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {lines.map((line) => (
          <li key={line.id} className="rounded-xl bg-[#F7F9FC] px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#102A43]">{line.title}</p>
                {line.subtitle ? <p className="mt-0.5 truncate text-[11px] text-[#627D98]">{line.subtitle}</p> : null}
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-[#102A43]">{line.amountLabel}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-[#E8EEF6] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[#0F1F3D]">Order total:</span>
          <span className="text-[18px] font-bold text-[#0F1F3D]">{totalLabel}</span>
        </div>
        {footerNote ? <p className="mt-2 text-[11px] text-[#829AB1]">{footerNote}</p> : null}
      </div>
    </div>
  );
}

export type VisamentSummaryApplicant = {
  id: string;
  title: string;
  subtotalLabel: string;
  items: Array<{ id: string; label: string; amountLabel: string }>;
};

type VisamentOrderSummaryProps = {
  applicants: VisamentSummaryApplicant[];
  totalLabel: string;
};

export function VisamentOrderSummary({ applicants, totalLabel }: VisamentOrderSummaryProps) {
  return (
    <div className="flex h-full w-full flex-col p-5">
      <h2 className="shrink-0 text-[16px] font-semibold text-[#0F1F3D]">Order summary</h2>

      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
        {applicants.map((applicant) => (
          <div key={applicant.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-[#0F1F3D]">{applicant.title}</p>
              <p className="text-[14px] font-bold text-[#0F1F3D]">{applicant.subtotalLabel}</p>
            </div>
            {applicant.items.length ? (
              <div className="space-y-2 rounded-xl bg-[#EEF5FF] px-3 py-2.5">
                {applicant.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="min-w-0 leading-snug text-[#486581]">{item.label}</span>
                    <span className="shrink-0 font-semibold text-[#102A43]">{item.amountLabel}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#D7E4F4] px-3 py-2 text-[12px] text-[#829AB1]">
                No services selected
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto shrink-0 border-t border-[#E8EEF6] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#0F1F3D]">Order total:</span>
          <span className="text-[18px] font-bold text-[#0F1F3D]">{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}

type ServiceOption = {
  id: string;
  title: string;
  description?: string;
  priceLabel: string;
};

type ServiceOptionListProps = {
  label?: string;
  options: ServiceOption[];
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
};

export function ServiceOptionList({
  label = "What do you need?",
  options,
  value,
  disabled,
  onChange,
}: ServiceOptionListProps) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-[#334E68]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-[#1A56DB] bg-[#EFF6FF] shadow-[0_0_0_1px_#1A56DB]"
                  : "border-[#E1E7EF] bg-white hover:border-[#B8C9DE]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#102A43]">{option.title}</p>
                {option.description ? (
                  <p className="mt-0.5 text-[11px] text-[#829AB1]">{option.description}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[14px] font-bold text-[#1A56DB]">{option.priceLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const checkoutFieldClass =
  "w-full rounded-lg border border-[#D0D7E2] bg-white px-3 py-2.5 text-[13px] text-[#102A43] outline-none transition placeholder:text-[#9AA8BC] focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/15 disabled:bg-[#F5F7FA]";

export const checkoutLabelClass = "mb-1.5 block text-[12px] font-medium text-[#334E68]";
