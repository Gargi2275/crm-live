"use client";

import { KeyRound } from "lucide-react";

type PermissionRow = {
  module: string;
  admin: boolean;
  ops_manager: boolean;
  case_processor: boolean;
  reviewer: boolean;
  support_agent: boolean;
};

const PERMISSIONS: PermissionRow[] = [
  { module: "Dashboard", admin: true, ops_manager: true, case_processor: true, reviewer: true, support_agent: true },
  { module: "Kanban Pipeline", admin: true, ops_manager: true, case_processor: true, reviewer: true, support_agent: false },
  { module: "Alerts (SLA / NDR)", admin: true, ops_manager: true, case_processor: false, reviewer: false, support_agent: false },
  { module: "Notifications Feed", admin: true, ops_manager: true, case_processor: false, reviewer: false, support_agent: false },
  { module: "Reports", admin: true, ops_manager: true, case_processor: false, reviewer: true, support_agent: false },
  { module: "Logs Module", admin: true, ops_manager: true, case_processor: false, reviewer: false, support_agent: false },
  { module: "Staff Management", admin: true, ops_manager: false, case_processor: false, reviewer: false, support_agent: false },
  { module: "Billing / Revenue", admin: true, ops_manager: false, case_processor: false, reviewer: false, support_agent: false },
];

const cell = (enabled: boolean) =>
  enabled
    ? "bg-[#ECFDF5] text-[#006F57] border border-[#009877]/25"
    : "bg-[#FEF2F2] text-[#B42318] border border-[#B42318]/25";

export default function AdminPermissionsPage() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1200px] mx-auto space-y-4 font-body">
      <div>
        <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#486581]" /> Permissions
        </h1>
        <p className="mt-1 text-sm text-[#627D98]">
          UI module ready. This is currently a suggested matrix (frontend route-guard + sidebar visibility). Not backed by a permissions API yet.
        </p>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
        <div className="grid grid-cols-12 gap-0 border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 text-[11px] font-semibold text-[#627D98] uppercase tracking-wide">
          <div className="col-span-4">Module</div>
          <div className="col-span-2 text-center">Admin</div>
          <div className="col-span-2 text-center">Ops</div>
          <div className="col-span-2 text-center">Processor</div>
          <div className="col-span-1 text-center">Reviewer</div>
          <div className="col-span-1 text-center">Support</div>
        </div>

        <div className="divide-y divide-[#E5EAF0]">
          {PERMISSIONS.map((row) => (
            <div key={row.module} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
              <div className="col-span-12 md:col-span-4">
                <p className="text-sm font-semibold text-[#102A43]">{row.module}</p>
              </div>
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cell(row.admin)}`}>
                  {row.admin ? "Allow" : "Deny"}
                </span>
              </div>
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cell(row.ops_manager)}`}>
                  {row.ops_manager ? "Allow" : "Deny"}
                </span>
              </div>
              <div className="col-span-4 md:col-span-2 flex justify-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cell(row.case_processor)}`}>
                  {row.case_processor ? "Allow" : "Deny"}
                </span>
              </div>
              <div className="col-span-6 md:col-span-1 flex justify-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cell(row.reviewer)}`}>
                  {row.reviewer ? "Allow" : "Deny"}
                </span>
              </div>
              <div className="col-span-6 md:col-span-1 flex justify-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cell(row.support_agent)}`}>
                  {row.support_agent ? "Allow" : "Deny"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

