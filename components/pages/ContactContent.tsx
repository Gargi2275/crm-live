"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/pages/PageHero";
import { pageFadeUp } from "@/components/pages/pageMotion";
import { getPublicSupportEmail } from "@/lib/api";
import {
  SUPPORT_EMAIL as DEFAULT_SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_WHATSAPP_HREF,
} from "@/lib/contact";

export function ContactContent() {
  const reduceMotion = useReducedMotion();
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);

  useEffect(() => {
    let cancelled = false;
    getPublicSupportEmail()
      .then((email) => {
        if (!cancelled && email) setSupportEmail(email);
      })
      .catch(() => {
        if (!cancelled) setSupportEmail(DEFAULT_SUPPORT_EMAIL);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const contactItems = useMemo(
    () => [
      {
        icon: Mail,
        title: "Email Us",
        subtitle: "For general inquiries and support.",
        link: { href: `mailto:${supportEmail}`, label: supportEmail },
      },
      {
        icon: MessageCircle,
        title: "WhatsApp (Messages Only)",
        subtitle: "For quick updates and secure communication.",
        link: { href: SUPPORT_WHATSAPP_HREF, label: SUPPORT_PHONE_DISPLAY },
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
    ],
    [supportEmail],
  );

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in Touch"
        description="Have a question about our services or need help deciding where to start? We're here for you. We aim to respond within 24 hours."
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
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={pageFadeUp}
                  initial={reduceMotion ? false : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1c69dd] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-[#102a43]">{item.title}</h3>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#5e7599]">
                        {item.subtitle}
                      </p>
                      {"link" in item && item.link ? (
                        <a
                          href={item.link.href}
                          className="mt-2 inline-block text-sm font-semibold text-[#1c69dd] hover:underline"
                        >
                          {item.link.label}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <ContactForm />
          </motion.div>
        </div>
      </div>
      </section>
    </>
  );
}
