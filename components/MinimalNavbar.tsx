"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MessageCircle, Menu, X } from "lucide-react";
import { useEVisa } from "@/context/EVisaContext";
import Image from "next/image";

export function MinimalNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data } = useEVisa();
  const isRegistrationPage = pathname === "/indian-e-visa";

  // Show file number badge on pages 2-5
  const showFileNumber = !isRegistrationPage && data.fileNumber;

  return (
    <motion.nav
      animate={{
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
      className="fixed top-0 left-0 right-0 z-[100] transition-colors duration-200"
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-heading font-black tracking-tighter text-2xl text-primary flex items-center">
         <Image
                                       src="/logo.png"
                                       alt="FlyOCI Logo"
                                       width={120}
                                       height={40}
                                       className="h-10 w-auto"
                                       priority
                                     />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {isRegistrationPage ? (
            <>
              <Link href="/services/new-oci" className="font-body font-semibold text-[#486581] hover:text-primary transition-colors">
                OCI
              </Link>
              <Link href="/indian-e-visa" className="font-body font-semibold text-primary border-b-2 border-primary pb-1">
                Indian e-Visa
              </Link>
              <Link href="/track" className="font-body font-semibold text-[#486581] hover:text-primary transition-colors">
                Track Application
              </Link>
              <Link href="/contact" className="font-body font-semibold text-[#486581] hover:text-primary transition-colors">
                Contact
              </Link>
              <Link
                href="/track"
                className="rounded-lg border border-[#009877] px-4 py-2 text-sm font-semibold text-[#006F57] transition-colors hover:bg-[#ECFAF5]"
              >
                Track
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
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
                <Image
                                              src="/logo.png"
                                              alt="FlyOCI Logo"
                                              width={120}
                                              height={40}
                                              className="h-10 w-auto"
                                              priority
                                            />
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-primary" />
                </button>
              </div>

              {isRegistrationPage ? (
                <>
                  <Link
                    href="/services/new-oci"
                    className="font-body font-bold text-lg text-[#486581]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    OCI
                  </Link>
                  <Link
                    href="/indian-e-visa"
                    className="font-body font-bold text-lg text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Indian e-Visa
                  </Link>
                  <Link
                    href="/track"
                    className="font-body font-bold text-lg text-[#486581]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Track Application
                  </Link>
                  <Link
                    href="/contact"
                    className="font-body font-bold text-lg text-[#486581]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </>
              ) : (
                <>
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
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
