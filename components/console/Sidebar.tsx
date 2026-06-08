"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  getAdminMyPermissions,
  getConsoleDashboardLabel,
  getConsoleHomePath,
  hasEasyFlyConsoleAccess,
  hasFlyOciConsoleAccess,
  hasMyActiveCasesAccess,
} from "@/lib/admin-auth";
import { canAccessAdminRoute } from "@/lib/admin-console-nav";
import {
  BarChart3,
  Briefcase,
  Users,
  KanbanSquare,
  PieChart,
  TriangleAlert,
  Landmark,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plane,
  List,
  CalendarClock,
  TrendingUp,
  ShieldCheck,
  KeyRound,
  Logs,
  Bell,
  Mail,
  Activity,
  UserCog,
  ClipboardList,
} from "lucide-react";

const STAFF_CONSOLE_ROLES = new Set(["case_processor", "reviewer", "support_agent"]);

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const { adminUser } = useAdminAuth();

  const role = adminUser?.role;
  const accessScope = adminUser?.access_scope ?? "all";

  const [easyFlyOpen, setEasyFlyOpen] = useState(accessScope === "easyfly_only" || pathname?.startsWith("/admin/easyfly"));
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!adminUser?.id) return;
    void getAdminMyPermissions()
      .then((data) => setModulePermissions(data.permissions || {}))
      .catch(() => setModulePermissions(null));
  }, [adminUser?.id, adminUser?.role]);

  useEffect(() => {
    setEasyFlyOpen(accessScope === "easyfly_only" || Boolean(pathname?.startsWith("/admin/easyfly")));
  }, [accessScope, pathname]);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  const easyFlySubItems = [
    { name: "Bookings", href: "/admin/easyfly", icon: List },
    { name: "Schedule Changes", href: "/admin/easyfly/schedule", icon: CalendarClock },
    { name: "Travel", href: "/admin/easyfly/travel", icon: Plane },
    ...(role === "admin" ? [{ name: "Revenue", href: "/admin/easyfly/revenue", icon: TrendingUp }] : []),
  ];

  const isStaffConsoleRole = STAFF_CONSOLE_ROLES.has(role || "");
  const canViewMyCases = hasMyActiveCasesAccess(role);
  const dashboardHref = getConsoleHomePath(accessScope);
  const dashboardLabel = getConsoleDashboardLabel(accessScope);

  const baseMenuItems = [
    { name: dashboardLabel, href: dashboardHref, icon: BarChart3 },
    ...(canViewMyCases ? [{ name: "My Active Cases", href: "/admin/my-cases", icon: ClipboardList }] : []),
    { name: "Workload", href: "/admin/workload", icon: UserCog },
    { name: "Team Performance", href: "/admin/team-performance", icon: Activity },
    { name: "Staff Management", href: "/admin/staff", icon: Briefcase },
    { name: "Roles", href: "/admin/roles", icon: ShieldCheck },
    { name: "Permissions", href: "/admin/permissions", icon: KeyRound },
    { name: "Kanban Pipeline", href: "/admin/kanban", icon: KanbanSquare },
    { name: "Reports", href: "/admin/reports", icon: PieChart },
    { name: "EasyFly Bookings", href: "/admin/easyfly", icon: Plane },
    { name: "Logs Module", href: "/admin/logs", icon: Logs },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Email Module", href: "/admin/email", icon: Mail },
    { name: "NDR / SLA Alerts", href: "/admin/alerts", icon: TriangleAlert },
    { name: "Team Management", href: "/admin/team", icon: Users },
    { name: "Remittance / Revenue", href: "/admin/revenue", icon: Landmark },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    // EasyFly removed from here
  ];

  const menuItems = baseMenuItems.filter((item) => {
    if (accessScope === "easyfly_only") {
      if (item.name === "EasyFly Bookings") return false;
      return item.href === dashboardHref || item.href.startsWith("/admin/easyfly");
    }

    if (!hasEasyFlyConsoleAccess(accessScope) && item.href.startsWith("/admin/easyfly")) {
      return false;
    }

    if (!hasFlyOciConsoleAccess(accessScope) && (item.href === "/admin" || item.href.startsWith("/admin/my-cases"))) {
      return false;
    }

    if ((role || "").toLowerCase() === "admin") return true;
    if (item.href === dashboardHref) return true;
    if (!modulePermissions) {
      return item.href === dashboardHref || (canViewMyCases && item.href === "/admin/my-cases");
    }
    if (item.href === "/admin/my-cases") {
      return canViewMyCases && canAccessAdminRoute(item.href, modulePermissions, role);
    }
    return canAccessAdminRoute(item.href, modulePermissions, role);
  });

  return (
    <aside 
      className={cn(
        "bg-white border-r border-[0.5px] border-[#D9E1EA] h-screen sticky top-0 flex flex-col transition-all duration-300 z-20",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[0.5px] border-[#D9E1EA]">
        <Link href="/" className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <Image
            src="/logo.png"
            alt="FlyOCI Logo"
            width={120}
            height={40}
            className={cn("object-contain", collapsed ? "h-8 w-8" : "h-10 w-auto")}
            priority
          />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1 scrollbar-none">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== dashboardHref && item.href !== "/admin" && pathname?.startsWith(item.href)) ||
            (item.href === dashboardHref && (pathname === "/admin" || pathname === "/admin/easyfly"));
          // EasyFly dropdown logic
          if (item.href === "/admin/easyfly") {
            if (accessScope === "exclude_easyfly") return null;
            return (
              <div key="easyfly-dropdown" className="relative">
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors group font-body cursor-pointer",
                    (pathname?.startsWith("/admin/easyfly"))
                      ? "bg-[#009877]/12 text-[#006F57] font-semibold border border-[0.5px] border-[#009877]/40 shadow-[0_8px_22px_rgba(0,152,119,0.08)]"
                      : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900 border border-transparent",
                    collapsed && "justify-center px-0"
                  )}
                  ref={triggerRef}
                  onClick={() => setEasyFlyOpen((v) => {
                    const next = !v;
                    if (collapsed && next && triggerRef.current) {
                      const r = triggerRef.current.getBoundingClientRect();
                      setPortalPos({ left: Math.round(r.right + 8), top: Math.round(r.top) });
                    }
                    return next;
                  })}
                  title={collapsed ? item.name : undefined}
                >
                  <Plane
                    className={cn(
                      "w-5 h-5 shrink-0 transition-transform duration-300",
                      pathname?.startsWith("/admin/easyfly") ? "text-[#009877]" : "text-slate-500 group-hover:text-slate-800 group-hover:scale-105",
                    )}
                  />
                  {!collapsed && <span className="truncate">EasyFly</span>}

                </motion.div>
                {/* Dropdown */}
                <AnimatePresence>
                  {/* COLLAPSED: floating popover to the right */}
                  {/** Collapsed floating popover rendered via portal below */}

                  {/* EXPANDED: inline dropdown (existing behavior) */}
                  {!collapsed && easyFlyOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-7 border-l border-[#D9E1EA] pl-3 py-1 flex flex-col gap-1">
                        {easyFlySubItems.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2 px-2 py-2 rounded-[8px] transition-colors font-body text-sm",
                              pathname === sub.href || pathname?.startsWith(sub.href)
                                ? "bg-[#009877]/10 text-[#006F57] font-semibold"
                                : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900"
                            )}
                          >
                            <sub.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }
          // Default nav item
          return (
            <motion.div key={item.href} whileHover={{ x: collapsed ? 0 : 2 }} whileTap={{ scale: 0.99 }}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors group font-body",
                  isActive
                    ? "bg-[#009877]/12 text-[#006F57] font-semibold border border-[0.5px] border-[#009877]/40 shadow-[0_8px_22px_rgba(0,152,119,0.08)]"
                    : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900 border border-transparent",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-transform duration-300",
                    isActive ? "text-[#009877]" : "text-slate-500 group-hover:text-slate-800 group-hover:scale-105",
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Portal popover for collapsed EasyFly */}
      {portalEl && collapsed && easyFlyOpen && portalPos && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            style={{ position: "fixed", left: portalPos.left, top: portalPos.top }}
            className="z-50 bg-white border border-[#D9E1EA] rounded-[12px] shadow-lg py-1 min-w-[180px]"
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#D9E1EA] mb-1">
              EasyFly
            </div>
            {easyFlySubItems.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={() => setEasyFlyOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 transition-colors font-body text-sm mx-1 rounded-[8px]",
                  pathname === sub.href || pathname?.startsWith(sub.href)
                    ? "bg-[#009877]/10 text-[#006F57] font-semibold"
                    : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900"
                )}
              >
                <sub.icon className="w-4 h-4 shrink-0" />
                <span>{sub.name}</span>
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>,
        portalEl
      )}

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[0.5px] border-[#D9E1EA] flex justify-center">
        <motion.button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-[10px] text-slate-500 hover:bg-[#F5F7FA] hover:text-slate-800 transition-colors w-full flex justify-center"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </motion.button>
      </div>
    </aside>
  );
}
