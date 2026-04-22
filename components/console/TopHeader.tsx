"use client";

import { Bell, Search, LogOut, User, TrendingUp, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { getAdminAlerts } from "@/lib/admin-auth";
import { adminSearch, type AdminSearchResult } from "@/lib/admin-auth";
import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCallback } from "react";



  function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}


export function TopHeader() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [openAlertCount, setOpenAlertCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string | number; type: string; message: string; timestamp: string }>>([]);
  const { logout, adminUser } = useAdminAuth();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<AdminSearchResult | null>(null);
const [searchLoading, setSearchLoading] = useState(false);
const [searchOpen, setSearchOpen] = useState(false);
const searchRef = useRef<HTMLDivElement | null>(null);
const debouncedQuery = useDebounce(searchQuery, 350);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const roleLabelMap: Record<string, string> = {
    admin: "Admin",
    ops_manager: "Operations Manager",
    case_processor: "Case Processor",
    reviewer: "Reviewer",
    support_agent: "Support Agent",
  };
  const roleLabel = roleLabelMap[String(adminUser?.role || "")] || "Staff";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAlertSummary = async () => {
      try {
        const payload = await getAdminAlerts();
        if (!isMounted) {
          return;
        }
        const unresolvedCount = Number(payload?.summary?.open || 0);
        setOpenAlertCount(unresolvedCount);
        setNotifications(payload?.notifications ?? []);
      } catch {
        if (!isMounted) {
          return;
        }
        setOpenAlertCount(0);
        setNotifications([]);
      }
    };

    void loadAlertSummary();
    const intervalId = window.setInterval(() => {
      void loadAlertSummary();
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

const runSearch = useCallback(async (q: string) => {
  if (q.trim().length < 2) { setSearchResults(null); return; }
  setSearchLoading(true);
  try {
    const results = await adminSearch(q);
    setSearchResults(results);
    setSearchOpen(true);
  } catch {
    setSearchResults(null);
  } finally {
    setSearchLoading(false);
  }
}, []);

useEffect(() => { void runSearch(debouncedQuery); }, [debouncedQuery, runSearch]);

const totalResults = searchResults
  ? (searchResults.cases?.length ?? 0) + (searchResults.customers?.length ?? 0) + (searchResults.leads?.length ?? 0)
  : 0;



  return (
    <header className="bg-white border-b border-[0.5px] border-[#D9E1EA] sticky top-0 z-10">
      <div className="h-16 flex items-center justify-between gap-4 px-6">
      {/* Search Bar */}
      {/* <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#009877]" />
          <input 
            type="text" 
            placeholder="Search cases, customers, or leads..." 
            className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[0.5px] border-[#D9E1EA] rounded-[12px] text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877] transition-all text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div> */}


<div className="flex-1 max-w-lg relative" ref={searchRef}>
  <div className="relative group">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#009877]" />
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(e.target.value.length >= 2); }}
      onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
      placeholder="Search cases, customers, or leads..."
      className="w-full pl-9 pr-8 py-2.5 bg-[#F8FAFC] border border-[0.5px] border-[#D9E1EA] rounded-[12px] text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877] transition-all text-slate-900 placeholder:text-slate-500"
    />
    {searchQuery && (
      <button onClick={() => { setSearchQuery(""); setSearchResults(null); setSearchOpen(false); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>

  <AnimatePresence>
    {searchOpen && (
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[12px] border border-[#D9E1EA] shadow-[0_18px_36px_rgba(15,42,67,0.12)] z-30 overflow-hidden"
      >
        {searchLoading && (
          <div className="px-4 py-4 text-sm text-[#627D98] flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-[#009877] border-t-transparent rounded-full animate-spin" />
            Searching...
          </div>
        )}

        {!searchLoading && searchResults && totalResults === 0 && (
          <p className="px-4 py-4 text-sm text-[#627D98]">No results for <span className="font-medium text-[#102A43]">"{searchQuery}"</span></p>
        )}

        {!searchLoading && searchResults && totalResults > 0 && (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[#F1F5F9]">

            {searchResults.cases?.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-semibold text-[#829AB1] uppercase tracking-wider mb-2">Cases</p>
                {searchResults.cases.map((c) => (
                  <button key={c.id} onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/admin/kanban?applicationId=${c.id}`); }}
                    className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#F5F7FA] flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#33A1FD] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#102A43]">{c.reference_number}</p>
                      <p className="text-xs text-[#627D98]">{c.customer_name} • {c.service_name}</p>
                    </div>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#486581]">{c.application_status}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.customers?.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-semibold text-[#829AB1] uppercase tracking-wider mb-2">Customers</p>
                {searchResults.customers.map((c) => (
                  <button key={c.id} onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/admin/customers/${c.id}`); }}
                    className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#F5F7FA] flex items-center gap-3">
                    <User className="w-4 h-4 text-[#009877] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#102A43]">{c.full_name}</p>
                      <p className="text-xs text-[#627D98]">{c.email ?? c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.leads?.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-semibold text-[#829AB1] uppercase tracking-wider mb-2">Leads</p>
                {searchResults.leads.map((l) => (
                  <button key={l.id} onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/admin/kanban?applicationId=${l.id}`); }}
                    className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#F5F7FA] flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-[#B87333] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#102A43]">{l.reference_number}</p>
                      <p className="text-xs text-[#627D98]">{l.customer_name} • {l.stage}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
</div>


      <div className="flex items-center gap-3">


        {/* Notifications */}
        <div ref={notificationMenuRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 text-slate-600 hover:bg-[#F5F7FA] rounded-full transition-colors"
            onClick={() => {
              setShowNotificationMenu((prev) => !prev);
              setShowProfileMenu(false);
            }}
            aria-label="Open notifications"
            aria-expanded={showNotificationMenu}
          >
            <Bell className="w-5 h-5" />
            {openAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 border-2 border-white rounded-full text-[10px] leading-none font-semibold text-white inline-flex items-center justify-center">
                {openAlertCount > 99 ? "99+" : openAlertCount}
              </span>
            )}
          </motion.button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] rounded-[12px] border border-[#D9E1EA] bg-white shadow-[0_18px_36px_rgba(15,42,67,0.12)] z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
                <p className="text-sm font-semibold text-[#102A43] font-heading">Notifications</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationMenu(false);
                    router.push("/admin/alerts");
                  }}
                  className="text-xs text-[#009877] hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#627D98]">No notifications yet.</p>
                ) : (
                  notifications.slice(0, 8).map((notification) => (
                    <div key={String(notification.id)} className="px-4 py-3 border-b border-[#F1F5F9] last:border-b-0">
                      <p className="text-sm text-[#102A43] leading-snug">{notification.message}</p>
                      <p className="mt-1 text-[11px] text-[#829AB1]">
                        {new Date(notification.timestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          ref={profileMenuRef}
          className="relative pl-2 sm:pl-3 border-l border-[0.5px] border-[#D9E1EA]"
        >
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-[12px] px-1.5 py-1 hover:bg-[#F5F7FA] transition-colors"
            aria-label="Profile menu"
          >
            <div className="w-9 h-9 bg-[#009877]/12 text-[#006F57] rounded-full flex items-center justify-center border border-[0.5px] border-[#009877]/30">
              <User className="w-4.5 h-4.5" />
            </div>
          </button>

         {showProfileMenu && (
  <div className="absolute right-0 mt-2 w-[220px] rounded-[12px] border border-[#D9E1EA] bg-white shadow-[0_18px_36px_rgba(15,42,67,0.12)] p-3 z-20">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-[#009877]/12 text-[#006F57] rounded-full flex items-center justify-center border border-[#009877]/30 shrink-0 text-sm font-bold font-heading">
        {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? "S"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#102A43] font-heading truncate">
          {adminUser?.full_name || adminUser?.username || "Staff"}
        </p>
        <p className="text-xs text-[#627D98] truncate">{roleLabel}</p>
      </div>
    </div>
    <div className="border-t border-[#E5EAF0] pt-2">
      <button
        onClick={() => {
          setShowProfileMenu(false);
          logout();
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm text-[#334E68] hover:bg-[#F5F7FA]"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  </div>
)}
        </div>
        </div>
      </div>
    </header>
  );
}
