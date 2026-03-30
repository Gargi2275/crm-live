"use client";

import { useConsole } from "@/components/console/ConsoleContext";
import { motion } from "framer-motion";
import { ReceiptText, AlertCircle, HandCoins } from "lucide-react";

export default function BillingPage() {
  const { role } = useConsole();
  const canExport = role !== "Staff / Case Worker";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Billing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Pending invoices</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><ReceiptText className="w-4 h-4 text-[#0B69B7]" />8</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Failed payments</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><AlertCircle className="w-4 h-4 text-[#B42318]" />2</p>
        </div>
        <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
          <p className="text-xs text-[#627D98]">Collected this week</p>
          <p className="mt-1 text-lg font-heading font-semibold text-[#102A43] inline-flex items-center gap-2"><HandCoins className="w-4 h-4 text-[#009877]" />₹1,84,000</p>
        </div>
      </div>

      <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-5 space-y-2 shadow-sm">
        <p className="text-[#486581] text-sm">Pending invoices: 8</p>
        <p className="text-[#486581] text-sm">Failed payments: 2</p>
        <p className="text-[#486581] text-sm">Collected this week: ₹1,84,000</p>
        {canExport ? (
          <motion.button whileTap={{ scale: 0.97 }} className="text-sm px-3 py-1.5 rounded-[10px] bg-[#009877] text-white hover:bg-[#007B61] font-heading">Export Billing CSV</motion.button>
        ) : (
          <p className="text-xs text-[#9C4F17] bg-[#B87333]/12 inline-flex px-2 py-1 rounded-full">Export hidden for Staff role</p>
        )}
      </motion.div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Billing checklist</h2>
        <ul className="space-y-1 text-sm text-[#486581]">
          <li>Verify payer details before issuing receipts</li>
          <li>Review failed transaction logs every 2 hours</li>
          <li>Export CSV before daily closing window</li>
        </ul>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Recent invoices</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Invoice</th>
                <th className="px-4 py-2.5 text-left">Customer</th>
                <th className="px-4 py-2.5 text-left">Amount</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">INV-2091</td><td className="px-4 py-2.5">Devkishan S.</td><td className="px-4 py-2.5">₹5,000</td><td className="px-4 py-2.5">Paid</td></tr>
              <tr><td className="px-4 py-2.5">INV-2092</td><td className="px-4 py-2.5">Priya S.</td><td className="px-4 py-2.5">₹3,500</td><td className="px-4 py-2.5">Pending</td></tr>
              <tr><td className="px-4 py-2.5">INV-2093</td><td className="px-4 py-2.5">Arjun M.</td><td className="px-4 py-2.5">₹8,000</td><td className="px-4 py-2.5">Failed</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Billing FAQ and dispute handling
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Disputes are acknowledged within 4 business hours. Failed payments trigger retry workflow at 15 min, 2 hr, and 24 hr intervals.</p>
      </details>
    </motion.div>
  );
}

