"use client";

type PageLoaderProps = {
  title?: string;
  subtitle?: string;
  /** Fill most of the viewport so the page doesn’t look blank above the footer. */
  fill?: boolean;
};

export function PageLoader({
  title = "Loading…",
  subtitle,
  fill = true,
}: PageLoaderProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-4 ${
        fill ? "min-h-[min(70vh,560px)] py-16" : "py-10"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-md flex-col items-center rounded-3xl border border-[#dce7f8] bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(18,84,150,0.08)] sm:px-8">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-[#dbeafe]" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#1A56DB] border-r-[#1A56DB]/40" />
        </span>
        <p className="mt-5 text-base font-semibold text-[#102A43]">{title}</p>
        {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-[#627D98]">{subtitle}</p> : null}
        <div className="mt-6 w-full space-y-2.5 animate-pulse">
          <div className="mx-auto h-2.5 w-4/5 rounded-full bg-[#eef4ff]" />
          <div className="mx-auto h-2.5 w-3/5 rounded-full bg-[#f3f7fc]" />
          <div className="mx-auto h-16 w-full rounded-2xl bg-[#f7faff]" />
        </div>
      </div>
    </div>
  );
}
