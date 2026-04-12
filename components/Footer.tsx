"use client";

import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import Image from "next/image";

const links = {
  services: [
    { name: "New OCI Card", href: "/services/new-oci" },
    { name: "OCI Renewal", href: "/services/oci-renewal" },
    { name: "OCI Update", href: "/services/oci-update" },
    { name: "Indian e-Visa", href: "/indian-e-visa" },
    { name: "Passport Renewal", href: "/services/passport-renewal" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQs", href: "/faqs" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Disclaimer", href: "/disclaimer" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
};

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <li>
    <Link href={href} className="text-[#5f7388] hover:text-primary transition-colors relative group block py-1 overflow-hidden">
      {children}
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary/70 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
    </Link>
  </li>
);

export function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] border-t border-t-primary/20 ${compact ? "pt-10 pb-8" : "pt-20 pb-10"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${compact ? "gap-8 mb-10" : "gap-12 mb-16"}`}>
          {/* Brand Col */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <Image
                              src="/logo.png"
                              alt="FlyOCI Logo"
                              width={120}
                              height={40}
                              className="h-10 w-auto"
                              priority
                            />
            </Link>
            <p className="text-[#5f7388] leading-relaxed font-body text-sm">
              Helping UK and US residents of Indian origin with OCI cards, Indian e-Visas, and passport renewals. Expert document audit and end-to-end support.
            </p>
            <div className="flex space-x-4">
              <a href="mailto:hello@flyoci.com" className="text-[#5f7388] hover:text-primary transition-colors" aria-label="Email Us">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#5f7388] hover:text-primary transition-colors" aria-label="WhatsApp Us">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-dark font-heading font-semibold text-lg mb-6">Services</h3>
            <ul className="space-y-3 font-body text-sm">
              {links.services.map((link) => (
                <FooterLink key={link.name} href={link.href}>
                  {link.name}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-dark font-heading font-semibold text-lg mb-6">Company</h3>
            <ul className="space-y-3 font-body text-sm">
              {links.company.map((link) => (
                <FooterLink key={link.name} href={link.href}>
                  {link.name}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-dark font-heading font-semibold text-lg mb-6">Legal</h3>
            <ul className="space-y-3 font-body text-sm">
              {links.legal.map((link) => (
                <FooterLink key={link.name} href={link.href}>
                  {link.name}
                </FooterLink>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer Line */}
        <div className={`border-t border-primary/15 ${compact ? "pt-5 mt-5" : "pt-8 mt-8"}`}>
          <div className={`p-4 rounded-xl bg-bg-blue/55 border border-primary/20 shadow-[0_8px_22px_rgba(51,161,253,0.12)] ${compact ? "mb-4" : "mb-6"}`}>
            <p className="text-[#60788f] text-xs text-center leading-relaxed">
              <strong>Disclaimer:</strong> FlyOCI is an independent private service. We are not affiliated with any government, consulate or embassy. We charge a fee for our professional form-filling, document audit, and full application management services. Government fees are paid directly to the respective authorities.
            </p>
          </div>
          <div className="text-center text-[#6f8498] text-sm flex flex-col items-center">
            <p>&© COPYRIGHT 2025 |  All Rights Reserved | Developed & Maintain by TechnoAdviser</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
