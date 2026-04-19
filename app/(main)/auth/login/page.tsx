"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Globe2, Mail, Phone, ShieldCheck, Sparkles, User2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/lib/auth";
import { OTPInput } from "@/components/OTPInput";

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

const STAGE_LABELS: Record<LoginStage, string> = {
  email: "Email Check",
  existingOtp: "Login OTP",
  newDetails: "Profile Details",
  newOtp: "Signup OTP",
};

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
  const hasError = Boolean(localError || error);
  const stageProgress = useMemo(() => {
    if (stage === "email") return 25;
    if (stage === "newDetails") return 60;
    return 100;
  }, [stage]);

  const splitFullName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  };

  const sendExistingOtp = async () => {
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
        await sendExistingOtp();
      } else {
        setStage("newDetails");
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to check email.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleResendExistingOtp = async () => {
    clearError();
    setLocalError("");
    setInfo("");
    await sendExistingOtp();
  };

  useEffect(() => {
    if (!initialized) return;
    if (stage !== "existingOtp") return;
    if (!accountExists) return;
    if (otpRequested || requestingOtp || !normalizedEmail) return;
    void sendExistingOtp();
  }, [initialized, stage, accountExists, otpRequested, requestingOtp, normalizedEmail]);

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
      await refreshUser();
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
      await refreshUser();
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
    <section className="relative min-h-[82vh] overflow-hidden bg-[linear-gradient(150deg,#f8fbff_0%,#edf5ff_55%,#f7fcff_100%)] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#33a1fd]/22 blur-3xl" />
        <div className="absolute top-[15%] right-[10%] h-52 w-52 rounded-full bg-[#0f7ee8]/12 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#00a37a]/12 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mx-auto max-w-6xl"
      >
        <div className="grid grid-cols-1 overflow-hidden rounded-[28px] border border-[#d5e3f5] bg-white shadow-[0_30px_70px_rgba(18,52,95,0.14)] lg:grid-cols-2">
          <div className="hidden flex-col justify-between bg-[linear-gradient(145deg,#0f3f88_0%,#1c64c8_56%,#35a1fd_100%)] p-10 text-white lg:flex">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> OTP Login
              </p>
              <h2 className="mt-5 text-3xl font-heading font-bold leading-tight">A faster login flow with secure OTP checks</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/90">
                Continue with one secure flow for both existing and new users. Your details stay consistent and your session is protected.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/80">Secure session</p>
                <p className="mt-1 text-sm font-semibold">OTP verification unlocks your dashboard instantly.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/80">Current step</p>
                <p className="mt-1 text-base font-semibold">{STAGE_LABELS[stage]}</p>
              </div>
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

            <div className="mt-5 rounded-2xl border border-[#d9e6f5] bg-[#f8fbff] p-3.5">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56718e]">
                <span>Flow Progress</span>
                <span>{stageProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#dbe8f8]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#0f7ee8,#00a37a)]" style={{ width: `${stageProgress}%` }} />
              </div>
            </div>

            {stage === "email" && (
              <form className="mt-8 space-y-5" onSubmit={handleEmailCheck}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Mail className="h-4 w-4 text-[#5e7892]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      hasError
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
              <form className="mt-8 space-y-5" onSubmit={handleVerifyExistingOtp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Account found for <span className="font-semibold">{normalizedEmail}</span>. Use OTP to login.
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>{requestingOtp ? "Sending OTP..." : "OTP sent. Enter it below."}</span>
                  <button
                    type="button"
                    onClick={() => void handleResendExistingOtp()}
                    disabled={requestingOtp || verifyingOtp}
                    className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend OTP
                  </button>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#d9e6f5] bg-[#f8fbff] px-4 py-4">
                  <p className="text-sm font-medium text-slate-700">Enter OTP</p>
                  <OTPInput onComplete={(value) => setOtp(value)} error={hasError} success={false} />
                  <p className="text-center text-xs text-[#5e7892]">Type all 6 digits to enable verification.</p>
                </div>

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      hasError
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
                    {verifyingOtp ? "Verifying..." : "Login"}
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
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <User2 className="h-4 w-4 text-[#5e7892]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Mobile</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <Phone className="h-4 w-4 text-[#5e7892]" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="+44 7000 000000"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Country of residence</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <Globe2 className="h-4 w-4 text-[#5e7892]" />
                      <select
                        value={countryOfResidence}
                        onChange={(e) => setCountryOfResidence(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
                      hasError
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
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <User2 className="h-4 w-4 text-[#5e7892]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Mobile</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <Phone className="h-4 w-4 text-[#5e7892]" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="+44 7000 000000"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Country of residence</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <Globe2 className="h-4 w-4 text-[#5e7892]" />
                      <select
                        value={countryOfResidence}
                        onChange={(e) => setCountryOfResidence(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                {otpRequested && (
                  <div className="space-y-3 rounded-2xl border border-[#d9e6f5] bg-[#f8fbff] px-4 py-4">
                    <p className="text-sm font-medium text-slate-700">Enter OTP</p>
                    <OTPInput onComplete={(value) => setOtp(value)} error={hasError} success={false} />
                    <p className="text-center text-xs text-[#5e7892]">Type all 6 digits to finish account setup.</p>
                  </div>
                )}

                {(localError || error || info) && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      hasError
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
