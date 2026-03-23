"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "./ui/Button";

const navLinks = [
  { name: "Home", href: "/" },
  {
    name: "Services",
    href: "/services",
    dropdown: [
      { name: "New OCI Card", href: "/services/new-oci" },
      { name: "OCI Renewal / Transfer", href: "/services/oci-renewal" },
      { name: "OCI Update (Gratis)", href: "/services/oci-update" },
      { name: "Indian e-Visa", href: "/services/indian-evisa" },
      { name: "Indian Passport Renewal", href: "/services/passport-renewal" },
    ],
  },
  { name: "How It Works", href: "/how-it-works" },
  { name: "Document Audit", href: "/document-audit" },
  { name: "Pricing", href: "/pricing" },
  { name: "FAQs", href: "/faqs" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 80) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
    setActiveDropdown(false);
  }, [pathname]);

  return (
    <>
      <motion.nav
        initial={{ backgroundColor: "rgba(250, 250, 247, 1)", borderBottomColor: "rgba(229, 231, 235, 0)" }}
        animate={{
          backgroundColor: isScrolled ? "rgba(15, 31, 61, 0.97)" : "rgba(250, 250, 247, 1)",
          borderBottomColor: isScrolled ? "rgba(15, 31, 61, 0)" : "rgba(229, 231, 235, 1)",
        }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 w-full z-50 border-b ${isScrolled ? "backdrop-blur-md" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 relative z-50">
              <span className={`font-heading text-2xl font-bold transition-colors duration-300 ${isScrolled ? "text-white" : "text-navy"}`}>
                FlyOCI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 lg:space-x-4">
              {navLinks.map((link) => (
                <div
                  key={link.name}
                  className="relative group"
                  onMouseEnter={() => link.dropdown && setActiveDropdown(true)}
                  onMouseLeave={() => link.dropdown && setActiveDropdown(false)}
                >
                  <Link
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
                      isScrolled ? "text-gray-200 hover:text-white" : "text-textMuted hover:text-navy"
                    }`}
                  >
                    {link.name}
                    {link.dropdown && <ChevronDown className="ml-1 w-4 h-4" />}
                  </Link>
                  {pathname === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron rounded-full"
                    />
                  )}

                  {/* Dropdown Menu */}
                  {link.dropdown && (
                    <AnimatePresence>
                      {activeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-[0_8px_32px_rgba(15,31,61,0.12)] ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none"
                        >
                          <div className="py-2">
                            {link.dropdown.map((sublink) => (
                              <Link
                                key={sublink.name}
                                href={sublink.href}
                                className="block px-4 py-3 text-sm text-navy hover:bg-gray-50 hover:text-saffron transition-colors"
                              >
                                {sublink.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center">
              <Link href="/document-audit">
                <Button>Get My Documents Checked</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden items-center z-50">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-md focus:outline-none ${
                  isScrolled && !menuOpen ? "text-white" : "text-navy"
                }`}
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy z-40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 max-w-sm w-full bg-background z-40 shadow-2xl overflow-y-auto lg:hidden pt-24 pb-8 px-6"
          >
            <div className="flex flex-col space-y-6">
              {navLinks.map((link) => (
                <div key={link.name}>
                  <Link
                    href={link.href}
                    className={`block text-lg font-medium ${
                      pathname === link.href ? "text-saffron" : "text-navy"
                    }`}
                  >
                    {link.name}
                  </Link>
                  {link.dropdown && (
                    <div className="mt-3 ml-4 pl-4 border-l-2 border-border space-y-3">
                      {link.dropdown.map((sublink) => (
                        <Link
                          key={sublink.name}
                          href={sublink.href}
                          className="block text-base text-textMuted hover:text-navy"
                        >
                          {sublink.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-6 border-t border-border mt-6">
                <Link href="/document-audit">
                  <Button className="w-full">Get My Documents Checked</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
