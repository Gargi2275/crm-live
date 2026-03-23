"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/managed cookies
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      // Small delay before showing banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleManage = () => {
    // Navigate to cookie policy/preferences or open modal
    localStorage.setItem("cookieConsent", "managed");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pb-6 sm:pb-8 pointer-events-none"
        >
          <div className="max-w-7xl mx-auto">
            <div className="bg-navy rounded-2xl p-6 shadow-2xl border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-6 pointer-events-auto">
              <p className="text-gray-300 font-body text-sm leading-relaxed max-w-4xl">
                This website uses cookies to improve your experience and to help us understand how our services are used. By continuing to use this site, you agree to our use of cookies. You can manage preferences in your browser settings.
              </p>
              
              <div className="flex flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleManage}
                  className="flex-1 lg:flex-none border-gray-600 text-gray-300 hover:text-white hover:border-white py-2"
                >
                  Manage Preferences
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleAccept}
                  className="flex-1 lg:flex-none py-2"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
