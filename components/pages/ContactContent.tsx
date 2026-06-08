"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/pages/PageHero";
import { pageFadeUp } from "@/components/pages/pageMotion";

const contactItems = [
  {
    icon: Mail,
    title: "Email Us",
    subtitle: "For general inquiries and support.",
    link: { href: "mailto:support@flyoci.com", label: "support@flyoci.com" },
  },
  {
    icon: MessageCircle,
    title: "WhatsApp (Messages Only)",
    subtitle: "For quick updates and secure communication.",
    link: { href: "https://wa.me/447000000000", label: "+44 7000 000000" },
  },
  {
    icon: Clock,
    title: "Business Hours",
    subtitle: "Mon-Fri: 9:00 AM - 6:00 PM (GMT)\nSat-Sun: Closed",
  },
  {
    icon: MapPin,
    title: "Operations",
    subtitle: "Online Service Provider\nServing UK & US Residents globally.",
  },
];

export function ContactContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in Touch"
        description="Whether you need a Document Audit, have a question about our services, or need help deciding, we're here for you. We aim to respond within 24 hours."
        highlights={[
          { label: "Response", value: "Within 24 hours" },
          { label: "Channel", value: "Email + WhatsApp" },
          { label: "Coverage", value: "UK & US residents" },
        ]}
      />

      <section className="bg-white pb-24 pt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6 lg:col-span-2"
          >
            <h2 className="font-heading text-2xl font-black text-[#041020]">Contact Information</h2>

            <div className="space-y-4">
              {contactItems.map((item) => (
                <motion.div
                  key={item.title}
                  variants={pageFadeUp}
                  whileHover={reduceMotion ? undefined : { x: 6 }}
                  className="group flex items-start gap-4 rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-[#dbeafe] hover:bg-white hover:shadow-[0_8px_24px_rgba(30,74,135,0.08)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#1c69dd] transition-transform group-hover:scale-110">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[#041020]">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm font-medium text-[#486581]">{item.subtitle}</p>
                    {item.link && (
                      <a
                        href={item.link.href}
                        className="mt-1 inline-block text-sm font-bold text-[#1c69dd] transition-colors hover:underline"
                      >
                        {item.link.label}
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3"
          >
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="overflow-hidden rounded-3xl border border-[#d9e8ff] bg-white p-1 shadow-[0_16px_48px_rgba(30,74,135,0.1)] sm:p-3"
            >
              <div className="h-1 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd]" />
              <div className="p-4 sm:p-6">
                <ContactForm />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-6 text-center sm:p-8"
        >
          <p className="text-sm font-bold uppercase tracking-wide text-[#2b5e93]">Quick links</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "Pricing", href: "/pricing" },
              { label: "FAQs", href: "/faqs" },
              { label: "Document Audit", href: "/document-audit" },
              { label: "Services", href: "/services" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-[#cfe2ff] bg-white px-4 py-2 text-sm font-bold text-[#1c69dd] transition-all hover:-translate-y-0.5 hover:border-[#1c69dd]/30 hover:shadow-md"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
      </section>
    </>
  );
}
