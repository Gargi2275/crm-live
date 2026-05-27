"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

const links = {
  services: [
    { name: "New OCI Card", href: "/services/new-oci" },
    { name: "OCI Renewal", href: "/services/oci-renewal" },
    { name: "OCI Update", href: "/services/oci-update" },
    { name: "Indian e-Visa", href: "/indian-e-visa" },
    { name: "Passport Renewal", href: "/services/passport-renewal" },
    { name: "Apostille Services", href: "/apostille-services" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQs", href: "/faqs" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Terms & Conditions", href: "/terms-and-conditions" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Refund Policy", href: "/refund-policy" },
    { name: "Cookies", href: "/cookies" },
    { name: "Disclaimer", href: "/disclaimer" },
  ],
};

const support = [
  { icon: Mail, label: "support@flyoci.com" },
  { icon: Phone, label: "Guided callback support" },
  { icon: Clock3, label: "24–48h initial review" },
  { icon: MapPin, label: "Serving global Indians" },
];

const assurances = [
  { icon: ShieldCheck, label: "Encrypted uploads" },
  { icon: FileCheck2, label: "Document checks" },
  { icon: Globe2, label: "UK and US support" },
];

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 py-1 text-md text-slate-900 transition-colors hover:text-sky-600"
    >
      <span>{children}</span>
      <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-sky-500" />
    </Link>
  );
}

function LinkColumn({
  title,
  items,
}: {
  title: string;
  items: { name: string; href: string }[];
}) {
  return (
    <div>
      {/* <h2 className="mt-16 text-[15px] font-bold uppercase tracking-[0.2em] text-sky-900"> */}
     
<h2 className="mt-16 text-[15px] font-extrabold uppercase tracking-[0.2em] text-slate-800">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-0.5">
        {items.map((link) => (
          <FooterLink key={link.name} href={link.href}>
            {link.name}
          </FooterLink>
        ))}
      </div>
    </div>
  );
}

export function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="relative overflow-hidden bg-white text-slate-800">
      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400" />

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0ea5e9 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className={`relative mx-auto px-6 ${compact ? "py-8" : "py-16"} lg:px-8`}>

        {/* ── TOP SECTION: Brand + Nav columns ── */}
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.1fr] lg:items-start">

          {/* Brand block */}
          <div>
            <Link href="/" className="inline-flex bg-white">
              <Image
                src="/logo.png"
                alt="FlyOCI"
                width={150}
                height={65}
                className="h-12 w-auto"
                priority
              />
            </Link>

           <p className="mt-5 max-w-sm text-md leading-7 text-slate-900">
  A private documentation assistance service for families,
  professionals, and frequent travelers who want their paperwork
  prepared cleanly before it reaches the official portal.
</p>
<p className="mt-3 max-w-sm text-md leading-7 text-slate-900">
  We handle the complexity of document preparation so you can focus
  on what matters — your move, your family, your future.
</p>

          </div>

          {/* Nav columns */}
          <LinkColumn title="Services" items={links.services} />
          <LinkColumn title="Company" items={links.company} />

         <div className="flex flex-col gap-8">
  
<LinkColumn title="Legal" items={links.legal} />

</div> 
<div className="flex flex-col gap-4 mt-10">
  <div className="flex flex-wrap gap-2">
    {assurances.map((a) => (
      <div key={a.label} className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700">
        <a.icon className="h-3.5 w-3.5" />
        {a.label}
      </div>
    ))}
  </div>
  <div className="flex flex-col gap-2.5">
    {support.map((item) => (
      <div key={item.label} className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 border border-sky-100">
          <item.icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-md text-slate-700">{item.label}</p>
      </div>
    ))}
  </div>
</div>


</div>

        {/* ── DIVIDER ── */}
        <div className="mt-14 border-t border-slate-100" />

        {/* ── DISCLAIMER ── */}
        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5">
          <p className="text-md leading-6 text-slate-900">
  <span className="font-bold text-slate-900">Disclaimer:</span>{" "}
            FlyOCI is an independent private service provider offering document
            preparation and guidance support. We are not affiliated with the
            Government of India, VFS Global, embassies, or consulates.
            Government fees are paid separately to the respective authorities.
          </p>
        </div>

        {/* ── BOTTOM COPYRIGHT LINE ── */}
        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-md font-semibold text-slate-900">
          Copyright © 2026 FlyOCI. All rights reserved. Maintained by{" "}
          <span className="font-semibold text-sky-600">TechnoAdviser Technologies</span>.
        </div>

      </div>
    </footer>
  );
}