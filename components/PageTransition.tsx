"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex-1 overflow-hidden">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-12%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.12)_0%,transparent_68%)] blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, -16, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-8rem] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(28,105,221,0.10)_0%,transparent_70%)] blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="relative z-10 flex w-full flex-1 flex-col"
      >
        {children}
      </motion.main>
    </div>
  );
}