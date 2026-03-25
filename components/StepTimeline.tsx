"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
interface Step {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface StepTimelineProps {
  steps: Step[];
}

export function StepTimeline({ steps }: StepTimelineProps) {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <div ref={containerRef} className="relative max-w-4xl mx-auto py-12">
      {/* Desktop Horizontal Line */}
      <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-primary/15 rounded-full" />
      <motion.div
        className="hidden md:block absolute top-12 left-0 h-1 bg-primary rounded-full origin-left"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <div className="flex flex-col md:flex-row md:justify-between space-y-12 md:space-y-0 relative">
        {/* Mobile Vertical Line */}
        <div className="md:hidden absolute top-0 left-[23px] w-1 h-full bg-primary/15 rounded-full" />
        <motion.div
          className="md:hidden absolute top-0 left-[23px] w-1 bg-primary rounded-full origin-top"
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{ height: "100%" }}
        />

        {steps.map((step, index) => (
          <div key={index} className="relative flex md:flex-col items-start md:items-center relative z-10 md:w-1/3 px-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : { scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.4 }}
              className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-[0_8px_24px_rgba(51,161,253,0.35)] flex-shrink-0 z-10"
            >
              {step.icon || (index + 1)}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.4 + 0.2 }}
              className="ml-6 md:ml-0 md:mt-8 md:text-center"
            >
              <h3 className="text-xl font-heading font-bold text-primary mb-3">{step.title}</h3>
              <p className="text-textMuted font-body leading-relaxed text-sm">
                {step.description}
              </p>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
