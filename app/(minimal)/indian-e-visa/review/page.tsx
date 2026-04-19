"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { ProgressStepper } from "@/components/ProgressStepper";
import { eVisaApi } from "@/lib/api-client";
import { authService } from "@/lib/auth";
import { isCurrentPathAllowed, isMissingCaseError, resolveCanonicalEVisaRoute, resolveMissingCaseRedirect } from "@/lib/evisa-step-guard";

export default function ReviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useEVisa();
  const caseFromQuery = searchParams.get("case") || "";
  const caseNumber = caseFromQuery || data.fileNumber || "FO-EV-...";

  useEffect(() => {
    let cancelled = false;

    const enforceStepOrder = async () => {
      const normalizedCase = (caseFromQuery || data.fileNumber || "").trim().toUpperCase();
      if (!normalizedCase) {
        if (!isCurrentPathAllowed(pathname, "/indian-e-visa")) {
          router.replace("/indian-e-visa");
        }
        return;
      }

      let canonicalRoute = `/indian-e-visa/review?case=${encodeURIComponent(normalizedCase)}`;
      if (!data.hasUploaded) {
        canonicalRoute = `/indian-e-visa/upload?case=${encodeURIComponent(normalizedCase)}`;
      }

      if (authService.isLoggedIn()) {
        try {
          const resume = await eVisaApi.getResume(normalizedCase);
          canonicalRoute = resolveCanonicalEVisaRoute(resume.data, normalizedCase);
        } catch (error) {
          if (isMissingCaseError(error)) {
            canonicalRoute = resolveMissingCaseRedirect(true);
          }
        }
      }

      if (!cancelled && !isCurrentPathAllowed(pathname, canonicalRoute)) {
        router.replace(canonicalRoute);
      }
    };

    void enforceStepOrder();

    const handlePopState = () => {
      void enforceStepOrder();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [caseFromQuery, data.fileNumber, data.hasUploaded, pathname, router]);

  return (
    <div className="flex-1 w-full bg-bg relative pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-14 -left-8 h-44 w-44 rounded-full bg-[#e7f1ff] blur-2xl" />
        <div className="absolute top-28 right-6 h-36 w-36 rounded-full bg-[#eaf9f1] blur-2xl" />
      </div>

      <div className="w-full bg-white/90 py-2 px-4 border-b border-[#e4edf9]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="font-mono text-primary text-xs sm:text-sm font-bold flex items-center gap-2">
            <span className="text-muted">File No:</span> {caseNumber}
          </div>
          <div className="text-accent font-bold text-sm flex gap-2 items-center">
            <CheckCircle2 className="h-4 w-4" /> Final review
          </div>
        </div>
      </div>

      <div className="pt-2">
        <ProgressStepper currentStep={5} />
      </div>

      <div className="max-w-[900px] mx-auto px-4 mt-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[18px] border border-[#d5e3f5] bg-white/95 backdrop-blur-sm p-5 sm:p-7"
        >
          <p className="font-body text-[11px] tracking-[0.08em] text-[#8ea4bf] uppercase font-semibold">Process started</p>
          <h1 className="font-heading font-extrabold text-[#102a4c] text-[30px] sm:text-[38px] leading-tight mt-1">
            Your e-Visa Application Is
            <span className="text-[#2563eb]"> In Process</span>
          </h1>
          <p className="font-body text-[14px] sm:text-[15px] text-[#5f7694] mt-3 max-w-[760px] leading-relaxed">
            Step 5 is completed. Your file is now in processing and live updates are available in the tracking dashboard.
          </p>

          <div className="mt-6">
            <div className="rounded-[14px] border border-[#dce8f7] bg-[#f9fcff] p-4 sm:p-5">
              <p className="font-body text-[10px] tracking-[0.08em] text-[#90a6c1] uppercase font-semibold">Application snapshot</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3 rounded-[10px] border border-[#deebfb] bg-white px-3 py-3">
                  <FileText className="h-4 w-4 text-[#2d66dc] mt-0.5" />
                  <div>
                    <p className="font-body text-[12px] font-semibold text-[#1a3e6d]">Case reference</p>
                    <p className="font-mono text-[12px] text-[#2d66dc] mt-0.5">{caseNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[10px] border border-[#deebfb] bg-white px-3 py-3">
                  <ShieldCheck className="h-4 w-4 text-[#1f8a5b] mt-0.5" />
                  <div>
                    <p className="font-body text-[12px] font-semibold text-[#1a3e6d]">Security & compliance</p>
                    <p className="font-body text-[12px] text-[#5f7694] mt-0.5">Documents are encrypted and linked to your case ID.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[10px] border border-[#deebfb] bg-white px-3 py-3">
                  <Sparkles className="h-4 w-4 text-[#c57d00] mt-0.5" />
                  <div>
                    <p className="font-body text-[12px] font-semibold text-[#1a3e6d]">Current status</p>
                    <p className="font-body text-[12px] text-[#5f7694] mt-0.5">Your case is in process. You can monitor updates in the tracking dashboard.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-[#cfe0f7] bg-[#f6fbff] p-4 sm:p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8d6ef] bg-white px-3 py-1 text-[11px] font-semibold text-[#1f6aa1]">
                <CheckCircle2 className="h-4 w-4" /> Submitted and in process
              </div>

              {/* <button
                type="button"
                onClick={() => router.push( `/track?case=${encodeURIComponent(caseNumber)}`)}
                className="mt-3 w-full rounded-[11px] bg-[#2d66dc] py-3 text-[14px] font-bold text-white hover:bg-[#2459c3] transition-colors"
              >
                View Tracking Dashboard
              </button> */}

              <p className="mt-2 font-body text-[11px] text-[#7d94b1] leading-relaxed text-center">
                Status updates, timeline, and support actions are available in tracking.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
