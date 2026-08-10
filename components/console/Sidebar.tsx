"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  ReceiptText,
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
  GitBranch,
  RotateCcw,
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

type SidebarOrder = {
  groupIds: string[];
  itemHrefsByGroup: Record<string, string[]>;
};

const SIDEBAR_ORDER_KEY = (userId: string | number) => `flyoci:admin-sidebar-order:${userId}`;

function groupDragId(groupId: string) {
  return `group:${groupId}`;
}

function itemDragId(href: string) {
  return `item:${href}`;
}

function parseGroupDragId(id: string | number) {
  const value = String(id);
  return value.startsWith("group:") ? value.slice(6) : null;
}

function parseItemDragId(id: string | number) {
  const value = String(id);
  return value.startsWith("item:") ? value.slice(5) : null;
}

function applyListOrder<T>(items: T[], order: string[] | undefined, getId: (item: T) => string): T[] {
  if (!order?.length) return items;
  const map = new Map(items.map((item) => [getId(item), item]));
  const result: T[] = [];
  for (const id of order) {
    const item = map.get(id);
    if (item) {
      result.push(item);
      map.delete(id);
    }
  }
  for (const item of items) {
    if (map.has(getId(item))) result.push(item);
  }
  return result;
}

function applySidebarOrder(groups: NavGroup[], order: SidebarOrder | null): NavGroup[] {
  if (!order) return groups;
  const orderedGroups = applyListOrder(groups, order.groupIds, (group) => group.id);
  return orderedGroups.map((group) => ({
    ...group,
    items: applyListOrder(group.items, order.itemHrefsByGroup[group.id], (item) => item.href),
  }));
}

function buildSidebarOrder(groups: NavGroup[]): SidebarOrder {
  return {
    groupIds: groups.map((group) => group.id),
    itemHrefsByGroup: Object.fromEntries(groups.map((group) => [group.id, group.items.map((item) => item.href)])),
  };
}

function loadSidebarOrder(userId: string | number | undefined): SidebarOrder | null {
  if (userId == null || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_ORDER_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SidebarOrder;
    if (!Array.isArray(parsed?.groupIds) || typeof parsed?.itemHrefsByGroup !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSidebarOrder(userId: string | number | undefined, order: SidebarOrder) {
  if (userId == null || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_ORDER_KEY(userId), JSON.stringify(order));
  } catch {
    // ignore quota / private mode
  }
}

/** Nested group+item sortables: only collide with matching type. */
const sidebarCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const wantGroups = activeId.startsWith("group:");
  const filtered = args.droppableContainers.filter((container) => {
    const id = String(container.id);
    return wantGroups ? id.startsWith("group:") : id.startsWith("item:");
  });
  return closestCenter({
    ...args,
    droppableContainers: filtered.length ? filtered : args.droppableContainers,
  });
};

function SortableNavGroup({
  id,
  canDrag,
  children,
}: {
  id: string;
  canDrag: boolean;
  children: (opts: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: CSSProperties;
    isDragging: boolean;
    dragHandleProps: Record<string, unknown>;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupDragId(id),
    disabled: !canDrag,
    data: { type: "group", groupId: id },
  });

  return (
    <>
      {children({
        setNodeRef,
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.85 : 1,
          zIndex: isDragging ? 20 : undefined,
        },
        isDragging,
        dragHandleProps: canDrag ? { ...attributes, ...listeners } : {},
      })}
    </>
  );
}

