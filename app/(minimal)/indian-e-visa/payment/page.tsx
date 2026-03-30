"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { ProgressStepper } from "@/components/ProgressStepper";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
import { eVisaApi } from "@/lib/api-client";

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
  const searchParams = useSearchParams();
  const { data, updateData } = useEVisa();
  const caseNumber = searchParams.get("case") || data.fileNumber || "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");

  const price = data.visaDuration === "5-Year" ? 150 : 88;
  const fileNumber = caseNumber || "FO-EV-...";

  const handlePayment = async () => {
    if (!caseNumber) {
      setErrorMessage("Case number missing. Please start registration again.");
      return;
    }

    setErrorMessage("");
    setIsProcessing(true);

    try {
      const paymentReference = `LOCAL-${Date.now()}`;
      const response = await eVisaApi.paymentConfirm(caseNumber, paymentReference);
      setUploadUrl(response.data.upload_url);
      updateData({ hasPaid: true, fileNumber: caseNumber });
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payment confirmation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    if (uploadUrl && uploadUrl.includes("?case=")) {
      const caseParam = uploadUrl.split("?case=")[1] || caseNumber;
      router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseParam)}`);
      return;
    }
    router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseNumber)}`);
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
