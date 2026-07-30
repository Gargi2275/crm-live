"use client";

import { useState, useEffect, useMemo, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown, CircleUserRound, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import { startHrefForServiceType } from "@/lib/public-pricing";
import { groupServicesByCategory, splitPrimaryAndOtherServiceGroups } from "@/lib/service-categories";

const baseNavLinks = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/services", servicesMenu: true },
  { name: "How It Works", href: "/how-it-works" },
  { name: "Pricing", href: "/pricing" },
  { name: "FAQs", href: "/faqs" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function Navbar() {
  const router = useRouter();
  const { isAuthenticated, logout, loading } = useAuth();
  const { services, loading: pricingLoading } = usePublicPricing();
  const navLinks = baseNavLinks;
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const isDashboardRoute = pathname === "/dashboard";

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const serviceGroups = useMemo(
    () => groupServicesByCategory(services),
    [services],
  );

  const { primaryGroups, otherGroups } = useMemo(
    () => splitPrimaryAndOtherServiceGroups(serviceGroups),
    [serviceGroups],
  );

  const serviceHrefs = useMemo(
    () => serviceGroups.flatMap((group) => [group.href, ...group.services.map((s) => s.href)]),
    [serviceGroups],
  );

  const totalServiceCount = useMemo(
    () => serviceGroups.reduce((sum, group) => sum + group.services.length, 0),
    [serviceGroups],
  );

  const servicesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openServicesMenu = () => {
    if (servicesCloseTimer.current) {
      clearTimeout(servicesCloseTimer.current);
      servicesCloseTimer.current = null;
    }
    setActiveDropdown(true);
  };

  const closeServicesMenu = () => {
    if (servicesCloseTimer.current) clearTimeout(servicesCloseTimer.current);
    servicesCloseTimer.current = setTimeout(() => setActiveDropdown(false), 120);
  };

  const toggleServicesMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (servicesCloseTimer.current) {
      clearTimeout(servicesCloseTimer.current);
      servicesCloseTimer.current = null;
    }
    setActiveDropdown((open) => !open);
  };

  useEffect(() => {
    return () => {
      if (servicesCloseTimer.current) clearTimeout(servicesCloseTimer.current);
    };
  }, []);

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
    setIsScrolled(latest > 12);
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

  return (
    <>
      <motion.nav
        initial={false}
        animate={{
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.92)",
          borderBottomColor: isScrolled ? "rgba(15, 42, 67, 0.08)" : "rgba(51, 161, 253, 0.1)",
          boxShadow: isScrolled
            ? "0 1px 0 rgba(15,42,67,0.04), 0 8px 24px rgba(15,42,67,0.06)"
            : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.2 }}
        className={`fixed top-0 z-50 w-full border-b ${isScrolled ? "" : "backdrop-blur-md"}`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex h-18 items-center justify-between gap-4 lg:h-20">
            {/* Logo */}
            <Link href="/" className="relative z-50 flex flex-shrink-0 items-center">

              <Image
                src="/logo.png"
                alt="FlyOCI Logo"
                width={120}
                height={40}
                className="h-9 w-auto sm:h-10"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            {!isDashboardRoute && (
            <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex lg:gap-0.5 xl:gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.servicesMenu
                    ? serviceHrefs.includes(pathname) || pathname.startsWith("/services/")
                    : false);

                return (
                <div
                  key={link.name}
                  className="relative"
                  onMouseEnter={() => link.servicesMenu && openServicesMenu()}
                  onMouseLeave={() => link.servicesMenu && closeServicesMenu()}
                >
                  <Link
                    href={link.href}
                    onClick={link.servicesMenu ? toggleServicesMenu : undefined}
                    className={`relative flex items-center whitespace-nowrap rounded-md px-2 py-2 text-base font-medium no-underline transition-colors duration-250 xl:px-3 ${
                      isActive || (link.servicesMenu && activeDropdown)
                        ? "text-primary"
                        : "text-dark/90 hover:text-primary"
                    } after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-primary after:transition-transform after:duration-250 after:content-[''] ${
                      isActive || (link.servicesMenu && activeDropdown)
                        ? "after:scale-x-100"
                        : "after:scale-x-0 hover:after:scale-x-100"
                    }`}
                    aria-expanded={link.servicesMenu ? activeDropdown : undefined}
                    aria-haspopup={link.servicesMenu ? "menu" : undefined}
                  >
                    {link.name}
                    {link.servicesMenu && (
                      <ChevronDown
                        className={`ml-1 h-4 w-4 shrink-0 transition-transform duration-200 ${
                          activeDropdown ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>
                </div>
                );
              })}
            </div>
            )}

            {/* CTA / Auth Buttons */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {isDashboardRoute ? (
                <>
                  <Link
                    href="/track"
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-100 mr-2"
                  >
                    Track application
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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
                <Button variant="outline" className="text-base" disabled>Loading...</Button>
              ) : isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline" className="text-base">Dashboard</Button>
                  </Link>
                  <Button
                    variant="primary"
                    className="text-base"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <Link href="/auth/login">
                  <Button variant="outline" className="text-base">Login</Button>
                </Link>
              )}
            </div>


            {/* Mobile menu button */}
            <div className="z-50 flex items-center lg:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-md p-2 text-dark focus:outline-none hover:text-primary"
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
            className="fixed inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto bg-white/95 px-5 pb-8 pt-24 shadow-[0_18px_48px_rgba(51,161,253,0.2)] backdrop-blur-xl lg:hidden sm:px-6"
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
                      {link.servicesMenu && (
                        <div className="mt-3 ml-1 space-y-5 border-l-2 border-primary/20 pl-4">
                          {primaryGroups.map((group) => (
                            <div key={group.id}>
                              <Link
                                href={group.href}
                                className="block text-sm font-bold text-[#1c69dd]"
                              >
                                {group.title}
                              </Link>
                              <div className="mt-2 space-y-1">
                                {group.services.map((service) => (
                                  <Link
                                    key={String(service.id)}
                                    href={startHrefForServiceType(service.serviceType)}
                                    className="block py-1.5 text-[15px] font-medium text-[#334e68] hover:text-primary"
                                  >
                                    {service.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                          {otherGroups.map((group) => (
                            <div key={group.id} className="rounded-xl border border-[#e8f1ff] bg-[#f8fbff] p-3">
                              <Link
                                href={group.href}
                                className="block text-center text-sm font-bold text-[#1c69dd]"
                              >
                                {group.title}
                              </Link>
                              <div className="mt-2 space-y-1">
                                {group.services.map((service) => (
                                  <Link
                                    key={String(service.id)}
                                    href={startHrefForServiceType(service.serviceType)}
                                    className="block py-1.5 text-center text-[15px] font-medium text-[#334e68] hover:text-primary"
                                  >
                                    {service.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
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

      {portalReady && !isDashboardRoute
        ? createPortal(
            <AnimatePresence>
              {activeDropdown ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] hidden justify-center px-4 pt-2 lg:flex lg:top-20"
                >
                  <div
                    role="menu"
                    className="pointer-events-auto flex w-full max-w-5xl max-h-[min(42rem,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-2xl border border-[#d6e8ff] bg-white shadow-[0_24px_56px_rgba(15,42,67,0.16)]"
                    onMouseEnter={openServicesMenu}
                    onMouseLeave={closeServicesMenu}
                  >
                    <div className="shrink-0 border-b border-[#eef3f9] px-6 py-4">
                      <p className="text-sm font-semibold text-[#102a43]">Browse services by category</p>
                      <p className="mt-0.5 text-sm text-[#627d98]">
                        Pick a category, then choose the service that fits your case.
                      </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
                      <div
                        className={`grid gap-0 px-3 py-5 sm:px-5 ${
                          primaryGroups.length >= 4
                            ? "grid-cols-2 xl:grid-cols-4"
                            : primaryGroups.length === 3
                              ? "grid-cols-1 md:grid-cols-3"
                              : "grid-cols-1 sm:grid-cols-2"
                        }`}
                      >
                        {pricingLoading && primaryGroups.length === 0
                          ? Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="animate-pulse space-y-3 px-4 py-2">
                                <div className="h-4 w-32 rounded bg-[#e8f1ff]" />
                                <div className="h-5 w-full rounded bg-[#f0f5ff]" />
                                <div className="h-5 w-5/6 rounded bg-[#f0f5ff]" />
                              </div>
                            ))
                          : primaryGroups.map((group, index) => (
                              <div
                                key={group.id}
                                className={`px-4 py-2 ${
                                  index > 0 ? "border-t border-[#eef3f9] xl:border-t-0 xl:border-l" : ""
                                }`}
                              >
                                <Link
                                  href={group.href}
                                  className="mb-3 block text-[15px] font-bold leading-snug text-[#1c69dd] transition-colors hover:text-[#155fc4]"
                                >
                                  {group.title}
                                </Link>
                                <ul className="space-y-1">
                                  {group.services.map((service) => (
                                    <li key={String(service.id)}>
                                      <Link
                                        href={startHrefForServiceType(service.serviceType)}
                                        className="block rounded-lg px-2 py-2.5 text-[15px] font-medium leading-snug text-[#102a43] transition-colors hover:bg-[#f4f8ff] hover:text-[#1c69dd]"
                                        onClick={() => setActiveDropdown(false)}
                                      >
                                        {service.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                      </div>

                      {otherGroups.length > 0 ? (
                        <div className="border-t border-[#eef3f9] bg-white px-4 py-5 sm:px-6">
                          {otherGroups.map((group) => (
                            <div key={group.id} className="mx-auto w-full max-w-sm">
                              <Link
                                href={group.href}
                                className="mb-3 block text-[15px] font-bold leading-snug text-[#1c69dd] transition-colors hover:text-[#155fc4]"
                              >
                                {group.title}
                              </Link>
                              <ul className="flex flex-col gap-1">
                                {group.services.map((service) => (
                                  <li key={String(service.id)} className="w-full">
                                    <Link
                                      href={startHrefForServiceType(service.serviceType)}
                                      className="block w-full rounded-lg px-2 py-2.5 text-left text-[15px] font-medium leading-snug text-[#102a43] transition-colors hover:bg-[#f4f8ff] hover:text-[#1c69dd]"
                                      onClick={() => setActiveDropdown(false)}
                                    >
                                      {service.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 border-t border-[#e8f1ff] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href="/services"
                        className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#1c69dd] transition-colors hover:text-[#155fc4]"
                      >
                        View all {totalServiceCount || ""} services
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <p className="text-sm text-[#627d98]">
                        Unsure where to begin?{" "}
                        <Link href="/services" className="font-semibold text-[#1c69dd] hover:underline">
                          Browse services
                        </Link>
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
