"use client";

import type { HubOffering } from "@/lib/api";
import { formatHubMoney } from "@/lib/location-hub";
import { home } from "@/components/home/homeTheme";

type ComparisonTableProps = {
  offerings: HubOffering[];
  currencySymbol: string;
};

export function ComparisonTable({ offerings, currencySymbol }: ComparisonTableProps) {
  if (!offerings.length) return null;

  return (
    <section className={home.sectionSoft}>
      <div className={home.container}>
        <h2 className={home.h2}>Compare services</h2>
        <p className={home.lead}>Side-by-side fees, timing, and validity for this location.</p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-card">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.12em] text-accent">
              <tr>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Processing time</th>
                <th className="px-4 py-3 font-semibold">Govt fees</th>
                <th className="px-4 py-3 font-semibold">Your fees</th>
                <th className="px-4 py-3 font-semibold">Validity</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((row) => (
                <tr key={`cmp-${row.service.id}`} className="border-t border-border/80">
                  <td className="px-4 py-3 font-semibold text-dark">{row.service.service_name}</td>
                  <td className="px-4 py-3 text-textMuted">{row.service.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-dark">{row.processing_time || "—"}</td>
                  <td className="px-4 py-3 text-dark">{formatHubMoney(currencySymbol, row.govt_fee)}</td>
                  <td className="px-4 py-3 text-dark">{formatHubMoney(currencySymbol, row.service_fee)}</td>
                  <td className="px-4 py-3 text-dark">{row.validity || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
