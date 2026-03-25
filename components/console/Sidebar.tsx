"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FlyOCILogo } from "@/components/FlyOCILogo";
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
  PlaneTakeoff
} from "lucide-react";

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/console", icon: BarChart3 },
    { name: "Orders / Cases", href: "/console/staff", icon: Briefcase },
    { name: "Kanban Pipeline", href: "/console/kanban", icon: KanbanSquare },
    { name: "Reports", href: "/console/reports", icon: PieChart },
    { name: "NDR / SLA Alerts", href: "/console/alerts", icon: TriangleAlert },
    { name: "Team Management", href: "/console/team", icon: Users },
    { name: "Remittance / Revenue", href: "/console/revenue", icon: Landmark },
    { name: "Billing", href: "/console/billing", icon: CreditCard },
    { name: "Settings", href: "/console/settings", icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "bg-[#0F172A] border-r border-slate-800 h-screen sticky top-0 flex flex-col transition-all duration-300 z-20",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <Link href="/console" className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="bg-[#33A1FD] text-white p-1 rounded-md shrink-0">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
          {!collapsed && <FlyOCILogo className="text-lg whitespace-nowrap" />}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/console" && pathname?.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                isActive
                  ? "bg-[#33A1FD]/20 text-[#33A1FD] font-medium border border-[#33A1FD]/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isActive ? "text-[#33A1FD]" : "text-slate-400 group-hover:text-white",
                )}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 flex justify-center">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full flex justify-center"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
