"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Download, MessageCircle, Mail, CheckCircle2, Circle } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { StatusTimeline, TimelineItem } from "@/components/StatusTimeline";
import { OTPInput } from "@/components/OTPInput";

export default function TrackPage() {
  const { data } = useEVisa();
  const [searchVal, setSearchVal] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "error" | "success">("idle");
  const [showDashboard, setShowDashboard] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;

    setIsSearching(true);
    setError("");

    setTimeout(() => {
      setIsSearching(false);
      // Mock validation
      if (searchVal.toUpperCase().startsWith("FO-EV-") || searchVal === data.fileNumber || searchVal === data.email) {
        setShowOTP(true);
      } else {
        setError("No application found with this reference.");
      }
    }, 800);
  };

  const handleOTPComplete = (code: string) => {
    if (code === "123456") {
      setOtpStatus("success");
      setTimeout(() => {
        setShowOTP(false);
        setShowDashboard(true);
      }, 600);
    } else {
      setOtpStatus("error");
      setTimeout(() => setOtpStatus("idle"), 1000);
    }
  };

  const stages = [
    { label: "Registered", state: "done" },
    { label: "Email", state: "done" },
    { label: "Payment", state: "done" },
    { label: "Docs", state: "done" },
    { label: "Preparation", state: "active" },
    { label: "Submitted", state: "pending" },
    { label: "Decision", state: "pending" },
    { label: "Closed", state: "pending" },
  ] as const;

  const timelineRows = [
    { title: "Registered", note: "26 Mar 2026, 09:14 AM", state: "done" },
    { title: "Email confirmed", note: "26 Mar 2026, 09:17 AM", state: "done" },
    { title: "Payment confirmed", note: "26 Mar 2026, 09:22 AM", state: "done" },
    { title: "Documents received", note: "26 Mar 2026, 11:05 AM", state: "done" },
    { title: "In preparation", note: "In progress", state: "active" },
    { title: "Submitted to authorities", note: "Awaiting", state: "pending" },
    { title: "Decision received", note: "Awaiting", state: "pending" },
    { title: "Closed", note: "Awaiting", state: "pending" },
  ] as const;

  return (
    <div className="flex-1 w-full bg-bg relative pb-32">
      <AnimatePresence mode="wait">
        {!showDashboard ? (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="w-full pt-10">
              <h1 className="font-heading font-extrabold text-[#0f1f3d] text-[40px] sm:text-[42px] text-center">
                Track your <span className="italic text-[#1a56db]">application</span>
              </h1>
              <p className="font-body text-center text-[#627a96] text-[14px] mt-2">Enter your file number and we&apos;ll show live status updates</p>

              <div className="mt-5 flex justify-center flex-wrap gap-2">
                <span className="rounded-[8px] bg-[#2d66dc] px-4 py-1.5 text-[11px] font-semibold text-white">File number</span>
                <span className="rounded-[8px] border border-[#d5e3f5] bg-white px-4 py-1.5 text-[11px] text-[#7a8fa8]">Email address</span>
                <span className="rounded-[8px] border border-[#d5e3f5] bg-white px-4 py-1.5 text-[11px] text-[#7a8fa8]">Magic link</span>
              </div>

              <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-[12px] border border-[#d6e4f4] bg-white p-4">
                      {!showOTP ? (
                        <form onSubmit={handleSearch}>
                          <p className="font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em]">Enter file number</p>
                          <input
                            type="text"
                            placeholder="FO-EV-2025-000001"
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className={`mt-2 w-full rounded-[8px] border px-3 py-2.5 font-mono text-[14px] outline-none ${
                              error ? "border-red-400 text-red-600" : "border-[#d8e4f3] bg-[#f8fbff] text-[#1a2f4d]"
                            }`}
                            disabled={isSearching}
                          />

                          <p className="mt-3 font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em]">Verify with OTP</p>
                          <p className="font-body text-[10px] text-[#8098b5] mt-1">We&apos;ll send a 6-digit code to your registered email address</p>

                          <div className="mt-2">
                            <OTPInput onComplete={handleOTPComplete} error={otpStatus === "error"} success={otpStatus === "success"} />
                          </div>

                          <p className="mt-2 text-[10px] text-[#2d66dc] font-body">Resend code · 0:48 remaining</p>
                          {error && <p className="text-red-600 font-body text-xs mt-2">{error}</p>}

                          <motion.button
                            type="submit"
                            disabled={isSearching || !searchVal.trim()}
                            whileHover={!isSearching && searchVal.trim() ? { scale: 1.01 } : {}}
                            whileTap={!isSearching && searchVal.trim() ? { scale: 0.99 } : {}}
                            className={`mt-3 w-full rounded-[10px] py-2.5 text-[14px] font-semibold transition-all ${
                              isSearching || !searchVal.trim() ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-[#2d66dc] text-white"
                            }`}
                          >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "View status →"}
                          </motion.button>

                          <p className="mt-2 text-center font-body text-[10px] text-[#9ab0c8]">No account or password needed</p>
                        </form>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <h3 className="text-center font-heading text-[#173b69] text-xl font-semibold">Security Check</h3>
                          <p className="text-center font-body text-[12px] text-[#7089a6] mt-1">Enter the OTP sent to {searchVal}</p>
                          <div className="mt-4">
                            <OTPInput onComplete={handleOTPComplete} error={otpStatus === "error"} success={otpStatus === "success"} />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {!showOTP && (
                      <div className="rounded-[12px] border border-[#d6e4f4] bg-white p-4">
                        <p className="font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em]">Or use magic link</p>
                        <div className="mt-2 rounded-[10px] border border-[#b9d5f5] bg-[#f1f7ff] p-3">
                          <p className="font-body text-[12px] font-semibold text-[#1d4f89]">Send me a tracking link</p>
                          <p className="font-body text-[10px] text-[#6584ac]">Arrives in your inbox in under 1 min</p>
                        </div>

                        <input
                          type="email"
                          placeholder="you@email.com"
                          className="mt-3 w-full rounded-[8px] border border-[#d8e4f3] bg-[#f8fbff] px-3 py-2.5 font-body text-[14px] outline-none"
                        />

                        <button className="mt-3 w-full rounded-[10px] border border-[#b9d5f5] bg-white py-2.5 text-[14px] font-semibold text-[#2d66dc]">
                          Send magic link →
                        </button>

                        <div className="mt-3 border-t border-[#e8eff9] pt-3">
                          <p className="font-body text-[10px] font-semibold text-[#9ab0c8] uppercase tracking-[0.06em] mb-2">Recent applications</p>
                          <div className="space-y-2">
                            <div className="rounded-[9px] border border-[#dde8f5] bg-[#f8fbff] px-3 py-2 flex items-center justify-between">
                              <div>
                                <p className="font-mono text-[11px] font-semibold text-[#1a2f4d]">FO-EV-2026-004821</p>
                                <p className="font-body text-[10px] text-[#8aa0ba]">Rajesh Kumar · 1-yr e-Visa</p>
                              </div>
                              <span className="rounded-full bg-[#fff7e8] px-2 py-0.5 text-[10px] font-semibold text-[#9b6200]">In prep</span>
                            </div>
                            <div className="rounded-[9px] border border-[#dde8f5] bg-[#f8fbff] px-3 py-2 flex items-center justify-between">
                              <div>
                                <p className="font-mono text-[11px] font-semibold text-[#1a2f4d]">FO-OCI-2026-001234</p>
                                <p className="font-body text-[10px] text-[#8aa0ba]">Priya Kumar · OCI renewal</p>
                              </div>
                              <span className="rounded-full bg-[#edf9f2] px-2 py-0.5 text-[10px] font-semibold text-[#1e7348]">Submitted</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full pt-8"
          >
            <div className="w-full">
              <button 
                onClick={() => { setShowDashboard(false); setSearchVal(""); }}
                className="flex items-center gap-2 text-muted hover:text-primary font-body font-bold text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Search
              </button>

              <div className="bg-white">
                  <div className="px-4 py-3 border-b border-[#e7f0fb]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-body text-[14px] font-semibold text-[#17345d]">{data.fullName || "Rajesh Kumar"}</p>
                        <span className="mt-1 inline-flex items-center rounded-[8px] border border-[#cfe0f7] bg-[#f5f9ff] px-2 py-1 font-mono text-[10px] font-semibold text-[#2f6fe8]">
                          {searchVal === data.email && data.fileNumber ? data.fileNumber : searchVal.toUpperCase()}
                        </span>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[#f2d8ac] bg-[#fff6e8] px-3 py-1 text-[10px] font-semibold text-[#a86500]">
                        In preparation
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                      {stages.map((stage, idx) => {
                        const isDone = stage.state === "done";
                        const isActive = stage.state === "active";

                        return (
                          <div key={stage.label} className="flex items-center gap-2 min-w-fit">
                            <div className="flex flex-col items-center gap-1 min-w-[56px]">
                              <span
                                className={`h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                  isDone
                                    ? "bg-[#2b65dc] text-white"
                                    : isActive
                                      ? "border border-[#f0b44e] bg-[#fff6e8] text-[#a86500]"
                                      : "border border-[#d3deed] bg-[#f8fbff] text-[#98abc3]"
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                              </span>
                              <span className={`font-body text-[9px] ${isDone ? "text-[#2b65dc]" : isActive ? "text-[#a86500]" : "text-[#9bb0c8]"}`}>
                                {stage.label}
                              </span>
                            </div>

                            {idx < stages.length - 1 && (
                              <span className={`h-[2px] w-8 ${isDone ? "bg-[#2b65dc]" : "bg-[#d8e4f3]"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-3 p-3">
                    <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                      <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Status Timeline</p>

                      <div className="space-y-2.5">
                        {timelineRows.map((row) => {
                          const isDone = row.state === "done";
                          const isActive = row.state === "active";

                          return (
                            <div key={row.title} className="flex items-start gap-2.5">
                              <span
                                className={`mt-0.5 h-[16px] w-[16px] rounded-full flex items-center justify-center ${
                                  isDone
                                    ? "bg-[#2b65dc] text-white"
                                    : isActive
                                      ? "border border-[#f0b44e] bg-[#fff6e8] text-[#a86500]"
                                      : "border border-[#d3deed] bg-[#f8fbff] text-[#9ab0c9]"
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className={`font-body text-[12px] font-semibold ${isDone ? "text-[#183d70]" : isActive ? "text-[#a86500]" : "text-[#8ea4bf]"}`}>
                                  {row.title}
                                </p>
                                <p className="font-body text-[10px] text-[#8ea4bf]">{row.note}</p>

                                {isActive && (
                                  <div className="mt-1.5 rounded-[8px] border border-[#f0cf95] bg-[#fff7e9] px-2 py-1.5">
                                    <p className="font-body text-[10px] text-[#9a6100]">
                                      Your application is being prepared for submission. We&apos;ll notify you by email and WhatsApp when submitted.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                        <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Application Summary</p>
                        <div className="space-y-1.5">
                          <p className="font-body text-[11px] text-[#8ba1bb]">File number</p>
                          <p className="font-mono text-[11px] font-semibold text-[#2f6fe8]">{searchVal === data.email && data.fileNumber ? data.fileNumber : searchVal.toUpperCase()}</p>
                          <p className="font-body text-[11px] text-[#8ba1bb] mt-1">Applicant name</p>
                          <p className="font-body text-[12px] font-semibold text-[#183d70]">{data.fullName || "Rajesh Kumar"}</p>
                          <p className="font-body text-[11px] text-[#8ba1bb] mt-1">Visa type</p>
                          <p className="font-body text-[12px] font-semibold text-[#183d70]">{data.visaDuration || "1-Year"} e-Visa</p>
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
                        <p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Actions</p>
                        <div className="space-y-2">
                          <button className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2">
                            <Download className="h-4 w-4" /> Download acknowledgment
                          </button>
                          <button className="w-full rounded-[8px] border border-[#cfe8d9] bg-[#edf9f2] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1e7348] hover:bg-[#e4f6ec] transition-colors inline-flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> WhatsApp support
                          </button>
                          <button className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Email support
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
