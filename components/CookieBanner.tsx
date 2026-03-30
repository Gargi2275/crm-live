"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/managed cookies
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      // Show immediately to avoid late layout perception shifts during scrolling.
      setIsVisible(true);
    }
  }, []);

  const trackConsent = async (status: string, referred_from: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/cookies/consent/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          essential_accepted: true,
          analytics_accepted: status === "accepted",
          marketing_accepted: status === "accepted",
          preferences_accepted: false,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          referred_from,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to track cookie consent:", response.statusText);
      }
    } catch (error) {
      console.warn("Error tracking cookie consent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    trackConsent("accepted", "cookie_banner");
    setIsVisible(false);
  };

  const handleManage = () => {
    localStorage.setItem("cookieConsent", "managed");
    trackConsent("managed", "cookie_banner");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pb-6 sm:pb-8 pointer-events-none will-change-transform"
          style={{ overflowAnchor: "none" }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="bg-primary rounded-2xl p-6 shadow-2xl border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-6 pointer-events-auto">
              <p className="text-gray-300 font-body text-sm leading-relaxed max-w-4xl">
                This website uses cookies to improve your experience. Essential cookies are required for functionality and security. You can learn more by visiting our{" "}
                <a href="/cookies" className="underline hover:text-white transition-colors">
                  cookie policy
                </a>
                .
              </p>

              <div className="flex flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={isLoading}
                  className="flex-1 lg:flex-none border-gray-600 text-gray-300 hover:text-white hover:border-white py-2 disabled:opacity-50"
                >
                  Manage
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="flex-1 lg:flex-none py-2 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Accept"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
