"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";
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
  ChevronRight
} from "lucide-react";

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: BarChart3 },
    { name: "Orders / Cases", href: "/admin/staff", icon: Briefcase },
    { name: "Kanban Pipeline", href: "/admin/kanban", icon: KanbanSquare },
    { name: "Reports", href: "/admin/reports", icon: PieChart },
    { name: "NDR / SLA Alerts", href: "/admin/alerts", icon: TriangleAlert },
    { name: "Team Management", href: "/admin/team", icon: Users },
    { name: "Remittance / Revenue", href: "/admin/revenue", icon: Landmark },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "bg-white border-r border-[0.5px] border-[#D9E1EA] h-screen sticky top-0 flex flex-col transition-all duration-300 z-20",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[0.5px] border-[#D9E1EA]">
        <Link href="/admin" className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
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
      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
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
