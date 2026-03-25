"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { FileText, MessageCircle, Menu, X } from "lucide-react";
import { useEVisa } from "@/context/EVisaContext";
import { FlyOCILogo } from "./FlyOCILogo";

export function MinimalNavbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data } = useEVisa();

  // Show file number badge on pages 2-5
  const showFileNumber = pathname !== "/indian-e-visa" && data.fileNumber;

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsScrolled(latest > 60);
    });
  }, [scrollY]);

  return (
    <motion.nav
      animate={{
        backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.97)" : "transparent",
        boxShadow: isScrolled ? "0 4px 20px rgba(0, 0, 0, 0.05)" : "none",
      }}
      className="fixed top-0 left-0 right-0 z-[100] transition-colors duration-200"
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-heading font-black tracking-tighter text-2xl text-primary flex items-center">
          <FlyOCILogo className="text-2xl" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {showFileNumber && (
            <div className="flex items-center gap-2 bg-accent/10 text-primary font-mono text-sm px-3 py-1.5 rounded-lg border border-accent/20 font-bold">
              <FileText className="w-4 h-4" />
              {data.fileNumber}
            </div>
          )}
          <Link href="/track" className="font-body font-semibold text-primary hover:text-accent transition-colors">
            Track Application
          </Link>
          <a
            href="https://wa.me/1234567890" // Decorative
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-body font-semibold text-secondary hover:opacity-80 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" />
            Need Help?
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-primary"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[200] flex justify-end"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[280px] bg-white h-full shadow-2xl p-6 flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <FlyOCILogo className="text-xl" />
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-primary" />
                </button>
              </div>

              {showFileNumber && (
                <div className="flex items-center gap-2 bg-accent/10 text-primary font-mono text-sm px-3 py-2 rounded-lg border border-accent/20 font-bold justify-center">
                  <FileText className="w-4 h-4" />
                  {data.fileNumber}
                </div>
              )}

              <Link 
                href="/track" 
                className="font-body font-bold text-lg text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Track Application
              </Link>
              <a
                href="https://wa.me/1234567890"
                className="flex items-center gap-2 font-body font-bold text-lg text-secondary mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle className="w-5 h-5" />
                Need Help?
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
