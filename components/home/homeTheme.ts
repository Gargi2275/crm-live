/** Shared homepage visual language — matches globals.css / tailwind brand tokens. */
export const home = {
  section: "relative overflow-hidden py-12 sm:py-14 lg:py-16",
  sectionSoft: "relative overflow-hidden bg-[#f8fbff] py-12 sm:py-14 lg:py-16",
  sectionWhite: "relative overflow-hidden bg-white py-12 sm:py-14 lg:py-16",
  container: "relative mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8",
  eyebrow:
    "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent",
  h2: "font-heading text-[clamp(1.75rem,3.2vw,2.4rem)] font-bold leading-tight tracking-[-0.02em] text-dark",
  lead: "mt-3 max-w-2xl text-[15px] leading-relaxed text-textMuted sm:text-base",
  card: "rounded-2xl border border-border bg-white shadow-card",
  chip: "rounded-full border border-border bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent",
  linkAccent: "font-semibold text-primary transition-colors hover:text-accent",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-bold text-white shadow-btn transition hover:bg-accent hover:shadow-btn-hover",
  btnDark:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-dark px-4 py-3 text-[14px] font-bold text-white transition hover:bg-primary",
  btnOutline:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-dark transition hover:border-primary/40 hover:bg-[#f3f8ff]",
} as const;
