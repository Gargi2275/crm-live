"use client";
import { motion } from "framer-motion";

interface VisaDurationCardProps {
  type: "1-Year" | "5-Year";
  price: string;
  selected: boolean;
  onSelect: () => void;
  bestValue?: boolean;
}

export function VisaDurationCard({ type, price, selected, onSelect, bestValue }: VisaDurationCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative w-full text-left p-4 sm:p-5 rounded-[12px] transition-colors focus:outline-none ${
        selected
          ? "border-2 border-accent bg-[#FFFBF0]"
          : "border-2 border-border bg-white hover:border-[#93C5FD] hover:-translate-y-0.5 hover:shadow-md focus:border-secondary"
      }`}
    >
      {bestValue && (
        <span className="absolute -top-2 -right-2 bg-accent text-primary text-[10px] font-bold px-2 py-1 uppercase rounded-md shadow-sm z-10">
          Best Value
        </span>
      )}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-heading font-extrabold text-primary text-lg sm:text-xl">{type} e-Visa</h4>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-accent bg-accent" : "border-border"
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
      <p className="font-body font-bold text-xl sm:text-2xl text-primary">{price}</p>
    </motion.button>
  );
}
