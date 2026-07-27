"use client";

type ServiceFilterTabsProps = {
  categories: { slug: string; name: string }[];
  active: string;
  onChange: (slug: string) => void;
};

export function ServiceFilterTabs({ categories, active, onChange }: ServiceFilterTabsProps) {
  const tabs = [{ slug: "all", name: "All" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.slug;
        return (
          <button
            key={tab.slug}
            type="button"
            onClick={() => onChange(tab.slug)}
            className={
              isActive
                ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-btn"
                : "rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-dark transition hover:border-primary/40 hover:bg-[#f3f8ff]"
            }
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
