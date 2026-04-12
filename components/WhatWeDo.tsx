import { Poppins, Raleway } from "next/font/google";
import { FileText, RefreshCw, ShieldCheck, IdCard, Plane } from "lucide-react";
import { FadeInUp } from "@/components/FadeInUp";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

type TileTheme = "green" | "blue" | "amber";

type Tile = {
  title: string;
  subtitle: string;
  theme: TileTheme;
  icon: React.ComponentType<{ className?: string }>;
};

const topTiles: Tile[] = [
  {
    title: "New OCI application",
    subtitle: "First-time OCI card, fully prepared",
    theme: "green",
    icon: FileText,
  },
  {
    title: "OCI renewal & transfer",
    subtitle: "New passport or card renewal",
    theme: "green",
    icon: RefreshCw,
  },
  {
    title: "Mandatory OCI update",
    subtitle: "Complex process — we handle it",
    theme: "blue",
    icon: ShieldCheck,
  },
  {
    title: "Indian passport renewal",
    subtitle: "UK & US residents",
    theme: "blue",
    icon: IdCard,
  },
];

const bottomTile: Tile = {
  title: "Indian e-Visa — 1-year & 5-year",
  subtitle: "e-Visa applications prepared, checked and submitted for both validity options",
  theme: "amber",
  icon: Plane,
};

function themeClasses(theme: TileTheme): { wrapper: string; iconWrap: string; icon: string } {
  if (theme === "green") {
    return {
      wrapper: "bg-[#f8fbff] border-[#d9e8fb]",
      iconWrap: "bg-[#edf5ff]",
      icon: "text-[#1c6fd6]",
    };
  }

  if (theme === "blue") {
    return {
      wrapper: "bg-[#f3f8ff] border-[#cfe1f8]",
      iconWrap: "bg-[#e6f1ff]",
      icon: "text-[#1f5fae]",
    };
  }

  return {
    wrapper: "bg-[#f6faff] border-[#d7e6fb]",
    iconWrap: "bg-[#edf5ff]",
    icon: "text-[#2a6fcb]",
  };
}

function InfoTile({ title, subtitle, theme, icon: Icon }: Tile) {
  const themeClass = themeClasses(theme);

  return (
    <article
      className={`rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(22,68,130,0.12)] ${themeClass.wrapper}`}
    >
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${themeClass.iconWrap}`}>
        <Icon className={`h-4.5 w-4.5 ${themeClass.icon}`} />
      </div>

      <h3 className={`${poppins.className} text-[12px] font-semibold leading-[1.4] text-[#102a43]`}>
        {title}
      </h3>
      <p className={`${raleway.className} mt-1 text-[12px] leading-[1.5] text-[#4c6278]`}>
        {subtitle}
      </p>
    </article>
  );
}

export default function WhatWeDo() {
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(51,120,213,0.08),transparent_40%),radial-gradient(circle_at_90%_85%,rgba(51,120,213,0.06),transparent_35%)]" />
      <div className="mx-auto grid grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <FadeInUp>
          <p className={`${poppins.className} text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1b67c8]`}>
            What we do
          </p>

          <h2 className={`${poppins.className} mt-3 text-3xl font-bold leading-tight text-[#102a43] sm:text-4xl`}>
            Everything you need for India travel &amp; OCI -
            <span className="text-[#1b67c8]"> in one place</span>
          </h2>

          <p className={`${raleway.className} mt-5 max-w-xl text-[16px] leading-7 text-[#4c6278]`}>
            FlyOCI is a specialist online service for UK and US residents of Indian origin. We&apos;re a
            <strong> private, independent service</strong> - not a government website. We prepare your
            application and check your documents so your file is right the first time.
          </p>

          <ul className={`${raleway.className} mt-6 space-y-3 text-[15px] leading-6 text-[#2f445b]`}>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1d69ca]" />
              <span>Step-by-step guidance throughout</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1d69ca]" />
              <span>Document check before submission</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#52a77e]" />
              <span>UK &amp; US residents served</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#52a77e]" />
              <span>Private &amp; independent - not government</span>
            </li>
          </ul>
        </FadeInUp>

        <div className="relative z-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topTiles.map((tile, i) => (
              <FadeInUp key={tile.title} delay={i * 0.08}>
                <InfoTile {...tile} />
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.3} className="mt-3">
            <InfoTile {...bottomTile} />
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}