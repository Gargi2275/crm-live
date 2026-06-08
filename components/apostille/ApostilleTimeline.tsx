"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { APOSTILLE_TIMELINE } from "@/lib/apostille-ui";

type ApostilleTimelineProps = {
  activeIndex: number;
  compact?: boolean;
};

export function ApostilleTimeline({ activeIndex, compact = false }: ApostilleTimelineProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {APOSTILLE_TIMELINE.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              isActive
                ? "border-[#1d6fd1]/35 bg-[#eef5ff] shadow-[0_4px_16px_rgba(29,111,209,0.1)]"
                : isDone
                  ? "border-[#c9ddff] bg-white"
                  : "border-[#e8eef8] bg-[#fafcff]"
            }`}
          >
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isDone
                  ? "bg-[#1d6fd1] text-white"
                  : isActive
                    ? "bg-[#1d6fd1]/15 text-[#1d6fd1] ring-2 ring-[#1d6fd1]/25"
                    : "bg-[#edf2fb] text-[#8fa3bc]"
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isActive ? "text-[#0d1f3c]" : "text-[#243b53]"}`}>
                {step.label}
              </p>
              {!compact ? (
                <p className="mt-0.5 text-xs text-[#627d98]">{step.hint}</p>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
