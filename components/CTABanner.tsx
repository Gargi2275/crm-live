"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "./ui/Button";

export function CTABanner() {
  return (
    <section className="bg-[linear-gradient(135deg,#eef7ff_0%,#f8fcff_45%,#ffffff_100%)] py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-y border-primary/15">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary opacity-20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-primary opacity-15 rounded-full blur-[90px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true}}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-heading font-bold text-dark mb-6"
        >
          Ready to Start?
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg md:text-xl text-textMuted font-body mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Whether you need a new OCI, an update, an e-Visa or passport renewal, the first step is the same — get your documents checked.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link href="/document-audit">
            <Button variant="primary" className="text-lg py-4 px-8 shadow-[0_12px_30px_rgba(51,161,253,0.35)] hover:shadow-[0_16px_36px_rgba(51,161,253,0.45)]">
              Start My Document Audit
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
