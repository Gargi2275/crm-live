"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, type ComponentType } from "react";
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
  Activity,
  UserCog,
  ClipboardList,
  FolderArchive,
  Layers,
  Newspaper,
  Globe2,
  MapPin,
  LayoutTemplate,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}) {
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

  const ACTION_ROLES = new Set(["ops_manager", "reviewer", "case_processor", "support_agent"]);
  const isActionDashboardRole = ACTION_ROLES.has(role ?? "");

  const easyFlySubItems = [
    ...(isActionDashboardRole
      ? [{ name: "Action Dashboard", href: "/admin/easyfly/action", icon: ClipboardList }]
      : []),
    { name: "Bookings", href: "/admin/easyfly", icon: List },
    { name: "Schedule Changes", href: "/admin/easyfly/schedule", icon: CalendarClock },
    { name: "Travel", href: "/admin/easyfly/travel", icon: Plane },
    ...(role === "admin" ||
    role === "ops_manager" ||
    role === "case_processor" ||
    role === "support_agent" ||
    role === "reviewer"
      ? [{ name: "Revenue", href: "/admin/easyfly/revenue", icon: TrendingUp }]
      : []),
  ];

  const canViewMyCases = accessScope !== "easyfly_only" && hasMyActiveCasesAccess(role);
  const dashboardHref = getConsoleHomePath(accessScope);
  const dashboardLabel = getConsoleDashboardLabel(accessScope);

  const navGroups: NavGroup[] = [
    {
      id: "work",
      label: "Work",
      items: [
        { name: dashboardLabel, href: dashboardHref, icon: BarChart3 },
        ...(canViewMyCases ? [{ name: "My Cases", href: "/admin/my-cases", icon: ClipboardList }] : []),
        { name: "Pipeline", href: "/admin/kanban", icon: KanbanSquare },
        { name: "Workload", href: "/admin/workload", icon: UserCog },
      ],
    },
    {
      id: "team",
      label: "Team",
      items: [
        { name: "Performance", href: "/admin/team-performance", icon: Activity },
        { name: "Staff", href: "/admin/staff", icon: Briefcase },
        { name: "Services & Categories", href: "/admin/services", icon: Layers },
        { name: "Origin countries", href: "/admin/origin-countries", icon: Globe2 },
        { name: "Service hubs", href: "/admin/service-hubs", icon: MapPin },
        { name: "Blog", href: "/admin/blog", icon: Newspaper },
        { name: "Homepage", href: "/admin/homepage", icon: LayoutTemplate },
        { name: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
        { name: "Team overview", href: "/admin/team", icon: Users },
      ],
    },
    {
      id: "easyfly",
      label: "EasyFly",
      items: [{ name: "EasyFly", href: "/admin/easyfly", icon: Plane }],
    },
    {
      id: "insights",
      label: "Insights",
      items: [
        { name: "Reports", href: "/admin/reports", icon: PieChart },
        { name: "Revenue", href: "/admin/revenue", icon: Landmark },
        { name: "Billing", href: "/admin/billing", icon: CreditCard },
        { name: "Alerts", href: "/admin/alerts", icon: TriangleAlert },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [
        { name: "Logs", href: "/admin/logs", icon: Logs },
        { name: "Documents", href: "/admin/docs", icon: FolderArchive },
        { name: "Notifications", href: "/admin/notifications", icon: Bell },
        { name: "Mail password", href: "/admin/email", icon: KeyRound },
        { name: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  const canShowItem = (item: NavItem) => {
    if (accessScope === "easyfly_only") {
      // EasyFly-only users only see the EasyFly section (dropdown + sub-routes).
      return item.href === "/admin/easyfly" || item.href.startsWith("/admin/easyfly/");
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
    if (item.href === "/admin/easyfly" && hasEasyFlyConsoleAccess(accessScope)) return true;
    return canAccessAdminRoute(item.href, modulePermissions, role);
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(canShowItem),
    }))
    .filter((group) => {
      if (accessScope === "easyfly_only") return group.id === "easyfly";
      return group.items.length > 0;
    });

  const linkClass = (isActive: boolean) =>
    cn(
      "relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-[10px] transition-colors group font-body text-[15px]",
      isActive
        ? "bg-[#009877]/12 text-[#006F57] font-semibold border border-[0.5px] border-[#009877]/40"
        : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900 border border-transparent",
      collapsed && "lg:justify-center lg:px-0",
    );

  const isItemActive = (href: string) =>
    pathname === href ||
    (href !== dashboardHref && href !== "/admin" && pathname?.startsWith(href)) ||
    (href === dashboardHref && (pathname === "/admin" || pathname === "/admin/easyfly"));

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-[#0F172A]/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          "bg-white border-r border-[0.5px] border-[#D9E1EA] flex flex-col transition-all duration-300",
          // Mobile: off-canvas drawer
          "fixed inset-y-0 left-0 z-40 h-screen w-[280px]",
          mobileOpen ? "translate-x-0 shadow-[8px_0_32px_rgba(15,42,67,0.14)]" : "-translate-x-full",
          // Desktop: in-flow wider sidebar
          "lg:relative lg:z-20 lg:translate-x-0 lg:shadow-none lg:h-screen",
          collapsed ? "lg:w-[72px]" : "lg:w-[268px]",
        )}
      >
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-[0.5px] border-[#D9E1EA]">
        <Link
          href="/"
          className={cn("flex items-center gap-2 min-w-0", collapsed && "lg:justify-center lg:w-full")}
          onClick={() => setMobileOpen(false)}
        >
          <Image
            src="/logo.png"
            alt="FlyOCI Logo"
            width={120}
            height={40}
            className={cn("object-contain", collapsed ? "lg:h-8 lg:w-8 h-9 w-auto" : "h-9 w-auto")}
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto px-2.5 scrollbar-none">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id} className={cn(groupIndex > 0 && "mt-3")}>
            {(!collapsed || mobileOpen) && (
              <p className={cn(
                "px-2.5 mb-1.5 text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#8A9BB0]",
                collapsed && "lg:hidden",
              )}>
                {group.label}
              </p>
            )}
            {collapsed && groupIndex > 0 && <div className="mx-2 mb-2 border-t border-[#E5EAF0] hidden lg:block" />}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.href === "/admin/easyfly") {
                  if (accessScope === "exclude_easyfly") return null;
                  return (
                    <div key="easyfly-dropdown" className="relative">
                      <motion.div
                        whileHover={{ x: collapsed ? 0 : 2 }}
                        whileTap={{ scale: 0.99 }}
                        className={linkClass(Boolean(pathname?.startsWith("/admin/easyfly")))}
                        ref={triggerRef}
                        onClick={() =>
                          setEasyFlyOpen((v) => {
                            const next = !v;
                            if (collapsed && next && triggerRef.current && window.matchMedia("(min-width: 1024px)").matches) {
                              const r = triggerRef.current.getBoundingClientRect();
                              setPortalPos({ left: Math.round(r.right + 8), top: Math.round(r.top) });
                            }
                            return next;
                          })
                        }
                        title={collapsed ? item.name : undefined}
                      >
                        <Plane
                          className={cn(
                            "w-[18px] h-[18px] shrink-0 transition-transform duration-300",
                            pathname?.startsWith("/admin/easyfly")
                              ? "text-[#009877]"
                              : "text-slate-500 group-hover:text-slate-800",
                          )}
                        />
                        <span className={cn("truncate", collapsed && "lg:hidden")}>EasyFly</span>
                      </motion.div>
                      <AnimatePresence>
                        {easyFlyOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn("overflow-hidden", collapsed && "lg:hidden")}
                          >
                            <div className="ml-6 border-l border-[#D9E1EA] pl-2.5 py-1 flex flex-col gap-0.5">
                              {easyFlySubItems.map((sub) => (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={cn(
                                    "flex items-center gap-2 px-2 py-2 rounded-[8px] transition-colors font-body text-sm",
                                    pathname === sub.href || pathname?.startsWith(sub.href)
                                      ? "bg-[#009877]/10 text-[#006F57] font-semibold"
                                      : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900",
                                  )}
                                >
                                  <sub.icon className="w-3.5 h-3.5 shrink-0" />
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

                const isActive = isItemActive(item.href);
                return (
                  <motion.div key={item.href} whileHover={{ x: collapsed ? 0 : 2 }} whileTap={{ scale: 0.99 }}>
                    <Link
                      href={item.href}
                      className={linkClass(isActive)}
                      title={collapsed ? item.name : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon
                        className={cn(
                          "w-[18px] h-[18px] shrink-0 transition-transform duration-300",
                          isActive ? "text-[#009877]" : "text-slate-500 group-hover:text-slate-800",
                        )}
                      />
                      <span className={cn("truncate", collapsed && "lg:hidden")}>{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {portalEl &&
        collapsed &&
        easyFlyOpen &&
        portalPos &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", left: portalPos.left, top: portalPos.top }}
              className="z-50 bg-white border border-[#D9E1EA] rounded-[12px] shadow-lg py-1 min-w-[180px] hidden lg:block"
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
                      : "text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900",
                  )}
                >
                  <sub.icon className="w-4 h-4 shrink-0" />
                  <span>{sub.name}</span>
                </Link>
              ))}
            </motion.div>
          </AnimatePresence>,
          portalEl,
        )}

      <div className="p-2 border-t border-[0.5px] border-[#D9E1EA] flex justify-center">
        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-2 rounded-[10px] text-slate-500 hover:bg-[#F5F7FA] hover:text-slate-800 transition-colors w-full justify-center"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </motion.button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-[10px] text-slate-500 hover:bg-[#F5F7FA] hover:text-slate-800 transition-colors w-full flex justify-center text-sm font-semibold"
        >
          Close menu
        </button>
      </div>
    </aside>
    </>
  );
}
