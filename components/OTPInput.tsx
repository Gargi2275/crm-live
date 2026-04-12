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
      className="flex justify-center gap-2 sm:gap-3"
      animate={error ? { x: [0, -8, 8, -8, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {digits.map((digit, i) => {
        let stateClass = "border-border bg-white text-primary";
        if (error) stateClass = "border-red text-red-600";

        else if (success) stateClass = "border-green bg-greenL text-green-700";
        else if (digit) stateClass = "border-accent/60 bg-[#ffffff] text-primary";

        return (
          <motion.div
            key={i}
            initial={false}
            animate={success ? { backgroundColor: "#DCFCE7", borderColor: "#16A34A" } : {}} 
            transition={{ delay: success ? i * 0.05 : 0, duration: 0.2 }}
            className={`w-[48px] h-[54px] rounded-[10px] overflow-hidden ${stateClass}`}
          >
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-full h-full text-center font-mono text-[22px] font-bold outline-none transition-colors border-2 border-blue-400 focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] bg-transparent disabled:opacity-100 placeholder:text-transparent"
              maxLength={1}
              disabled={success}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
