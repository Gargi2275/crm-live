import { Suspense, type ReactNode } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function MainDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <section className="bg-bg-page pt-24">
          <PageLoader title="Loading dashboard…" subtitle="Preparing your workspace." />
        </section>
      }
    >
      {children}
    </Suspense>
  );
}
