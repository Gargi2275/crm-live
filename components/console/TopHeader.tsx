"use client";

import {
  Bell,
  Filter,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { usePathname, useRouter } from "next/navigation";
import { getAdminAlerts } from "@/lib/admin-auth";
import {
  titleForAdminPath,
  useAdminPageChrome,
} from "@/components/console/AdminPageChromeContext";

export function TopHeader({
  mobileOpen = false,
  onToggleMobileNav,
}: {
  mobileOpen?: boolean;
  onToggleMobileNav?: () => void;
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openAlertCount, setOpenAlertCount] = useState(0);
  const [notifications, setNotifications] = useState<import("@/lib/admin-auth").AdminNotification[]>([]);
  const { logout, adminUser } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { chrome, chromeRef } = useAdminPageChrome();

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  const roleLabelMap: Record<string, string> = {
    admin: "Admin",
    ops_manager: "Operations Manager",
    case_processor: "Case Processor",
    reviewer: "Reviewer",
    support_agent: "Support Agent",
  };
  const roleLabel = roleLabelMap[String(adminUser?.role || "")] || "Staff";

  const pageTitle = chrome?.title || titleForAdminPath(pathname || "/admin");
  const PageIcon = chrome?.icon;
  const hasFilters = Boolean(chrome?.filtersContent);
  const hasSearch = Boolean(chrome?.search);
  const hasActions = Boolean(chrome?.actions);
  const activeFilterCount = chrome?.activeFilterCount ?? 0;

  const loadAlertSummary = useCallback(async (markRead = false) => {
    try {
      const payload = await getAdminAlerts(markRead);
      const notificationsData = payload?.notifications ?? [];
      setNotifications(notificationsData);

      const unreadFromSummary = payload?.summary?.unread;
      if (typeof unreadFromSummary === "number") {
        setOpenAlertCount(unreadFromSummary);
      } else {
        const unreadCount = notificationsData.filter((n) => !n.is_read).length;
        setOpenAlertCount(unreadCount);
      }
    } catch {
      setOpenAlertCount(0);
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    setFiltersOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hasFilters) setFiltersOpen(false);
  }, [hasFilters]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    void loadAlertSummary();
    const intervalId = window.setInterval(() => {
      void loadAlertSummary();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [adminUser?.role, loadAlertSummary]);

  const openNotification = (notification: import("@/lib/admin-auth").AdminNotification) => {
    setShowNotificationMenu(false);
    const applicationId = notification.application_id;
    const isStaffRole = ["case_processor", "reviewer", "support_agent"].includes(adminUser?.role || "");
    if (applicationId && isStaffRole) {
      router.push(`/admin/my-cases?applicationId=${encodeURIComponent(String(applicationId))}`);
      return;
    }
    if (applicationId) {
      router.push(`/admin/kanban?applicationId=${encodeURIComponent(String(applicationId))}`);
      return;
    }
    if (["admin", "ops_manager"].includes(adminUser?.role || "")) {
      router.push("/admin/alerts");
    }
  };

  return (
    <header className="bg-white border-b border-[#D9E1EA] sticky top-0 z-20 shadow-[0_1px_0_rgba(15,42,67,0.03)]">
      <div className="min-h-[3.75rem] flex items-center gap-2.5 md:gap-3.5 px-3 md:px-5 py-2.5 sm:py-0">
        {onToggleMobileNav ? (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="lg:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA]"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        ) : null}

        {/* Page identity — shrinks when search is present */}
        <div
          className={`min-w-0 shrink-0 ${
            hasSearch ? "max-w-[36%] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[300px]" : "max-w-[55%] sm:max-w-[300px] md:max-w-[360px]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {PageIcon ? (
              <span className="hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#009877]/10 text-[#006F57]">
                <PageIcon className="h-[18px] w-[18px]" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-[17px] md:text-lg font-heading font-semibold text-[#102A43] leading-tight">
                {pageTitle}
              </h1>
              {chrome?.subtitle ? (
                <p className="hidden xl:block truncate text-xs text-[#829AB1] leading-tight mt-0.5">
                  {chrome.subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Search + Filters — primary focus of the bar */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 sm:gap-2.5">
          {hasSearch ? (
            <div className="relative w-full max-w-lg group">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9BB0] group-focus-within:text-[#009877]" />
              <input
                type="search"
                value={chrome?.search?.value ?? ""}
                onChange={(e) => chromeRef.current?.search?.onChange(e.target.value)}
                placeholder={chrome?.search?.placeholder || "Search…"}
                className="w-full rounded-[10px] border border-[#D9E1EA] bg-[#F8FAFC] py-2 sm:py-2.5 pl-9 sm:pl-10 pr-9 text-[15px] text-[#102A43] placeholder:text-[#8A9BB0] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877] transition-all"
              />
              {chrome?.search?.value ? (
                <button
                  type="button"
                  onClick={() => chromeRef.current?.search?.onChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9BB0] hover:text-[#486581]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : (
            <div className="hidden md:block flex-1" />
          )}

          {hasFilters ? (
            <div className="relative shrink-0" ref={filtersRef}>
              <button
                type="button"
                onClick={() => {
                  setFiltersOpen((v) => !v);
                  setShowNotificationMenu(false);
                  setShowProfileMenu(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 sm:px-3 py-2 sm:py-2.5 text-[15px] font-semibold transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-[#009877] bg-[#E6F7F2] text-[#006F57]"
                    : "border-[#D9E1EA] bg-white text-[#486581] hover:bg-[#F5F7FA]"
                }`}
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
                aria-label="Open filters"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 ? (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#009877] text-[11px] font-bold text-white inline-flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              <AnimatePresence>
                {filtersOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),420px)] rounded-[14px] border border-[#D9E1EA] bg-white shadow-[0_20px_40px_rgba(15,42,67,0.14)] z-40 overflow-hidden"
                    role="dialog"
                    aria-label="Page filters"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#E5EAF0] px-4 py-3">
                      <p className="text-base font-heading font-semibold text-[#102A43]">Filters</p>
                      <div className="flex items-center gap-2">
                        {activeFilterCount > 0 && chrome?.onClearFilters ? (
                          <button
                            type="button"
                            onClick={() => chromeRef.current?.onClearFilters?.()}
                            className="text-sm font-semibold text-[#627D98] hover:text-[#B42318]"
                          >
                            Clear all
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setFiltersOpen(false)}
                          className="rounded-full p-1 text-[#829AB1] hover:bg-[#F5F7FA] hover:text-[#486581]"
                          aria-label="Close filters"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[min(70vh,480px)] overflow-y-auto p-4 space-y-3.5 text-[15px]">
                      {chrome?.filtersContent}
                    </div>
                    {(chromeRef.current ?? chrome)?.meta ? (
                      <div className="border-t border-[#E5EAF0] px-4 py-2.5 text-sm text-[#627D98]">
                        {(chromeRef.current ?? chrome)?.meta}
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        {/* Actions + notifications + profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {hasActions ? (
            <div className="hidden md:flex items-center gap-1.5 max-w-[280px] lg:max-w-none overflow-hidden">
              {chrome?.actions}
            </div>
          ) : null}

          <div ref={notificationMenuRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-slate-600 hover:bg-[#F5F7FA] rounded-full transition-colors"
              onClick={() => {
                setShowNotificationMenu((prev) => {
                  const next = !prev;
                  if (next) void loadAlertSummary(true);
                  return next;
                });
                setShowProfileMenu(false);
                setFiltersOpen(false);
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
              <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-1.5rem))] rounded-[12px] border border-[#D9E1EA] bg-white shadow-[0_18px_36px_rgba(15,42,67,0.12)] z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
                  <p className="text-base font-semibold text-[#102A43] font-heading">Notifications</p>
                  {["admin", "ops_manager"].includes(adminUser?.role || "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotificationMenu(false);
                        router.push("/admin/alerts");
                      }}
                      className="text-sm text-[#009877] hover:underline"
                    >
                      View all
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-[15px] text-[#627D98]">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 8).map((notification) => (
                      <button
                        key={String(notification.id)}
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="w-full text-left px-4 py-3 border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <p className="text-[15px] text-[#102A43] leading-snug">{notification.message}</p>
                        <p className="mt-1 text-xs text-[#829AB1]">
                          {notification.type_label ? `${notification.type_label} · ` : ""}
                          {new Date(notification.timestamp).toLocaleString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} className="relative pl-1 sm:pl-2 border-l border-[#D9E1EA]">
            <button
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setShowNotificationMenu(false);
                setFiltersOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-[12px] px-1 py-1 hover:bg-[#F5F7FA] transition-colors"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#009877]/12 text-[#006F57] rounded-full flex items-center justify-center border border-[#009877]/30">
                <User className="w-4 h-4" />
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-[220px] rounded-[12px] border border-[#D9E1EA] bg-white shadow-[0_18px_36px_rgba(15,42,67,0.12)] p-3 z-30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#009877]/12 text-[#006F57] rounded-full flex items-center justify-center border border-[#009877]/30 shrink-0 text-sm font-bold font-heading">
                    {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#102A43] font-heading truncate">
                      {adminUser?.full_name || adminUser?.username || "Staff"}
                    </p>
                    <p className="text-sm text-[#627D98] truncate">{roleLabel}</p>
                  </div>
                </div>
                <div className="border-t border-[#E5EAF0] pt-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#D9E1EA] px-3 py-2.5 text-[15px] text-[#334E68] hover:bg-[#F5F7FA]"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / tablet actions — only when needed, compact scroll row */}
      {hasActions ? (
        <div className="md:hidden flex items-center gap-2 px-3 pb-2.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chrome?.actions}
        </div>
      ) : null}
    </header>
  );
}
