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
      <div className="flex h-screen bg-[#F5F7FA] overflow-hidden text-slate-900">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader />

          <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-[#33A1FD]/10 blur-3xl"
              animate={{ x: [0, -14, 0], y: [0, 10, 0], opacity: [0.35, 0.5, 0.35] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-1/3 -left-20 h-44 w-44 rounded-full bg-[#009877]/10 blur-3xl"
              animate={{ x: [0, 12, 0], y: [0, -8, 0], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="relative h-full"
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
          style: { background: "#FFFFFF", color: "#0F172A", border: "0.5px solid #D9E1EA", borderRadius: "12px" },
        }}
      />
    </ConsoleProvider>
  );
}
