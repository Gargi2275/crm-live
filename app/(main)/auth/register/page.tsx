"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextParam = searchParams.get("next") || "";
    const nextPath = nextParam.startsWith("/") ? nextParam : "/dashboard";
    router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }, [router, searchParams]);

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-bg-page min-h-[70vh]">
      <div className="max-w-md mx-auto text-center text-slate-600">Redirecting to login...</div>
    </section>
  );
}
