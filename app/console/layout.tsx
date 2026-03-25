"use client";

import { useState } from "react";
import { Sidebar } from "@/components/console/Sidebar";
import { TopHeader } from "@/components/console/TopHeader";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ConsoleProvider } from "@/components/console/ConsoleContext";
import { Toaster } from "react-hot-toast";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <ConsoleProvider>
      <div className="flex h-screen bg-[#F0F4FF] overflow-hidden text-slate-900">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#FFFFFF", color: "#0F172A", border: "1px solid #BFDBFE" },
        }}
      />
    </ConsoleProvider>
  );
}
