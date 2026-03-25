"use client";
import { motion } from "framer-motion";

interface AnimatedCheckmarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function AnimatedCheckmark({ size = 72, color = "#16A34A", className = "" }: AnimatedCheckmarkProps) {
  const checkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1, 
      transition: { duration: 0.6, delay: 0.2, ease: "easeOut" as const } 
    },
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      style={{ width: size, height: size }}
      className={`relative mx-auto ${className}`}
    >
      <svg viewBox="0 0 52 52" className="w-full h-full drop-shadow-sm">
        <motion.circle
          cx="26"
          cy="26"
          r="25"
          fill={`${color}15`}
          stroke={color}
          strokeWidth="2"
        />
        <motion.path
          d="M14 27l8 8 16-16"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          variants={checkVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </motion.div>
  );
}
