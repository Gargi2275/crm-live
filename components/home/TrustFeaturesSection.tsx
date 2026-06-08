"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Globe,
  MessageCircle,
  Shield,
  ShieldCheck,
  Stamp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type TrustFeature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  points: string[];
  href: string;
};

const trustFeatures: TrustFeature[] = [
  {
    title: "Specialised Focus",
    description: "We only handle OCI, Indian passports, e-Visas and apostille.",
    icon: Globe,
    points: [
      "OCI, e-Visa, passport & apostille only",
      "Rules for UK & US applicants",
      "Avoid generic travel-agency gaps",
    ],
    href: "/services",
  },
  {
    title: "Expert Checks",
    description: "We reduce rejections by catching issues upfront.",
    icon: Shield,
    points: [
      "Name, DOB & document cross-checks",
      "Photo and biometric validation",
      "Pre-submission file review",
    ],
    href: "/document-audit",
  },
  {
    title: "Apostille Services",
    description: "Full guidance on legalisation and attestation.",
    icon: Stamp,
    points: [
      "Apostille for birth, marriage & degree certs",
      "Notarisation & translation guidance",
      "Track status from start to finish",
    ],
    href: "/apostille-services",
  },
  {
    title: "Clear Comms",
    description: "WhatsApp & email support directly with humans.",
    icon: MessageCircle,
    points: [
      "Human replies via WhatsApp and email",
      "Concise written audit reports",
      "Guidance at each next step",
    ],
    href: "/contact",
  },
  {
    title: "Fixed Fees",
    description: "Transparent pricing without surprises.",
    icon: CheckCircle,
    points: [
      "Clear service vs government fees",
      "Audit fee credited against service",
      "No hidden extras in our quote",
    ],
    href: "/pricing",
  },
  {
    title: "Step Guidance",
    description: "Especially helpful for elderly or first-timers.",
    icon: UserCheck,
    points: [
      "Step-by-step checklists",
      "Help with form completion",
      "Phone/WhatsApp assistance for seniors",
    ],
    href: "/how-it-works",
  },
];

function TrustCard({ feature, index }: { feature: TrustFeature; index: number }) {
  const Icon = feature.icon;
  const reduceMotion = useReducedMotion();
  const accents = ["#1c69dd", "#2563eb", "#7c3aed", "#059669", "#1d4ed8", "#0f4cad"];
  const accent = accents[index % accents.length];

  return (
    <motion.div variants={cardItem}>
      <Link href={feature.href} className="group block h-full">
        <motion.article
          whileHover={reduceMotion ? undefined : { y: -10 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="relative h-full overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-6 shadow-[0_8px_28px_rgba(30,74,135,0.07)] transition-all duration-300 group-hover:border-[#1c69dd]/30 group-hover:shadow-[0_24px_56px_rgba(28,105,221,0.14)]"
        >
          <div className="absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-[#1c69dd] via-[#60a5fa] to-[#1c69dd] transition-transform duration-500 group-hover:scale-x-100" />

          <div className="flex items-start justify-between gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.12, rotate: 5 }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] shadow-inner"
            >
              <div style={{ color: accent }}>
                <Icon className="h-5 w-5" />
              </div>
            </motion.div>
            <span className="rounded-full border border-[#dbeafe] bg-[#f8fbff] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#486581]">
              Trusted
            </span>
          </div>

          <h3 className="mt-4 font-heading text-lg font-bold text-[#041020] transition-colors group-hover:text-[#1c69dd]">
            {feature.title}
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[#486581]">{feature.description}</p>

          <ul className="mt-4 space-y-2">
            {feature.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[13px] font-medium text-[#334e68]">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between border-t border-[#eef4ff] pt-4">
            <span className="text-sm font-bold text-[#1c69dd]">Learn more</span>
            <motion.span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff6ff] text-[#1c69dd]"
              whileHover={reduceMotion ? undefined : { x: 4 }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}

export function TrustFeaturesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#f8fbff] py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(28,105,221,0.06),transparent_50%)]" />

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Why trust us
          </div>
          <h2 className="font-heading text-3xl font-black text-[#041020] md:text-4xl">
            Why UK &amp; US Families Trust Us
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-relaxed text-[#486581]">
            A specialist process, clear communication, and transparent pricing from start to finish.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {trustFeatures.map((feature, i) => (
            <TrustCard key={feature.title} feature={feature} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
