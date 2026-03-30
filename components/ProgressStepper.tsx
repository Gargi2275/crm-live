"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ProgressStepperProps {
  currentStep: number;
}

const STEPS = ["Register", "Email", "Payment", "Upload", "Done"];

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <div className="w-full max-w-[720px] mx-auto py-6 flex items-center justify-between px-4">
      {STEPS.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={index} className="flex items-center flex-1 relative">
            <div className="flex flex-col items-center gap-1.5 z-10 relative">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold relative z-10 transition-colors duration-300 ${
                  isDone
                    ? "bg-green text-black shadow-[0_0_0_4px_rgba(22,163,74,0.2)]"
                    : isActive
                    ? "bg-accent text-white"
                    : "bg-border text-muted"
                }`}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : index + 1}
              </motion.div>
              <span
                className={`text-[11px] font-bold hidden sm:block ${
                  isDone ? "text-green" : isActive ? "text-accent" : "text-muted"
                }`}
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 h-[2px] bg-border relative overflow-hidden mx-2">
                {isDone && (
                  <motion.div
                    className="absolute top-0 left-0 h-full w-full bg-green origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
