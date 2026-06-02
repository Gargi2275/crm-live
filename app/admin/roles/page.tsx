"use client";

import { ShieldCheck, Users } from "lucide-react";

const ROLES = [
  { id: "admin", label: "Admin", description: "Full access across console modules and settings." },
  { id: "ops_manager", label: "Operations Manager", description: "Operational control: pipeline, alerts, reports, team ops." },
  { id: "case_processor", label: "Case Processor", description: "Works assigned cases: kanban, dashboard tasks, EasyFly (if allowed)." },
  { id: "reviewer", label: "Reviewer", description: "Review workflows, kanban, reports (if allowed)." },
  { id: "support_agent", label: "Support Agent", description: "Limited dashboard view and support-only actions." },
] as const;

export default function AdminRolesPage() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[1100px] mx-auto space-y-4 font-body">
      <div>
        <h1 className="text-[22px] font-heading font-semibold text-[#102A43] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#0B69B7]" /> Roles
        </h1>
        <p className="mt-1 text-sm text-[#627D98]">
          UI module ready. Backend role management endpoints are not present in this repo yet.
        </p>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] bg-[#F8FAFC] text-[11px] font-semibold text-[#627D98] uppercase tracking-wide">
          Available roles
        </div>
        <div className="divide-y divide-[#E5EAF0]">
          {ROLES.map((role) => (
            <div key={role.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-heading font-semibold text-[#102A43]">{role.label}</p>
                  <p className="mt-1 text-sm text-[#486581]">{role.description}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full border border-[#D9E1EA] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334E68]">
                  {role.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#D9E1EA] p-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#009877]" />
          <p className="text-sm font-heading font-semibold text-[#102A43]">Next step</p>
        </div>
        <p className="mt-2 text-sm text-[#627D98]">
          When you add backend endpoints (create/update roles + permission grants), we can replace this with live CRUD and a permission matrix.
        </p>
      </div>
    </div>
  );
}

