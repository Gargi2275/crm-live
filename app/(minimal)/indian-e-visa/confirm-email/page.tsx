"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { useAuth } from "@/context/AuthContext";
import { Reveal } from "@/components/Reveal";
import { OTPInput } from "@/components/OTPInput";
import { ProgressStepper } from "@/components/ProgressStepper";
import { eVisaApi } from "@/lib/api-client";
import { setTokens } from "@/lib/api";
import { EVISA_DEFAULTS } from "@/lib/evisa-config";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateData } = useEVisa();
  const { refreshUser } = useAuth();
  const caseNumber = searchParams.get("case") || data.fileNumber || "";
  const cooldownParam = searchParams.get("cooldown");


const [otpStatus, setOtpStatus] = useState<"idle" | "success" | "error">("idle");
const [isSubmitting, setIsSubmitting] = useState(false);
const [isMagicLinkSending, setIsMagicLinkSending] = useState(false);
const [countdown, setCountdown] = useState(0);
const [statusMessage, setStatusMessage] = useState<string>("");
const initializedCaseRef = useRef<string>("");
const configLoadedRef = useRef(false);

const resolveCooldownSeconds = (payload?: {
  resend_cooldown_seconds?: number;
  resend_cooldown_minutes?: number;
}) => {
  const fromSeconds = Number(payload?.resend_cooldown_seconds);
  if (Number.isFinite(fromSeconds) && fromSeconds > 0) {
    return fromSeconds;
  }

  const fromMinutes = Number(payload?.resend_cooldown_minutes);
  if (Number.isFinite(fromMinutes) && fromMinutes > 0) {
    return fromMinutes * 60;
  }

  return data.resendCooldownSeconds || EVISA_DEFAULTS.resendCooldownSeconds;
};

const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

// Mask email: r*****@gmail.com
const maskEmail = (email: string) => {
  if (!email) return "your@email.com";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  const maskedName =
    name[0] + "*****" + (name.length > 1 ? name[name.length - 1] : "");

  return `${maskedName}@${domain}`;
};

useEffect(() => {
  if (!data.email) {
    // If directly accessed without filling form, ideally redirect to start. Let's allow for now.
  }
}, [data.email, router]);

useEffect(() => {
  if (countdown > 0) {
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }
}, [countdown]);

useEffect(() => {
  if (!caseNumber) return;

  if (initializedCaseRef.current === caseNumber) {
    return;
  }

  const cooldownFromQuery = Number(cooldownParam || "");
  const initialCooldown =
    Number.isFinite(cooldownFromQuery) && cooldownFromQuery > 0
      ? cooldownFromQuery
      : (data.resendCooldownSeconds || EVISA_DEFAULTS.resendCooldownSeconds);

  if (initialCooldown > 0) {
    setCountdown(initialCooldown);
  }

  initializedCaseRef.current = caseNumber;
}, [caseNumber, cooldownParam]);

useEffect(() => {
  if (cooldownParam || configLoadedRef.current) {
    return;
  }

  let cancelled = false;

  eVisaApi
    .getConfig()
    .then((response) => {
      if (cancelled) {
        return;
      }

      configLoadedRef.current = true;

      const serverCooldown = resolveCooldownSeconds(response.data);
      const serverExpiry =
        response.data.otp_expires_in_minutes ||
        EVISA_DEFAULTS.otpExpiresInMinutes;
      const serverMaxResends =
        response.data.max_resends || EVISA_DEFAULTS.maxResends;

      updateData({
        resendCooldownSeconds: serverCooldown,
        otpExpiresInMinutes: serverExpiry,
        maxResends: serverMaxResends,
      });

      setCountdown((prev) => (prev === 0 ? serverCooldown : prev));
    })
    .catch(() => {
      // Keep current fallback values if config call fails.
    });

  return () => {
    cancelled = true;
  };
}, [cooldownParam, updateData, data.resendCooldownSeconds]);
  
const handleOTPComplete = async (code: string) => {
  const sanitizedCode = (code || "").replace(/\D/g, "").slice(0, 6);
  if (!caseNumber) {
    setOtpStatus("error");
    setStatusMessage("Case number missing. Please register again.");
    return;
  }
  if (sanitizedCode.length !== 6) {
    setOtpStatus("error");
    setStatusMessage("Enter a valid 6-digit OTP.");
    return;
  }

  setIsSubmitting(true);
  setStatusMessage("");
  try {
    const response = await eVisaApi.confirmEmail(caseNumber, sanitizedCode);
    if (response.data?.tokens?.access && response.data?.tokens?.refresh) {
      setTokens(response.data.tokens.access, response.data.tokens.refresh);
      try {
        await refreshUser();
      } catch {
        // Tokens are stored; context will recover on next auth check.
      }
    }
    setOtpStatus("success");
    updateData({ isEmailConfirmed: true, fileNumber: caseNumber });
  } catch (error) {
    setOtpStatus("error");
    setStatusMessage(error instanceof Error ? error.message : "OTP verification failed");
  } finally {
    setIsSubmitting(false);
  }
};


