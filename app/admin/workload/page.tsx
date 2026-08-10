"use client";

import { Suspense } from "react";
import { WorkloadView } from "@/components/console/workload/WorkloadView";

export default function AdminWorkloadPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-8 text-center text-sm text-[#627D98]">
          Loading workload…
        </div>
      }
    >
      <WorkloadView />
    </Suspense>
  );
}
