"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface OTPInputProps {
  onComplete: (otp: string) => void;
  error?: string | boolean;
  success?: boolean;
}

export function OTPInput({ onComplete, error, success }: OTPInputProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastSubmittedOtpRef = useRef<string>("");

  useEffect(() => {
    const otp = digits.join("");
    const isComplete = digits.every((d) => d !== "") && otp.length === 6;
    if (isComplete && otp !== lastSubmittedOtpRef.current) {
      lastSubmittedOtpRef.current = otp;
      onComplete(otp);
    }
    if (!isComplete) {
      lastSubmittedOtpRef.current = "";
    }
  }, [digits, onComplete]);

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) return; // Prevent multiple chars
    
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, '').slice(0, 6).split("");
    const newDigits = [...digits];
    pasted.forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  return (
    <motion.div
      className="flex justify-center gap-2.5 sm:gap-3.5"
      animate={error ? { x: [0, -8, 8, -8, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {digits.map((digit, i) => {
        let stateClass = "border-[#d4dfec] bg-white text-[#102a43] shadow-[0_8px_18px_rgba(13,42,67,0.06)]";
        if (error) stateClass = "border-red text-red-600";

        else if (success) stateClass = "border-green bg-greenL text-green-700";
        else if (digit) stateClass = "border-[#33a1fd]/60 bg-[#f8fbff] text-[#102a43] shadow-[0_10px_20px_rgba(15,95,191,0.12)]";

        return (
          <motion.div
            key={i}
            initial={false}
            animate={success ? { backgroundColor: "#DCFCE7", borderColor: "#16A34A" } : {}} 
            transition={{ delay: success ? i * 0.05 : 0, duration: 0.2 }}
            className={`h-[58px] w-[48px] overflow-hidden rounded-[14px] border ${stateClass}`}
          >
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="h-full w-full border-0 bg-transparent text-center font-mono text-[22px] font-bold tracking-[0.08em] text-inherit outline-none ring-0 transition focus:bg-[#eef6ff] focus:shadow-[inset_0_0_0_2px_rgba(51,161,253,0.5)] disabled:opacity-100 placeholder:text-transparent"
              maxLength={1}
              disabled={success}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
