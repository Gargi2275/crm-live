"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { ProgressStepper } from "@/components/ProgressStepper";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
import { eVisaApi } from "@/lib/api-client";
import { authService } from "@/lib/auth";
import { isCurrentPathAllowed, isMissingCaseError, resolveCanonicalEVisaRoute, resolveMissingCaseRedirect } from "@/lib/evisa-step-guard";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  image?: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getRazorpayLogoUrl(): string {
  const configured = process.env.NEXT_PUBLIC_RAZORPAY_LOGO_URL?.trim();
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/logo.png`;
  }
  return "/logo.png";
}

async function getLogoDataUrlFromPublic(): Promise<string> {
  const response = await fetch("/logo.png", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Logo file not found");
  }

  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read logo file"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to load logo file"));
    reader.readAsDataURL(blob);
  });
}

const framerConfetti = Array.from({ length: 50 }).map((_, i) => ({
  id: i,
  x: Math.random() * 600 - 300,
  y: Math.random() * 600 - 300,
  rotation: Math.random() * 360,
  scale: Math.random() * 0.8 + 0.4,
  color: ["#F5A623", "#1A7A8A", "#16A34A"][Math.floor(Math.random() * 3)]
}));

export default function PaymentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, updateData } = useEVisa();
  const caseNumber = searchParams.get("case") || data.fileNumber || "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [checkoutLogoUrl, setCheckoutLogoUrl] = useState("");

  const price = data.visaDuration === "5-Year" ? 150 : 88;
  const fileNumber = caseNumber || "FO-EV-...";

  useEffect(() => {
    let cancelled = false;

    const enforceStepOrder = async () => {
      const normalizedCase = (caseNumber || "").trim().toUpperCase();
      const localCase = String(data.fileNumber || "").trim().toUpperCase();
      const hasMatchingLocalCase = Boolean(localCase) && localCase === normalizedCase;
      if (!normalizedCase) {
        if (!isCurrentPathAllowed(pathname, "/indian-e-visa")) {
          router.replace("/indian-e-visa");
        }
        return;
      }

      let canonicalRoute = `/indian-e-visa/payment?case=${encodeURIComponent(normalizedCase)}`;
      if ((isSuccess || data.hasPaid) && hasMatchingLocalCase) {
        canonicalRoute = `/indian-e-visa/upload?case=${encodeURIComponent(normalizedCase)}`;
      } else if (hasMatchingLocalCase && !data.isEmailConfirmed) {
        canonicalRoute = `/indian-e-visa/confirm-email?case=${encodeURIComponent(normalizedCase)}`;
      }

      if (authService.isLoggedIn()) {
        try {
          const resume = await eVisaApi.getResume(normalizedCase);
          canonicalRoute = resolveCanonicalEVisaRoute(resume.data, normalizedCase);
        } catch (error) {
          if (isMissingCaseError(error)) {
            canonicalRoute = resolveMissingCaseRedirect(true);
          }
        }
      }

      if (!cancelled && !isCurrentPathAllowed(pathname, canonicalRoute)) {
        router.replace(canonicalRoute);
      }
    };

    void enforceStepOrder();

    const handlePopState = () => {
      void enforceStepOrder();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [caseNumber, data.hasPaid, data.isEmailConfirmed, isSuccess, pathname, router]);

  useEffect(() => {
    let cancelled = false;

    getLogoDataUrlFromPublic()
      .then((dataUrl) => {
        if (!cancelled) {
          setCheckoutLogoUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutLogoUrl(getRazorpayLogoUrl());
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePayment = async () => {
    if (!caseNumber) {
      setErrorMessage("Case number missing. Please start registration again.");
      return;
    }

    setErrorMessage("");
    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout. Please try again.");
      }

      const orderResponse = await eVisaApi.createPaymentOrder(caseNumber);
      const orderData = orderResponse.data;
      const finalLogoUrl = checkoutLogoUrl || getRazorpayLogoUrl();
      const rawContact = orderData.prefill?.contact;
      const normalizedContact = typeof rawContact === "string" ? rawContact.replace(/\D/g, "") : "";
      const safePrefill = {
        ...orderData.prefill,
        contact:
          normalizedContact.length >= 10 && normalizedContact.length <= 15
            ? normalizedContact
            : undefined,
      };

      const razorpay = new window.Razorpay({
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name || "Fly OCI",
        image: finalLogoUrl,
        description: orderData.description || `Indian e-Visa assistance - ${caseNumber}`,
        order_id: orderData.razorpay_order_id,
        prefill: safePrefill,
        theme: {
          color: "#4d576c",
        },
        handler: async (rzpResponse) => {
          try {
            const response = await eVisaApi.paymentConfirm(caseNumber, {
              payment_reference: rzpResponse.razorpay_payment_id,
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            setUploadUrl(response.data.upload_url);
            updateData({ hasPaid: true, fileNumber: caseNumber });
            setIsSuccess(true);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      });

      if (razorpay.on) {
        razorpay.on("payment.failed", (event) => {
          setErrorMessage(event.error?.description || "Payment failed. Please try again.");
        });
      }

      razorpay.open();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payment confirmation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    const emailQuery = data.email ? `&email=${encodeURIComponent(data.email)}` : "";
    if (uploadUrl && uploadUrl.includes("?case=")) {
      const caseParam = uploadUrl.split("?case=")[1] || caseNumber;
      router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseParam)}${emailQuery}`);
      return;
    }
    router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseNumber)}${emailQuery}`);
  };

  if (isSuccess) {
    return (
      <div className="flex-1 w-full bg-bg relative pb-20 overflow-hidden">
        <ProgressStepper currentStep={3} />
        
        {/* Custom Confetti */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center -mt-20 z-0">
          {framerConfetti.map((c) => (
            <motion.div
              key={c.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: c.x, y: c.y, rotate: c.rotation, scale: c.scale, opacity: 0 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute w-3 h-3 rounded-full"
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>

        <div className="max-w-[480px] mx-auto px-4 mt-12 relative z-10">
          <Reveal direction="up">
            <div className="bg-white rounded-[20px] shadow-card p-6 sm:p-10 text-center border-t-4 border-green">
              <div className="mb-6 h-20 flex justify-center items-center">
                <AnimatedCheckmark size={80} color="#16A34A" />
              </div>
              
              <h2 className="font-heading font-extrabold text-accent text-2xl sm:text-3xl mb-2">Payment Confirmed!</h2>
              <div className="mt-3 mb-4 inline-flex bg-bg border border-border rounded-badge px-4 py-1.5 font-mono font-bold text-primary text-[13px]">
                {fileNumber}
              </div>
              <p className="font-body text-primary font-medium text-[15px] mb-8">
                Payment successful. Upload documents to proceed.
              </p>

              <div className="bg-bg border border-border rounded-xl p-5 mb-8 text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-body text-sm font-semibold text-muted">File Number</span>
                  <span className="font-mono text-sm font-bold text-primary">{fileNumber}</span>
                </div>
                <div className="w-full h-px bg-border mb-3" />
                <div className="flex justify-between items-center mb-3">
                  <span className="font-body text-sm font-semibold text-muted">Amount</span>
                  <span className="font-mono text-sm font-bold text-primary">£{price}.00</span>
                </div>
                <div className="w-full h-px bg-border mb-3" />
                <div className="flex justify-between items-center">
                  <span className="font-body text-sm font-semibold text-muted">Visa Type</span>
                  <span className="font-mono text-sm font-bold text-primary">{data.visaDuration || "1-Year"}</span>
                </div>
              </div>

              <motion.button
                onClick={handleContinue}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-accent text-white font-bold text-[16px] px-7 py-[15px] rounded-btn shadow-[0_4px_16px_rgba(245,166,35,0.28)] hover:shadow-btn-hover flex justify-center items-center gap-2 transition-all"
              >
                Upload Documents →
              </motion.button>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  const checkCircleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }
  };

  const featureList = [
    "Application preparation support",
    "Government portal submission",
    "Document formatting guidance",
    "Status updates via email / WhatsApp"
  ];

  return (
    <div className="flex-1 w-full flex flex-col items-center bg-bg relative pb-20">
      {/* Header bar */}
      <div className="w-full bg-primary py-2 px-4 shadow-sm relative z-20">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div className="font-mono text-white text-xs sm:text-sm font-bold flex items-center gap-2">
            <span className="text-white/60">File No:</span> {fileNumber}
          </div>
          <div className="text-white/80 font-body text-xs sm:text-sm flex gap-3">
             <span className="hidden sm:inline">Need help? </span>
             <a href="#" className="font-bold text-white hover:text-accent transition-colors">WhatsApp</a>
             <span className="text-white/30">•</span>
             <a href="#" className="font-bold text-white hover:text-accent transition-colors">Email</a>
          </div>
        </div>
      </div>

      <div className="w-full">
        <ProgressStepper currentStep={2} />
      </div>
      
      <div className="max-w-[1000px] w-full mx-auto px-4 mt-8 lg:mt-12">
        <Reveal direction="up" delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            
            {/* Left — Service Summary Card */}
            <div className="bg-white rounded-card shadow-[0_18px_45px_rgba(20,76,160,0.10)] border border-[#d8e7f8] overflow-hidden">
              <div className="p-6 sm:p-8">
                <span className="inline-block px-3 py-1 bg-[#eaf4ff] text-[#1f4f8f] text-[11px] font-bold uppercase tracking-wider rounded-md mb-4">
                  Service Summary
                </span>
                <h3 className="font-body font-bold text-[#0f1f3d] text-xl sm:text-2xl mb-6">Indian e-Visa Assistance Fee</h3>
                
                <div className="flex flex-wrap gap-3 mb-8">
                  <div className="bg-[#fff5dd] border border-[#f4d89a] font-body font-bold text-[#3b2a08] text-sm px-3 py-1.5 rounded-badge flex items-center gap-2">
                    <span>✈️</span> {data.visaDuration || "1-Year"} e-Visa
                  </div>
                  <div className="bg-[#e9f9f0] border border-[#bfe9cf] font-mono font-bold text-[#196c43] text-sm px-3 py-1.5 rounded-badge flex items-center gap-2">
                    <span>📋</span> {fileNumber}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {featureList.map((feature, i) => (
                    <motion.div key={i} initial="hidden" animate="visible" variants={checkCircleVariants} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-greenL text-green flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-body text-[#23395d]">{feature}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-[#fff8e8] border border-[#f4d89a] rounded-lg p-4 mb-8 text-[#3b2a08] font-body text-sm font-medium">
                  Final approval is subject to the issuing authorities.
                </div>

                <div className="w-full h-px bg-border mb-6" />

                <div className="space-y-3 font-body">
                  <div className="flex justify-between items-center text-[#5f7391]">
                    <span>Service Fee:</span>
                    <span className="font-mono text-[#cb7f00] font-bold text-lg">£{price}.00</span>
                  </div>
                  <div className="flex justify-between items-center text-[#5f7391]">
                    <span>Taxes:</span>
                    <span className="font-mono text-[#cb7f00] font-bold text-lg">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="font-bold text-[#0f1f3d] text-lg">Total payable:</span>
                    <span className="font-mono text-[#0f1f3d] font-bold text-xl">£{price}.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Sticky Pricing Card */}
            <div className="sticky top-24 bg-[#f3f9ff] border border-[#d8e7f8] rounded-card shadow-[0_18px_45px_rgba(20,76,160,0.10)] p-7 text-[#0f1f3d]">
              <div className="font-mono text-[#5f7391] text-xs font-bold tracking-widest mb-2">TOTAL PAYABLE</div>
              <div className="font-mono text-[#cb7f00] text-[52px] leading-tight font-bold mb-4">£{price}</div>
              <p className="font-body text-[#3f587a] text-sm mb-6 leading-relaxed">
                Complete payment to proceed to the secure document upload section.
              </p>

              <label className="flex items-start gap-3 bg-white text-[#1f3658] border border-[#d8e7f8] rounded-xl p-4 cursor-pointer mb-6 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-1 w-5 h-5 rounded border-border text-accent focus:ring-accent shrink-0"
                />
                <span className="font-body text-xs font-medium leading-relaxed select-none">
                  I understand FlyOCI provides application assistance. Approval is not guaranteed and is decided by the authorities.
                </span>
              </label>

              <motion.button
                onClick={handlePayment}
                disabled={!acknowledged || isProcessing}
                whileHover={acknowledged && !isProcessing ? { scale: 1.02, y: -2 } : {}}
                whileTap={acknowledged && !isProcessing ? { scale: 0.98 } : {}}
                className={`w-full font-bold text-[16px] px-7 py-[16px] rounded-btn flex justify-center items-center transition-all duration-300 ${
                  acknowledged && !isProcessing 
                    ? "bg-[#1a56db] text-white shadow-[0_10px_24px_rgba(26,86,219,0.35)] hover:shadow-[0_14px_30px_rgba(26,86,219,0.42)] cursor-pointer" 
                    : "bg-[#dfe9f6] text-[#7f94b1] cursor-not-allowed"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                  </div>
                ) : (
                  "Pay & Continue"
                )}
              </motion.button>

              {errorMessage && (
                <p className="mt-3 text-center text-sm text-red-600 font-semibold">{errorMessage}</p>
              )}

              <div className="mt-6 flex justify-center items-center gap-4 font-body text-xs text-[#6f86a6] font-medium tracking-wide">
                <span>💳 Card</span>
                <span>•</span>
                <span>📱 UPI</span>
                <span>•</span>
                <span>👛 Wallets</span>
              </div>
            </div>
            
          </div>
        </Reveal>
      </div>
    </div>
  );
}
