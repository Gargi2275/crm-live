"use client";

import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";

export type TimelineStatus = "complete" | "active" | "pending";

export interface TimelineItem {
  id: number;
  title: string;
  description: string;
  status: TimelineStatus;
  timestamp?: string;
}

interface StatusTimelineProps {
  items: TimelineItem[];
}

export function StatusTimeline({ items }: StatusTimelineProps) {
  return (
    <div className="w-full relative py-4">
      {items.map((item, index) => {
        const isComplete = item.status === "complete";
        const isActive = item.status === "active";
        const isLast = index === items.length - 1;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="flex relative"
          >
            {/* Left Column: Dot and Line */}
            <div className="flex flex-col items-center mr-4 sm:mr-6 w-8 shrink-0 relative">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm relative z-10 transition-all duration-300 ${
                  isComplete ? "bg-green text-white shadow-[0_0_0_4px_rgba(22,163,74,0.15)]" :
                  isActive ? "bg-accent text-primary" :
                  "bg-[#E5E7EB] text-muted border-none"
                }`}
              >
                {isComplete && <Check className="w-4 h-4" strokeWidth={3} />}
                {isActive && (
                  <>
                    <Clock className="w-4 h-4" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-accent"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>
                )}
                {item.status === "pending" && (index + 1)}
              </div>
              
              {!isLast && (
                <div className="w-[2px] h-[50px] sm:h-[40px] bg-border relative overflow-hidden -mt-[2px] -mb-[2px] z-0">
                  {isComplete && (
                    <motion.div
                      className="absolute top-0 left-0 w-full h-full bg-green origin-top"
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 pb-6 sm:pb-8 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-[15px] pb-1 sm:pb-0 ${
                    isComplete ? "text-green" :
                    isActive ? "text-accent" :
                    "text-muted"
                  }`}>
                    {item.title}
                  </h4>
                  {isActive && (
                    <span className="bg-accent text-primary text-[10px] font-bold uppercase px-2 py-0.5 rounded-badge tracking-wider">
                      In Progress
                    </span>
                  )}
                </div>
                {item.timestamp && (
                  <span className="font-mono text-[11px] text-ui-muted mt-1 sm:mt-0">
                    {item.timestamp}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-ui-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
