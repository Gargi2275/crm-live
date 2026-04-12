"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { requestStaffForgotPassword } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [requestingReset, setRequestingReset] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
      toast.success("Admin login successful.");
      router.replace("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Email is required.");
      return;
    }

    setRequestingReset(true);
    try {
      await requestStaffForgotPassword(resetEmail.trim().toLowerCase());
      toast.success("If your account exists, reset link has been sent.");
      setResetEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request reset link.");
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[16px] border border-[#D9E1EA] bg-white p-6 shadow-[0_18px_36px_rgba(15,42,67,0.12)]">
        <h1 className="text-[24px] font-heading font-semibold text-[#102A43]">FlyOCI Admin Login</h1>
        <p className="mt-1 text-sm text-[#486581]">Staff access only. Customer login is separate.</p>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="mb-1 block text-sm text-[#334E68]">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-[12px] border border-[#D9E1EA] px-3 py-2.5 text-sm focus:border-[#009877] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#334E68]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[12px] border border-[#D9E1EA] px-3 py-2.5 text-sm focus:border-[#009877] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[12px] bg-[#009877] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#E5EAF0] pt-4">
          <p className="text-sm font-semibold text-[#102A43]">Forgot password?</p>
          <form className="mt-2 space-y-2" onSubmit={handleRequestReset}>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Staff email"
              className="w-full rounded-[12px] border border-[#D9E1EA] px-3 py-2.5 text-sm focus:border-[#009877] focus:outline-none"
            />
            <button
              type="submit"
              disabled={requestingReset}
              className="w-full rounded-[12px] border border-[#D9E1EA] px-4 py-2.5 text-sm font-semibold text-[#334E68] hover:bg-[#F5F7FA] disabled:opacity-70"
            >
              {requestingReset ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
