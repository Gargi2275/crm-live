"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import { authService } from "@/lib/auth";
import toast from "react-hot-toast";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChangePasswordStep = "requestOtp" | "enterOtp" | "newPassword";

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [step, setStep] = useState<ChangePasswordStep>("requestOtp");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");

  const handleRequestOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await authService.requestChangePasswordOtp();
      setStep("enterOtp");
      if (response.otp) {
        setOtpInfo(`Dev OTP: ${response.otp}`);
      } else {
        setOtpInfo(`OTP sent to ${response.email}. Expires in ${response.otpExpiresInMinutes} minutes.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter a valid 6-digit OTP.");
      return;
    }

    setStep("newPassword");
  };

  const handleChangePassword = async () => {
    setError("");

    if (!newPassword) {
      setError("Password is required.");
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
      await authService.changePassword(otp.trim(), newPassword);
      toast.success("Password changed successfully!");
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("requestOtp");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setOtpInfo("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBack = () => {
    if (step === "enterOtp") {
      setStep("requestOtp");
      setOtp("");
      setError("");
      setOtpInfo("");
    } else if (step === "newPassword") {
      setStep("enterOtp");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-[#d5e3f5] overflow-hidden">
              {/* Header */}
              <div className="bg-[linear-gradient(140deg,#0f3f88_0%,#1a5fbf_52%,#2f8de7_100%)] px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-heading font-semibold text-white">Change Password</h2>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Request OTP Step */}
                {step === "requestOtp" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-600">
                      We'll send a verification code to your email to confirm the password change.
                    </p>

                    {error && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-[#c9d8ea] text-slate-700 font-medium hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition disabled:opacity-60"
                      >
                        {loading ? "Sending..." : "Send Code"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Enter OTP Step */}
                {step === "enterOtp" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-2 rounded-lg border border-[#c9d8ea] text-center font-mono text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="000000"
                      />
                    </div>

                    {otpInfo && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        {otpInfo}
                      </div>
                    )}

                    {error && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 px-4 py-2 rounded-lg border border-[#c9d8ea] text-slate-700 font-medium hover:bg-slate-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleVerifyOtp}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* New Password Step */}
                {step === "newPassword" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 rounded-lg border border-[#c9d8ea] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 rounded-lg border border-[#c9d8ea] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Confirm password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 px-4 py-2 rounded-lg border border-[#c9d8ea] text-slate-700 font-medium hover:bg-slate-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition disabled:opacity-60"
                      >
                        {loading ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
