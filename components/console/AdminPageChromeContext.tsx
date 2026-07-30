"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

export type AdminPageChromeSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type AdminPageChromeConfig = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  search?: AdminPageChromeSearch;
  /** Floating filter panel body (selects, date ranges, etc.) */
  filtersContent?: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  /** Right-side action buttons (Refresh, New, etc.) */
  actions?: ReactNode;
  /** Optional meta text shown near filters (e.g. "106 services") */
  meta?: ReactNode;
  /**
   * Bump when filter/action UI must re-render (select values, loading, counts).
   * Prefer a string built from page filter state.
   */
  syncKey?: string;
};

type AdminPageChromeContextValue = {
  chrome: AdminPageChromeConfig | null;
  /** Always-current config (for callbacks / panel content without stale closures) */
  chromeRef: React.MutableRefObject<AdminPageChromeConfig | null>;
  setChrome: (next: AdminPageChromeConfig | null, ownerId?: number) => void;
  claimChromeOwner: () => number;
};

const AdminPageChromeContext = createContext<AdminPageChromeContextValue | null>(null);

function chromeSignature(config: AdminPageChromeConfig | null): string {
  if (!config) return "";
  return [
    config.title,
    config.subtitle ?? "",
    config.icon?.displayName ?? config.icon?.name ?? "",
    config.search?.value ?? "",
    config.search?.placeholder ?? "",
    String(Boolean(config.filtersContent)),
    String(config.activeFilterCount ?? 0),
    String(Boolean(config.onClearFilters)),
    String(Boolean(config.actions)),
    typeof config.meta === "string" || typeof config.meta === "number" ? String(config.meta) : String(Boolean(config.meta)),
    config.syncKey ?? "",
  ].join("|");
}

export function AdminPageChromeProvider({ children }: { children: ReactNode }) {
  const chromeRef = useRef<AdminPageChromeConfig | null>(null);
  const signatureRef = useRef("");
  const ownerRef = useRef(0);
  const ownerSeqRef = useRef(0);
  const [chrome, setChromeState] = useState<AdminPageChromeConfig | null>(null);

  const claimChromeOwner = useCallback(() => {
    ownerSeqRef.current += 1;
    return ownerSeqRef.current;
  }, []);

  const setChrome = useCallback((next: AdminPageChromeConfig | null, ownerId?: number) => {
    // Stale page cleanup must not wipe the next page's chrome (Filters sticking / vanishing).
    if (next === null) {
      if (ownerId !== undefined && ownerId !== ownerRef.current) return;
      chromeRef.current = null;
      signatureRef.current = "";
      ownerRef.current = 0;
      setChromeState((prev) => (prev === null ? prev : null));
      return;
    }

    if (ownerId !== undefined) {
      ownerRef.current = ownerId;
    }

    const nextSig = chromeSignature(next);
    chromeRef.current = next;
    if (nextSig === signatureRef.current) return;
    signatureRef.current = nextSig;
    setChromeState(next);
  }, []);

  const value = useMemo(
    () => ({ chrome, chromeRef, setChrome, claimChromeOwner }),
    [chrome, setChrome, claimChromeOwner],
  );

  return (
    <AdminPageChromeContext.Provider value={value}>{children}</AdminPageChromeContext.Provider>
  );
}

export function useAdminPageChrome() {
  const ctx = useContext(AdminPageChromeContext);
  if (!ctx) {
    throw new Error("useAdminPageChrome must be used within AdminPageChromeProvider");
  }
  return ctx;
}

/**
 * Register the current page's title, search, filters, and actions into the top navbar.
 * Clears automatically on unmount / route change.
 * Pass `{ enabled: false }` when embedding the view inside another page that owns chrome.
 */
export function useSetAdminPageChrome(
  config: AdminPageChromeConfig | null,
  options?: { enabled?: boolean },
) {
  const ctx = useContext(AdminPageChromeContext);
  const setChrome = ctx?.setChrome;
  const claimChromeOwner = ctx?.claimChromeOwner;
  const configRef = useRef(config);
  configRef.current = config;
  const ownerIdRef = useRef(0);
  const enabled = options?.enabled !== false;

  // Primitive signature only — avoids depending on ctx object identity (which changes
  // whenever chrome state updates and would otherwise clear→reset in a loop).
  const signature = chromeSignature(config);

  useLayoutEffect(() => {
    if (!enabled || !setChrome || !claimChromeOwner) return;
    const ownerId = claimChromeOwner();
    ownerIdRef.current = ownerId;
    setChrome(configRef.current, ownerId);
    return () => setChrome(null, ownerId);
  }, [setChrome, claimChromeOwner, signature, enabled]);
}

