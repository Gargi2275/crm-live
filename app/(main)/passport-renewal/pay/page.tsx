"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  createPassportRenewalQuoteOrder,
  getPassportRenewalQuoteDetail,
  verifyPassportRenewalQuotePayment,
  type PassportRenewalQuoteDetailResponse,
} from "@/lib/api";

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOpenOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (payload: RazorpaySuccessPayload) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOpenOptions) => { open: () => void };
  }
}

export default function PassportRenewalPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = String(searchParams.get("reference") || searchParams.get("reference_number") || "").trim();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<PassportRenewalQuoteDetailResponse | null>(null);

  const status = String(quote?.quote_status || "").toUpperCase();

  const ensureRazorpayLoaded = async (): Promise<void> => {
    if (typeof window === "undefined") {
      throw new Error("Razorpay is only available in browser.");
    }
    if (window.Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpay = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
      document.body.appendChild(script);
    });
  };

  const fetchQuote = async () => {
    if (!reference) return;
    setError(null);
    try {
      const response = await getPassportRenewalQuoteDetail(reference);
      setQuote(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quote details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reference) {
      router.replace("/document-audit");
      return;
    }
    void fetchQuote();
  }, [reference]);

  useEffect(() => {
    if (status !== "PENDING_QUOTE") {
      return;
    }
    const id = window.setInterval(() => {
      void fetchQuote();
    }, 60000);
    return () => window.clearInterval(id);
  }, [status, reference]);

  useEffect(() => {
    if (status !== "PAID") {
      return;
    }
    const id = window.setTimeout(() => {
      router.push(`/track?case=${encodeURIComponent(reference)}`);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [status, reference, router]);

  const handlePayNow = async () => {
    if (!reference) return;
    setPaying(true);
    setError(null);
    try {
      const orderPayload = await createPassportRenewalQuoteOrder(reference);
      await ensureRazorpayLoaded();
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Razorpay SDK unavailable.");
      }

      await new Promise<void>((resolve, reject) => {
        const instance = new RazorpayCtor({
          key: orderPayload.key_id,
          amount: orderPayload.order.amount,
          currency: orderPayload.currency,
          order_id: orderPayload.order.id,
          name: "FlyOCI",
          description: "Passport Renewal Quote Payment",
          handler: async (payload) => {
            try {
              await verifyPassportRenewalQuotePayment(
                reference,
                payload.razorpay_order_id,
                payload.razorpay_payment_id,
                payload.razorpay_signature,
              );
              setSuccessMessage("Payment successful. Redirecting to your dashboard...");
              router.push(`/dashboard/document-audit?reference=${encodeURIComponent(reference)}&paid=1`);
              resolve();
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled.")),
          },
        });

        instance.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passport renewal payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const quoteAmount = useMemo(() => {
    const amount = Number(quote?.quote_amount_pence ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return quote?.quoted_fee ? `£${quote.quoted_fee}` : "£0.00";
    }
    return `£${(amount / 100).toFixed(2)}`;
  }, [quote?.quote_amount_pence, quote?.quoted_fee]);

  return (
    <section className="min-h-[70vh] bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#dce7f8] bg-white p-6 shadow-[0_14px_36px_rgba(30,74,135,0.1)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Passport Renewal</p>
        <h1 className="mt-2 text-3xl font-heading font-bold text-primary">Quote Payment</h1>

        {loading ? <p className="mt-4 text-sm text-textMuted">Loading your quote details...</p> : null}

        {!loading && error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {!loading && !error && status === "PENDING_QUOTE" ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p className="font-semibold text-amber-800">Your quote is being prepared</p>
            <p>Our team will email you when ready.</p>
            <p>File number: <strong>{quote?.case_reference || quote?.file_number || reference}</strong></p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/contact")}>Contact Support</Button>
              <Button variant="outline" onClick={() => void fetchQuote()}>Refresh Now</Button>
            </div>
          </div>
        ) : null}

        {!loading && !error && status === "QUOTED" ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p className="text-base font-semibold">Quote Ready for Payment</p>
            <p className="mt-2">File number: <strong>{quote?.case_reference || quote?.file_number || reference}</strong></p>
            <p>Service: <strong>Indian Passport Renewal</strong></p>
            <p>Quote amount: <strong>{quoteAmount}</strong></p>
            <p>Quote valid until: <strong>{quote?.quote_expires_at ? new Date(quote.quote_expires_at).toLocaleString() : "Not set"}</strong></p>
            {quote?.quote_notes ? <p className="mt-2">Notes from admin: {quote.quote_notes}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button isLoading={paying} onClick={() => void handlePayNow()}>Pay Now</Button>
              <Button variant="outline" onClick={() => router.push("/contact")}>Contact Support</Button>
            </div>
          </div>
        ) : null}

        {!loading && !error && status === "PAID" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Payment already received</p>
            <p className="mt-1">Redirecting to tracking page...</p>
            <div className="mt-3">
              <Button onClick={() => router.push(`/track?case=${encodeURIComponent(reference)}`)}>Track your application</Button>
            </div>
          </div>
        ) : null}

        {!loading && !error && status === "EXPIRED" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Your quote has expired</p>
            <p className="mt-1">Please request a new quote from support.</p>
            <div className="mt-3 flex gap-3">
              <Button variant="outline" onClick={() => router.push("/contact")}>Request New Quote</Button>
              <Button variant="outline" onClick={() => router.push("/contact")}>Contact Support</Button>
            </div>
          </div>
        ) : null}

        {successMessage ? <p className="mt-4 text-sm font-semibold text-emerald-700">{successMessage}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => router.push("/dashboard")}>Open Dashboard</Button>
        </div>
      </div>
    </section>
  );
}
