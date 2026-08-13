"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExpressBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-[#C2410C]/45 bg-[#FFF7ED] font-bold uppercase tracking-wide text-[#C2410C]",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <Zap className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} fill="currentColor" />
      Express
    </span>
  );
}
