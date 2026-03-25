"use client";

import { ALERT_FEED } from "@/lib/data/mockConsoleData";
import toast from "react-hot-toast";

export default function AlertsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">NDR / SLA Alerts</h1>
      <div className="space-y-3">
        {ALERT_FEED.map((alert) => (
          <div key={alert.id} className="bg-white border border-blue-100 rounded-lg p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-900">{alert.text}</p>
              <p className="text-xs text-slate-400">{alert.entity}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1 rounded bg-[#F0F4FF] text-slate-700 border border-blue-100" onClick={() => toast("Alert dismissed")}>
                Dismiss
              </button>
              <button className="text-xs px-3 py-1 rounded bg-[#F97316] text-white" onClick={() => toast.success("Taking action")}>
                Take Action
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

