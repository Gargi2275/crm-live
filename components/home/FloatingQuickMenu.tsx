"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  IdCard,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  Plane,
  Stamp,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const QUICK_LINKS = [
  { label: "OCI", href: "/services/new-oci", icon: IdCard, accent: "#1c69dd" },
  { label: "eVisa", href: "/services/indian-evisa", icon: Plane, accent: "#2563eb" },
  { label: "Apostille", href: "/apostille-services", icon: Stamp, accent: "#3b82f6" },
  { label: "About Us", href: "/about", icon: UserRound, accent: "#1558c0" },
  { label: "Contact Us", href: "/contact", icon: MessageCircle, accent: "#1c69dd" },
  { label: "Services", href: "/services", icon: LayoutGrid, accent: "#2563eb" },
] as const;

const CONTACT_EMAIL = "support@flyoci.com";
const CONTACT_ADDRESS =
  "FlyOCI · Online documentation support for UK & US residents of Indian origin.";

export function FloatingQuickMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-5 z-[90] sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mb-4 w-[min(92vw,320px)]"
          >
            {/* 6 quick-link cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group flex flex-col items-center justify-center rounded-2xl border border-[#d6e8ff] bg-white px-2 py-3.5 text-center shadow-[0_8px_24px_rgba(28,105,221,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1c69dd]/35 hover:shadow-[0_12px_32px_rgba(28,105,221,0.18)]"
                  >
                    <div
                      className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#eff6ff] text-[#1c69dd] transition-colors group-hover:bg-[#1c69dd] group-hover:text-white"
                      style={{ boxShadow: `0 0 0 1px ${item.accent}14` }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0d1f3c]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Contact card */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#d6e8ff] bg-white shadow-[0_16px_40px_rgba(28,105,221,0.14)]">
              <div className="border-b border-[#e8f1ff] bg-gradient-to-r from-[#f4f8ff] to-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c69dd] text-white shadow-[0_4px_14px_rgba(28,105,221,0.35)]">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0d1f3c]">
                    Let&apos;s Talk
                  </p>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#627d98]">
                      Email
                    </p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="mt-0.5 block text-sm font-semibold text-[#1c69dd] hover:underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#627d98]">
                      Our Address
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#334e68]">{CONTACT_ADDRESS}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 bg-[#1c69dd] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1558c0]"
              >
                Full contact form
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1c69dd] to-[#1558c0] text-white shadow-[0_10px_32px_rgba(28,105,221,0.45)] ring-4 ring-white/80"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
