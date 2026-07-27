"use client";

import { home } from "@/components/home/homeTheme";

const ROWS = [
  {
    label: "Document checklist clarity",
    you: "Guided checklist with corrections",
    diy: "Guess from scattered portals",
    agent: "Varies by agent experience",
  },
  {
    label: "Fee transparency",
    you: "Govt + service fees shown upfront",
    diy: "Hidden rework costs later",
    agent: "Often bundled without breakdown",
  },
  {
    label: "Turnaround visibility",
    you: "Clear processing windows per service",
    diy: "Unclear rejection loops",
    agent: "Depends on follow-up quality",
  },
  {
    label: "Secure uploads",
    you: "Encrypted portal workflows",
    diy: "Email / WhatsApp file risk",
    agent: "Mixed handling practices",
  },
];

export function DIYComparisonTable() {
  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <h2 className={home.h2}>FlyOCI vs DIY vs typical agent</h2>
        <p className={home.lead}>See where guided preparation saves rework and delay.</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-card">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.12em] text-accent">
              <tr>
                <th className="px-4 py-3 font-semibold">Capability</th>
                <th className="px-4 py-3 font-semibold">FlyOCI</th>
                <th className="px-4 py-3 font-semibold">DIY</th>
                <th className="px-4 py-3 font-semibold">Typical agent</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-border/80">
                  <td className="px-4 py-3 font-semibold text-dark">{row.label}</td>
                  <td className="px-4 py-3 text-primary">{row.you}</td>
                  <td className="px-4 py-3 text-textMuted">{row.diy}</td>
                  <td className="px-4 py-3 text-textMuted">{row.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
