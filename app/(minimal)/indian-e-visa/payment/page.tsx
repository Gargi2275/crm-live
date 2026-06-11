"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
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

  const [serviceName, setServiceName] = useState("Indian e-Visa assistance");
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [currency, setCurrency] = useState("GBP");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

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
        if (app.payment_confirmed) {
          setUploadUrl(`/indian-e-visa/upload?case=${encodeURIComponent(caseNumber)}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load payment details.");
      } finally {
        setLoading(false);
      }
    };

    void loadCase();
  }, [caseNumber]);

  useEffect(() => {
    const { sessionId, paymentKind, reference } = readStripeReturnParams();
    if (!sessionId || paymentKind !== "evisa") return;

    const resolvedCase = String(reference || caseNumber || "").trim();
    if (!resolvedCase) return;

    let active = true;
    void (async () => {
      setPaying(true);
      setError("");
      try {
        const response = await eVisaApi.paymentConfirm(resolvedCase, {
          payment_intent_id: sessionId,
        });
        if (!active) return;
        clearStripeReturnParams();
        setPaymentConfirmed(true);
        setUploadUrl(response.data.upload_url || `/indian-e-visa/upload?case=${encodeURIComponent(resolvedCase)}`);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Payment verification failed.");
      } finally {
        if (active) {
          setPaying(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [caseNumber]);

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

  const handleContinue = () => {
    const target =
      uploadUrl && uploadUrl.startsWith("/")
        ? uploadUrl
        : `/indian-e-visa/upload?case=${encodeURIComponent(caseNumber)}`;
    router.push(target);
  };

  return (
    <div className="min-h-[100svh] flex flex-col">
      <Navbar />
      <PageTransition>
        <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_70%)]">
          <section className="max-w-4xl mx-auto">
            <div className="rounded-3xl border border-[#d7e5fb] bg-white p-6 sm:p-8 shadow-[0_18px_48px_rgba(30,74,135,0.08)]">
              <p className="inline-flex items-center rounded-full border border-[#cfe2ff] bg-[#eef6ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b5e93]">
                Indian e-Visa / Payment
              </p>
              <h1 className="mt-3 text-3xl font-heading font-bold text-primary">Complete Your Payment</h1>
              <p className="mt-2 text-sm text-slate-600">
                Pay securely with Stripe to continue to document upload.
              </p>

              {loading ? (
                <div className="mt-8 flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading payment summary...
                </div>
              ) : (
                <>
                  <div className="mt-7 rounded-2xl border border-slate-200 bg-[#fbfdff] p-5">
                    <h2 className="text-lg font-semibold text-primary">Payment Summary</h2>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p className="flex justify-between">
                        <span>Case number</span>
                        <strong>{caseNumber || "-"}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span>Service</span>
                        <strong>{serviceName}</strong>
                      </p>
                      {displayAmount ? (
                        <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-primary">
                          <span className="font-semibold">Total due</span>
                          <strong>{displayAmount}</strong>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {paymentConfirmed ? (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Payment is confirmed. You can continue to document upload.
                    </div>
                  ) : null}

                  {error ? (
                    <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {paymentConfirmed ? (
                      <Button onClick={handleContinue}>Upload Documents</Button>
                    ) : (
                      <Button onClick={() => void handlePayment()} isLoading={paying} disabled={!caseNumber}>
                        Pay with Stripe
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
      <CookieBanner />
    </div>
  );
}
