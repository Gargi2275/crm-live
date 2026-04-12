"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const [otpEnabled, setOtpEnabled] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 font-body max-w-[1200px] mx-auto"
    >
      <h1 className="text-[26px] leading-tight font-heading font-semibold text-[#102A43]">Settings</h1>

      <motion.div whileHover={{ y: -2 }} className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4 shadow-sm">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Security Features</h2>
        <div className="space-y-3 text-sm text-[#486581]">
          <div className="flex items-center justify-between rounded-[12px] border border-[#D9E1EA] p-3">
            <div>
              <p className="text-[#102A43] font-medium">Login with OTP</p>
              <p className="text-xs text-[#627D98]">Require OTP for all console logins</p>
            </div>
            <button
              onClick={() => setOtpEnabled((prev) => !prev)}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${otpEnabled ? "bg-[#009877]" : "bg-slate-300"}`}
              aria-label="Toggle OTP login"
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${otpEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-[12px] border border-[#D9E1EA] p-3">
            <div>
              <p className="text-[#102A43] font-medium">Session persistence</p>
              <p className="text-xs text-[#627D98]">Keep admin users signed in until they explicitly log out</p>
            </div>
            <button
              onClick={() => {}}
              className="h-6 w-11 rounded-full p-0.5 transition-colors bg-[#009877] cursor-default"
              aria-label="Session persistence enabled"
              disabled
            >
              <span className="block h-5 w-5 rounded-full bg-white transition-transform translate-x-5" />
            </button>
          </div>

          <div className="rounded-[12px] border border-[#D9E1EA] p-3">
            <p className="text-[#102A43] font-medium mb-2">Session timeout</p>
            <p className="text-sm text-[#486581]">Disabled. Admin sessions remain active until logout.</p>
          </div>
        </div>
      </motion.div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Audit Log</h2>
        <p className="text-sm text-[#486581]">09:48 AM | Nimit accessed PASSPORT_DevkishanSuthar_2026.pdf</p>
        <p className="text-sm text-[#486581]">10:14 AM | Riya changed stage to DOCUMENTS_REQUIRED</p>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] p-4">
        <h2 className="text-[#102A43] font-heading font-semibold mb-2">Role-safe defaults</h2>
        <ul className="space-y-1 text-sm text-[#486581]">
          <li>Role badge in navbar active</li>
          <li>Staff export/download actions hidden by role</li>
          <li>Sensitive access remains audit-logged</li>
        </ul>
      </div>

      <div className="bg-white border-[0.5px] border-[#D9E1EA] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between">
          <h2 className="text-sm font-heading font-semibold text-[#102A43]">Configuration table</h2>
          <span className="text-xs text-[#627D98]">Dummy data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-2.5 text-left">Setting</th>
                <th className="px-4 py-2.5 text-left">Value</th>
                <th className="px-4 py-2.5 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] text-[#334E68]">
              <tr><td className="px-4 py-2.5">Session persistence</td><td className="px-4 py-2.5">Until logout</td><td className="px-4 py-2.5">Today 10:12 AM</td></tr>
              <tr><td className="px-4 py-2.5">2FA mode</td><td className="px-4 py-2.5">OTP required</td><td className="px-4 py-2.5">Today 9:48 AM</td></tr>
              <tr><td className="px-4 py-2.5">Export policy</td><td className="px-4 py-2.5">Admin + Ops only</td><td className="px-4 py-2.5">Yesterday 7:10 PM</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <details className="bg-white border border-[#D9E1EA] rounded-[12px] p-3 group">
        <summary className="list-none cursor-pointer text-sm font-heading font-semibold text-[#102A43] flex items-center justify-between">
          Hardening recommendations
          <span className="text-[#627D98] group-open:rotate-180 transition-transform">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-[#486581]">Enable OTP confirmation for sensitive actions (exports, stage overrides, file downloads) and enforce 90-day password rotation.</p>
      </details>
    </motion.div>
  );
}