function SortableNavItem({
  href,
  groupId,
  canDrag,
  children,
}: {
  href: string;
  groupId: string;
  canDrag: boolean;
  children: (opts: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: CSSProperties;
    isDragging: boolean;
    dragHandleProps: Record<string, unknown>;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemDragId(href),
    disabled: !canDrag,
    data: { type: "item", groupId, href },
  });

  return (
    <>
      {children({
        setNodeRef,
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.8 : 1,
          zIndex: isDragging ? 30 : undefined,
        },
        isDragging,
        dragHandleProps: canDrag ? { ...attributes, ...listeners } : {},
      })}
    </>
  );
}

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
  const userId = adminUser?.id;

  const [easyFlyOpen, setEasyFlyOpen] = useState(accessScope === "easyfly_only" || pathname?.startsWith("/admin/easyfly"));
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean> | null>(null);
  const [sidebarOrder, setSidebarOrder] = useState<SidebarOrder | null>(null);
  const [orderReady, setOrderReady] = useState(false);

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

  useEffect(() => {
    if (userId == null) {
      setSidebarOrder(null);
      setOrderReady(false);
      return;
    }
    setSidebarOrder(loadSidebarOrder(userId));
    setOrderReady(true);
  }, [userId]);

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

  const defaultNavGroups: NavGroup[] = useMemo(
    () => [
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
          { name: "Case routing", href: "/admin/routing", icon: GitBranch },
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
          { name: "Misc Charges", href: "/admin/misc-charges", icon: ReceiptText },
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
    ],
    [canViewMyCases, dashboardHref, dashboardLabel],
  );

  const canShowItem = useCallback(
    (item: NavItem) => {
      if (accessScope === "easyfly_only") {
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
    },
    [accessScope, canViewMyCases, dashboardHref, modulePermissions, role],
  );

  const orderedNavGroups = useMemo(
    () => applySidebarOrder(defaultNavGroups, orderReady ? sidebarOrder : null),
    [defaultNavGroups, orderReady, sidebarOrder],
  );

  const visibleGroups = useMemo(
    () =>
      orderedNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(canShowItem),
        }))
        .filter((group) => {
          if (accessScope === "easyfly_only") return group.id === "easyfly";
          return group.items.length > 0;
        }),
    [accessScope, canShowItem, orderedNavGroups],
  );

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const canDrag = isDesktop && !collapsed;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = useCallback(
    (next: SidebarOrder) => {
      setSidebarOrder(next);
      saveSidebarOrder(userId, next);
    },
    [userId],
  );

  const resolveGroupIdFromOver = useCallback(
    (overId: string | number, overData: Record<string, unknown> | undefined) => {
      const direct = parseGroupDragId(overId);
      if (direct) return direct;
      if (typeof overData?.groupId === "string") return overData.groupId;
      const itemHref = parseItemDragId(overId);
      if (!itemHref) return null;
      return visibleGroups.find((group) => group.items.some((item) => item.href === itemHref))?.id ?? null;
    },
    [visibleGroups],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canDrag) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeGroupId = parseGroupDragId(active.id);
      const activeItemHref = parseItemDragId(active.id);
      const overItemHref = parseItemDragId(over.id);
      const current = sidebarOrder ?? buildSidebarOrder(defaultNavGroups);

      if (activeGroupId) {
        const targetGroupId = resolveGroupIdFromOver(over.id, over.data.current as Record<string, unknown> | undefined);
        if (!targetGroupId || targetGroupId === activeGroupId) return;

        const visibleIds = visibleGroups.map((group) => group.id);
        const oldIndex = visibleIds.indexOf(activeGroupId);
        const newIndex = visibleIds.indexOf(targetGroupId);
        if (oldIndex < 0 || newIndex < 0) return;

        const nextVisible = arrayMove(visibleIds, oldIndex, newIndex);
        const visibleSet = new Set(visibleIds);
        const baseGroupIds = current.groupIds.length ? current.groupIds : defaultNavGroups.map((g) => g.id);
        const nextGroupIds: string[] = [];
        let vi = 0;
        for (const id of baseGroupIds) {
          if (visibleSet.has(id)) {
            if (vi < nextVisible.length) nextGroupIds.push(nextVisible[vi++]);
          } else {
            nextGroupIds.push(id);
          }
        }
        while (vi < nextVisible.length) nextGroupIds.push(nextVisible[vi++]);
        for (const id of defaultNavGroups.map((g) => g.id)) {
          if (!nextGroupIds.includes(id)) nextGroupIds.push(id);
        }

        persistOrder({
          ...current,
          groupIds: nextGroupIds,
        });
        return;
      }

      if (activeItemHref && overItemHref) {
        const sourceGroup = visibleGroups.find((group) => group.items.some((item) => item.href === activeItemHref));
        const targetGroup = visibleGroups.find((group) => group.items.some((item) => item.href === overItemHref));
        if (!sourceGroup || !targetGroup || sourceGroup.id !== targetGroup.id) return;

        const hrefs = sourceGroup.items.map((item) => item.href);
        const oldIndex = hrefs.indexOf(activeItemHref);
        const newIndex = hrefs.indexOf(overItemHref);
        if (oldIndex < 0 || newIndex < 0) return;

        const nextVisibleHrefs = arrayMove(hrefs, oldIndex, newIndex);
        const previous =
          current.itemHrefsByGroup[sourceGroup.id] ??
          defaultNavGroups.find((g) => g.id === sourceGroup.id)?.items.map((i) => i.href) ??
          [];
        const visibleSet = new Set(hrefs);
        const nextHrefs: string[] = [];
        let vi = 0;
        for (const href of previous) {
          if (visibleSet.has(href)) {
            if (vi < nextVisibleHrefs.length) nextHrefs.push(nextVisibleHrefs[vi++]);
          } else {
            nextHrefs.push(href);
          }
        }
        while (vi < nextVisibleHrefs.length) nextHrefs.push(nextVisibleHrefs[vi++]);
        for (const href of defaultNavGroups.find((g) => g.id === sourceGroup.id)?.items.map((i) => i.href) ?? []) {
          if (!nextHrefs.includes(href)) nextHrefs.push(href);
        }

        persistOrder({
          ...current,
          itemHrefsByGroup: {
            ...current.itemHrefsByGroup,
            [sourceGroup.id]: nextHrefs,
          },
        });
      }
    },
    [canDrag, defaultNavGroups, persistOrder, resolveGroupIdFromOver, sidebarOrder, visibleGroups],
  );

  const resetOrder = useCallback(() => {
    setSidebarOrder(null);
    if (userId != null && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SIDEBAR_ORDER_KEY(userId));
      } catch {
        // ignore
      }
    }
  }, [userId]);

  const hasCustomOrder = Boolean(sidebarOrder);

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
          "fixed inset-y-0 left-0 z-40 h-dvh w-[min(280px,85vw)]",
          mobileOpen ? "translate-x-0 shadow-[8px_0_32px_rgba(15,42,67,0.14)]" : "-translate-x-full",
          // Desktop: in-flow wider sidebar
          "lg:relative lg:z-20 lg:translate-x-0 lg:shadow-none lg:h-dvh",
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
        <DndContext sensors={sensors} collisionDetection={sidebarCollisionDetection} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleGroups.map((group) => groupDragId(group.id))} strategy={verticalListSortingStrategy}>
            {visibleGroups.map((group, groupIndex) => (
              <SortableNavGroup key={group.id} id={group.id} canDrag={canDrag}>
                {({ setNodeRef, style, isDragging, dragHandleProps }) => (
                  <div
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                      groupIndex > 0 && "mt-3",
                      isDragging && "rounded-[12px] bg-white shadow-md ring-1 ring-[#D9E1EA]",
                    )}
                  >
                    {(!collapsed || mobileOpen) && (
                      <div
                        className={cn(
                          "px-2.5 mb-1.5 py-1 rounded-[8px] select-none",
                          canDrag && "cursor-grab active:cursor-grabbing touch-none hover:bg-[#F5F7FA]",
                          collapsed && "lg:hidden",
                        )}
                        title={canDrag ? "Drag section to reorder" : undefined}
                        {...dragHandleProps}
                      >
                        <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#8A9BB0]">
                          {group.label}
                        </p>
                      </div>
                    )}
                    {collapsed && groupIndex > 0 && <div className="mx-2 mb-2 border-t border-[#E5EAF0] hidden lg:block" />}

                    <SortableContext
                      items={group.items.map((item) => itemDragId(item.href))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          if (item.href === "/admin/easyfly") {
                            if (accessScope === "exclude_easyfly") return null;
                            return (
                              <SortableNavItem key="easyfly-dropdown" href={item.href} groupId={group.id} canDrag={canDrag}>
                                {({ setNodeRef: itemRef, style: itemStyle, isDragging: itemDragging, dragHandleProps: itemHandle }) => (
                                  <div
                                    ref={itemRef}
                                    style={itemStyle}
                                    className={cn(
                                      "relative",
                                      itemDragging && "rounded-[10px] bg-white shadow-sm",
                                      canDrag && "cursor-grab active:cursor-grabbing",
                                    )}
                                    title={canDrag ? "Drag to reorder" : undefined}
                                    {...itemHandle}
                                  >
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
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
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
                                )}
                              </SortableNavItem>
                            );
                          }

                          const isActive = isItemActive(item.href);
                          return (
                            <SortableNavItem key={item.href} href={item.href} groupId={group.id} canDrag={canDrag}>
                              {({ setNodeRef: itemRef, style: itemStyle, isDragging: itemDragging, dragHandleProps: itemHandle }) => (
                                <motion.div
                                  ref={itemRef}
                                  style={itemStyle}
                                  whileHover={{ x: collapsed ? 0 : 2 }}
                                  whileTap={{ scale: 0.99 }}
                                  className={cn(
                                    itemDragging && "rounded-[10px] bg-white shadow-sm",
                                    canDrag && "cursor-grab active:cursor-grabbing",
                                  )}
                                  title={canDrag ? "Drag to reorder" : collapsed ? item.name : undefined}
                                  {...itemHandle}
                                >
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
                              )}
                            </SortableNavItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </div>
                )}
              </SortableNavGroup>
            ))}
          </SortableContext>
        </DndContext>
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

      <div className="p-2 border-t border-[0.5px] border-[#D9E1EA] flex flex-col gap-1">
        {hasCustomOrder && (!collapsed || mobileOpen) && (
          <button
            type="button"
            onClick={resetOrder}
            className={cn(
              "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[8px] text-[11px] font-semibold text-[#627D98] hover:bg-[#F5F7FA] hover:text-slate-800 transition-colors",
              collapsed && "lg:hidden",
            )}
            title="Reset sidebar order"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset order</span>
          </button>
        )}
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
