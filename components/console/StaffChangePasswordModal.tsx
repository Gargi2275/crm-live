"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { changeStaffPassword } from "@/lib/admin-auth";

type StaffChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-[10px] border border-[#D9E1EA] bg-white px-3 py-2.5 pr-10 text-sm text-[#102A43] outline-none focus:border-[#009877] focus:ring-2 focus:ring-[#009877]/20";

export function StaffChangePasswordModal({ open, onClose }: StaffChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setLoading(true);
    try {
      await changeStaffPassword(currentPassword, newPassword);
      toast.success("Password changed successfully.");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-[#102A43]/45 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog backdrop"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-change-password-title"
        className="relative z-[1] w-full max-w-[440px] rounded-t-[16px] sm:rounded-[14px] bg-white border border-[#D9E1EA] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E5EAF0] px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#009877]/10 text-[#006F57]">
              <KeyRound className="h-[18px] w-[18px]" />
            </span>
            <h2
              id="staff-change-password-title"
              className="text-base font-heading font-semibold text-[#102A43]"
            >
              Change Password
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-[8px] p-1.5 text-[#627D98] hover:bg-[#F5F7FA] hover:text-[#102A43]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-5 py-4 space-y-3.5">
          <p className="text-sm text-[#627D98]">
            Enter your current password, then choose a new one. You will stay signed in after updating.
          </p>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">Current password</span>
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputClass}
                placeholder="Current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829AB1] hover:text-[#486581]"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">New password</span>
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829AB1] hover:text-[#486581]"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-[#486581]">Confirm new password</span>
            <div className="relative mt-1">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829AB1] hover:text-[#486581]"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-[10px] border border-[#F1A7A0]/45 bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[10px] border border-[#D9E1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-[10px] bg-[#009877] px-5 py-2.5 text-sm font-heading font-semibold text-white hover:bg-[#007B61] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Saving…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
