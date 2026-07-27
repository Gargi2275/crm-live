"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  colorClass: string;
  bgClass: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  trend,
  isPositive,
  colorClass,
  bgClass,
  icon: Icon,
  active = false,
  onClick,
}: StatCardProps) {
  const interactive = Boolean(onClick);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={interactive ? { y: -3 } : undefined}
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={interactive ? active : undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-[10px] border-[0.5px] bg-white p-3 text-left transition-colors duration-200",
        active
          ? "border-[#009877] ring-1 ring-[#009877]/30 bg-[#009877]/5"
          : "border-[#D9E1EA]",
        interactive
          ? "cursor-pointer hover:border-[#009877]/35"
          : "cursor-default",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-heading font-medium text-[#486581] leading-tight">{title}</p>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h3 className="text-lg sm:text-xl font-heading font-semibold text-[#102A43] leading-none">{value}</h3>
            {trend && (
              <span
                className={cn(
                  "text-[10px] font-heading font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap",
                  isPositive ? "bg-[#009877]/12 text-[#006F57]" : "bg-[#B42318]/12 text-[#B42318]",
                )}
              >
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className={cn("p-2 rounded-lg flex items-center justify-center self-start", bgClass, colorClass)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </motion.button>
  );
}
