"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "./ui/Button";
import Image from "next/image";

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
        initial={{ backgroundColor: "rgba(255, 255, 255, 1)", borderBottomColor: "rgba(226, 232, 240, 0)" }}
        animate={{
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 1)",
          borderBottomColor: isScrolled ? "rgba(226, 232, 240, 1)" : "rgba(226, 232, 240, 0)",
        }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 w-full z-50 border-b transition-shadow ${isScrolled ? "shadow-navbar backdrop-blur-md" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center relative z-50 ">

              <Image
                src="/logo.png"
                alt="FlyOCI Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2 lg:space-x-1">
              {navLinks.map((link) => (
                <div
                  key={link.name}
                  className="relative group"
                  onMouseEnter={() => link.dropdown && setActiveDropdown(true)}
                  onMouseLeave={() => link.dropdown && setActiveDropdown(false)}
                >
                  <Link
                    href={link.href}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-250 ease-out flex items-center relative group text-dark hover:text-primary"
                  >
                    {link.name}
                    {link.dropdown && <ChevronDown className="ml-1 w-4 h-4" />}
                    <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-250 ease-out" />
                  </Link>
                  {pathname === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
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
                                className="block px-4 py-3 text-sm text-dark hover:bg-bg-page hover:text-primary transition-colors"
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
                <Button variant="primary" className="text-sm">
                  Get My Documents Checked
                </Button>
              </Link>
            </div>


            {/* Mobile menu button */}
            <div className="flex lg:hidden items-center z-50">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md focus:outline-none text-dark hover:text-primary"
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
            className="fixed inset-0 bg-dark z-40 lg:hidden"
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
            className="fixed inset-y-0 right-0 max-w-sm w-full bg-white z-40 shadow-2xl overflow-y-auto lg:hidden pt-24 pb-8 px-6"
          >
            <div className="flex flex-col space-y-6">
              {navLinks.map((link) => (
                <div key={link.name}>
                  <Link
                    href={link.href}
                    className={`block text-lg font-medium ${pathname === link.href ? "text-primary" : "text-dark"
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
                          className="block text-base text-textMuted hover:text-primary"
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
