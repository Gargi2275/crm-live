"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

type PasswordResetStep = "email" | "otp" | "newPassword";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<PasswordResetStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("forgot_password_draft");
      if (!raw) return;

      const draft = JSON.parse(raw) as {
        step: PasswordResetStep;
        email: string;
        otp: string;
        newPassword: string;
        confirmPassword: string;
      };
      if (draft.step) setStep(draft.step);
      if (draft.email) setEmail(draft.email);
      if (draft.otp) setOtp(draft.otp);
      if (draft.newPassword) setNewPassword(draft.newPassword);
      if (draft.confirmPassword) setConfirmPassword(draft.confirmPassword);
    } catch {
      sessionStorage.removeItem("forgot_password_draft");
    }
  }, []);

  useEffect(() => {
    const draft = { step, email, otp, newPassword, confirmPassword };
    sessionStorage.setItem("forgot_password_draft", JSON.stringify(draft));
  }, [step, email, otp, newPassword, confirmPassword]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpInfo("");

    if (!email.trim()) {
      setError("Enter your registered email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/request-otp/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to request OTP");
      }

      setStep("otp");
      if (data.data?.otp) {
        setOtpInfo(`Dev OTP: ${data.data.otp}`);
      } else {
        setOtpInfo(`OTP sent to ${email}. Expires in ${data.data?.otp_expires_in_minutes || 10} minutes.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/verify-otp/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error_code === "INVALID_OTP") {
          setError("Incorrect OTP. Please check and try again.");
        } else if (data.error_code === "OTP_EXPIRED") {
          setError("OTP expired. Request a new one.");
          setStep("email");
        } else {
          setError(data.message || "OTP verification failed");
        }
        return;
      }

      // OTP verified successfully, proceed to password entry
      setStep("newPassword");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!newPassword || !confirmPassword) {
      setError("Both password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/reset/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
            password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed");
      }

      setSuccessMessage("Password reset successful! Redirecting to login...");
      sessionStorage.removeItem("forgot_password_draft");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setOtpInfo("");
  };

  const handleBackToOtp = () => {
    setStep("otp");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <section className="relative overflow-hidden min-h-[78vh] bg-[#f4f7fb] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-16 h-72 w-72 rounded-full bg-[#33a1fd]/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-[#009877]/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative max-w-5xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-[#d5e3f5] bg-white shadow-[0_28px_60px_rgba(18,52,95,0.12)]">
          <div className="hidden lg:flex flex-col justify-between p-10 bg-[linear-gradient(140deg,#0f3f88_0%,#1a5fbf_52%,#2f8de7_100%)] text-white">
            <div>
              <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                Password Recovery
              </p>
              <h2 className="mt-4 text-3xl font-heading font-bold leading-tight">Reset your password</h2>
              <p className="mt-4 text-sm text-white/85 leading-relaxed">
                We'll send a secure OTP to your registered email address to verify your identity.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs text-white/80">Secure process</p>
              <p className="mt-1 text-sm font-semibold">Your account is protected by email verification.</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-semibold tracking-wide uppercase">FlyOCI Password Reset</span>
            </div>

            <h1 className="mt-4 text-3xl font-heading font-bold text-primary">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-600">
              {step === "email" && "Enter your registered email to get started."}
              {step === "otp" && "Enter the 6-digit OTP sent to your email."}
              {step === "newPassword" && "Create your new password."}
            </p>

            {/* Email Step */}
            {step === "email" && (
              <form onSubmit={handleRequestOtp} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#c9d8ea] bg-[#f9fbff] px-3.5 py-3 text-sm outline-none transition-all focus:border-[#1e66d0] focus:bg-white focus:ring-4 focus:ring-[#1e66d0]/10"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[linear-gradient(140deg,#0f4aa2_0%,#1f6de0_100%)] py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(24,95,196,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_28px_rgba(24,95,196,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>

                <div className="text-center pt-2">
                  <p className="text-sm text-slate-600">
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/login")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Login here
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* OTP Step */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-[#c9d8ea] bg-[#f9fbff] px-3.5 py-3 text-sm text-center font-mono text-lg outline-none transition-all focus:border-[#1e66d0] focus:bg-white focus:ring-4 focus:ring-[#1e66d0]/10"
                    placeholder="000000"
                  />
                </div>

                {otpInfo && (
                  <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    {otpInfo}
                  </p>
                )}

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="flex-1 rounded-xl border border-[#c9d8ea] py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[linear-gradient(140deg,#0f4aa2_0%,#1f6de0_100%)] py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(24,95,196,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_28px_rgba(24,95,196,0.34)]"
                  >
                    Verify OTP
                  </button>
                </div>
              </form>
            )}

            {/* New Password Step */}
            {step === "newPassword" && (
              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#c9d8ea] bg-[#f9fbff] px-3.5 py-3 pr-11 text-sm outline-none transition-all focus:border-[#1e66d0] focus:bg-white focus:ring-4 focus:ring-[#1e66d0]/10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#c9d8ea] bg-[#f9fbff] px-3.5 py-3 pr-11 text-sm outline-none transition-all focus:border-[#1e66d0] focus:bg-white focus:ring-4 focus:ring-[#1e66d0]/10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                {successMessage && (
                  <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {successMessage}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBackToOtp}
                    className="flex-1 rounded-xl border border-[#c9d8ea] py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-[linear-gradient(140deg,#0f4aa2_0%,#1f6de0_100%)] py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(24,95,196,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_28px_rgba(24,95,196,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
