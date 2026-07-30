"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Globe2, Mail, Phone, ShieldCheck, User2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/lib/auth";
import { OTPInput } from "@/components/OTPInput";
import { RecaptchaField, requireCaptchaToken } from "@/components/RecaptchaField";
import {
  LoginPrimaryButton,
  LoginSecondaryButton,
  LoginShell,
  LoginStepRail,
  loginFieldWrap,
  loginInputClass,
} from "@/components/auth/LoginShell";

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

function StatusBanner({
  hasError,
  message,
}: {
  hasError: boolean;
  message: string;
}) {
  if (!message) return null;
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        hasError
          ? "border border-red-200 bg-red-50 text-red-700"
          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
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
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

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
  const statusMessage = localError || error || info || "";

  const stageMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  const splitFullName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  };

  const sendExistingOtp = async (tokenOverride?: string) => {
    if (!normalizedEmail) {
      setLocalError("Enter your email.");
      return;
    }
    const token = (tokenOverride ?? captchaToken).trim();
    const captchaMsg = requireCaptchaToken(token);
    if (captchaMsg) {
      setCaptchaError(captchaMsg);
      setLocalError(captchaMsg);
      return;
    }
    setCaptchaError("");

    setRequestingOtp(true);
    try {
      const response = await authService.requestLoginOtp(normalizedEmail, token);
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
    const captchaMsg = requireCaptchaToken(captchaToken);
    if (captchaMsg) {
      setCaptchaError(captchaMsg);
      return;
    }
    setCaptchaError("");

    setRequestingOtp(true);
    try {
      const exists = await authService.checkUserExists(normalizedEmail);
      setAccountExists(exists);
      setOtp("");
      setOtpRequested(false);
      setInfo("");
      if (exists) {
        setStage("existingOtp");
        await sendExistingOtp(captchaToken);
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
    const captchaMsg = requireCaptchaToken(captchaToken);
    if (captchaMsg) {
      setCaptchaError(captchaMsg);
      setLocalError("Complete the captcha again to resend OTP.");
      return;
    }
    await sendExistingOtp();
  };

  useEffect(() => {
    if (!initialized) return;
    if (stage !== "existingOtp") return;
    if (!accountExists) return;
    if (otpRequested || requestingOtp || !normalizedEmail) return;
    if (!captchaToken.trim()) return;
    void sendExistingOtp();
  }, [initialized, stage, accountExists, otpRequested, requestingOtp, normalizedEmail, captchaToken]);

  const handleSendSignupOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError("");
    setInfo("");

    if (!normalizedEmail || !normalizedFullName || !mobileNumber.trim() || !countryOfResidence.trim()) {
      setLocalError("Full name, email, mobile, and country of residence are required.");
      return;
    }
    const captchaMsg = requireCaptchaToken(captchaToken);
    if (captchaMsg) {
      setCaptchaError(captchaMsg);
      return;
    }
    setCaptchaError("");

    setRequestingOtp(true);
    try {
      const response = await authService.requestSignupOtp({
        email: normalizedEmail,
        fullName: normalizedFullName,
        mobileNumber: mobileNumber.trim(),
        countryOfResidence: countryOfResidence.trim(),
        captchaToken,
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

  const headline =
    stage === "email"
      ? "Welcome back"
      : stage === "existingOtp"
        ? "Enter your OTP"
        : stage === "newDetails"
          ? "Create your account"
          : "Verify & finish";

  const subcopy =
    stage === "email"
      ? "Enter your email. We’ll check if you already have an account, then continue with OTP."
      : stage === "existingOtp"
        ? `We found an account for ${normalizedEmail || "your email"}. Enter the code we sent.`
        : stage === "newDetails"
          ? `No account yet for ${normalizedEmail || "this email"}. Add a few details to continue.`
          : `Confirm the OTP sent to ${normalizedEmail || "your email"} to create your account.`;

  return (
    <LoginShell stage={stage} stageLabel={STAGE_LABELS[stage]}>
      <div className="w-full">
        <div className="flex items-center gap-2 text-[#1c64c8]">
          <ShieldCheck className="h-5 w-5 xl:h-6 xl:w-6" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] xl:text-[13px]">FlyOCI Secure Login</span>
        </div>

        <h1 className="mt-2 font-heading text-[1.65rem] font-bold leading-tight tracking-[-0.02em] text-[#0f2a52] sm:text-[1.85rem] xl:mt-3 xl:text-[2.35rem]">
          {headline}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#5f7692] xl:mt-2 xl:text-base">{subcopy}</p>

        <LoginStepRail stage={stage} />

        <div className="mt-5 xl:mt-6">
          <AnimatePresence mode="wait">
            {stage === "email" ? (
              <motion.form
                key="email"
                {...stageMotion}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 xl:space-y-5"
                onSubmit={handleEmailCheck}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Email</span>
                  <div className={loginFieldWrap}>
                    <Mail className="h-4 w-4 shrink-0 text-[#5e7892]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={loginInputClass}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <RecaptchaField
                  onChange={(token) => {
                    setCaptchaToken(token);
                    if (token) setCaptchaError("");
                  }}
                  error={captchaError}
                />

                <StatusBanner hasError={hasError} message={statusMessage} />

                <LoginPrimaryButton disabled={requestingOtp}>
                  {requestingOtp ? "Checking..." : "Continue"}
                </LoginPrimaryButton>
              </motion.form>
            ) : null}

            {stage === "existingOtp" ? (
              <motion.form
                key="existingOtp"
                {...stageMotion}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 xl:space-y-5"
                onSubmit={handleVerifyExistingOtp}
              >
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d5e3f5] bg-[#f8fbff] px-4 py-3 text-sm text-[#486581]">
                  <span>{requestingOtp ? "Sending OTP..." : "OTP sent. Enter it below."}</span>
                  <button
                    type="button"
                    onClick={() => void handleResendExistingOtp()}
                    disabled={requestingOtp || verifyingOtp}
                    className="shrink-0 font-semibold text-[#1c64c8] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend
                  </button>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#d9e6f5] bg-[#f8fbff] px-4 py-4">
                  <p className="text-sm font-medium text-[#334E68]">Enter OTP</p>
                  <OTPInput onComplete={(value) => setOtp(value)} error={hasError} success={false} />
                  <p className="text-center text-xs text-[#5e7892]">Type all 6 digits to enable verification.</p>
                </div>

                <StatusBanner hasError={hasError} message={statusMessage} />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <LoginSecondaryButton onClick={handleStartOver} className="sm:flex-1">
                    Back
                  </LoginSecondaryButton>
                  <LoginPrimaryButton disabled={requestingOtp || verifyingOtp} className="sm:flex-1">
                    {verifyingOtp ? "Verifying..." : "Login"}
                  </LoginPrimaryButton>
                </div>
              </motion.form>
            ) : null}

            {stage === "newDetails" ? (
              <motion.form
                key="newDetails"
                {...stageMotion}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 xl:space-y-5"
                onSubmit={handleSendSignupOtp}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Full name</span>
                    <div className={loginFieldWrap}>
                      <User2 className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={loginInputClass}
                        placeholder="John Doe"
                        autoComplete="name"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Mobile</span>
                    <div className={loginFieldWrap}>
                      <Phone className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className={loginInputClass}
                        placeholder="+44 7000 000000"
                        autoComplete="tel"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Country of residence</span>
                    <div className={loginFieldWrap}>
                      <Globe2 className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <select
                        value={countryOfResidence}
                        onChange={(e) => setCountryOfResidence(e.target.value)}
                        className={loginInputClass}
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

                <RecaptchaField
                  onChange={(token) => {
                    setCaptchaToken(token);
                    if (token) setCaptchaError("");
                  }}
                  error={captchaError}
                />

                <StatusBanner hasError={hasError} message={statusMessage} />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <LoginSecondaryButton onClick={handleStartOver} className="sm:flex-1">
                    Back
                  </LoginSecondaryButton>
                  <LoginPrimaryButton disabled={requestingOtp} className="sm:flex-1">
                    {requestingOtp ? "Sending OTP..." : "Send OTP"}
                  </LoginPrimaryButton>
                </div>
              </motion.form>
            ) : null}

            {stage === "newOtp" ? (
              <motion.form
                key="newOtp"
                {...stageMotion}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 xl:space-y-5"
                onSubmit={handleVerifySignupOtp}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Full name</span>
                    <div className={loginFieldWrap}>
                      <User2 className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={loginInputClass}
                        placeholder="John Doe"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Mobile</span>
                    <div className={loginFieldWrap}>
                      <Phone className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className={loginInputClass}
                        placeholder="+44 7000 000000"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#334E68] xl:text-[15px]">Country of residence</span>
                    <div className={loginFieldWrap}>
                      <Globe2 className="h-4 w-4 shrink-0 text-[#5e7892]" />
                      <select
                        value={countryOfResidence}
                        onChange={(e) => setCountryOfResidence(e.target.value)}
                        className={loginInputClass}
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

                {otpRequested ? (
                  <div className="space-y-3 rounded-2xl border border-[#d9e6f5] bg-[#f8fbff] px-4 py-4">
                    <p className="text-sm font-medium text-[#334E68]">Enter OTP</p>
                    <OTPInput onComplete={(value) => setOtp(value)} error={hasError} success={false} />
                    <p className="text-center text-xs text-[#5e7892]">Type all 6 digits to finish account setup.</p>
                  </div>
                ) : null}

                <StatusBanner hasError={hasError} message={statusMessage} />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <LoginSecondaryButton onClick={handleStartOver} className="sm:flex-1">
                    Back
                  </LoginSecondaryButton>
                  <LoginPrimaryButton disabled={requestingOtp || verifyingOtp} className="sm:flex-1">
                    {otpRequested
                      ? verifyingOtp
                        ? "Verifying..."
                        : "Create Account"
                      : requestingOtp
                        ? "Sending OTP..."
                        : "Send OTP"}
                  </LoginPrimaryButton>
                </div>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </LoginShell>
  );
}
