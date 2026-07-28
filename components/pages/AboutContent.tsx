"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Clock,
  Globe,
  Heart,
  IdCard,
  Plane,
  Shield,
  ShieldCheck,
  Stamp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CTABanner } from "@/components/CTABanner";
import { PageHero } from "@/components/pages/PageHero";
import { pageContainer, pageFadeUp } from "@/components/pages/pageMotion";

const values = [
  { title: "Clarity", description: "We explain requirements in simple language — no jargon, no guesswork.", icon: Clock },
  { title: "Honesty", description: "Fixed transparent fees and realistic timelines. We tell you what to expect upfront.", icon: Shield },
  { title: "Care", description: "Patient support for elderly parents, families, and complex document cases.", icon: Heart },
];

const stats = [
  { label: "Families supported", value: "500+" },
  { label: "Avg. review turnaround", value: "24–48 hrs" },
  { label: "Regions served", value: "UK & US" },
  { label: "Services covered", value: "OCI · Visa · Passport" },
];

const services = [
  { title: "New OCI Card", desc: "First-time OCI from the UK or US", icon: IdCard, href: "/services/new-oci" },
  { title: "OCI Renewal", desc: "Transfer to a new passport", icon: ShieldCheck, href: "/services/oci-renewal" },
  { title: "Indian e-Visa", desc: "1-year and 5-year options", icon: Plane, href: "/services/indian-evisa" },
  { title: "Passport Renewal", desc: "Fixed-fee NRI renewals", icon: Globe, href: "/services/passport-renewal" },
  { title: "Apostille", desc: "Catalog fees — same guided journey", icon: Stamp, href: "/apostille-services" },
];

const differentiators = [
  "Document-first approach — we check papers before forms",
  "Clear written feedback on what to fix or add",
  "WhatsApp and email updates at every milestone",
  "Independent service — not a government website",
];

export function AboutContent() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <PageHero
        eyebrow="About FlyOCI"
        title="About FlyOCI"
        description="FlyOCI was built for Indian-origin families in the UK and US who want OCI, e-Visa, and passport work done properly — without confusion, hidden steps, or costly mistakes."
        highlights={[
          { label: "Focus", value: "OCI, e-Visa, Passport" },
          { label: "Approach", value: "Document-first guidance" },
          { label: "Audience", value: "UK & US residents" },
        ]}
      />

      {/* Story */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-3xl border border-[#d9e8ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f0f7ff] p-6 shadow-[0_16px_48px_rgba(30,74,135,0.1)] sm:p-10 lg:p-12"
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center lg:gap-12">
              <div>
                <h2 className="font-heading text-2xl font-black text-[#041020] sm:text-3xl">Our Story</h2>
                <p className="mt-4 text-base font-medium leading-relaxed text-[#486581] sm:text-lg">
                  Government rules change often. Forms are technical. A single name mismatch or wrong photo can add weeks of delay. FlyOCI exists to make this journey predictable — especially for families managing applications for parents, children, or spouses abroad.
                </p>
                <p className="mt-4 text-base font-medium leading-relaxed text-[#486581]">
                  We combine practical checklists, secure uploads, expert document review, and hands-on support until your OCI card, e-Visa, or passport is issued. We are an independent service — not affiliated with any government body or VFS.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {stats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={reduceMotion ? undefined : { y: -4 }}
                    className="rounded-2xl border border-[#d9e8ff] bg-white p-4 text-center shadow-[0_8px_22px_rgba(30,74,135,0.07)]"
                  >
                    <p className="font-heading text-xl font-black text-[#1c69dd] sm:text-2xl">{stat.value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#627d98]">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission + Why */}
      <section className="bg-[#f7fbff] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid gap-6 lg:grid-cols-2 lg:gap-8"
          >
            <motion.div
              variants={pageFadeUp}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="rounded-3xl border border-[#d9e8ff] bg-white p-6 shadow-[0_12px_32px_rgba(30,74,135,0.08)] sm:p-8"
            >
              <h2 className="font-heading text-2xl font-black text-[#041020]">Why We Exist</h2>
              <p className="mt-4 font-medium leading-relaxed text-[#486581]">
                Many applicants spend hours on portals only to discover missing affidavits, apostille, or photo rejections. We catch those issues early and guide the fix before submission.
              </p>
              <ul className="mt-6 space-y-3">
                {differentiators.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm font-semibold text-[#334e68]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1c69dd]" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={pageFadeUp}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="rounded-3xl border border-[#d9e8ff] bg-gradient-to-br from-[#041020] to-[#0f4cad] p-6 text-white shadow-[0_16px_40px_rgba(4,16,32,0.2)] sm:p-8"
            >
              <Users className="h-10 w-10 text-white/90" />
              <h2 className="mt-4 font-heading text-2xl font-black">Who We Help</h2>
              <p className="mt-4 font-medium leading-relaxed text-white/85">
                UK and US residents of Indian origin applying for themselves, their parents, children, or spouses — including cases with name changes, multi-country documents, or first-time OCI.
              </p>
              <Link
                href="/services"
                className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#041020] transition-transform hover:scale-[1.02]"
              >
                Browse our services
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services grid */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]"
          >
            What We Help With
          </motion.h2>
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
          >
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.title} variants={pageFadeUp}>
                  <Link
                    href={s.href}
                    className="group flex h-full flex-col rounded-2xl border border-[#d9e8ff] bg-[#f8fbff] p-5 transition-all hover:-translate-y-1 hover:border-[#1c69dd]/30 hover:bg-white hover:shadow-[0_14px_36px_rgba(28,105,221,0.12)]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#1c69dd] transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg font-black text-[#041020] group-hover:text-[#1c69dd]">{s.title}</h3>
                    <p className="mt-1 text-sm font-medium text-[#486581]">{s.desc}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f7fbff] py-14 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-black text-[#041020]"
          >
            Our Core Values
          </motion.h2>
          <motion.div
            variants={pageContainer}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:gap-8"
          >
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  variants={pageFadeUp}
                  whileHover={reduceMotion ? undefined : { y: -8, scale: 1.02 }}
                  className="group flex h-full flex-col items-center rounded-3xl border border-[#d9e8ff] bg-white p-8 text-center shadow-[0_12px_32px_rgba(30,74,135,0.08)] transition-all hover:border-[#1c69dd]/25 hover:shadow-[0_20px_48px_rgba(28,105,221,0.14)] sm:p-10"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf3ff] text-[#1c69dd] transition-transform group-hover:scale-110">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 font-heading text-xl font-black text-[#041020] group-hover:text-[#1c69dd] sm:text-2xl">
                    {v.title}
                  </h3>
                  <p className="font-medium leading-relaxed text-[#486581]">{v.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
