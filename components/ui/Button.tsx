"use client";

import { motion } from "framer-motion";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onAnimationStart" | "onDragStart" | "onDragEnd"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-heading font-semibold tracking-[0.01em] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-btn disabled:opacity-50 disabled:pointer-events-none btn-elevate";

  const variants = {
    primary: "bg-btn-primary text-white shadow-btn hover:shadow-btn-hover hover:-translate-y-0.5 px-6 py-3",
    secondary: "bg-white border border-primary/30 text-primary rounded-btn px-6 py-3 shadow-[0_8px_22px_rgba(51,161,253,0.12)] hover:border-primary hover:bg-bg-blue/70",
    outline: "border border-primary/35 text-primary hover:bg-bg-blue/80 px-6 py-3 bg-white/70 backdrop-blur-sm",
  };

  

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </motion.button>
  );
}
