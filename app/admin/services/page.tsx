"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import AdminServicesPanel from "@/components/console/AdminServicesPanel";
import AdminCategoriesPanel from "@/components/console/AdminCategoriesPanel";

type CatalogTab = "services" | "categories";

function AdminServicesCategoriesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: CatalogTab =
    searchParams.get("tab") === "categories" ? "categories" : "services";
  const [tab, setTab] = useState<CatalogTab>(initialTab);

  useEffect(() => {
    const fromUrl: CatalogTab =
      searchParams.get("tab") === "categories" ? "categories" : "services";
    setTab(fromUrl);
  }, [searchParams]);

  const selectTab = (next: CatalogTab) => {
    setTab(next);
    const qs = next === "categories" ? "?tab=categories" : "";
    router.replace(`/admin/services${qs}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-3 font-body">
      <div className="inline-flex rounded-[10px] border border-[#D9E1EA] bg-white p-1">
                      <button
                        type="button"
          onClick={() => selectTab("services")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "services"
              ? "bg-[#1A56DB] text-white shadow-sm"
              : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Services
                        </button>
                        <button
                          type="button"
          onClick={() => selectTab("categories")}
          className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition ${
            tab === "categories"
              ? "bg-[#1A56DB] text-white shadow-sm"
              : "text-[#486581] hover:bg-[#F5F7FA]"
          }`}
        >
          Categories
          </button>
      </div>

      {tab === "services" ? <AdminServicesPanel /> : <AdminCategoriesPanel />}
    </div>
  );
}

export default function AdminServicesCategoriesPage() {
  return (
    <Suspense
      fallback={
        <section className="bg-bg-page">
          <PageLoader title="Loading…" subtitle="Services & categories." fill={false} />
        </section>
      }
    >
      <AdminServicesCategoriesInner />
    </Suspense>
  );
}
