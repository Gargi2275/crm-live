"use client";

import { ReactNode } from "react";
import { MinimalNavbar } from "@/components/MinimalNavbar";
import { EVisaProvider } from "@/context/EVisaContext";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function TrackLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <EVisaProvider>
      <div className="min-h-screen bg-ui-bg flex flex-col font-body">
        <MinimalNavbar />
        
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col relative w-full pt-[72px]"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </EVisaProvider>
  );
}
