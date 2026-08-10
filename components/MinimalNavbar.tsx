"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MessageCircle, Menu, X, CircleUserRound, LayoutDashboard } from "lucide-react";
import { useEVisa } from "@/context/EVisaContext";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { SUPPORT_WHATSAPP_HREF } from "@/lib/contact";
import { authService } from "@/lib/auth";

export function MinimalNavbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { data } = useEVisa();
  const { isAuthenticated, loading, logout } = useAuth();
  const isRegistrationPage = pathname === "/indian-e-visa";
  const hasSession = Boolean(isAuthenticated || authService.isLoggedIn());
  const dashboardHref = "/dashboard";
  const loginHref = `/auth/login?next=${encodeURIComponent(dashboardHref)}`;

  // Show file number badge on pages 2-5
  const showFileNumber = !isRegistrationPage && data.fileNumber;

  const goToDashboard = () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    // Full navigation leaves the e-Visa layout cleanly (avoids soft-nav stuck state).
    if (typeof window !== "undefined") {
      window.location.assign(hasSession ? dashboardHref : loginHref);
      return;
    }
    router.push(hasSession ? dashboardHref : loginHref);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [profileMenuOpen]);

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
        <div className="hidden md:flex items-center gap-6">
          {showFileNumber && (
            <div className="flex items-center gap-2 bg-accent/10 text-primary font-mono text-sm px-3 py-1.5 rounded-lg border border-accent/20 font-bold">
              <FileText className="w-4 h-4" />
              {data.fileNumber}
            </div>
          )}

          {!isRegistrationPage ? (
            <Link href="/track" className="font-body font-semibold text-primary hover:text-accent transition-colors">
              Track Application
            </Link>
          ) : null}

          <a
            href={SUPPORT_WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-body font-semibold text-[#486581] hover:text-primary transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Need help?
          </a>

          {!loading && hasSession ? (
            <>
              <button
                type="button"
                onClick={goToDashboard}
                className="inline-flex items-center gap-2 font-body font-semibold text-primary hover:text-accent transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#bfd3ff] bg-white text-primary hover:bg-[#f6faff]"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  <CircleUserRound className="h-5 w-5" />
                </button>
                {profileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 rounded-xl border border-[#d6e2f5] bg-white shadow-[0_14px_34px_rgba(20,48,96,0.15)] p-2"
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={goToDashboard}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-[#294d84] hover:bg-[#f6faff]"
                    >
                      Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-[#d04b4b] hover:bg-[#fff1f1] disabled:opacity-60"
                    >
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : !loading ? (
            <Link
              href={loginHref}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Login
            </Link>
          ) : null}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-primary" onClick={() => setMobileMenuOpen(true)}>
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
                <Image src="/logo.png" alt="FlyOCI Logo" width={120} height={40} className="h-10 w-auto" priority />
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

              {!isRegistrationPage ? (
                <Link
                  href="/track"
                  className="font-body font-bold text-lg text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Track Application
                </Link>
              ) : null}

              <a
                href={SUPPORT_WHATSAPP_HREF}
                className="flex items-center gap-2 font-body font-bold text-lg text-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle className="w-5 h-5" />
                Need help?
              </a>

              {!loading && hasSession ? (
                <>
                  <button
                    type="button"
                    onClick={goToDashboard}
                    className="text-left font-body font-bold text-lg text-primary"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-left font-body font-bold text-lg text-red-600 disabled:opacity-60"
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              ) : !loading ? (
                <Link
                  href={loginHref}
                  className="font-body font-bold text-lg text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
