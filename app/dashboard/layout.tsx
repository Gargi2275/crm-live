import { Suspense, type ReactNode } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <section className="bg-bg-page pt-24">
          <PageLoader title="Loading…" subtitle="Please wait a moment." />
        </section>
      }
    >
      {children}
    </Suspense>
  );
}
