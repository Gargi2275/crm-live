"use client";

import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/Button";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const badges = [
  { text: "UK-based support", icon: <CheckCircle className="w-4 h-4 text-success" /> },
  { text: "Transparent fixed fees", icon: <ShieldCheck className="w-4 h-4 text-saffron" /> },
  { text: "Secure document uploads", icon: <Clock className="w-4 h-4 text-teal" /> },
  { text: "WhatsApp & email updates", icon: <MessageCircle className="w-4 h-4 text-navy" /> },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Animated Background Mesh */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-saffron opacity-10 filter blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal opacity-10 filter blur-[100px] pointer-events-none"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-4xl mx-auto text-center"
      >
        <motion.h1 
          variants={itemVariants}
          className="font-heading text-4xl sm:text-5xl lg:text-7xl text-navy font-bold tracking-tight mb-6 leading-[1.1]"
        >
          Hassle-Free OCI, Indian e-Visa & Passport Services <span className="text-saffron">— Done For You</span>
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="font-body text-lg sm:text-xl text-textMuted max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          For UK & US residents of Indian origin. We handle the forms, documents and appointments so you don&apos;t lose time or miss travel plans.
        </motion.p>

        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <Link href="/document-audit" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto text-lg py-4">
              Get My Documents Checked
            </Button>
          </Link>
          <Link href="/services" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto text-lg py-4 bg-white/50 backdrop-blur-sm">
              View Services & Pricing
            </Button>
          </Link>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center items-center gap-3 sm:gap-6"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -3, boxShadow: "0 4px 12px rgba(15,31,61,0.08)" }}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm text-sm font-medium text-navy transition-all"
            >
              {badge.icon}
              {badge.text}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
