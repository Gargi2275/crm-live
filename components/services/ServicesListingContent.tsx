"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import { CTABanner } from "@/components/CTABanner";
import { UserCheck, Shield, CheckCircle, Globe, FileX, FileText } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const services = [
  {
    title: "New OCI Card",
    description: "End-to-end support for first-time applicants from the UK and US.",
    icon: <UserCheck />,
    href: "/services/new-oci",
    price: "£88 service fee",
  },
  {
    title: "OCI Renewal / Transfer",
    description: "Transfer your existing OCI details to your new passport.",
    icon: <Shield />,
    href: "/services/oci-renewal",
    price: "£78 service fee",
  },
  {
    title: "OCI Update (Gratis)",
    description: "Mandatory updates required by government rules.",
    icon: <CheckCircle />,
    href: "/services/oci-update",
    price: "£50 service fee",
  },
  {
    title: "Indian e-Visa",
    description: "1-Year & 5-Year tourist and business e-Visas.",
    icon: <Globe />,
    href: "/services/indian-evisa",
    price: "£88 (1-Year) · £150 (5-Year)",
  },
  {
    title: "Indian Passport Renewal",
    description: "Renewing Indian passports for NRIs living abroad.",
    icon: <FileX />,
    href: "/services/passport-renewal",
    price: "Price on request",
  },
  {
    title: "Apostille & Attestation",
    description: "Document legalisation guidance and support with free pre-check.",
    icon: <FileText />,
    href: "/apostille-services",
    price: "Free pre-check",
  },
];

export function ServicesListingContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-14 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#dcecff] blur-3xl motion-safe:animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[#edf5ff] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c69dd] shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              FlyOCI Services
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-heading text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-tight tracking-[-0.02em] text-[#041020]"
            >
              Our Services
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-relaxed text-[#334e68] sm:text-lg"
            >
              FlyOCI offers end-to-end support for OCI cards, Indian e-Visas and Indian passport renewals for UK & US residents. Choose the service that fits your situation, or start with a Document Audit if you&apos;re unsure.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/document-audit" className="group">
                <motion.span
                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1c69dd] to-[#2563eb] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(28,105,221,0.35)]"
                >
                  Start Document Audit
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </Link>
              <Link href="/contact" className="group">
                <motion.span
                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#cfe2ff] bg-white px-6 py-3.5 text-sm font-bold text-[#1c69dd] shadow-sm transition-shadow hover:shadow-md"
                >
                  Ask a Question
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          >
            {services.map((service) => (
              <motion.div key={service.title} variants={fadeUp} className="h-full">
                <ServiceCard {...service} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
