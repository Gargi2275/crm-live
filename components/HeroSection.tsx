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

import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  return (
    <section className="relative min-h-[72vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 lg:pt-32 pb-16 overflow-hidden">
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl mx-auto"
      >
        <div className="max-w-3xl mx-auto text-center">
        <motion.h1
          variants={itemVariants}
          className="font-heading text-[24px] sm:text-[34px] lg:text-[44px] font-bold tracking-[-0.02em] leading-[1.06] text-white"
        >
          Hassle-Free OCI,
          <span className="block mt-2 bg-gradient-to-r from-[#9dd3ff] to-white bg-clip-text text-transparent">
            Indian e-Visa and Passport Services
          </span>
          <span className="block mt-2 text-[0.58em] font-semibold text-[#d9e8ff]">Done For You</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-5 text-[13px] sm:text-[15px] text-[#ecf3ff] max-w-2xl mx-auto mb-6 leading-relaxed"
        >
          For UK and US residents of Indian origin. We handle forms, documents, and appointments so you avoid delays and travel stress.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
        >
          <Link href="/auth/login?next=%2Findian-e-visa" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-6 py-3 text-[15px] rounded-full shadow-[0_10px_24px_rgba(28,105,221,0.34)]">
              Start My Application
            </Button>
          </Link>

          <Link href="/document-audit" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto px-6 py-3 text-[15px] rounded-full border-white/70 text-white bg-[#ffffff1a] hover:bg-[#ffffff26]">
              Get My Documents Checked
            </Button>
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-2"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b1f45]/45 border border-white/40 shadow-[0_8px_18px_rgba(8,23,56,0.2)] text-[12px] text-white"
            >
              {badge.icon}
              {badge.text}
            </motion.div>
          ))}
        </motion.div>
        </div>
      </motion.div>
    </section>
  );
}