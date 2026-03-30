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
}

export function StatCard({ title, value, trend, isPositive, colorClass, bgClass, icon: Icon }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden bg-white rounded-[12px] shadow-sm border-[0.5px] border-[#D9E1EA] p-5 hover:border-[#009877]/35 transition-all duration-300"
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#33A1FD]/8 blur-2xl" />
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <p className="text-sm font-heading font-medium text-[#486581]">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-heading font-semibold text-[#102A43]">{value}</h3>
            {trend && (
              <span 
                className={cn(
                  "text-xs font-heading font-semibold px-2 py-0.5 rounded-full",
                  isPositive ? "bg-[#009877]/12 text-[#006F57]" : "bg-[#B42318]/12 text-[#B42318]"
                )}
              >
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className={cn("p-3 rounded-lg flex items-center justify-center", bgClass, colorClass)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