const handleContinue = () => {
  if (otpStatus !== "success") return; // safety

  setIsSubmitting(true);

  setTimeout(() => {
    router.replace(`/indian-e-visa/payment?case=${encodeURIComponent(caseNumber)}`);
  }, 800);
};
  const handleResend = async () => {
    if (countdown !== 0 || !caseNumber) return;

    setStatusMessage("");
    try {
      const response = await eVisaApi.resendEmail(caseNumber);
      const nextAt = response.data.next_resend_available_at;
      const fallbackCooldown = resolveCooldownSeconds(response.data);
      if (nextAt) {
        const remaining = Math.max(0, Math.ceil((new Date(nextAt).getTime() - Date.now()) / 1000));
        setCountdown(remaining);
      } else {
        setCountdown(fallbackCooldown);
      }
      updateData({
        otpExpiresInMinutes: response.data.otp_expires_in_minutes || data.otpExpiresInMinutes,
        resendCooldownSeconds: fallbackCooldown,
        maxResends: response.data.max_resends || data.maxResends,
      });
      setOtpStatus("idle");
      setStatusMessage(`OTP resent successfully. Valid for ${response.data.otp_expires_in_minutes || data.otpExpiresInMinutes} minutes.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to resend OTP");
    }
  };

  const handleMagicLink = async () => {
    if (!caseNumber || isMagicLinkSending) return;

    setIsMagicLinkSending(true);
    setStatusMessage("");
    try {
      const response = await eVisaApi.requestMagicLink(caseNumber, data.email || undefined);
      setStatusMessage(response.message || "Magic link sent. Check your inbox.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to send magic link");
    } finally {
      setIsMagicLinkSending(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-bg relative pb-20">
      <ProgressStepper currentStep={1} />
      
      <div className="max-w-[480px] mx-auto px-4 mt-8">
        <Reveal direction="up">
          <div className="bg-card rounded-card shadow-card p-6 sm:p-10 relative overflow-hidden">
            
            {/* Top Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-3xl shadow-sm border border-accent/20"
              >
                📧
              </motion.div>
            </div>

            <div className="text-center mb-6">
              <h2 className="font-heading font-extrabold text-primary text-2xl sm:text-3xl mb-2">Check your email</h2>
              <p className="font-body text-muted text-[15px]">We&apos;ve sent your FlyOCI file number to:</p>
              <div className="mt-3 inline-flex flex-col items-center gap-2">
                <div className="bg-bg border border-border rounded-lg px-4 py-2 font-mono font-bold text-primary text-[15px]">
                  {maskEmail(data.email)}
                </div>
                <div className="bg-primary text-white text-[11px] font-mono font-bold px-3 py-1 rounded-badge">
                  {caseNumber || "FO-EV-..."}
                </div>
              </div>
            </div>

            <div className="bg-bg rounded-xl border border-border p-4 mb-6">
              <ul className="text-[13px] text-muted font-body space-y-2">
                <li className="flex gap-2">
                  <span className="text-accent">→</span> Check spam/junk folder
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">→</span> Delivery usually takes under 1 minute
                </li>
                <li className="flex gap-2 leading-tight">
                  <span className="text-secondary">→</span> The email contains your file number and secure link
                </li>
              </ul>
            </div>

            <div className="mb-8">
              <label className="block text-center font-body font-bold text-primary text-[15px] mb-4">
                Enter the 6-digit code from your email
              </label>
              <OTPInput 
                onComplete={handleOTPComplete} 
                error={otpStatus === "error"} 
                success={otpStatus === "success"} 
              />
              
              <div className="h-6 mt-3 flex justify-center items-center">
                <AnimatePresence mode="wait">
                  {otpStatus === "error" && (
                    <motion.p key="error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red text-sm font-bold flex items-center gap-1.5">
                      <span className="text-lg leading-none">✗</span> {statusMessage || "Incorrect code. Please try again."}
                    </motion.p>
                  )}
                  {otpStatus === "success" && (
                    <motion.p key="success" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green text-sm font-bold flex items-center gap-1.5">
                      <span className="text-lg leading-none">✓</span> Code verified!
                    </motion.p>
                  )}
                  {otpStatus === "idle" && (
                    <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-muted font-mono text-[11px]">
                      Enter the OTP received in your email (valid for {data.otpExpiresInMinutes || EVISA_DEFAULTS.otpExpiresInMinutes} minutes)
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {statusMessage && otpStatus !== "error" && (
                <p className="text-center text-xs text-muted mt-2">{statusMessage}</p>
              )}
            </div>

            <motion.button
              onClick={handleContinue}
              disabled={otpStatus !== "success" || isSubmitting}
              whileHover={otpStatus === "success" && !isSubmitting ? { scale: 1.02, y: -2 } : {}}
              whileTap={otpStatus === "success" && !isSubmitting ? { scale: 0.97 } : {}}
              className={`w-full text-primary font-bold text-[16px] px-7 py-[15px] rounded-btn shadow-[0_4px_16px_rgba(245,166,35,0.28)] hover:shadow-btn-hover flex justify-center items-center transition-all duration-300 ${
                otpStatus === "success" && !isSubmitting ? "bg-accent" : "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed transform-none"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" /> Proceeding...
                </>
              ) : (
                "✅ I have received the email – Continue to Payment"
              )}
            </motion.button>
            
            {/* Secondary actions */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border pt-6 font-body font-semibold text-sm">
              <button 
                onClick={() => router.push("/indian-e-visa")}
                className="text-primary font-bold hover:opacity-80 transition-opacity flex items-center focus:outline-none"
              >
                ← Change email address
              </button>
              
              <div className="flex items-center gap-4">
                {/* <button
                  onClick={handleMagicLink}
                  disabled={isMagicLinkSending || !caseNumber}
                  className={`transition-opacity text-primary focus:outline-none ${isMagicLinkSending || !caseNumber ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                >
                  {isMagicLinkSending ? "Sending magic link..." : "Send magic link"}
                </button> */}

                <button
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className={`transition-opacity text-muted focus:outline-none ${countdown > 0 ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                >
                  {countdown > 0 ? (
                    <span className="font-mono">Resend in {formatCountdown(countdown)}</span>
                  ) : (
                    "Resend email"
                  )}
                </button>
              </div>


              
            </div>

          </div>
        </Reveal>
      </div>
    </div>
  );
}
