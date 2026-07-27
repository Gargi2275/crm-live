"use client";

import { Check } from "lucide-react";
import type { JourneyQuestion } from "@/lib/questionnaire";

type InlineSmartQuestionsProps = {
  questions: JourneyQuestion[];
  answers: Record<string, string>;
  disabled?: boolean;
  onChange: (code: string, value: string) => void;
  errors?: Record<string, string>;
};

/** Compact inline smart questionnaire — only renders when questions exist. */
export function InlineSmartQuestions({
  questions,
  answers,
  disabled,
  onChange,
  errors,
}: InlineSmartQuestionsProps) {
  if (!questions.length) return null;

  const answeredCount = questions.filter((q) => (answers[q.id] || "").trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#E8EEF6] pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1A56DB]">
            Quick questions
          </p>
          <p className="mt-1 text-sm font-medium text-[#486581]">
            A few details so we can build your document checklist
          </p>
        </div>
        <p className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-semibold text-[#1A56DB]">
          {answeredCount}/{questions.length} answered
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => {
          const value = answers[q.id] || "";
          const isText = q.question_type === "text" || (!q.options?.length && q.question_type !== "yes_no");
          const options =
            q.options?.length > 0 ? q.options : q.question_type === "yes_no" ? ["Yes", "No"] : [];
          const hasError = Boolean(errors?.[q.id]);
          const lowerLabel = (q.label || "").toLowerCase();
          const lowerId = (q.id || "").toLowerCase();
          const isCountryQuestion = lowerLabel.includes("country") || lowerId.includes("country");
          const renderCountryDropdown = isCountryQuestion && options.length >= 50;

          return (
            <div
              key={q.id}
              className={`rounded-2xl border bg-white p-4 sm:p-5 ${
                hasError ? "border-rose-300 ring-2 ring-rose-100" : "border-[#E1E7EF]"
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[12px] font-bold text-[#1A56DB]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug text-[#0F1F3D]">
                    {q.label}
                    {q.is_required !== false ? <span className="text-rose-500"> *</span> : null}
                  </p>
                  {q.help_text ? (
                    <p className="mt-1 text-[13px] leading-relaxed text-[#829AB1]">{q.help_text}</p>
                  ) : null}
                </div>
              </div>

              {isText ? (
                <input
                  type="text"
                  value={value}
                  disabled={disabled}
                  placeholder="Type your answer"
                  className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15 disabled:opacity-60"
                  onChange={(e) => onChange(q.id, e.target.value)}
                />
              ) : renderCountryDropdown ? (
                <select
                  value={value}
                  disabled={disabled}
                  onChange={(e) => onChange(q.id, e.target.value)}
                  className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition disabled:opacity-60 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15"
                >
                  <option value="" disabled>
                    Select {q.label || "country"}
                  </option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((option) => {
                    const selected = value === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(q.id, option)}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition disabled:opacity-60 ${
                          selected
                            ? "border-[#1A56DB] bg-[#EFF6FF] text-[#0F1F3D] shadow-[0_0_0_3px_rgba(26,86,219,0.12)]"
                            : "border-[#E1E7EF] bg-[#F8FAFC] text-[#334E68] hover:border-[#B8C9DE] hover:bg-white"
                        }`}
                      >
                        <span className="leading-snug">{option}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#1A56DB] bg-[#1A56DB] text-white"
                              : "border-[#C5D0DE] bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {errors?.[q.id] ? (
                <p className="mt-2 text-[12px] font-medium text-rose-600">{errors[q.id]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
