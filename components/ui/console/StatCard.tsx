"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5 hover:border-[#33A1FD]/40 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {trend && (
              <span 
                className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded-full",
                  isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
    </div>
  );
}
