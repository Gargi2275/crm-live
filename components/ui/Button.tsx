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
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-lg disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-saffron text-navy hover:bg-amber-500 px-6 py-3",
    secondary: "bg-teal text-white hover:bg-opacity-90 px-6 py-3",
    outline: "border-2 border-navy text-navy hover:border-saffron px-6 py-3",
  };

  const isPrimary = variant === "primary";

  return (
    <motion.button
      whileHover={{
        scale: 1.04,
        boxShadow: isPrimary
          ? "0 8px 32px rgba(245,166,35,0.35)"
          : "0 8px 32px rgba(15,31,61,0.15)",
      }}
      whileTap={{ scale: 0.97 }}
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
