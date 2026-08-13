"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Button } from "@/components/ui/Button";
import { useEVisa } from "@/context/EVisaContext";
import { eVisaApi } from "@/lib/api-client";
import {
  clearStripeReturnParams,
  getStripeCheckoutUrl,
  readStripeReturnParams,
  redirectToStripeCheckout,
} from "@/lib/stripe-checkout";

const minorToMajor = (value?: number, currency = "GBP") => {
  const zeroDecimal = new Set(["JPY", "KRW", "VND"]);
  if (zeroDecimal.has(currency.toUpperCase())) {
    return value ?? 0;
  }
  return (value ?? 0) / 100;
};

const formatMoney = (amount: number, currency = "GBP") => {
  const code = currency.toUpperCase();
  const symbol = code === "GBP" ? "£" : code === "EUR" ? "€" : code === "USD" ? "$" : `${code} `;
  return `${symbol}${amount.toFixed(2)}`;
};

export default function EVisaPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseNumber = (searchParams.get("case") || searchParams.get("reference") || "").trim();
  const { updateData } = useEVisa();

  const [serviceName, setServiceName] = useState("Indian e-Visa assistance");
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [currency, setCurrency] = useState("GBP");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const docsUrl = (resolvedCase: string, url?: string) => {
    if (url && url.startsWith("/")) return url;
    return `/indian-e-visa/upload?case=${encodeURIComponent(resolvedCase)}`;
  };

  const markPaidLocally = (resolvedCase: string) => {
    updateData({
      fileNumber: resolvedCase,
      hasPaid: true,
      isEmailConfirmed: true,
    });
  };

  useEffect(() => {
    const loadCase = async () => {
      if (!caseNumber) {
        setError("Missing case number. Please return to your application and try again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const resume = await eVisaApi.getResume(caseNumber);
        const app = resume.data.application_data;
        setServiceName(app.service_name || "Indian e-Visa assistance");
        setPaymentConfirmed(Boolean(app.payment_confirmed));
        updateData({ isEmailConfirmed: true, fileNumber: caseNumber });
        if (app.payment_confirmed) {
          markPaidLocally(caseNumber);
          const next = docsUrl(caseNumber);
          setUploadUrl(next);
          router.replace(next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load payment details.");
      } finally {
        setLoading(false);
      }
    };

    void loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber, router]);

  useEffect(() => {
    const { sessionId, paymentKind, reference } = readStripeReturnParams();
    if (!sessionId || paymentKind !== "evisa") return;

    const resolvedCase = String(reference || caseNumber || "").trim();
    if (!resolvedCase) return;

    let active = true;
    void (async () => {
      setPaying(true);
      setError("");

      const confirmOnce = () =>
        eVisaApi.paymentConfirm(resolvedCase, {
          stripe_session_id: sessionId,
          payment_intent_id: sessionId,
        });

      try {
        const response = await confirmOnce();
        if (!active) return;
        clearStripeReturnParams();
        setPaymentConfirmed(true);
        markPaidLocally(resolvedCase);
        const next = docsUrl(resolvedCase, response.data.upload_url);
        setUploadUrl(next);
        router.replace(next);
      } catch {
        // Stripe can lag briefly after redirect — retry once.
        try {
          await new Promise((r) => setTimeout(r, 1500));
          const response = await confirmOnce();
          if (!active) return;
          clearStripeReturnParams();
          setPaymentConfirmed(true);
          markPaidLocally(resolvedCase);
          const next = docsUrl(resolvedCase, response.data.upload_url);
          setUploadUrl(next);
          router.replace(next);
        } catch (retryError) {
          if (!active) return;
          setError(
            retryError instanceof Error
              ? retryError.message
              : "Payment verification failed. If you were charged, refresh this page or open your case again.",
          );
        }
      } finally {
        if (active) setPaying(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber, router]);

  const displayAmount = useMemo(() => {
    if (amountMinor === null) return null;
    return formatMoney(minorToMajor(amountMinor, currency), currency);
  }, [amountMinor, currency]);

  const handlePayment = async () => {
    if (!caseNumber || paymentConfirmed) return;

    setError("");
    setPaying(true);

    try {
      const response = await eVisaApi.createPaymentOrder(caseNumber);
      const order = response.data;
      setAmountMinor(order.amount);
      setCurrency(order.currency || "GBP");
      redirectToStripeCheckout(getStripeCheckoutUrl(order));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="w-full bg-[#F4F6F9] text-[#102A43]">
      <div className="mx-auto w-full max-w-[720px] px-3 py-4 sm:px-5 sm:py-5">
        <div className="mb-4 flex justify-center">
          <ProgressStepper currentStep={1} />
        </div>

        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-[22px] font-semibold text-[#0F1F3D]">Forms & Payment</h1>
          <p className="mt-1 text-[13px] text-[#627D98]">
            Pay securely — then upload your documents on the next screen.
          </p>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-[13px] text-[#627D98]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-lg border border-[#E8EEF6] bg-[#F7F9FC] p-4">
                <div className="space-y-2 text-[13px] text-[#334E68]">
                  <p className="flex justify-between gap-3">
                    <span>Case</span>
                    <strong className="text-[#0F1F3D]">{caseNumber || "-"}</strong>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span>Service</span>
                    <strong className="text-right text-[#0F1F3D]">{serviceName}</strong>
                  </p>
                  {displayAmount ? (
                    <p className="flex justify-between gap-3 border-t border-[#E8EEF6] pt-2 text-[15px]">
                      <span className="font-semibold">Total due</span>
                      <strong className="text-[#1A56DB]">{displayAmount}</strong>
                    </p>
                  ) : null}
                </div>
              </div>

              {paymentConfirmed ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
                  Payment confirmed. Taking you to documents…
                </div>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="mt-5">
                {paymentConfirmed ? (
                  <Button
                    onClick={() =>
                      router.push(
                        uploadUrl || `/indian-e-visa/upload?case=${encodeURIComponent(caseNumber)}`,
                      )
                    }
                  >
                    Upload documents
                  </Button>
                ) : (
                  <Button onClick={() => void handlePayment()} isLoading={paying} disabled={!caseNumber}>
                    Pay & continue to documents
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
