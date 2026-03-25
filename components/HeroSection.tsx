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
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-32 pb-16 bg-hero overflow-hidden">
      
      {/* ✅ Softer background (less distracting) */}
      <motion.div
        animate={{ x: [0, 26, 0], y: [0, -14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.18)_0%,transparent_70%)] blur-3xl z-0"
      />
      <motion.div
        animate={{ x: [0, -26, 0], y: [0, 18, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.14)_0%,transparent_70%)] blur-3xl z-0"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-3xl mx-auto text-center"
      >
        {/* ✅ Fixed heading (balanced + gradient only on key text) */}
<motion.h1
  className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight"
>
  <span className="text-[#0B1F3A]">
    Hassle-Free
  </span>{" "}
  
  <span className="bg-gradient-to-r from-[#33A1FD] to-[#1E7ED8] bg-clip-text text-transparent">
    OCI, e-Visa & Passport
  </span>{" "}
  
  <span className="text-[#0B1F3A]">
    Services
  </span>
</motion.h1>

        {/* ✅ Supporting text */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-muted max-w-xl mx-auto mb-8 leading-relaxed"
        >
          For UK & US residents of Indian origin. We handle the forms, documents and appointments so you don&apos;t lose time or miss travel plans.
        </motion.p>

        {/* ✅ Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
        >
          <Link href="/document-audit" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-6 py-3 text-base rounded-full">
              Get Documents Checked
            </Button>
          </Link>

          <Link href="/services" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto px-6 py-3 text-base rounded-full bg-white/75">
              View Services & Pricing
            </Button>
          </Link>
        </motion.div>

        {/* ✅ Badges */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-3"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-primary/15 shadow-[0_8px_18px_rgba(51,161,253,0.12)] text-sm text-[#365067]"
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