"use client";

import { Bell, Search, Wallet, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useConsole } from "./ConsoleContext";

export function TopHeader() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const { role, setRole, roles } = useConsole();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const idleTimer = setTimeout(() => setShowIdleWarning(true), 3000);
    return () => clearTimeout(idleTimer);
  }, []);

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-10 shadow-sm">
      {showIdleWarning && (
        <div className="px-6 py-2 text-xs bg-amber-100 text-amber-700 border-b border-amber-200 flex items-center justify-between">
          <span>You will be logged out in 5 minutes</span>
          <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => setShowIdleWarning(false)}>
            <LogOut className="w-3 h-3" /> Stay active
          </button>
        </div>
      )}
      <div className="h-16 flex items-center justify-between px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#33A1FD]" />
          <input 
            type="text" 
            placeholder="Search cases, customers, or leads..." 
            className="w-full pl-9 pr-4 py-2 bg-[#F0F4FF] border border-blue-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#33A1FD]/25 focus:border-[#33A1FD] transition-all text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Live Clock */}
        <div className="hidden md:flex flex-col items-end min-w-[120px]">
          {mounted ? (
            <>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">{format(time, "hh:mm:ss a")}</span>
              <span className="text-xs text-slate-400">{format(time, "EEE, MMM d, yyyy")}</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">--:--:--</span>
              <span className="text-xs text-slate-400 text-transparent">Loading date</span>
            </>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3 text-sm text-slate-700 bg-[#F0F4FF] border border-blue-200 rounded-lg px-3 py-2">
          <Wallet className="w-4 h-4 text-[#22C55E]" />
          <span>Wallet: ₹1,82,300</span>
          <button className="bg-[#B87333] text-white text-xs px-2.5 py-1 rounded-md font-semibold">Recharge</button>
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="bg-white border border-blue-200 text-sm rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#33A1FD]/40"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {/* Notifications */}
        <button className="relative p-2 text-slate-600 hover:bg-[#F0F4FF] rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        {/* User Dropdown */}
        <div className="flex items-center gap-3 pl-4 border-l border-blue-100 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">Meera Jain</p>
            <p className="text-xs text-slate-400">Console Operator</p>
          </div>
          <div className="w-9 h-9 bg-[#33A1FD]/15 text-[#33A1FD] rounded-full flex items-center justify-center font-bold text-sm border border-[#33A1FD]/30">
            MJ
          </div>
          <span className="text-xs bg-[#33A1FD]/15 text-[#33A1FD] border border-[#33A1FD]/30 px-2 py-1 rounded-md">{role}</span>
        </div>
        </div>
      </div>
    </header>
  );
}
