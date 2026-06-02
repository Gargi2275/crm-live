"use client";

import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { PageVisitTracker } from "@/components/PageVisitTracker";
import { motion } from "framer-motion";

export default function MinimalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      key={typeof window !== "undefined" ? window.location.pathname : ""}
    >
      <PageVisitTracker />
      {children}
      <Footer compact />
      <CookieBanner />
    </motion.div>
  );
}
