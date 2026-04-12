"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/lib/auth";

const LOGIN_DRAFT_KEY = "flyoci_login_draft";
type LoginStage = "email" | "existingOtp" | "newDetails" | "newOtp";

type LoginDraft = {
  stage: LoginStage;
  accountExists: boolean | null;
  email: string;
  fullName: string;
  mobileNumber: string;
  countryOfResidence: string;
  otpRequested: boolean;
};

const COUNTRY_OPTIONS = [
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "UAE", label: "United Arab Emirates" },
  { value: "Other", label: "Other" },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, clearError, error, isAuthenticated } = useAuth();

  const nextParam = searchParams.get("next") || "";
  const nextPath = nextParam.startsWith("/") ? nextParam : "/dashboard";

  const [initialized, setInitialized] = useState(false);
  const [stage, setStage] = useState<LoginStage>("email");
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryOfResidence, setCountryOfResidence] = useState("United Kingdom");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [localError, setLocalError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOGIN_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as LoginDraft;
      setStage(draft.stage || "email");
      setAccountExists(typeof draft.accountExists === "boolean" ? draft.accountExists : null);
      setFullName(draft.fullName || "");
      setEmail(draft.email || "");
      setMobileNumber(draft.mobileNumber || "");
      setCountryOfResidence(draft.countryOfResidence || "United Kingdom");
      setOtpRequested(Boolean(draft.otpRequested));
    } catch {
      localStorage.removeItem(LOGIN_DRAFT_KEY);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const draft: LoginDraft = {
      stage,
      accountExists,
      email,
      fullName,
      mobileNumber,
      countryOfResidence,
      otpRequested,
    };
    localStorage.setItem(LOGIN_DRAFT_KEY, JSON.stringify(draft));
  }, [initialized, stage, accountExists, email, fullName, mobileNumber, countryOfResidence, otpRequested]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.removeItem(LOGIN_DRAFT_KEY);
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  const normalizedEmail = useMemo(() => email.trim(), [email]);
  const normalizedFullName = useMemo(() => fullName.trim(), [fullName]);

  const splitFullName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  };

  const handleEmailCheck = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!normalizedEmail) {
      setLocalError("Enter your email.");
      return;
    }

    setRequestingOtp(true);
    try {
      const exists = await authService.checkUserExists(normalizedEmail);
      setAccountExists(exists);
      setOtp("");
      setOtpRequested(false);
      setInfo("");
      if (exists) {
        setStage("existingOtp");
      } else {
        setStage("newDetails");
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to check email.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleSendExistingOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!normalizedEmail) {
      setLocalError("Enter your email.");
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await authService.requestLoginOtp(normalizedEmail);
      setOtpRequested(true);
      setStage("existingOtp");
      setInfo(
        response.otp
          ? `OTP sent. DEV OTP: ${response.otp}`
          : `OTP sent to your email. Expires in ${response.otpExpiresInMinutes} minutes.`,
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleSendSignupOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!normalizedEmail || !normalizedFullName || !mobileNumber.trim() || !countryOfResidence.trim()) {
      setLocalError("Full name, email, mobile, and country of residence are required.");
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await authService.requestSignupOtp({
        email: normalizedEmail,
        fullName: normalizedFullName,
        mobileNumber: mobileNumber.trim(),
        countryOfResidence: countryOfResidence.trim(),
      });
      setOtpRequested(true);
      setStage("newOtp");
      if (response.prefill) {
        setInfo("OTP sent. Enter it to create your account.");
      } else {
        setInfo(
          response.otp
            ? `OTP sent. DEV OTP: ${response.otp}`
            : `OTP sent to your email. Expires in ${response.otpExpiresInMinutes} minutes.`,
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyExistingOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!otpRequested) {
      setLocalError("Send OTP first.");
      return;
    }

    if (!otp.trim()) {
      setLocalError("Enter the OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      await authService.verifyLoginOtp({
        email: normalizedEmail,
        otp: otp.trim(),
      });
      localStorage.removeItem(LOGIN_DRAFT_KEY);
      router.replace(nextPath);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleVerifySignupOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!otpRequested) {
      setLocalError("Send OTP first.");
      return;
    }

    if (!otp.trim()) {
      setLocalError("Enter the OTP.");
      return;
    }

    if (!normalizedFullName || !mobileNumber.trim() || !countryOfResidence.trim()) {
      setLocalError("Full name, mobile, and country of residence are required.");
      return;
    }

    const { firstName, lastName } = splitFullName(normalizedFullName);

    setVerifyingOtp(true);
    try {
      await authService.register({
        email: normalizedEmail,
        otp: otp.trim(),
        first_name: firstName,
        last_name: lastName,
        phone_number: mobileNumber.trim(),
        country: countryOfResidence.trim(),
      });
      localStorage.removeItem(LOGIN_DRAFT_KEY);
      router.replace(nextPath);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Signup verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleClearOtp = () => {
    setOtp("");
    setOtpRequested(false);
    setInfo("");
    setLocalError("");
  };

  const handleStartOver = () => {
    setStage("email");
    setAccountExists(null);
    setEmail("");
    setFullName("");
    setMobileNumber("");
    setCountryOfResidence("United Kingdom");
    setOtp("");
    setOtpRequested(false);
    setInfo("");
    setLocalError("");
    clearError();
  };

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-[#f4f7fb] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-16 h-72 w-72 rounded-full bg-[#33a1fd]/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-[#009877]/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mx-auto max-w-5xl"
      >
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-[#d5e3f5] bg-white shadow-[0_28px_60px_rgba(18,52,95,0.12)] lg:grid-cols-2">
          <div className="hidden flex-col justify-between bg-[linear-gradient(140deg,#0f3f88_0%,#1a5fbf_52%,#2f8de7_100%)] p-10 text-white lg:flex">
            <div>
              <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                OTP Login
              </p>
              <h2 className="mt-4 text-3xl font-heading font-bold leading-tight">Sign in with OTP every time</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                Keep your full name, email, mobile number, and country of residence on every login. No password step.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs text-white/80">Secure session</p>
              <p className="mt-1 text-sm font-semibold">OTP verification unlocks your dashboard immediately.</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">FlyOCI Secure Login</span>
            </div>

            <h1 className="mt-4 text-3xl font-heading font-bold text-primary">Login with OTP</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your email first. We will check whether the account exists, then continue with OTP.
            </p>

            {stage === "email" && (
              <form className="mt-8 space-y-5" onSubmit={handleEmailCheck}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="you@example.com"
                  />
                </label>

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      localError || error
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {localError || error || info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={requestingOtp}
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingOtp ? "Checking..." : "Continue"}
                </button>
              </form>
            )}

            {stage === "existingOtp" && (
              <form className="mt-8 space-y-5" onSubmit={otpRequested ? handleVerifyExistingOtp : handleSendExistingOtp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Account found for <span className="font-semibold">{normalizedEmail}</span>. Use OTP to login.
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>{otpRequested ? "OTP sent. Enter it below." : "Send OTP to continue."}</span>
                  {!otpRequested && (
                    <button type="submit" className="font-semibold text-primary hover:underline">
                      Send OTP
                    </button>
                  )}
                </div>

                {otpRequested && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">OTP</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter 6-digit OTP"
                    />
                  </label>
                )}

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      localError || error
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {localError || error || info}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={requestingOtp || verifyingOtp}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpRequested ? (verifyingOtp ? "Verifying..." : "Login") : requestingOtp ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {stage === "newDetails" && (
              <form className="mt-8 space-y-5" onSubmit={handleSendSignupOtp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  No account found for <span className="font-semibold">{normalizedEmail}</span>. Enter your details to continue.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="John Doe"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Mobile</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="+44 7000 000000"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Country of residence</span>
                    <select
                      value={countryOfResidence}
                      onChange={(e) => setCountryOfResidence(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>Send OTP after filling in your details.</span>
                  <button type="submit" className="font-semibold text-primary hover:underline">
                    Send OTP
                  </button>
                </div>

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      localError || error
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {localError || error || info}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={requestingOtp}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestingOtp ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {stage === "newOtp" && (
              <form className="mt-8 space-y-5" onSubmit={handleVerifySignupOtp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Create your account for <span className="font-semibold">{normalizedEmail}</span>.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="John Doe"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Mobile</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="+44 7000 000000"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Country of residence</span>
                    <select
                      value={countryOfResidence}
                      onChange={(e) => setCountryOfResidence(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {otpRequested && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">OTP</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter 6-digit OTP"
                    />
                  </label>
                )}

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      localError || error
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {localError || error || info}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>{otpRequested ? "OTP sent. Verify to create your account." : "Send OTP after filling your details."}</span>
                  {!otpRequested && (
                    <button type="submit" className="font-semibold text-primary hover:underline">
                      Send OTP
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={requestingOtp || verifyingOtp}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpRequested ? (verifyingOtp ? "Verifying..." : "Create Account") : requestingOtp ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-600">
              Need help? <Link href="/contact" className="font-semibold text-primary hover:underline">Contact support</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
