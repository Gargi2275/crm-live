"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Download, MessageCircle, Mail, UploadCloud } from "lucide-react";

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

  const determineTimeline = (): TimelineItem[] => {
    return [
      { id: 1, title: "Registered", description: "Basic details registered.", status: "complete", timestamp: "09:00 AM" },
      { id: 2, title: "Email Confirmed", description: "Email securely verified.", status: "complete" },
      { id: 3, title: "Payment Confirmed", description: "Fee payment successful.", status: "complete" },
      { id: 4, title: "Documents Received", description: "Passport and photo provided.", status: "complete" },
      { id: 5, title: "In Preparation", description: "Our experts are reviewing your documents.", status: "active" },
      { id: 6, title: "Submitted", description: "Sent to the Government of India portal.", status: "pending" },
      { id: 7, title: "Decision Received", description: "Pending outcome from authorities.", status: "pending" },
      { id: 8, title: "Closed", description: "Application process concluded.", status: "pending" }
    ];
  };

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
            {/* Navy Hero for tracking */}
            <div className="bg-primary pt-24 pb-32 px-4 text-center">
              <h1 className="font-heading font-extrabold text-white text-[36px] sm:text-[48px] mb-4">
                Track Your Application
              </h1>
              <p className="font-body text-white/70 text-[16px]">
                Enter your reference to see live updates
              </p>
            </div>

            <div className="max-w-[500px] mx-auto px-4 -mt-20 relative z-10">
              <div className="bg-white rounded-card shadow-card p-6 sm:p-10">
                {!showOTP ? (
                  <form onSubmit={handleSearch}>
                    <div className="mb-6">
                      <label className="block text-primary font-body font-bold text-sm mb-2">File Number or Email</label>
                      <input
                        type="text"
                        placeholder="FO-EV-2025-000001"
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className={`w-full px-5 py-4 border-[1.5px] rounded-input font-mono text-[16px] outline-none transition-colors ${
                          error ? "border-red text-red focus:border-red" : "border-border text-primary focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
                        }`}
                        disabled={isSearching}
                      />
                      {error && <p className="text-red font-bold text-sm mt-2">{error}</p>}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSearching || !searchVal.trim()}
                      whileHover={!isSearching && searchVal.trim() ? { scale: 1.02, y: -2 } : {}}
                      whileTap={!isSearching && searchVal.trim() ? { scale: 0.98 } : {}}
                      className={`w-full font-bold text-[16px] px-7 py-[16px] rounded-btn shadow-btn flex justify-center items-center transition-all ${
                        isSearching || !searchVal.trim() ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed transform-none" : "bg-accent text-primary hover:shadow-btn-hover"
                      }`}
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Track Application →"}
                    </motion.button>
                  </form>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-6">
                      <h3 className="font-heading font-extrabold text-primary text-2xl mb-2">Security Check</h3>
                      <p className="font-body text-muted text-sm">
                        For your privacy, we&apos;ve sent a 6-digit OTP to the email associated with <strong className="text-primary">{searchVal}</strong>.
                      </p>
                    </div>

                    <label className="block text-center font-body font-bold text-primary text-[15px] mb-4">
                      Enter the 6-digit code
                    </label>
                    <OTPInput 
                      onComplete={handleOTPComplete} 
                      error={otpStatus === "error"} 
                      success={otpStatus === "success"} 
                    />
                    
                    <div className="h-6 mt-3 flex justify-center items-center">
                      <AnimatePresence mode="wait">
                        {otpStatus === "error" && (
                          <motion.p key="error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red text-sm font-bold flex items-center gap-1.5">
                            <span className="text-lg leading-none">✗</span> Incorrect code
                          </motion.p>
                        )}
                        {otpStatus === "idle" && (
                          <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-muted font-mono text-[11px]">
                            Tip: Use 123456
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
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
            className="w-full pt-10"
          >
            <div className="max-w-[1000px] mx-auto px-4">
              <button 
                onClick={() => { setShowDashboard(false); setSearchVal(""); }}
                className="flex items-center gap-2 text-muted hover:text-primary font-body font-bold text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Search
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
                
                {/* Left Column */}
                <div className="space-y-6">
                  
                  {/* Summary bar */}
                  <div className="bg-white rounded-card shadow-card p-5 border border-border flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="font-mono font-bold text-primary text-[15px]">
                        <span className="text-muted font-body text-xs font-semibold mr-2 uppercase tracking-wider">File No</span>
                        {searchVal === data.email && data.fileNumber ? data.fileNumber : searchVal.toUpperCase()}
                      </div>
                      <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                      <div className="font-body font-bold text-primary text-[15px]">
                        {data.fullName || "John Doe"}
                      </div>
                      <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                      <div className="bg-accent/10 border border-accent/20 font-body font-bold text-primary text-xs px-2.5 py-1 rounded-badge">
                        {data.visaDuration || "1-Year"} e-Visa
                      </div>
                    </div>
                  </div>

                  {/* Latest Update Panel */}
                  <div className="bg-primary rounded-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-heading italic text-white text-xl sm:text-2xl mb-1">
                        &quot;Your application is being prepared for submission.&quot;
                      </h3>
                      <p className="font-body text-white/55 text-sm">
                        Updated just now
                      </p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="bg-white rounded-card shadow-card p-6 sm:p-10 border border-border">
                    <h3 className="font-heading font-extrabold text-primary text-xl sm:text-2xl mb-8">
                      Application Progress
                    </h3>
                    <StatusTimeline items={determineTimeline()} />
                  </div>
                </div>

                {/* Right Column: Contextual Actions */}
                <div className="sticky top-24 space-y-4">
                  <h4 className="font-body font-bold text-primary text-sm uppercase tracking-wider mb-2 px-1">Actions & Support</h4>
                  
                  <button className="w-full flex items-center justify-between bg-white border border-primary text-primary font-bold px-5 py-4 rounded-xl hover:bg-primary hover:text-white transition-colors group">
                    <span className="flex items-center gap-3">
                      <UploadCloud className="w-5 h-5" />
                      Upload missing documents
                    </span>
                  </button>
                  
                  <button className="w-full flex items-center justify-between bg-white border border-primary text-primary font-bold px-5 py-4 rounded-xl hover:bg-primary hover:text-white transition-colors group">
                    <span className="flex items-center gap-3">
                      <Download className="w-5 h-5" />
                      Download receipt
                    </span>
                  </button>

                  <div className="pt-4 border-t border-border mt-4">
                    <button className="w-full flex items-center gap-3 bg-greenL text-green font-bold px-5 py-4 rounded-xl hover:opacity-90 transition-opacity mb-4">
                      <MessageCircle className="w-5 h-5" /> WhatsApp Support
                    </button>
                    
                    <button className="w-full flex items-center gap-3 bg-white border border-primary text-primary font-bold px-5 py-4 rounded-xl hover:bg-primary hover:text-white transition-colors">
                      <Mail className="w-5 h-5" /> Email Support
                    </button>
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
