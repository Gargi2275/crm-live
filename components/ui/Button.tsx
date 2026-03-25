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
    "inline-flex items-center justify-center font-heading transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-btn disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-btn-primary text-white shadow-btn hover:shadow-btn-hover px-6 py-3",
    secondary: "bg-white border-2 border-secondary text-secondary rounded-btn px-6 py-3",
    outline: "border-2 border-primary text-primary hover:bg-bg-blue px-6 py-3 bg-transparent",
  };

  const isPrimary = variant === "primary";

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
