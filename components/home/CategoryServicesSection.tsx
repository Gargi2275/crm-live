"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePublicPricing } from "@/hooks/usePublicPricing";
import { groupServicesByCategory } from "@/lib/service-categories";
import { home } from "@/components/home/homeTheme";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function CategoryCardSkeleton() {
  return (
    <div className={`${home.card} animate-pulse p-6 sm:p-7`}>
      <div className="h-6 w-3/4 rounded bg-[#ecf6ff]" />
      <div className="mt-3 h-4 w-full rounded bg-[#f2f8ff]" />
      <div className="mt-2 h-4 w-5/6 rounded bg-[#f2f8ff]" />
      <div className="mt-5 flex flex-wrap gap-2">
        <div className="h-8 w-24 rounded-lg bg-[#ecf6ff]" />
        <div className="h-8 w-28 rounded-lg bg-[#ecf6ff]" />
      </div>
      <div className="mt-6 h-10 w-36 rounded-lg bg-[#dbeafe]" />
    </div>
  );
}

export function CategoryServicesSection() {
  const reduceMotion = useReducedMotion();
  const { services, loading } = usePublicPricing();

  const groups = useMemo(() => groupServicesByCategory(services), [services]);

  return (
    <section className={home.sectionWhite}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(51,161,253,0.06),transparent_40%),radial-gradient(circle_at_90%_100%,rgba(15,126,232,0.05),transparent_35%)]" />

      <div className={home.container}>
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={container}
          className="mb-10 max-w-3xl"
        >
          <motion.p variants={fadeUp} className={`${home.eyebrow} mb-3`}>
            Our services
          </motion.p>
          <motion.h2 variants={fadeUp} className={home.h2}>
            Choose the service category you need
          </motion.h2>
          <motion.p variants={fadeUp} className={home.lead}>
            Browse by category, then pick the exact service. Every path starts with clear guidance and
            document checks.
          </motion.p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={container}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {groups.map((group) => (
              <motion.article
                key={group.id}
                variants={fadeUp}
                className={`flex h-full flex-col ${home.card} p-6 sm:p-7`}
              >
                <h3 className="font-heading text-xl font-bold leading-snug text-dark sm:text-[1.35rem]">
                  {group.title}
                </h3>
                <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-textMuted">
                  {group.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {group.services.map((service) => (
                    <Link
                      key={String(service.id)}
                      href={service.href}
                      className="rounded-lg border border-[#e8f0f8] bg-[#f7fbff] px-3 py-1.5 text-xs font-semibold text-textMuted transition-colors hover:border-primary/40 hover:bg-[#ecf6ff] hover:text-primary"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                  <Link
                    href={group.href}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-btn transition-colors hover:bg-accent"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
