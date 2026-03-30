"use client";

import { ReactNode } from "react";
import { MinimalNavbar } from "@/components/MinimalNavbar";
import { EVisaProvider } from "@/context/EVisaContext";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default function EVisaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <EVisaProvider>
      <div className="bg-ui-bg flex min-h-[100svh] flex-col font-body">
        <MinimalNavbar />
        
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex flex-1 flex-col w-full pt-[72px]"
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              border: "1px solid #d9e1ea",
              borderRadius: "12px",
              color: "#102a43",
            },
          }}
        />
      </div>
    </EVisaProvider>
  );
}
