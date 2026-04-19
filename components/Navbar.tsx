"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown, CircleUserRound } from "lucide-react";
import { Button } from "./ui/Button";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

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
      { name: "Apostille Services", href: "/apostille-services" },
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
  const router = useRouter();
  const { isAuthenticated, logout, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dashboardQuoteHref, setDashboardQuoteHref] = useState<string>("/dashboard");
  const [hasQuoteNotification, setHasQuoteNotification] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const isDashboardRoute = pathname === "/dashboard";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

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
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasQuoteNotification(false);
      setDashboardQuoteHref("/dashboard");
      return;
    }

    let cancelled = false;
    const loadQuoteNotification = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/applications/`, { method: "GET" });
        const raw = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        const apps = ((raw as { data?: Array<{ reference_number?: string; quote_status?: string; service_type?: string }> }).data || []);
        const quotedPassport = apps.find((app) => {
          const serviceType = String(app.service_type || "").toLowerCase();
          return serviceType.includes("passport") && String(app.quote_status || "").toUpperCase() === "QUOTED";
        });

        if (cancelled) {
          return;
        }

        if (quotedPassport?.reference_number) {
          setHasQuoteNotification(true);
          setDashboardQuoteHref(`/dashboard/document-audit?reference=${encodeURIComponent(quotedPassport.reference_number)}&resume=1&focusQuote=1`);
        } else {
          setHasQuoteNotification(false);
          setDashboardQuoteHref("/dashboard");
        }
      } catch {
        if (!cancelled) {
          setHasQuoteNotification(false);
        }
      }
    };

    void loadQuoteNotification();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, pathname]);

  return (
    <>
      <motion.nav
        initial={{ backgroundColor: "rgba(255, 255, 255, 0.9)", borderBottomColor: "rgba(51, 161, 253, 0.08)" }}
        animate={{
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.82)" : "rgba(255, 255, 255, 0.95)",
          borderBottomColor: isScrolled ? "rgba(51, 161, 253, 0.2)" : "rgba(51, 161, 253, 0.08)",
        }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 w-full z-50 border-b transition-shadow backdrop-blur-xl ${isScrolled ? "shadow-navbar" : ""}`}
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
            {!isDashboardRoute && (
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
                    className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-250 ease-out flex items-center relative group text-dark/90 hover:text-primary"
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
                          className="absolute left-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_14px_36px_rgba(51,161,253,0.16)] ring-1 ring-primary/10 overflow-hidden focus:outline-none"
                        >
                          <div className="py-2">
                            {link.dropdown.map((sublink) => (
                              <Link
                                key={sublink.name}
                                href={sublink.href}
                                className="block px-4 py-3 text-sm text-dark hover:bg-bg-blue/70 hover:text-primary transition-colors"
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
            )}

            {/* CTA / Auth Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {isDashboardRoute ? (
                <>
                  <Link
                    href="/track"
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 mr-2"
                  >
                    Track application
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Need Help
                  </Link>
                  {isAuthenticated && (
                    <div className="relative" ref={profileMenuRef}>
                      <button
                        type="button"
                        onClick={() => setProfileMenuOpen((prev) => !prev)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        aria-label="Open profile menu"
                        aria-haspopup="menu"
                        aria-expanded={profileMenuOpen}
                      >
                        <CircleUserRound className="h-5 w-5" />
                      </button>
                      <AnimatePresence>
                        {profileMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.16 }}
                            className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(20,48,96,0.15)] p-2"
                            role="menu"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setProfileMenuOpen(false);
                                router.push("/dashboard");
                              }}
                              className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Dashboard
                            </button>
                            <button
                              type="button"
                              onClick={handleLogout}
                              disabled={isLoggingOut}
                              className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              {isLoggingOut ? "Logging out..." : "Logout"}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              ) : loading ? (
                <Button variant="outline" className="text-sm" disabled>Loading...</Button>
              ) : isAuthenticated ? (
                <>
                  <Link href={dashboardQuoteHref} className="relative">
                    {hasQuoteNotification ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" /> : null}
                    <Button variant="outline" className="text-sm">Dashboard</Button>
                  </Link>
                  <Button
                    variant="primary"
                    className="text-sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <Link href="/auth/login">
                  <Button variant="outline" className="text-sm">Login</Button>
                </Link>
              )}
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
            className="fixed inset-0 bg-[#0d1f2d]/35 backdrop-blur-sm z-40 lg:hidden"
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
            className="fixed inset-y-0 right-0 max-w-sm w-full bg-white/95 backdrop-blur-xl z-40 shadow-[0_18px_48px_rgba(51,161,253,0.2)] overflow-y-auto lg:hidden pt-24 pb-8 px-6"
          >
            <div className="flex flex-col space-y-6">
              {isDashboardRoute ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quick Actions</p>
                    <Link
                      href="/track"
                      className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      Track application
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Need Help
                    </Link>

                    {loading ? (
                      <Button className="w-full" variant="outline" disabled>Loading...</Button>
                    ) : isAuthenticated ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/dashboard");
                          }}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Dashboard
                        </button>
                        <Button
                          className="w-full"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </Button>
                      </>
                    ) : (
                      <Link href="/auth/login">
                        <Button className="w-full" variant="outline">Login</Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {navLinks.map((link) => (
                    <div key={link.name}>
                      <Link
                        href={link.href}
                        className={`block text-lg font-medium ${pathname === link.href ? "text-primary" : "text-dark/90"
                          }`}
                      >
                        {link.name}
                      </Link>
                      {link.dropdown && (
                        <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/20 space-y-3">
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
                    {loading ? (
                      <Button className="w-full" variant="outline" disabled>Loading...</Button>
                    ) : isAuthenticated ? (
                      <div className="space-y-3">
                        <Link href="/dashboard">
                          <Button className="w-full" variant="outline">Dashboard</Button>
                        </Link>
                        <Button
                          className="w-full"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Link href="/auth/login">
                          <Button className="w-full" variant="outline">Login</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
