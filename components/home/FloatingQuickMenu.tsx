"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookUser,
  IdCard,
  LayoutGrid,
  Mail,
  MessageCircle,
  Phone,
  Plane,
  Route,
  Stamp,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL_HREF,
  SUPPORT_WHATSAPP_HREF,
} from "@/lib/contact";
import { getPublicSupportEmail } from "@/lib/api";

/** Six shortcuts — no “all services” or contact form as an icon. */
const QUICK_LINKS = [
  { label: "OCI", href: "/services/new-oci", icon: IdCard, accent: "#1c69dd" },
  { label: "eVisa", href: "/services/indian-evisa", icon: Plane, accent: "#2563eb" },
  { label: "Apostille", href: "/apostille-services", icon: Stamp, accent: "#3b82f6" },
  { label: "Passport", href: "/services/passport-renewal", icon: BookUser, accent: "#1558c0" },
  { label: "How it works", href: "/how-it-works", icon: Route, accent: "#0f7ee8" },
  { label: "About", href: "/about", icon: UserRound, accent: "#1c69dd" },
] as const;

export function FloatingQuickMenu() {
  const [open, setOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);

  useEffect(() => {
    let cancelled = false;
    getPublicSupportEmail()
      .then((email) => {
        if (!cancelled && email) setSupportEmail(email);
      })
      .catch(() => {
        if (!cancelled) setSupportEmail(SUPPORT_EMAIL);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-5 z-[90] flex flex-col items-end sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="quick-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mb-3 w-[min(92vw,320px)]"
          >
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_LINKS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group flex h-full flex-col items-center justify-center rounded-2xl border border-[#d6e8ff] bg-white px-2 py-3.5 text-center shadow-[0_8px_24px_rgba(28,105,221,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1c69dd]/35 hover:shadow-[0_12px_32px_rgba(28,105,221,0.18)]"
                    >
                      <div
                        className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#eff6ff] text-[#1c69dd] transition-colors group-hover:bg-[#1c69dd] group-hover:text-white"
                        style={{ boxShadow: `0 0 0 1px ${item.accent}14` }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#0d1f3c]">
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Contact strip below icons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.2 }}
              className="mt-3 overflow-hidden rounded-2xl border border-[#d6e8ff] bg-white shadow-[0_16px_40px_rgba(28,105,221,0.14)]"
            >
              <div className="border-b border-[#e8f1ff] bg-gradient-to-r from-[#f4f8ff] to-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c69dd] text-white shadow-[0_4px_14px_rgba(28,105,221,0.35)]">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0d1f3c]">
                    Let&apos;s talk
                  </p>
                </div>
              </div>

              <div className="space-y-1 px-2 py-2">
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[#f4f8ff]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#829ab1]">
                      Email
                    </span>
                    <span className="block truncate text-sm font-semibold text-[#1c69dd]">
                      {supportEmail}
                    </span>
                  </span>
                </a>

                <a
                  href={SUPPORT_PHONE_TEL_HREF}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[#f4f8ff]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#829ab1]">
                      Phone
                    </span>
                    <span className="block text-sm font-semibold text-[#1c69dd]">
                      {SUPPORT_PHONE_DISPLAY}
                    </span>
                  </span>
                </a>

                <a
                  href={SUPPORT_WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-[#f4f8ff]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#829ab1]">
                      WhatsApp
                    </span>
                    <span className="block text-sm font-semibold text-[#334e68]">
                      Message us anytime
                    </span>
                  </span>
                </a>
              </div>

              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 bg-[#1c69dd] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1558c0]"
              >
                Full contact form
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={open ? "Close quick links" : "Open quick links"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1c69dd] to-[#1558c0] text-white shadow-[0_10px_32px_rgba(28,105,221,0.45)] ring-4 ring-white/80"
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
              <LayoutGrid className="h-6 w-6" strokeWidth={2.25} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
