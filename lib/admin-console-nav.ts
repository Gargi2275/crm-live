/** Map admin routes to permission module keys (backend CONSOLE_MODULES). */
export const ADMIN_ROUTE_MODULE_KEY: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/my-cases": "kanban",
  "/admin/workload": "workload",
  "/admin/team-performance": "team_performance",
  "/admin/staff": "staff",
  "/admin/services": "services",
  "/admin/categories": "categories",
  "/admin/origin-countries": "origin_countries",
  "/admin/service-hubs": "hub_countries",
  "/admin/blog": "blog",
  "/admin/homepage": "homepage",
  "/admin/docs": "docs",
  "/admin/roles": "roles",
  "/admin/permissions": "permissions",
  "/admin/kanban": "kanban",
  "/admin/apostille": "kanban",
  "/admin/reports": "reports",
  "/admin/easyfly": "easyfly",
  "/admin/logs": "logs",
  "/admin/notifications": "notifications",
  "/admin/email": "email",
  "/admin/alerts": "alerts",
  "/admin/team": "team",
  "/admin/revenue": "revenue",
  "/admin/billing": "billing",
  "/admin/settings": "settings",
  "/admin/security": "settings",
  "/admin/customers": "dashboard",
};

export function resolveAdminRouteModuleKey(pathname: string): string | null {
  if (ADMIN_ROUTE_MODULE_KEY[pathname]) {
    return ADMIN_ROUTE_MODULE_KEY[pathname];
  }
  const routes = Object.keys(ADMIN_ROUTE_MODULE_KEY).sort((a, b) => b.length - a.length);
  for (const route of routes) {
    if (route !== "/admin" && pathname.startsWith(route)) {
      return ADMIN_ROUTE_MODULE_KEY[route];
    }
  }
  if (pathname.startsWith("/admin/easyfly")) return "easyfly";
  if (pathname === "/admin" || pathname.startsWith("/admin?")) return "dashboard";
  return null;
}

export function canAccessAdminRoute(
  href: string,
  permissions: Record<string, boolean> | null | undefined,
  role?: string | null,
): boolean {
  if ((role || "").toLowerCase() === "admin") return true;
  if (!permissions) return false;
  // Combined Roles & Permissions page — allow if either module is granted.
  if (href === "/admin/roles" || href.startsWith("/admin/roles") || href.startsWith("/admin/permissions")) {
    return Boolean(permissions.roles || permissions.permissions);
  }
  // Combined Services & Categories page — allow if either module is granted.
  if (href === "/admin/services" || href.startsWith("/admin/services") || href.startsWith("/admin/categories")) {
    return Boolean(permissions.services || permissions.categories);
  }
  const moduleKey = resolveAdminRouteModuleKey(href);
  if (!moduleKey) return false;
  return Boolean(permissions[moduleKey]);
}

export function canAccessAdminPathname(
  pathname: string,
  permissions: Record<string, boolean> | null | undefined,
  role?: string | null,
): boolean {
  if ((role || "").toLowerCase() === "admin") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/login") || pathname.startsWith("/admin/reset-password")) {
    return true;
  }
  if (!permissions) return false;
  if (pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions")) {
    return Boolean(permissions.roles || permissions.permissions);
  }
  if (pathname.startsWith("/admin/services") || pathname.startsWith("/admin/categories")) {
    return Boolean(permissions.services || permissions.categories);
  }
  const moduleKey = resolveAdminRouteModuleKey(pathname);
  if (!moduleKey) return false;
  return Boolean(permissions[moduleKey]);
}
