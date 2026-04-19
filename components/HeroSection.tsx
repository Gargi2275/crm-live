// "use client";

// import { motion } from "framer-motion";
// import { CheckCircle, ShieldCheck, Clock, MessageCircle } from "lucide-react";
// import Link from "next/link";
// import { Button } from "./ui/Button";

// const containerVariants = {
//   hidden: {},
//   visible: {
//     transition: {
//       staggerChildren: 0.15,
//     },
//   },
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: { duration: 0.6, ease: "easeOut" as const },
//   },
// };

// const badges = [
//   { text: "UK-based support", icon: <CheckCircle className="w-4 h-4 text-secondary" /> },
//   { text: "Transparent fixed fees", icon: <ShieldCheck className="w-4 h-4 text-accent" /> },
//   { text: "Secure document uploads", icon: <Clock className="w-4 h-4 text-primary" /> },
//   { text: "WhatsApp & email updates", icon: <MessageCircle className="w-4 h-4 text-primary" /> },
// ];

// export function HeroSection() {
//   return (
//     <section className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-hero">
//       {/* Animated Background Mesh and SVG Shapes */}
//       <motion.div
//         animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
//         transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(0,152,119,0.15)_0%,transparent_70%)] pointer-events-none blur-3xl z-0"
//       />
//       <motion.div
//         animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
//         transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.15)_0%,transparent_70%)] pointer-events-none blur-3xl z-0"
//       />

    

//       <motion.div
//         variants={containerVariants}
//         initial="hidden"
//         animate="visible"
//         className="relative z-10 w-full max-w-4xl mx-auto text-center"
//       >
//         <motion.h1
//           variants={itemVariants}
//           className="font-heading text-dark font-extrabold tracking-tight mb-6 leading-[1.1]"
//           style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
//         >
//           <span className="text-primary font-bold">Hassle-Free</span> OCI, Indian e-Visa & Passport Services <span className="text-accent italic">— Done For You</span>
//         </motion.h1>

//         <motion.p
//           variants={itemVariants}
//           className="font-body text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
//         >
//           For UK & US residents of Indian origin. We handle the forms, documents and appointments so you don&apos;t lose time or miss travel plans.
//         </motion.p>

//         <motion.div
//           variants={itemVariants}
//           className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
//         >
//           <Link href="/document-audit" className="w-full sm:w-auto">
//             <Button variant="primary" className="w-full sm:w-auto text-lg py-4">
//               Get My Documents Checked
//             </Button>
//           </Link>
//           <Link href="/services" className="w-full sm:w-auto">
//             <Button variant="outline" className="w-full sm:w-auto text-lg py-4 bg-white/50 backdrop-blur-sm">
//               View Services & Pricing
//             </Button>
//           </Link>
//         </motion.div>

//         <motion.div
//           variants={itemVariants}
//           className="flex flex-wrap justify-center items-center gap-3 sm:gap-6"
//         >
//           {badges.map((badge, index) => (
//             <motion.div
//               key={index}
//               whileHover={{ y: -3, boxShadow: "0 4px 12px rgba(51,161,253,0.15)" }}
//               className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-badge px-3 py-1 text-sm font-medium text-primary transition-all"
//             >
//               {badge.icon}
//               {badge.text}
//             </motion.div>
//           ))}
//         </motion.div>
//       </motion.div>
//     </section>
//   );
// }



"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Clock, MessageCircle, ChevronRight, IdCard, Plane, BookUser, Stamp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/Button";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const badges = [
  { text: "UK-based support", icon: <CheckCircle className="w-4 h-4 text-secondary" /> },
  { text: "Transparent fixed fees", icon: <ShieldCheck className="w-4 h-4 text-accent" /> },
  { text: "Secure document uploads", icon: <Clock className="w-4 h-4 text-primary" /> },
  { text: "WhatsApp & email updates", icon: <MessageCircle className="w-4 h-4 text-primary" /> },
];

