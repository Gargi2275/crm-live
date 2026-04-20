
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
import {
  createFullPaymentOrder,
  getApplicationByReference,
  type ApplicationDetailResponse,
  verifyFullPayment,
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

const penceToPounds = (value?: number) => ((value ?? 0) / 100);

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function DashboardPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceNumber = (searchParams.get("reference") || "").trim().toUpperCase();

  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadApplication = async () => {
      if (!referenceNumber) {
        setError("Missing reference number. Please return to Document Audit and try again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const details = await getApplicationByReference(referenceNumber);
        setApplication(details);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load payment details.");
      } finally {
        setLoading(false);
      }
    };

    void loadApplication();
  }, [referenceNumber]);

  const summary = useMemo(() => {
    const serviceFee = penceToPounds(application?.service_total_pence);
    const auditCredit = penceToPounds(application?.audit_credit_pence);
    const totalDue = penceToPounds(
      application?.amount_due_pence ?? Math.max(0, (application?.service_total_pence ?? 0) - (application?.audit_credit_pence ?? 0))
    );
    const serviceLabel = application?.service_name || application?.service_type || "Selected Service";
    return {
      serviceFee,
      auditCredit,
      totalDue,
      serviceLabel,
    };
  }, [application]);

  const isAlreadyPaid = Boolean(application?.payment_confirmed) || String(application?.full_payment_status || "").toLowerCase() === "paid";
  const isRejected =
    String(application?.audit_result || "").toLowerCase() === "red" ||
    String(application?.application_status || "").toLowerCase() === "rejected";

  const handlePayment = async () => {
    if (!referenceNumber || isAlreadyPaid) return;
    if (isRejected) {
      setError("This application has been rejected and cannot proceed to payment. Please contact support.");
      return;
    }

    setError("");
    setPaying(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout. Please refresh and try again.");
      }

      const orderPayload = await createFullPaymentOrder(referenceNumber);
      const order = orderPayload.order;

      if (!order?.id) {
        throw new Error("Could not create payment order.");
      }

      const razorpay = new window.Razorpay({
        key: orderPayload.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "FlyOCI",
        description: `Full service payment - ${referenceNumber}`,
        handler: async (payment) => {
          await verifyFullPayment(
            referenceNumber,
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature
          );
          router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1&payment=success`);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      });

      razorpay.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex flex-col">
      <Navbar />
      <PageTransition>
        <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_70%)]">
          <section className="max-w-4xl mx-auto">
            <div className="rounded-3xl border border-[#d7e5fb] bg-white p-6 sm:p-8 shadow-[0_18px_48px_rgba(30,74,135,0.08)]">
              <p className="inline-flex items-center rounded-full border border-[#cfe2ff] bg-[#eef6ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b5e93]">
                Dashboard / Payment
              </p>
              <h1 className="mt-3 text-3xl font-heading font-bold text-primary">Complete Full Service Payment</h1>
              <p className="mt-2 text-sm text-slate-600">
                After audit approval, complete payment to move your application into processing.
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
                      <p className="flex justify-between"><span>Reference</span><strong>{referenceNumber || "-"}</strong></p>
                      <p className="flex justify-between"><span>Service ({summary.serviceLabel})</span><strong>£{summary.serviceFee.toFixed(2)}</strong></p>
                      <p className="flex justify-between"><span>Audit credit</span><strong>- £{summary.auditCredit.toFixed(2)}</strong></p>
                      <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-primary">
                        <span className="font-semibold">Total due</span>
                        <strong>£{summary.totalDue.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>

                  {isRejected ? (
                    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      This application was marked as rejected by audit and cannot proceed to full payment. Please contact support.
                    </div>
                  ) : isAlreadyPaid ? (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Full payment is already confirmed for this application.
                    </div>
                  ) : (
                    <label className="mt-6 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        className="mt-1"
                      />
                      <span>I confirm FlyOCI can proceed with full-service processing after payment.</span>
                    </label>
                  )}

                  {error ? (
                    <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`)}>
                      Back to Audit
                    </Button>
                    {isRejected ? (
                      <Button variant="outline" onClick={() => router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`)}>
                        Return to Audit Result
                      </Button>
                    ) : isAlreadyPaid ? (
                      <Button onClick={() => router.push(`/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`)}>
                        Go to Processing Tracker
                      </Button>
                    ) : (
                      <Button onClick={() => void handlePayment()} isLoading={paying} disabled={!acknowledged || !referenceNumber}>
                        Pay & Continue
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
