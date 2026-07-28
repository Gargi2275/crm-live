"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { usePublicPricing } from "@/hooks/usePublicPricing";

export function CheckoutButton() {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const { assessmentFee, loading } = usePublicPricing();
  const feeLabel =
    assessmentFee != null && assessmentFee > 0
      ? `£${assessmentFee % 1 === 0 ? assessmentFee.toFixed(0) : assessmentFee.toFixed(2)}`
      : null;

  const handleCheckout = async () => {
    if (!feeLabel || assessmentFee == null) return;
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.origin + "/services",
          amountPence: Math.round(assessmentFee * 100),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session. Please try again.");
      }
    } catch {
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (loading || !feeLabel) {
    return null;
  }

  return (
    <Button
      onClick={handleCheckout}
      className="w-full sm:w-auto text-lg py-4 px-8 shadow-lg hover:shadow-xl"
      disabled={isCheckoutLoading}
    >
      {isCheckoutLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin inline-block" /> : null}
      {isCheckoutLoading ? "Processing..." : `Start Early Assessment (${feeLabel})`}
    </Button>
  );
}
