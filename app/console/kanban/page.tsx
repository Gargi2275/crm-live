"use client";

import { KanbanBoard } from "@/components/console/kanban/KanbanBoard";
import { useConsole } from "@/components/console/ConsoleContext";

export default function OperationsKanbanPage() {
  const { autoAssignTasks } = useConsole();

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Kanban Pipeline</h1>
          <p className="text-slate-300 text-sm mt-1">Drag and drop cases across all processing stages</p>
        </div>
        <button onClick={autoAssignTasks} className="bg-[#F97316] text-white px-4 py-2 rounded-lg font-semibold">
          AUTO-ASSIGN
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-blue-100 p-4">
        <KanbanBoard />
      </div>

      <div className="bg-white border border-blue-100 rounded-xl p-4">
        <h3 className="text-slate-900 font-semibold mb-3">SLA Monitoring Panel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3 text-slate-700">Audit: must complete in 4 hours <span className="text-green-600">Healthy</span></div>
          <div className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3 text-slate-700">Documents Review: 24 hours <span className="text-amber-600">At risk</span></div>
          <div className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3 text-slate-700">Submission: 48 hours <span className="text-red-600">Breach detected</span></div>
        </div>
      </div>
    </div>
  );
}
