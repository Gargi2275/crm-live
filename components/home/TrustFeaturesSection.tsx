"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Globe,
  MessageCircle,
  Shield,
  Stamp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { ParallaxBlob } from "@/components/home/HomeScrollMotion";
import { home } from "@/components/home/homeTheme";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
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
    href: "/how-it-works",
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
      "Concise written check reports",
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
      "Assessment fee credited against service",
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
  const accents = ["#33A1FD", "#0F7EE8", "#009877", "#33A1FD", "#0F7EE8", "#009877"];
  const accent = accents[index % accents.length];

  return (
    <motion.div variants={cardItem}>
      <Link href={feature.href} className="group block h-full">
        <motion.article
          whileHover={reduceMotion ? undefined : { y: -8 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className={`relative h-full ${home.card} p-6 transition-all duration-300 group-hover:border-primary/35`}
        >
          <div className="absolute inset-x-0 top-0 h-1 scale-x-0 rounded-t-2xl bg-gradient-to-r from-primary via-accent to-primary transition-transform duration-500 group-hover:scale-x-100" />

          <div className="flex items-start justify-between gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.12, rotate: 5 }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecf6ff]"
            >
              <div style={{ color: accent }}>
                <Icon className="h-5 w-5" />
              </div>
            </motion.div>
            <span className="rounded-full border border-border bg-[#f7fbff] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-textMuted">
              Trusted
            </span>
          </div>

          <h3 className="mt-4 font-heading text-lg font-bold text-dark transition-colors group-hover:text-primary">
            {feature.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">{feature.description}</p>

          <ul className="mt-4 space-y-2">
            {feature.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[13px] text-textMuted">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between border-t border-[#eef4ff] pt-4">
            <span className="text-sm font-semibold text-primary">Learn more</span>
            <motion.span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecf6ff] text-primary"
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
    <section className={home.sectionSoft}>
      <ParallaxBlob
        speed={42}
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.08)_0%,transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(51,161,253,0.06),transparent_50%)]" />

      <div className={home.container}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <h2 className={home.h2}>Why UK &amp; US families trust us</h2>
          <p className={`${home.lead} mx-auto`}>
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
