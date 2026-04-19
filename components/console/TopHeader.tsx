"use client";

import { Bell, Search, LogOut, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { getAdminAlerts } from "@/lib/admin-auth";

export function TopHeader() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [openAlertCount, setOpenAlertCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string | number; type: string; message: string; timestamp: string }>>([]);
  const { logout, adminUser } = useAdminAuth();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <header className="bg-white border-b border-[0.5px] border-[#D9E1EA] sticky top-0 z-10">
      <div className="h-16 flex items-center justify-between gap-4 px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#009877]" />
          <input 
            type="text" 
            placeholder="Search cases, customers, or leads..." 
            className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[0.5px] border-[#D9E1EA] rounded-[12px] text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877] transition-all text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">

        <select
          value={roleLabel}
          disabled
          className="hidden md:block bg-white border border-[0.5px] border-[#D9E1EA] text-sm rounded-[12px] px-3 py-2 text-slate-900 font-body"
        >
          <option value={roleLabel}>{roleLabel}</option>
        </select>

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
              <p className="text-sm font-semibold text-[#102A43] font-heading">Admin Console Session</p>
              <p className="text-xs text-[#627D98]">Authenticated user</p>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm text-[#334E68] hover:bg-[#F5F7FA]"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
