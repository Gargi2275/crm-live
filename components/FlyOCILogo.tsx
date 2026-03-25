"use client";

import { cn } from "@/lib/utils";

interface FlyOCILogoProps {
  className?: string;
  textClassName?: string;
}

export function FlyOCILogo({ className, textClassName }: FlyOCILogoProps) {
  return (
    <span className={cn("inline-flex items-center font-heading font-extrabold tracking-tight", className)}>
      <span className={cn("text-[#009877]", textClassName)}>Fly</span>
      <span className={cn("text-[#33A1FD]", textClassName)}>OCI</span>
    </span>
  );
}