export function HeroSection() {
  const serviceGroups: Array<{
    key: "oci" | "evisa" | "passport" | "apostille";
    label: string;
    tag?: string;
    icon: React.ComponentType<{ className?: string }>;
    options: Array<{ label: string; href: string }>;
  }> = [
    {
      key: "oci",
      label: "OCI Services",
      tag: "Popular",
      icon: IdCard,
      options: [
        { label: "New OCI Card", href: "/services/new-oci" },
        { label: "OCI Renewal / Transfer", href: "/services/oci-renewal" },
        { label: "OCI Update (Gratis)", href: "/services/oci-update" },
      ],
    },
    {
      key: "evisa",
      label: "Indian e-Visa",
      icon: Plane,
      options: [
        { label: "Indian e-Visa", href: "/services/indian-evisa" },
      ],
    },
    {
      key: "passport",
      label: "Passport Services",
      icon: BookUser,
      options: [
        { label: "Indian Passport Renewal", href: "/services/passport-renewal" },
      ],
    },
    {
      key: "apostille",
      label: "Apostille & Attestation",
      icon: Stamp,
      options: [
        { label: "Apostille & Attestation", href: "/apostille-services" },
      ],
    },
  ];

  const [activeGroup, setActiveGroup] = useState<"oci" | "evisa" | "passport" | "apostille" | null>("oci");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => serviceGroups.reduce((acc, group) => {
      acc[group.key] = group.options[0]?.label ?? "";
      return acc;
    }, {} as Record<string, string>),
  );

  const getSelectedHref = (groupKey: string) => {
    const group = serviceGroups.find((item) => item.key === groupKey);
    if (!group) return "/services";
    const selected = selectedOptions[groupKey];
    return group.options.find((opt) => opt.label === selected)?.href || group.options[0]?.href || "/services";
  };

  return (
    <section className="relative bg-[#f8fbff]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full"
      >
        <div className="relative overflow-hidden min-h-screen">
        <Image
          src="/hero_section_banner.jpeg"
          alt="OCI assistance banner"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(98deg,rgba(8,22,52,0.82)_0%,rgba(10,34,82,0.66)_45%,rgba(31,86,183,0.24)_100%)]" />

        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.24)_0%,transparent_70%)] blur-3xl z-0"
        />
        <motion.div
          animate={{ x: [0, -24, 0], y: [0, 14, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(143,206,255,0.3)_0%,transparent_70%)] blur-3xl z-0"
        />

        <div className="relative z-10 h-full px-5 sm:px-8 lg:px-10 pt-24 sm:pt-28 lg:pt-24 pb-8 lg:pb-10">
        <div className={`grid grid-cols-1 ${activeGroup ? "lg:grid-cols-[minmax(0,1fr)_430px]" : "lg:grid-cols-[minmax(0,1fr)_348px]"} gap-6 lg:gap-8 h-full items-start lg:items-center transition-all duration-300`}>
        <div className="max-w-4xl mx-auto lg:mx-0 text-center lg:text-left">
        <motion.h1
          variants={itemVariants}
          className="font-heading text-[26px] sm:text-[38px] lg:text-[52px] font-bold tracking-[-0.02em] leading-[1.06] text-white"
        >
          Hassle-Free OCI,
          <span className="block mt-2 bg-gradient-to-r from-[#9dd3ff] to-white bg-clip-text text-transparent">
            Indian e-Visa and Passport Services
          </span>
          <span className="block mt-2 text-[0.58em] font-semibold text-[#d9e8ff]">Done For You</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-6 text-[14px] sm:text-[16px] text-[#ecf3ff] max-w-[760px] mx-auto lg:mx-0 mb-7 leading-relaxed"
        >
          For UK and US residents of Indian origin. We handle forms, documents, and appointments so you avoid delays and travel stress.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-7"
        >
          <Link href="/auth/login?next=%2Findian-e-visa" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-6 py-3 text-[15px] rounded-md shadow-[0_10px_24px_rgba(28,105,221,0.34)]">
              Start My Application
            </Button>
          </Link>

          <Link href="/document-audit" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto px-6 py-3 text-[15px] rounded-md border-white/70 text-white bg-[#ffffff1a] hover:bg-[#ffffff26]">
              Get My Documents Checked
            </Button>
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center lg:justify-start gap-2"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0b1f45]/45 border border-white/40 shadow-[0_8px_18px_rgba(8,23,56,0.2)] text-[12px] text-white"
            >
              {badge.icon}
              {badge.text}
            </motion.div>
          ))}
        </motion.div>
        </div>

        <motion.aside
          variants={itemVariants}
          className={`w-full ${activeGroup ? "max-w-[430px]" : "max-w-[348px]"} mx-auto lg:mx-0 rounded-2xl border border-[#dbe6f3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.98)_100%)] p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(6,23,54,0.24)] backdrop-blur transition-all duration-300`}
        >
          <div className="mb-3">
            <h3 className="text-[30px] sm:text-[32px] leading-none font-heading font-bold text-[#102A43]">Our Services</h3>
            <p className="mt-1 text-[12px] text-[#627D98]">Select a service to get started</p>
          </div>

          <div className="space-y-2.5">
            {serviceGroups.map((group) => {
              const isOpen = activeGroup === group.key;
              const ServiceIcon = group.icon;
              return (
                <div key={group.key} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? "border-[#5ea9ff] bg-[#f2f8ff] shadow-[0_8px_22px_rgba(19,108,201,0.14)]" : "border-[#D9E1EA] bg-white/95 hover:border-[#bfd6f4]"}`}>
                  <div className="px-2.5 py-2.5">
                    <div className="w-full min-w-0 flex items-center gap-2 px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveGroup((prev) => (prev === group.key ? null : group.key))}
                        className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
                      >
                        <span className="w-7 h-7 rounded-lg bg-[#EAF3FF] border border-[#d5e6ff] flex-shrink-0 inline-flex items-center justify-center">
                          <ServiceIcon className="w-4 h-4 text-[#2d74c4]" />
                        </span>
                        <span className="text-[14px] font-medium text-[#243B53] truncate">{group.label}</span>
                        {group.tag && (
                          <span className="hidden sm:inline-flex rounded-full border border-[#cde2ff] bg-[#eef6ff] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#486581]">
                            {group.tag}
                          </span>
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key={`${group.key}-inline-select`}
                            initial={{ opacity: 0, x: 12, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            <select
                              value={selectedOptions[group.key]}
                              onChange={(event) => setSelectedOptions((prev) => ({ ...prev, [group.key]: event.target.value }))}
                              className="w-[172px] rounded-md border border-[#B9D7FF] bg-white px-2.5 py-1.5 text-[12px] text-[#334E68] focus:outline-none focus:ring-2 focus:ring-[#1c69dd]/20 focus:border-[#1c69dd]"
                            >
                              {group.options.map((option) => (
                                <option key={option.label} value={option.label}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="button"
                        onClick={() => setActiveGroup((prev) => (prev === group.key ? null : group.key))}
                        className="p-1"
                        aria-label={`Toggle ${group.label}`}
                      >
                        <ChevronRight className={`w-4 h-4 text-[#7B8794] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={`${group.key}-cta`}
                          initial={{ opacity: 0, y: -8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pl-9">
                            <Link
                              href={getSelectedHref(group.key)}
                              className="w-full inline-flex items-center justify-center rounded-md bg-[linear-gradient(90deg,#4ea6f5_0%,#136cc9_100%)] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-95"
                            >
                              Get Started
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          
        </motion.aside>

        </div>
        </div>
        </div>
      </motion.div>
    </section>
  );
}