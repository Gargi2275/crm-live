"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
}

interface CarouselProps {
  items: Testimonial[];
}

export function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [items.length, isHovered]);

  return (
    <div 
      className="relative max-w-3xl mx-auto w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-center mb-6 space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-6 h-6 fill-saffron text-saffron" />
        ))}
      </div>
      
      <div className="min-h-[160px] flex items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full"
          >
            <blockquote className="text-xl md:text-2xl font-heading text-navy leading-relaxed mb-6">
              "{items[currentIndex].quote}"
            </blockquote>
            <p className="font-body text-textMuted font-medium">
              — {items[currentIndex].author}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center mt-8 space-x-3">
        {items.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentIndex(index)}
            animate={{ 
              scale: currentIndex === index ? 1.3 : 1,
              backgroundColor: currentIndex === index ? "#F5A623" : "#E5E7EB"
            }}
            transition={{ duration: 0.3 }}
            className="w-2.5 h-2.5 rounded-full focus:outline-none"
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
