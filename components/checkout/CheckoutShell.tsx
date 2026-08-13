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

/**
 * Left: stepper + “Start your order” form (padded both sides).
 * Right: order summary flush top + right — height grows with content.
 */
export function CheckoutShell({
  title,
  subtitle,
  currentStep = 0,
  showStepper = true,
  form,
  summary,
}: CheckoutShellProps) {
  // Page uses pt-24 (~6rem) for the navbar; summary sits flush under it.
  const summaryMaxHeight = "calc(100dvh - 6rem)";

  return (
    <div className="w-full bg-[#F4F6F9] text-[#102A43]">
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
        {/* Form column — wider usable area */}
        <div className="min-w-0 flex-1 px-4 pt-3 sm:px-8 lg:px-10 lg:pb-6 xl:px-14 2xl:px-16">
          {showStepper ? (
            <div className="mb-4 flex justify-center rounded-xl border border-[#E4EAF2] bg-white px-4 py-3 shadow-sm sm:px-6">
              <ProgressStepper currentStep={currentStep} />
            </div>
          ) : null}
          <section className="min-w-0 rounded-2xl border border-[#E4EAF2] bg-white p-5 shadow-sm sm:p-6 lg:px-8 lg:py-6">
            <h1 className="text-[24px] font-semibold leading-tight text-[#0F1F3D]">{title}</h1>
            {subtitle ? <p className="mt-1 text-[14px] text-[#627D98]">{subtitle}</p> : null}
            <div className="mt-5">{form}</div>
          </section>
        </div>

        {/* Order summary — short by default, grows with applicants/services */}
        <aside
          className="sticky top-24 hidden w-[380px] shrink-0 self-start lg:block xl:w-[420px]"
          style={{ maxHeight: summaryMaxHeight }}
        >
          <div className="flex max-h-[inherit] flex-col overflow-y-auto border border-r-0 border-t-0 border-[#E4EAF2] bg-white px-5 pb-5 pt-4 shadow-sm sm:px-6 sm:pb-6 sm:pt-4 lg:rounded-bl-2xl lg:rounded-tl-none lg:rounded-tr-none">
            {summary}
          </div>
        </aside>

        {/* Mobile summary */}
        <div className="mx-5 mb-6 rounded-2xl border border-[#E4EAF2] bg-white p-5 shadow-sm sm:mx-8 lg:hidden">
          {summary}
        </div>
      </div>
    </div>
  );
}

/** Keep digits only, max 10 characters. */
export function sanitizeMobileDigits(value: string, maxLength = 10): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

export function isValidMobile10(value: string): boolean {
  return /^\d{10}$/.test(String(value || "").trim());
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
    <div className="flex w-full flex-col">
      <h2 className="shrink-0 text-[17px] font-semibold text-[#0F1F3D]">Order summary</h2>

      <div className="mt-3 space-y-4 pr-1">
        {lines.map((line) => (
          <div key={line.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-[15px] font-semibold text-[#0F1F3D]">{line.title}</p>
              <p className="shrink-0 text-[15px] font-bold text-[#0F1F3D]">{line.amountLabel}</p>
            </div>
            {line.subtitle ? (
              <div className="flex items-start justify-between gap-2 rounded-lg bg-[#EEF5FF] px-3 py-2.5 text-[13px]">
                <span className="min-w-0 leading-snug text-[#486581]">{line.subtitle}</span>
                <span className="shrink-0 font-semibold text-[#102A43]">{line.amountLabel}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 shrink-0 border-t border-[#E8EEF6] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#0F1F3D]">Order total:</span>
          <span className="text-[19px] font-bold text-[#0F1F3D]">{totalLabel}</span>
        </div>
        {footerNote ? <p className="mt-2 text-[12px] text-[#829AB1]">{footerNote}</p> : null}
      </div>
    </div>
  );
}

export type VisamentSummaryApplicant = {
  id: string;
  title: string;
  subtotalLabel: string;
  items: Array<{
    id: string;
    label: string;
    amountLabel: string;
    /** Highlight Express rows in the summary. */
    variant?: "default" | "express";
  }>;
  /** Show Express control under this applicant in the summary. */
  canSelectExpress?: boolean;
  expressSelected?: boolean;
};

type VisamentOrderSummaryProps = {
  applicants: VisamentSummaryApplicant[];
  totalLabel: string;
  footerNote?: string;
  disabled?: boolean;
  onToggleExpress?: (applicantId: string) => void;
};

export function VisamentOrderSummary({
  applicants,
  totalLabel,
  footerNote,
  disabled,
  onToggleExpress,
}: VisamentOrderSummaryProps) {
  return (
    <div className="flex w-full flex-col">
      <h2 className="shrink-0 text-[17px] font-semibold text-[#0F1F3D]">Order summary</h2>

      <div className="mt-3 space-y-4 pr-1">
        {applicants.map((applicant) => (
          <div key={applicant.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-[#0F1F3D]">{applicant.title}</p>
              <p className="text-[15px] font-bold text-[#0F1F3D]">{applicant.subtotalLabel}</p>
            </div>
            {applicant.items.length ? (
              <div className="space-y-2">
                {applicant.items.map((item) => {
                  const isExpress = item.variant === "express";
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-[13px] ${
                        isExpress
                          ? "border border-[#FDBA74] bg-[#fff7ed]"
                          : "bg-[#EEF5FF]"
                      }`}
                    >
                      <span
                        className={`min-w-0 leading-snug ${
                          isExpress ? "font-semibold text-[#c2410c]" : "text-[#486581]"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          isExpress ? "text-[#c2410c]" : "text-[#102A43]"
                        }`}
                      >
                        {item.amountLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[#D7E4F4] px-3 py-2 text-[13px] text-[#829AB1]">
                No services selected
              </p>
            )}

            {applicant.canSelectExpress && onToggleExpress ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleExpress(applicant.id)}
                className={`mt-2 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  applicant.expressSelected
                    ? "border-[#c2410c] bg-[#fff7ed] shadow-[0_0_0_1px_#c2410c]"
                    : "border-[#E1E7EF] bg-white hover:border-[#FDBA74]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#0F1F3D]">Express Service</span>
                  <span className="mt-0.5 block text-[11px] text-[#829AB1]">
                    Urgent priority · fee at payment
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-[#c2410c]">
                  {applicant.expressSelected ? "Selected" : "Select"}
                </span>
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 shrink-0 border-t border-[#E8EEF6] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#0F1F3D]">Order total:</span>
          <span className="text-[19px] font-bold text-[#0F1F3D]">{totalLabel}</span>
        </div>
        {footerNote ? <p className="mt-2 text-[12px] text-[#829AB1]">{footerNote}</p> : null}
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
      <p className="mb-2 text-[14px] font-semibold text-[#334E68]">{label}</p>
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
                <p className="text-[14px] font-semibold text-[#102A43]">{option.title}</p>
                {option.description ? (
                  <p className="mt-0.5 text-[12px] text-[#829AB1]">{option.description}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[15px] font-bold text-[#1A56DB]">{option.priceLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const checkoutFieldClass =
  "w-full rounded-lg border border-[#D0D7E2] bg-white px-3 py-2.5 text-[14px] text-[#102A43] outline-none transition placeholder:text-[#9AA8BC] focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/15 disabled:bg-[#F5F7FA]";

export const checkoutFieldErrorClass =
  "border-[#F3A4A4] focus:border-[#E11D48] focus:ring-[#E11D48]/15";

export const checkoutLabelClass = "mb-1.5 block text-[13px] font-medium text-[#334E68]";
