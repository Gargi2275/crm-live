"use client";

import { Bell, Search, LogOut, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useConsole } from "./ConsoleContext";
import { motion } from "framer-motion";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function TopHeader() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { role, setRole, roles } = useConsole();
  const { logout } = useAdminAuth();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="bg-white border-b border-[0.5px] border-[#D9E1EA] sticky top-0 z-10">
      <div className="h-16 flex items-center justify-between gap-4 px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#009877]" />
          <input 
            type="text" 
            placeholder="Search cases, customers, or leads..." 
            className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[0.5px] border-[#D9E1EA] rounded-[12px] text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877] transition-all text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="hidden md:block bg-white border border-[0.5px] border-[#D9E1EA] text-sm rounded-[12px] px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009877]/25 font-body"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {/* Notifications */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative p-2 text-slate-600 hover:bg-[#F5F7FA] rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
        </motion.button>

        <div
          ref={profileMenuRef}
          className="relative pl-2 sm:pl-3 border-l border-[0.5px] border-[#D9E1EA]"
        >
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-[12px] px-1.5 py-1 hover:bg-[#F5F7FA] transition-colors"
            aria-label="Profile menu"
          >
            <div className="w-9 h-9 bg-[#009877]/12 text-[#006F57] rounded-full flex items-center justify-center border border-[0.5px] border-[#009877]/30">
              <User className="w-4.5 h-4.5" />
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-[220px] rounded-[12px] border border-[#D9E1EA] bg-white shadow-[0_18px_36px_rgba(15,42,67,0.12)] p-3 z-20">
              <p className="text-sm font-semibold text-[#102A43] font-heading">Admin Console Session</p>
              <p className="text-xs text-[#627D98]">Authenticated user</p>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#D9E1EA] px-3 py-2 text-sm text-[#334E68] hover:bg-[#F5F7FA]"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
