"use client";

import { ALERT_FEED } from "@/lib/data/mockConsoleData";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { AlertTriangle, CircleCheck, TimerReset } from "lucide-react";

export default function AlertsPage() {
  const criticalCount = ALERT_FEED.filter((item) => item.text.toLowerCase().includes("sla") || item.text.toLowerCase().includes("risk")).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 font-body max-w-[1300px] mx-auto"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">NDR / SLA Alerts</h1>
          <p className="text-sm text-[#627D98] mt-1">Track critical cases quickly with clear actions and status cues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Open alerts</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#B42318]" />{ALERT_FEED.length}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Critical signals</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><TimerReset className="w-4 h-4 text-[#9C4F17]" />{criticalCount}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Auto-monitored</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CircleCheck className="w-4 h-4 text-[#009877]" />Realtime</p>
        </div>
      </div>

      <div className="space-y-3">
        {ALERT_FEED.map((alert) => (
          <motion.div key={alert.id} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-sm text-[#102A43] font-medium">{alert.text}</p>
              <p className="text-xs text-[#627D98]">{alert.entity}</p>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} className="text-xs px-3 py-1 rounded-full bg-[#F5F7FA] text-[#334E68] border-[0.5px] border-[#D9E1EA]" onClick={() => toast("Alert dismissed")}>
                Dismiss
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} className="text-xs px-3 py-1 rounded-full bg-[#009877] text-white hover:bg-[#007B61]" onClick={() => toast.success("Taking action")}>
                Take Action
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Alert handling queue</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Case</th>
                <th className="px-4 py-2.5 text-left">Owner</th>
                <th className="px-4 py-2.5 text-left">Age</th>
                <th className="px-4 py-2.5 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">LEAD-1004</td><td className="px-4 py-2.5">Nimit</td><td className="px-4 py-2.5">5h</td><td className="px-4 py-2.5">Critical</td></tr>
              <tr><td className="px-4 py-2.5">LEAD-1002</td><td className="px-4 py-2.5">Riya</td><td className="px-4 py-2.5">2h</td><td className="px-4 py-2.5">High</td></tr>
              <tr><td className="px-4 py-2.5">LEAD-1009</td><td className="px-4 py-2.5">Karan</td><td className="px-4 py-2.5">45m</td><td className="px-4 py-2.5">Medium</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Alert response SOP
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Critical alerts must be acknowledged within 15 minutes, tagged to owner, and escalated to Ops if unresolved after 1 hour.</p>
        </details>
        <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
          <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
            Follow-up cadence
            <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-[#486581]">Cases with pending customer action are re-pinged at 4h, 24h, and 48h, then moved to priority review queue.</p>
        </details>
      </div>
    </motion.div>
  );
}

