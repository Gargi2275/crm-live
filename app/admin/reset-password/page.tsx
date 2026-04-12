"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { confirmStaffForgotPassword } from "@/lib/admin-auth";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error("Invalid reset token.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await confirmStaffForgotPassword(token, newPassword);
      toast.success("Password reset successfully.");
      router.replace("/admin/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[16px] border border-[#D9E1EA] bg-white p-6 shadow-[0_18px_36px_rgba(15,42,67,0.12)]">
        <h1 className="text-[24px] font-heading font-semibold text-[#102A43]">Reset Staff Password</h1>
        <p className="mt-1 text-sm text-[#486581]">Set a new password for your internal staff account.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm text-[#334E68]">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-[12px] border border-[#D9E1EA] px-3 py-2.5 text-sm focus:border-[#009877] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#334E68]">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-[12px] border border-[#D9E1EA] px-3 py-2.5 text-sm focus:border-[#009877] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[12px] bg-[#009877] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-70"
          >
            {saving ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
