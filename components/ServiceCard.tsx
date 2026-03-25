"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  price?: string;
}

export function ServiceCard({ icon, title, description, href, price }: ServiceCardProps) {
  const content = (
    <motion.div
      whileHover={{ y: -4, boxShadow: "var(--shadow-md)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-gradient-card rounded-[var(--radius-card,20px)] p-6 sm:p-8 h-full flex flex-col border border-[rgba(0,152,119,0.1)] shadow-card transition-all duration-300 cursor-pointer group"
    >
      <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-accent/10 group-hover:text-accent transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-heading font-bold text-primary mb-3">{title}</h3>
      <p className="text-textMuted font-body leading-relaxed mb-6 flex-grow">
        {description}
      </p>

      <div className="mt-auto flex items-center justify-between">
        {price && (
          <span className="font-mono text-primary font-semibold">{price}</span>
        )}
        {href && (
          <div className="text-accent font-medium flex items-center text-sm group-hover:underline ml-auto">
            Learn More <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
