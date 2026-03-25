"use client";

import toast from "react-hot-toast";

const MOCK_TASKS = [
  { id: "t1", caseId: "LEAD-1001", customer: "Devkishan Suthar", title: "Audit Customer - Devkishan Suthar", deadline: "Due in 2 hours", priority: "High", status: "In Progress" },
  { id: "t2", caseId: "LEAD-1002", customer: "Priya Sharma", title: "Request additional documents", deadline: "Due in 4 hours", priority: "Normal", status: "Pending" },
  { id: "t3", caseId: "LEAD-1003", customer: "Arjun Mehta", title: "Form review for E-Visa", deadline: "Due today", priority: "Normal", status: "In Review" },
];

export default function StaffPage() {
  const tasks = MOCK_TASKS;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1300px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Orders / Cases</h1>
      <div className="bg-white rounded-xl border border-blue-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">My Daily Worklist</h2>
        <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-[#F8FAFF] border border-blue-100 rounded-lg p-3">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-slate-900 text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.customer} • {task.caseId} • {task.deadline}</p>
                  </div>
                  <div className="text-xs text-slate-300">{task.status}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button className="text-xs bg-[#33A1FD]/15 text-[#33A1FD] px-2 py-1 rounded" onClick={() => toast.success("Requested documents")}>Request Documents</button>
                  <button className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Generate WhatsApp Template</button>
                  <button className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Mark Audit Complete</button>
                  <button className="text-xs bg-[#B87333]/20 text-[#B87333] px-2 py-1 rounded">Move to Next Stage</button>
                  <button className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded">Upload & Tag Documents</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      <div className="bg-white rounded-xl border border-blue-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Accountability Panel</h2>
        <div className="space-y-1 text-xs text-slate-300">
          <p>Requested docs | Devkishan Suthar | 10:34 AM</p>
          <p>Audit complete | Priya Sharma | 10:12 AM</p>
          <p>Moved stage to REVIEW_PENDING | Arjun Mehta | 09:51 AM</p>
        </div>
      </div>
    </div>
  );
}
