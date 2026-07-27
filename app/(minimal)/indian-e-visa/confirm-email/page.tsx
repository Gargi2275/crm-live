"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { useAuth } from "@/context/AuthContext";
import { Reveal } from "@/components/Reveal";
import { OTPInput } from "@/components/OTPInput";
import { ProgressStepper } from "@/components/ProgressStepper";
import { eVisaApi } from "@/lib/api-client";
import { setTokens } from "@/lib/api";
import { authService } from "@/lib/auth";
import { EVISA_DEFAULTS } from "@/lib/evisa-config";
import { isCurrentPathAllowed, isMissingCaseError, resolveCanonicalEVisaRoute, resolveMissingCaseRedirect } from "@/lib/evisa-step-guard";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const pathname = usePathname();
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
const guardInFlightRef = useRef(false);

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

useEffect(() => {
  const enforceStepOrder = async () => {
    if (guardInFlightRef.current) {
      return;
    }
    guardInFlightRef.current = true;

    try {
      const normalizedCase = (caseNumber || "").trim().toUpperCase();
      if (!normalizedCase) {
        if (!isCurrentPathAllowed(pathname, "/indian-e-visa")) {
          router.replace("/indian-e-visa");
        }
        return;
      }

      let canonicalRoute = `/indian-e-visa/confirm-email?case=${encodeURIComponent(normalizedCase)}`;
      if (data.isEmailConfirmed) {
        canonicalRoute = `/indian-e-visa/payment?case=${encodeURIComponent(normalizedCase)}`;
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

      if (!isCurrentPathAllowed(pathname, canonicalRoute)) {
        router.replace(canonicalRoute);
      }
    } finally {
      guardInFlightRef.current = false;
    }
  };

  void enforceStepOrder();

  const handlePopState = () => {
    void enforceStepOrder();
  };

  window.addEventListener("popstate", handlePopState);
  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, [caseNumber, data.isEmailConfirmed, pathname, router]);
  
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
    <div className="w-full flex-1 bg-[#F4F6F9] pb-10">
      <div className="mx-auto w-full max-w-[920px] px-4 pt-3 sm:px-6 lg:px-8">
        <div className="mb-4">
          <ProgressStepper currentStep={1} />
        </div>

        <Reveal direction="up">
          <div className="overflow-hidden rounded-2xl border border-[#E4EAF2] bg-white shadow-[0_12px_32px_rgba(16,42,67,0.06)]">
            <div className="grid md:grid-cols-[1.05fr_0.95fr]">
              {/* Left: context */}
              <div className="border-b border-[#E4EAF2] p-5 sm:p-6 md:border-b-0 md:border-r">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecf6ff] text-xl">
                    📧
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-[22px] font-bold leading-tight text-[#0F1F3D] sm:text-[24px]">
                      Check your email
                    </h2>
                    <p className="mt-1 text-[13px] text-[#627D98]">
                      We&apos;ve sent your FlyOCI file number and verification code.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-[#D7E4F4] bg-[#F8FBFF] px-3 py-2 font-mono text-[13px] font-semibold text-[#0F1F3D]">
                    {maskEmail(data.email)}
                  </div>
                  <div className="rounded-full bg-primary px-3 py-1 font-mono text-[11px] font-bold text-white">
                    {caseNumber || "FO-EV-..."}
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 rounded-xl bg-[#F7F9FC] px-3.5 py-3 text-[12px] text-[#627D98]">
                  <li className="flex gap-2">
                    <span className="text-primary">→</span> Check spam/junk folder
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span> Delivery usually takes under 1 minute
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span> Email includes your file number and secure link
                  </li>
                </ul>

                <div className="mt-5 hidden items-center justify-between gap-3 border-t border-[#E8EEF6] pt-4 text-[13px] font-semibold md:flex">
                  <button
                    type="button"
                    onClick={() => router.push("/indian-e-visa")}
                    className="text-[#0F1F3D] transition hover:text-primary"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className={`transition ${
                      countdown > 0 ? "cursor-not-allowed text-[#829AB1] opacity-60" : "text-[#627D98] hover:text-primary"
                    }`}
                  >
                    {countdown > 0 ? (
                      <span className="font-mono">Resend in {formatCountdown(countdown)}</span>
                    ) : (
                      "Resend email"
                    )}
                  </button>
                </div>
              </div>

              {/* Right: OTP + continue */}
              <div className="flex flex-col justify-center p-5 sm:p-6">
                <label className="block text-[13px] font-semibold text-[#0F1F3D]">
                  Enter the 6-digit code from your email
                </label>
                <div className="mt-3">
                  <OTPInput
                    onComplete={handleOTPComplete}
                    error={otpStatus === "error"}
                    success={otpStatus === "success"}
                  />
                </div>

                <div className="mt-2.5 flex min-h-[20px] items-center justify-center">
                  <AnimatePresence mode="wait">
                    {otpStatus === "error" && (
                      <motion.p
                        key="error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-[12px] font-semibold text-red"
                      >
                        {statusMessage || "Incorrect code. Please try again."}
                      </motion.p>
                    )}
                    {otpStatus === "success" && (
                      <motion.p
                        key="success"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-[12px] font-semibold text-green"
                      >
                        Code verified
                      </motion.p>
                    )}
                    {otpStatus === "idle" && (
                      <motion.p
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center font-mono text-[11px] text-[#829AB1]"
                      >
                        Valid for {data.otpExpiresInMinutes || EVISA_DEFAULTS.otpExpiresInMinutes} minutes
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {statusMessage && otpStatus !== "error" ? (
                  <p className="mt-1 text-center text-[11px] text-[#829AB1]">{statusMessage}</p>
                ) : null}

                <motion.button
                  type="button"
                  onClick={handleContinue}
                  disabled={otpStatus !== "success" || isSubmitting}
                  whileHover={otpStatus === "success" && !isSubmitting ? { scale: 1.01 } : {}}
                  whileTap={otpStatus === "success" && !isSubmitting ? { scale: 0.98 } : {}}
                  className={`mt-4 flex w-full items-center justify-center rounded-xl px-5 py-3 text-[15px] font-semibold transition ${
                    otpStatus === "success" && !isSubmitting
                      ? "bg-primary text-white shadow-btn hover:bg-accent"
                      : "cursor-not-allowed bg-[#E8EEF6] text-[#829AB1]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proceeding…
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </motion.button>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8EEF6] pt-3 text-[12px] font-semibold md:hidden">
                  <button
                    type="button"
                    onClick={() => router.push("/indian-e-visa")}
                    className="text-[#0F1F3D]"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className={countdown > 0 ? "cursor-not-allowed text-[#829AB1]" : "text-[#627D98]"}
                  >
                    {countdown > 0 ? (
                      <span className="font-mono">Resend {formatCountdown(countdown)}</span>
                    ) : (
                      "Resend email"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
