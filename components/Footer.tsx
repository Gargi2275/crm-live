"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MessageCircle } from "lucide-react";
import { FlyOCILogo } from "./FlyOCILogo";

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
    <Link href={href} className="text-gray-400 hover:text-gray-300 transition-colors relative group block py-1">
      {children}
      <motion.span
        className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-300 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
      />
    </Link>
  </li>
);

export function Footer() {
  return (
    <footer className="bg-dark pt-20 pb-10 border-t-4 border-t-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Col */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <FlyOCILogo className="text-3xl" textClassName="!text-white" />
            </Link>
            <p className="text-gray-400 leading-relaxed font-body text-sm">
              Helping UK and US residents of Indian origin with OCI cards, Indian e-Visas, and passport renewals. Expert document audit and end-to-end support.
            </p>
            <div className="flex space-x-4">
              <a href="mailto:hello@flyoci.com" className="text-gray-400 hover:text-white transition-colors" aria-label="Email Us">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="WhatsApp Us">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-heading font-semibold text-lg mb-6">Services</h3>
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
            <h3 className="text-white font-heading font-semibold text-lg mb-6">Company</h3>
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
            <h3 className="text-white font-heading font-semibold text-lg mb-6">Legal</h3>
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
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="p-4 rounded-lg bg-gray-800/50 mb-6 border border-gray-700/50">
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              <strong>Disclaimer:</strong> FlyOCI is an independent private service. We are not affiliated with any government, consulate or embassy. We charge a fee for our professional form-filling, document audit, and full application management services. Government fees are paid directly to the respective authorities.
            </p>
          </div>
          <div className="text-center text-gray-500 text-sm flex flex-col items-center">
            <p>&copy; {new Date().getFullYear()} FlyOCI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
