"use client";

import { useState } from "react";
import { Sidebar } from "@/components/console/Sidebar";
import { TopHeader } from "@/components/console/TopHeader";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { ConsoleProvider } from "@/components/console/ConsoleContext";
import { Toaster } from "react-hot-toast";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { useEffect } from "react";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isBootstrapped, logout, adminUser } = useAdminAuth();
  const isPublicAdminAuthRoute = pathname === "/admin/login" || pathname === "/admin/reset-password";

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }
    if (!isAuthenticated && !isPublicAdminAuthRoute) {
      router.replace("/admin/login");
    }
    if (isAuthenticated && isPublicAdminAuthRoute) {
      router.replace("/admin");
    }
  }, [isAuthenticated, isBootstrapped, isPublicAdminAuthRoute, router]);

  useEffect(() => {
    if (!adminUser || isPublicAdminAuthRoute || pathname === "/admin") {
      return;
    }

    const role = adminUser.role;
    if (role === "admin") {
      return;
    }

    const roleAccess: Record<string, string[]> = {
      ops_manager: ["/admin", "/admin/kanban", "/admin/reports", "/admin/alerts", "/admin/team", "/admin/settings"],
      case_processor: ["/admin", "/admin/kanban"],
      reviewer: ["/admin", "/admin/kanban", "/admin/reports"],
      support_agent: ["/admin"],
    };

    const allowedRoots = roleAccess[role] || ["/admin"];
    const hasAccess = allowedRoots.some((root) => pathname === root || (root !== "/admin" && pathname.startsWith(root)));
    if (!hasAccess) {
      router.replace("/admin");
    }
  }, [adminUser, isPublicAdminAuthRoute, pathname, router]);

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] text-slate-700">
        Checking admin session...
      </div>
    );
  }

  if (isPublicAdminAuthRoute) {
    return (
      <>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#FFFFFF", color: "#0F172A", border: "0.5px solid #D9E1EA", borderRadius: "12px" },
          }}
        />
      </>
    );
  }

  return (
    <ConsoleProvider>
      <div className="flex h-screen bg-[#F5F7FA] overflow-hidden text-slate-900">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader />

          <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-[#33A1FD]/10 blur-3xl"
              animate={{ x: [0, -14, 0], y: [0, 10, 0], opacity: [0.35, 0.5, 0.35] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-1/3 -left-20 h-44 w-44 rounded-full bg-[#009877]/10 blur-3xl"
              animate={{ x: [0, 12, 0], y: [0, -8, 0], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="relative h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#FFFFFF", color: "#0F172A", border: "0.5px solid #D9E1EA", borderRadius: "12px" },
        }}
      />
    </ConsoleProvider>
  );
}
