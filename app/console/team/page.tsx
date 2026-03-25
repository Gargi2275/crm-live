"use client";

import { STAFF_MEMBERS } from "@/lib/data/mockConsoleData";

export default function TeamPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STAFF_MEMBERS.map((item) => (
          <div key={item.id} className="bg-white border border-blue-100 rounded-lg p-4">
            <p className="text-slate-900 font-semibold">{item.name}</p>
            <p className="text-xs text-slate-400">{item.role}</p>
            <p className="text-sm text-slate-300 mt-2">Tasks: {item.assigned} | Completed: {item.completed}</p>
            <p className="text-sm text-slate-300">Pending: {item.pending} | Status: {item.loadStatus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

