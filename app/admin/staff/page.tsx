"use client";

import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { CircleDashed, CircleCheck, AlertTriangle } from "lucide-react";

const MOCK_TASKS = [
  { id: "t1", caseId: "LEAD-1001", customer: "Devkishan Suthar", title: "Audit Customer - Devkishan Suthar", deadline: "Due in 2 hours", priority: "High", status: "In Progress" },
  { id: "t2", caseId: "LEAD-1002", customer: "Priya Sharma", title: "Request additional documents", deadline: "Due in 4 hours", priority: "Normal", status: "Pending" },
  { id: "t3", caseId: "LEAD-1003", customer: "Arjun Mehta", title: "Form review for E-Visa", deadline: "Due today", priority: "Normal", status: "In Review" },
];

export default function StaffPage() {
  const tasks = MOCK_TASKS;
  const inProgressCount = tasks.filter((task) => task.status === "In Progress").length;
  const pendingCount = tasks.filter((task) => task.status === "Pending").length;
  const reviewCount = tasks.filter((task) => task.status === "In Review").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="animate-in fade-in zoom-in-95 duration-500 max-w-[1300px] mx-auto space-y-6 font-body"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Orders / Cases</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">In progress</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CircleDashed className="w-4 h-4 text-[#0B69B7]" />{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">Pending</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#9C4F17]" />{pendingCount}</p>
        </div>
        <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-3">
          <p className="text-xs text-[#627D98]">In review</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><CircleCheck className="w-4 h-4 text-[#009877]" />{reviewCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
        <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-3">My Daily Worklist</h2>
        <div className="space-y-3">
            {tasks.map((task) => (
              <motion.div key={task.id} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3 shadow-sm">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-[#102A43] text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-[#627D98]">{task.customer} • {task.caseId} • {task.deadline}</p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    task.status === "In Progress" ? "bg-[#33A1FD]/12 text-[#0B69B7]" :
                    task.status === "Pending" ? "bg-[#B87333]/12 text-[#9C4F17]" :
                    "bg-[#009877]/12 text-[#006F57]"
                  }`}>{task.status}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button className="text-xs bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/35 px-2 py-1 rounded-full" onClick={() => toast.success("Requested documents")}>Request Documents</button>
                  <button className="text-xs bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 px-2 py-1 rounded-full">Generate WhatsApp Template</button>
                  <button className="text-xs bg-[#009877]/12 text-[#006F57] border-[0.5px] border-[#009877]/35 px-2 py-1 rounded-full">Mark Audit Complete</button>
                  <button className="text-xs bg-[#B87333]/12 text-[#9C4F17] border-[0.5px] border-[#B87333]/35 px-2 py-1 rounded-full">Move to Next Stage</button>
                  <button className="text-xs bg-[#B42318]/12 text-[#B42318] border-[0.5px] border-[#B42318]/25 px-2 py-1 rounded-full">Upload & Tag Documents</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-5">
        <h2 className="text-lg font-heading font-semibold text-[#102A43] mb-3">Accountability Panel</h2>
        <div className="space-y-1 text-xs text-[#486581]">
          <p>Requested docs | Devkishan Suthar | 10:34 AM</p>
          <p>Audit complete | Priya Sharma | 10:12 AM</p>
          <p>Moved stage to REVIEW_PENDING | Arjun Mehta | 09:51 AM</p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Operator quick notes</h2>
        <p className="text-sm text-[#486581]">Use document requests first for missing data, then move cases to next stage once attachments are tagged.</p>
      </div>

      <div className="bg-white rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Task queue table</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Case</th>
                <th className="px-4 py-2.5 text-left">Task</th>
                <th className="px-4 py-2.5 text-left">Deadline</th>
                <th className="px-4 py-2.5 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-2.5">{task.caseId}</td>
                  <td className="px-4 py-2.5">{task.title}</td>
                  <td className="px-4 py-2.5">{task.deadline}</td>
                  <td className="px-4 py-2.5">{task.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Case worker SOP (quick)
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Always validate identity documents first, write one clear note per action, and only move stage after checklist completion.</p>
      </details>
    </motion.div>
  );
}
