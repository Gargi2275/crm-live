"use client";

import { CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { home } from "@/components/home/homeTheme";

const POINTS = [
  {
    title: "High approval focus",
    body: "We review forms and documents carefully so applications are submitted cleanly the first time.",
    icon: ShieldCheck,
  },
  {
    title: "Clear fixed guidance",
    body: "Know what you need, what it costs, and what happens next — without hidden steps.",
    icon: Sparkles,
  },
  {
    title: "Real updates",
    body: "Stay informed as your case moves through each stage of document prep and filing readiness.",
    icon: Clock3,
  },
  {
    title: "Personal support",
    body: "Specialists help families navigate OCI, passport, and document checks with location-aware fees.",
    icon: CheckCircle2,
  },
];

export function WhyUsGrid() {
  return (
    <section className={home.sectionSoft}>
      <div className={home.container}>
        <h2 className={home.h2}>Why families choose FlyOCI</h2>
        <p className={home.lead}>Practical support built for NRIs — not a DIY portal dump.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className={`${home.card} flex gap-4 p-5`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-primary">
                <point.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-dark">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-textMuted">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
