"use client";

import { useConsole } from "@/components/console/ConsoleContext";

export default function BillingPage() {
  const { role } = useConsole();
  const canExport = role !== "Staff / Case Worker";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
      <div className="bg-white border border-blue-100 rounded-lg p-4 space-y-2">
        <p className="text-slate-300 text-sm">Pending invoices: 8</p>
        <p className="text-slate-300 text-sm">Failed payments: 2</p>
        <p className="text-slate-300 text-sm">Collected this week: ₹1,84,000</p>
        {canExport ? (
          <button className="text-sm px-3 py-1.5 rounded bg-[#33A1FD]/15 text-[#33A1FD] border border-[#33A1FD]/30">Export Billing CSV</button>
        ) : (
          <p className="text-xs text-amber-300">Export hidden for Staff role</p>
        )}
      </div>
    </div>
  );
}

