import { Suspense, type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-[20vh]" />}>{children}</Suspense>;
}
