"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

export function CheckoutButton() {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.origin + "/document-audit" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout URL not found:", data);
        alert("Failed to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      className="w-full sm:w-auto text-lg py-4 px-8 shadow-lg hover:shadow-xl"
      disabled={isCheckoutLoading}
    >
      {isCheckoutLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin inline-block" /> : null}
      {isCheckoutLoading ? "Processing..." : "Book My Document Audit (£15)"}
    </Button>
  );
}
