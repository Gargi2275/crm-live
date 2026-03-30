"use client";

import { KanbanBoard } from "@/components/console/kanban/KanbanBoard";
import { useConsole } from "@/components/console/ConsoleContext";
import { ShieldAlert, TimerReset, CheckCircle2, AlertTriangle } from "lucide-react";
import { STAFF_MEMBERS } from "@/lib/data/mockConsoleData";

export default function OperationsKanbanPage() {
  const { autoAssignTasks } = useConsole();
  const availableCount = STAFF_MEMBERS.filter((item) => item.loadStatus === "Available").length;
  const overloadedCount = STAFF_MEMBERS.filter((item) => item.loadStatus === "Overloaded").length;
  const totalPending = STAFF_MEMBERS.reduce((sum, item) => sum + item.pending, 0);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4 font-body max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2 shrink-0">
        <div>
          <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Operations Kanban Pipeline</h1>
          <p className="text-[#486581] text-sm mt-1">Drag and drop cases across all processing stages</p>
        </div>
        <button onClick={autoAssignTasks} className="bg-[#009877] hover:bg-[#007B61] text-white px-4 py-2 rounded-[10px] font-heading font-semibold shadow-sm">
          AUTO-ASSIGN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">SLA Health</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#009877]" /> Stable</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">At Risk Cases</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><TimerReset className="w-4 h-4 text-[#B87333]" /> 11</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">Breached Cases</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#B42318]" /> 4</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98] mb-1">Escalations</p>
          <p className="text-[#102A43] font-heading font-semibold text-lg inline-flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#33A1FD]" /> 2 open</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Staff available</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{availableCount}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Work pending</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{totalPending}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Overloaded staff</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{overloadedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4 shadow-sm">
        <KanbanBoard />
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#102A43] font-heading font-semibold">SLA Monitoring Panel</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/30">Realtime</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 text-[#334E68]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading font-medium">Audit</span>
              <span className="text-[#006F57] font-semibold">Healthy</span>
            </div>
            <p className="text-xs text-[#627D98] mb-2">Must complete in 4 hours</p>
            <div className="h-1.5 rounded-full bg-[#E8F5F2]"><div className="h-1.5 rounded-full bg-[#009877] w-[72%]" /></div>
          </div>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 text-[#334E68]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading font-medium">Documents Review</span>
              <span className="text-[#9C4F17] font-semibold">At risk</span>
            </div>
            <p className="text-xs text-[#627D98] mb-2">SLA threshold: 24 hours</p>
            <div className="h-1.5 rounded-full bg-[#F8EFE7]"><div className="h-1.5 rounded-full bg-[#B87333] w-[88%]" /></div>
          </div>
          <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 text-[#334E68]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading font-medium">Submission</span>
              <span className="text-[#B42318] font-semibold">Breach detected</span>
            </div>
            <p className="text-xs text-[#627D98] mb-2">SLA threshold: 48 hours</p>
            <div className="h-1.5 rounded-full bg-[#FDECEC]"><div className="h-1.5 rounded-full bg-[#B42318] w-[100%]" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#102A43] font-heading font-semibold">Internal Communication Panel</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35">Per customer room</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
          <div className="rounded-[12px] border border-[#D9E1EA] p-3 space-y-2 bg-[#F8FAFC]">
            <p className="text-sm text-[#102A43]"><span className="font-semibold">@OpsManager</span> Please verify address proof mismatch for LEAD-1004.</p>
            <p className="text-sm text-[#486581]"><span className="font-semibold">@Nimit</span> Audit updated. Marking checklist items and attaching corrected document.</p>
            <p className="text-sm text-[#486581]"><span className="font-semibold">System</span> Ravi moved LEAD-1003 from REVIEW_PENDING to READY_FOR_SUBMISSION at 10:41 AM.</p>
            <div className="pt-2 border-t border-[#D9E1EA] flex flex-wrap gap-2">
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">@Tag Member</button>
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">Add Note</button>
              <button className="text-xs px-2.5 py-1 rounded-full border border-[#D9E1EA] bg-white text-[#486581]">Upload File</button>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#D9E1EA] p-3 bg-white">
            <p className="text-xs text-[#627D98] mb-2">Traceable activity</p>
            <ul className="space-y-1.5 text-xs text-[#486581]">
              <li>10:43 AM | Nimit | Added discrepancy note</li>
              <li>10:41 AM | Ravi | Updated pipeline stage</li>
              <li>10:35 AM | System | Logged file attachment</li>
              <li>10:31 AM | Meera | Tagged @OpsManager</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h3 className="text-sm font-heading font-semibold text-[#102A43]">Pipeline operations table</h3>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Stage</th>
                <th className="px-4 py-2.5 text-left">Current cases</th>
                <th className="px-4 py-2.5 text-left">Avg age</th>
                <th className="px-4 py-2.5 text-left">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">AUDIT_PENDING</td><td className="px-4 py-2.5">7</td><td className="px-4 py-2.5">2h 14m</td><td className="px-4 py-2.5">Medium</td></tr>
              <tr><td className="px-4 py-2.5">DOCUMENTS_REQUIRED</td><td className="px-4 py-2.5">11</td><td className="px-4 py-2.5">19h 05m</td><td className="px-4 py-2.5">High</td></tr>
              <tr><td className="px-4 py-2.5">READY_FOR_SUBMISSION</td><td className="px-4 py-2.5">5</td><td className="px-4 py-2.5">6h 42m</td><td className="px-4 py-2.5">Low</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Ops playbook
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Review overloaded users every 2 hours, run auto-assign when pending crosses threshold, and escalate all breached submissions immediately.</p>
      </details>
    </div>
  );
}