/** Fallback titles when a page has not registered chrome yet */
export const ADMIN_ROUTE_TITLES: { match: (path: string) => boolean; title: string }[] = [
  { match: (p) => p === "/admin", title: "Dashboard" },
  { match: (p) => p.startsWith("/admin/my-cases"), title: "My Cases" },
  { match: (p) => p.startsWith("/admin/kanban"), title: "Pipeline" },
  { match: (p) => p.startsWith("/admin/workload"), title: "Workload" },
  { match: (p) => p.startsWith("/admin/team-performance"), title: "Performance" },
  { match: (p) => p.startsWith("/admin/staff"), title: "Staff" },
  { match: (p) => p.startsWith("/admin/services"), title: "Services & Categories" },
  { match: (p) => p.startsWith("/admin/categories"), title: "Services & Categories" },
  { match: (p) => p.startsWith("/admin/origin-countries"), title: "Origin countries" },
  { match: (p) => p.startsWith("/admin/blog"), title: "Blog" },
  { match: (p) => p.startsWith("/admin/homepage"), title: "Homepage settings" },
  { match: (p) => p.startsWith("/admin/roles"), title: "Roles & Permissions" },
  { match: (p) => p.startsWith("/admin/permissions"), title: "Roles & Permissions" },
  { match: (p) => p.startsWith("/admin/team"), title: "Team overview" },
  { match: (p) => p.startsWith("/admin/easyfly/action"), title: "EasyFly Actions" },
  { match: (p) => p.startsWith("/admin/easyfly/schedule"), title: "Schedule Changes" },
  { match: (p) => p.startsWith("/admin/easyfly/travel"), title: "Travel" },
  { match: (p) => p.startsWith("/admin/easyfly/revenue"), title: "EasyFly Revenue" },
  { match: (p) => p.startsWith("/admin/easyfly/new"), title: "New Booking" },
  { match: (p) => /^\/admin\/easyfly\/[^/]+$/.test(p) && !p.endsWith("/new"), title: "Booking" },
  { match: (p) => p.startsWith("/admin/easyfly"), title: "EasyFly Bookings" },
  { match: (p) => p.startsWith("/admin/reports"), title: "Reports" },
  { match: (p) => p.startsWith("/admin/revenue"), title: "Revenue" },
  { match: (p) => p.startsWith("/admin/billing"), title: "Billing" },
  { match: (p) => p.startsWith("/admin/alerts"), title: "Alerts" },
  { match: (p) => p.startsWith("/admin/logs"), title: "Logs" },
  { match: (p) => p.startsWith("/admin/docs"), title: "Documents" },
  { match: (p) => p.startsWith("/admin/notifications"), title: "Notifications" },
  { match: (p) => p.startsWith("/admin/email"), title: "Mail password" },
  { match: (p) => p.startsWith("/admin/settings"), title: "Settings" },
  { match: (p) => p.startsWith("/admin/customers"), title: "Customer" },
  { match: (p) => p.startsWith("/admin/security"), title: "Security" },
  { match: (p) => p.startsWith("/admin/apostille"), title: "Apostille" },
];

export function titleForAdminPath(pathname: string): string {
  const hit = ADMIN_ROUTE_TITLES.find((row) => row.match(pathname));
  return hit?.title ?? "Admin";
}

/**
 * Nest under the dashboard (or any host page) so child views can call
 * useSetAdminPageChrome without overwriting the host page chrome.
 */
export function AdminChromeIsolation({ children }: { children: ReactNode }) {
  const chromeRef = useRef<AdminPageChromeConfig | null>(null);
  const value = useMemo<AdminPageChromeContextValue>(
    () => ({
      chrome: null,
      chromeRef,
      setChrome: () => undefined,
      claimChromeOwner: () => -1,
    }),
    [],
  );

  return <AdminPageChromeContext.Provider value={value}>{children}</AdminPageChromeContext.Provider>;
}
