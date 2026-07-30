import { Suspense, type ReactNode } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function MainDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <section className="relative min-h-[50vh] overflow-hidden bg-[#F7FBFF] pt-24">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -left-[10%] -top-[20%] h-[55%] w-[50%] rounded-full bg-[#33A1FD]/18 blur-[90px]" />
            <div className="absolute -right-[8%] top-[5%] h-[45%] w-[42%] rounded-full bg-[#0B69B7]/12 blur-[100px]" />
          </div>
          <div className="relative">
            <PageLoader title="Loading dashboard…" subtitle="Preparing your workspace." />
          </div>
        </section>
      }
    >
      {children}
    </Suspense>
  );
}
