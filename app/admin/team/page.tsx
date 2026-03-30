"use client";

import { STAFF_MEMBERS } from "@/lib/data/mockConsoleData";
import { motion } from "framer-motion";

export default function TeamPage() {
  const totalAssigned = STAFF_MEMBERS.reduce((sum, member) => sum + member.assigned, 0);
  const totalCompleted = STAFF_MEMBERS.reduce((sum, member) => sum + member.completed, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1300px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Team Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Total staff</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{STAFF_MEMBERS.length}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Assigned tasks</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{totalAssigned}</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-3">
          <p className="text-xs text-[#627D98]">Completed tasks</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43]">{totalCompleted}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STAFF_MEMBERS.map((item) => (
          <motion.div key={item.id} whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
            <p className="text-[#102A43] font-heading font-semibold">{item.name}</p>
            <p className="text-xs text-[#627D98]">{item.role}</p>
            <p className="text-sm text-[#486581] mt-2">Tasks: <span className="text-[#0B69B7]">{item.assigned}</span> | Completed: <span className="text-[#006F57]">{item.completed}</span></p>
            <p className="text-sm text-[#486581]">Pending: <span className="text-[#9C4F17]">{item.pending}</span> | Status: <span className="text-[#334E68]">{item.loadStatus}</span></p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Management note</h2>
        <p className="text-sm text-[#486581]">Prioritize balancing high-load members first to reduce SLA pressure across active queues.</p>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Team performance table</h2>
          <span className="text-xs text-[#627D98]">Live from dummy set</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left">Assigned</th>
                <th className="px-4 py-2.5 text-left">Completed</th>
                <th className="px-4 py-2.5 text-left">SLA Breach</th>
                <th className="px-4 py-2.5 text-left">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              {STAFF_MEMBERS.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-2.5">{member.name}</td>
                  <td className="px-4 py-2.5">{member.assigned}</td>
                  <td className="px-4 py-2.5">{member.completed}</td>
                  <td className="px-4 py-2.5">{member.slaBreach}</td>
                  <td className="px-4 py-2.5">{member.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Weekly coaching focus
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Review cases with repeated SLA breaches, assign one quality audit buddy per staff member, and cap concurrent high-priority work.</p>
      </details>
    </motion.div>
  );
}

