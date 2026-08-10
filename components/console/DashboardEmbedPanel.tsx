"use client";

import dynamic from "next/dynamic";
import { Suspense, type ComponentType } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { AdminChromeIsolation } from "@/components/console/AdminPageChromeContext";
import { WorkloadView } from "@/components/console/workload/WorkloadView";
import { KanbanView } from "@/components/console/kanban/KanbanView";

const Loading = () => (
  <section className="rounded-[12px] border border-[#D9E1EA] bg-white">
    <PageLoader title="Loading…" subtitle="Opening in dashboard." fill={false} />
  </section>
);

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  return dynamic(loader, { ssr: false, loading: () => <Loading /> });
}

const EMBEDDED_PAGES: Record<string, ComponentType> = {
  "/admin/alerts": lazyPage(() => import("@/app/admin/alerts/page")),
  "/admin/billing": lazyPage(() => import("@/app/admin/billing/page")),
  "/admin/revenue": lazyPage(() => import("@/app/admin/revenue/page")),
  "/admin/reports": lazyPage(() => import("@/app/admin/reports/page")),
  "/admin/my-cases": lazyPage(() => import("@/app/admin/my-cases/page")),
  "/admin/staff": lazyPage(() => import("@/app/admin/staff/page")),
  "/admin/routing": lazyPage(() => import("@/app/admin/routing/page")),
  "/admin/team": lazyPage(() => import("@/app/admin/team/page")),
  "/admin/team-performance": lazyPage(() => import("@/app/admin/team-performance/page")),
  "/admin/services": lazyPage(() => import("@/app/admin/services/page")),
  "/admin/roles": lazyPage(() => import("@/app/admin/roles/page")),
  "/admin/blog": lazyPage(() => import("@/app/admin/blog/page")),
  "/admin/docs": lazyPage(() => import("@/app/admin/docs/page")),
  "/admin/logs": lazyPage(() => import("@/app/admin/logs/page")),
  "/admin/notifications": lazyPage(() => import("@/app/admin/notifications/page")),
  "/admin/settings": lazyPage(() => import("@/app/admin/settings/page")),
  "/admin/easyfly": lazyPage(() => import("@/app/admin/easyfly/page")),
  "/admin/easyfly/travel": lazyPage(() => import("@/app/admin/easyfly/travel/page")),
  "/admin/easyfly/schedule": lazyPage(() => import("@/app/admin/easyfly/schedule/page")),
  "/admin/easyfly/revenue": lazyPage(() => import("@/app/admin/easyfly/revenue/page")),
  "/admin/security": lazyPage(() => import("@/app/admin/security/page")),
  "/admin/homepage": lazyPage(() => import("@/app/admin/homepage/page")),
  "/admin/origin-countries": lazyPage(() => import("@/app/admin/origin-countries/page")),
  "/admin/service-hubs": lazyPage(() => import("@/app/admin/service-hubs/page")),
  "/admin/email": lazyPage(() => import("@/app/admin/email/page")),
};

function normalizeEmbedPath(href: string): string {
  const raw = href.split("?")[0]?.split("#")[0] || href;
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

export function canEmbedAdminHref(href: string): boolean {
  const path = normalizeEmbedPath(href);
  if (path === "/admin/workload" || path === "/admin/kanban") return true;
  if (EMBEDDED_PAGES[path]) return true;
  // Prefix match for report query variants etc. already covered by path-only key.
  return Object.keys(EMBEDDED_PAGES).some((key) => path === key || path.startsWith(`${key}/`));
}

export function DashboardEmbedPanel({ href }: { href: string }) {
  const path = normalizeEmbedPath(href);

  if (path === "/admin/workload") {
    const tab = new URLSearchParams(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "").get("tab");
    return (
      <AdminChromeIsolation>
        <WorkloadView embedded focusTab={tab} />
      </AdminChromeIsolation>
    );
  }

  if (path === "/admin/kanban") {
    return (
      <AdminChromeIsolation>
        <KanbanView embedded />
      </AdminChromeIsolation>
    );
  }

  const exact = EMBEDDED_PAGES[path];
  const prefixed =
    exact ||
    EMBEDDED_PAGES[
      Object.keys(EMBEDDED_PAGES)
        .filter((key) => path === key || path.startsWith(`${key}/`))
        .sort((a, b) => b.length - a.length)[0] || ""
    ];

  if (!prefixed) {
    return (
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 text-sm text-[#627D98]">
        This section can’t open inline yet. Use the sidebar to open it as a full page.
      </div>
    );
  }

  const Page = prefixed;
  return (
    <AdminChromeIsolation>
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </AdminChromeIsolation>
  );
}
