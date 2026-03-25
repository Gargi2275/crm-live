"use client";
import { motion } from "framer-motion";

interface PurposePillsProps {
  selected: string;
  onSelect: (val: string) => void;
}

const PURPOSES = ["Tourism", "Business", "Medical", "Conference", "Other"];

export function PurposePills({ selected, onSelect }: PurposePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PURPOSES.map((purpose) => {
        const isSelected = selected === purpose;
        return (
          <motion.button
            key={purpose}
            type="button"
            onClick={() => onSelect(purpose)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className={`px-4 py-2 rounded-badge font-body text-sm transition-colors focus:outline-none ${
              isSelected
                ? "bg-accent border border-accent text-primary font-bold"
                : "border border-border bg-white text-primary font-normal hover:border-accent hover:text-accent focus:border-accent"
            }`}
          >
            {purpose}
          </motion.button>
        );
      })}
    </div>
  );
}
