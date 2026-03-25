"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "./ui/Button";

interface PricingItem {
  name: string;
  price: string;
  creditApplied?: string;
  popular?: boolean;
}

interface PricingTableProps {
  items: PricingItem[];
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function PricingTable({ items }: PricingTableProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="overflow-x-auto">
        <motion.table
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="w-full text-left border-collapse"
        >
          <thead>
            <tr className="border-b-2 border-border">
              <th className="py-4 px-6 text-primary font-heading font-bold text-lg">Service</th>
              <th className="py-4 px-6 text-primary font-heading font-bold text-lg">Our Fee</th>
              <th className="py-4 px-6 text-primary font-heading font-bold text-lg hidden sm:table-cell">With Audit Credit</th>
              <th className="py-4 px-6"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <motion.tr
                key={index}
                variants={rowVariants}
                className="border-b border-border hover:bg-bg-blue/45 transition-colors group"
              >
                <td className="py-5 px-6 font-body font-medium text-primary flex items-center">
                  {item.name}
                  {item.popular && (
                    <span className="ml-3 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                </td>
                <td className="py-5 px-6 font-mono font-semibold text-lg text-primary">
                  {item.price}
                </td>
                <td className="py-5 px-6 hidden sm:table-cell">
                  {item.creditApplied ? (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="inline-block bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium border border-primary/25"
                    >
                      {item.creditApplied}
                    </motion.div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-5 px-6 text-right">
                  <Link href="/contact">
                    <Button variant="outline" className="py-2 px-4 text-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                      Select
                    </Button>
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </motion.table>
      </div>
      <p className="text-xs text-textMuted mt-4 text-center">
        * Prices are per applicant and exclude courier/postage where applicable. Government fees are clearly mentioned if included.
      </p>
    </div>
  );
}
