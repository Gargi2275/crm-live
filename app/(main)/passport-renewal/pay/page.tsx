"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConsentCheckboxes } from "@/components/ConsentCheckboxes";
import {
  createPassportRenewalQuoteOrder,
  getPassportRenewalQuoteDetail,
  verifyPassportRenewalQuotePayment,
  type PassportRenewalQuoteDetailResponse,
} from "@/lib/api";
import {
  clearStripeReturnParams,
  getStripeCheckoutUrl,
  readStripeReturnParams,
  redirectToStripeCheckout,
} from "@/lib/stripe-checkout";

export default function PassportRenewalPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = String(searchParams.get("reference") || searchParams.get("reference_number") || "").trim();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<PassportRenewalQuoteDetailResponse | null>(null);
  const [consentsAccepted, setConsentsAccepted] = useState(false);

  const status = String(quote?.quote_status || "").toUpperCase();

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
    const { sessionId, paymentKind, reference: returnReference } = readStripeReturnParams();
    if (!sessionId || paymentKind !== "passport-quote") return;

    const refNum = String(returnReference || reference || "").trim();
    if (!refNum) return;

    let active = true;
    void (async () => {
      setPaying(true);
      setError(null);
      try {
        await verifyPassportRenewalQuotePayment(refNum, sessionId);
        if (!active) return;
        clearStripeReturnParams();
        setSuccessMessage("Payment successful. Redirecting to your dashboard...");
        router.push(`/dashboard/document-audit?reference=${encodeURIComponent(refNum)}&paid=1`);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Payment verification failed.");
      } finally {
        if (active) {
          setPaying(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [reference, router]);

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
    if (!consentsAccepted) {
      setError("Please accept all required consents before paying.");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const orderPayload = await createPassportRenewalQuoteOrder(reference);
      redirectToStripeCheckout(getStripeCheckoutUrl(orderPayload));
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
            <div className="mt-4">
              <ConsentCheckboxes mode="payment" onAcceptanceChange={setConsentsAccepted} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button isLoading={paying} onClick={() => void handlePayNow()} disabled={!consentsAccepted}>Pay Now</Button>
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
