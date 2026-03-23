"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className = "", hoverEffect = false, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -6, boxShadow: "0 12px 40px rgba(15,31,61,0.15)" } : {}}
      transition={hoverEffect ? { type: "spring", stiffness: 300, damping: 20 } : {}}
      className={`bg-card rounded-2xl shadow-[0_2px_16px_rgba(15,31,61,0.08)] p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
