"use client";

import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Clock, MessageCircle } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  },
};

export function TrustBadges() {
  const badges = [
    { text: "UK-based support", icon: <CheckCircle className="w-5 h-5 text-success" /> },
    { text: "Transparent fixed fees", icon: <ShieldCheck className="w-5 h-5 text-saffron" /> },
    { text: "Secure document uploads", icon: <Clock className="w-5 h-5 text-teal" /> },
    { text: "WhatsApp & email updates", icon: <MessageCircle className="w-5 h-5 text-navy" /> },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="flex flex-wrap justify-center items-center gap-4 py-8"
    >
      {badges.map((badge, index) => (
        <motion.div
          key={index}
          variants={badgeVariants}
          whileHover={{ y: -3, boxShadow: "0 6px 16px rgba(15,31,61,0.08)" }}
          className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-border shadow-[0_2px_8px_rgba(15,31,61,0.04)]"
        >
          {badge.icon}
          <span className="font-body text-sm font-semibold text-navy">{badge.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
