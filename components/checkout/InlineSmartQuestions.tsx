"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  countryStateAnswerKey,
  fetchStatesForCountry,
  isCountryQuestionType,
} from "@/lib/country-states";
import {
  isQuestionVisible,
  resolveQuestionOptions,
  type JourneyQuestion,
} from "@/lib/questionnaire";

type InlineSmartQuestionsProps = {
  questions: JourneyQuestion[];
  answers: Record<string, string>;
  disabled?: boolean;
  onChange: (code: string, value: string) => void;
  errors?: Record<string, string>;
};

function useCountryStates(country: string) {
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = (country || "").trim();
    if (!value) {
      setStates([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchStatesForCountry(value).then((rows) => {
      if (cancelled) return;
      setStates(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return { states, loading };
}

/** Compact inline smart questionnaire — only renders when questions exist. */
export function InlineSmartQuestions({
  questions,
  answers,
  disabled,
  onChange,
  errors,
}: InlineSmartQuestionsProps) {
  const visibleQuestions = questions.filter((q) => isQuestionVisible(q, answers));

  // Auto-select when a Country→State question has exactly one country option (e.g. India only).
  useEffect(() => {
    for (const q of visibleQuestions) {
      if (!isCountryQuestionType(q.question_type)) continue;
      const options = resolveQuestionOptions(q, answers);
      if (options.length !== 1) continue;
      const only = options[0];
      if ((answers[q.id] || "").trim() === only) continue;
      onChange(q.id, only);
      onChange(countryStateAnswerKey(q.id), "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when question set / answers for country codes change
  }, [
    visibleQuestions
      .filter((q) => isCountryQuestionType(q.question_type))
      .map((q) => `${q.id}:${resolveQuestionOptions(q, answers).join("|")}:${answers[q.id] || ""}`)
      .join(";"),
  ]);

  const answeredCount = visibleQuestions.filter((q) => {
    if (!isCountryQuestionType(q.question_type)) {
      return Boolean((answers[q.id] || "").trim());
    }
    const country = (answers[q.id] || "").trim();
    if (!country) return false;
    // State may still be loading — count country as answered only when state not required yet / filled.
    // Keep optimistic: country filled counts toward progress; validation still enforces state.
    return true;
  }).length;

  if (!visibleQuestions.length) return null;

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
          {answeredCount}/{visibleQuestions.length} answered
        </p>
      </div>

      <div className="space-y-4">
        {visibleQuestions.map((q, index) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={index}
            answers={answers}
            disabled={disabled}
            onChange={onChange}
            errors={errors}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  answers,
  disabled,
  onChange,
  errors,
}: {
  q: JourneyQuestion;
  index: number;
  answers: Record<string, string>;
  disabled?: boolean;
  onChange: (code: string, value: string) => void;
  errors?: Record<string, string>;
}) {
  const value = answers[q.id] || "";
  const options = resolveQuestionOptions(q, answers);
  const isCountry = isCountryQuestionType(q.question_type);
  const isDate = String(q.question_type || "").toLowerCase() === "date";
  const isText =
    !isCountry &&
    !isDate &&
    (q.question_type === "text" ||
      (!options.length && q.question_type !== "yes_no" && !q.options_by_answer));
  const isLongText =
    isText && /address|notes/.test(`${q.id} ${q.label}`.toLowerCase());
  const hasError = Boolean(errors?.[q.id] || (isCountry && errors?.[countryStateAnswerKey(q.id)]));
  const lowerLabel = (q.label || "").toLowerCase();
  const lowerId = (q.id || "").toLowerCase();
  const isCountryOrState =
    lowerLabel.includes("country") ||
    lowerLabel.includes("state") ||
    lowerLabel.includes("region") ||
    lowerId.includes("country") ||
    lowerId.includes("state") ||
    lowerId.includes("region");
  const useDropdown =
    Boolean(q.options_by_answer && q.depends_on_code) ||
    options.length >= 8 ||
    (isCountryOrState && options.length >= 2);

  const countries = options.length ? options : [];
  const singleCountry = isCountry && countries.length === 1 ? countries[0] : null;
  const countryLocked = Boolean(singleCountry);
  const effectiveCountry = countryLocked ? singleCountry || value : value;
  const stateKey = countryStateAnswerKey(q.id);
  const stateValue = answers[stateKey] || "";
  const { states, loading: statesLoading } = useCountryStates(isCountry ? effectiveCountry : "");

  const helpText = useMemo(() => {
    if (q.help_text) return q.help_text;
    if (!isCountry) return null;
    if (countryLocked) return `Country is set to ${singleCountry}. Choose your state or region.`;
    return "Pick your country, then choose the matching state or region.";
  }, [countryLocked, isCountry, q.help_text, singleCountry]);

  return (
    <div
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
            {q.label || (isCountry ? "Country" : "Question")}
            {q.is_required !== false ? <span className="text-rose-500"> *</span> : null}
          </p>
          {helpText ? (
            <p className="mt-1 text-[13px] leading-relaxed text-[#829AB1]">{helpText}</p>
          ) : null}
          {q.depends_on_code && !options.length ? (
            <p className="mt-1 text-[12px] text-amber-700">
              No options configured for the selected parent answer yet.
            </p>
          ) : null}
        </div>
      </div>

      {isCountry ? (
        <div className="space-y-3">
          {countryLocked ? (
            <div className="rounded-xl border border-[#D9E8FF] bg-[#F5F9FF] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#627D98]">Country</p>
              <p className="mt-1 text-sm font-semibold text-[#0F1F3D]">{singleCountry}</p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#627D98]">
                Country
              </label>
              <select
                value={value}
                disabled={disabled || !countries.length}
                onChange={(e) => {
                  const nextCountry = e.target.value;
                  onChange(q.id, nextCountry);
                  onChange(stateKey, "");
                }}
                className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition disabled:opacity-60 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15"
              >
                <option value="" disabled>
                  Select country
                </option>
                {countries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
          {effectiveCountry ? (
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#627D98]">
                State / Region
                {q.is_required !== false && states.length > 0 ? (
                  <span className="text-rose-500"> *</span>
                ) : null}
              </label>
              {statesLoading ? (
                <p className="rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#829AB1]">
                  Loading states…
                </p>
              ) : states.length > 0 ? (
                <select
                  value={stateValue}
                  disabled={disabled}
                  onChange={(e) => onChange(stateKey, e.target.value)}
                  className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition disabled:opacity-60 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15"
                >
                  <option value="" disabled>
                    Select state / region
                  </option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={stateValue}
                  disabled={disabled}
                  placeholder="Type state or region (optional)"
                  className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15 disabled:opacity-60"
                  onChange={(e) => onChange(stateKey, e.target.value)}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : isDate ? (
        <input
          type="date"
          value={value}
          disabled={disabled}
          className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition disabled:opacity-60 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15"
          onChange={(e) => onChange(q.id, e.target.value)}
        />
      ) : isText ? (
        isLongText ? (
          <textarea
            value={value}
            disabled={disabled}
            rows={3}
            placeholder={q.help_text || "Type your answer"}
            className="w-full resize-none rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15 disabled:opacity-60"
            onChange={(e) => onChange(q.id, e.target.value)}
          />
        ) : (
          <input
            type="text"
            value={value}
            disabled={disabled}
            placeholder={q.help_text || "Type your answer"}
            className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15 disabled:opacity-60"
            onChange={(e) => onChange(q.id, e.target.value)}
          />
        )
      ) : useDropdown ? (
        <select
          value={value}
          disabled={disabled || !options.length}
          onChange={(e) => onChange(q.id, e.target.value)}
          className="w-full rounded-xl border border-[#D0D7E2] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#102A43] outline-none transition disabled:opacity-60 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/15"
        >
          <option value="" disabled>
            Select {q.label || "an option"}
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
      {isCountry && errors?.[stateKey] ? (
        <p className="mt-2 text-[12px] font-medium text-rose-600">{errors[stateKey]}</p>
      ) : null}
    </div>
  );
}
