
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import PageTransition from "@/components/PageTransition";
import { ConsentCheckboxes } from "@/components/ConsentCheckboxes";
import { Button } from "@/components/ui/Button";
import {
  createFullPaymentOrder,
  getApplicationByReference,
  type ApplicationDetailResponse,
  verifyFullPayment,
} from "@/lib/api";
import {
  clearStripeReturnParams,
  getStripeCheckoutUrl,
  readStripeReturnParams,
  redirectToStripeCheckout,
} from "@/lib/stripe-checkout";

const penceToPounds = (value?: number) => ((value ?? 0) / 100);

export default function DashboardPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceNumber = (searchParams.get("reference") || "").trim().toUpperCase();

  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [consentsAccepted, setConsentsAccepted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadApplication = async () => {
      if (!referenceNumber) {
        setError("Missing reference number. Please return to your application and try again.");
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

  const [confirmingReturn, setConfirmingReturn] = useState(() => {
    if (typeof window === "undefined") return false;
    const { sessionId, paymentKind } = readStripeReturnParams();
    return Boolean(sessionId && paymentKind === "full");
  });

  useEffect(() => {
    const { sessionId, paymentKind, reference } = readStripeReturnParams();
    if (!sessionId || paymentKind !== "full") return;

    const refNum = String(reference || referenceNumber || "").trim();
    if (!refNum) return;

    let active = true;
    void (async () => {
      setConfirmingReturn(true);
      setPaying(true);
      setError("");
      try {
        await verifyFullPayment(refNum, sessionId);
        if (!active) return;
        clearStripeReturnParams();
        // Pay-first flows still need document upload — land on the docs journey, not the dashboard home.
        router.replace(`/dashboard/document-audit?reference=${encodeURIComponent(refNum)}&resume=1`);
      } catch (e) {
        if (!active) return;
        setConfirmingReturn(false);
        setError(e instanceof Error ? e.message : "Payment verification failed.");
        setPaying(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [referenceNumber, router]);

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

  const hasAssessmentFlow =
    Number(application?.audit_fee_pence || 0) > 0 ||
    Boolean(application?.audit_fee_paid) ||
    String(application?.audit_payment_status || "").toLowerCase() === "paid" ||
    Number(application?.audit_credit_pence || 0) > 0;

  const showAssessmentCredit = hasAssessmentFlow && summary.auditCredit > 0;

  const isAlreadyPaid = Boolean(application?.payment_confirmed) || String(application?.full_payment_status || "").toLowerCase() === "paid";
  const isRejected =
    String(application?.audit_result || "").toLowerCase() === "red" ||
    String(application?.application_status || "").toLowerCase() === "rejected";

  const resumeHref = `/dashboard/document-audit?reference=${encodeURIComponent(referenceNumber)}&resume=1`;
  const backLabel = hasAssessmentFlow ? "Back to assessment" : "Back to uploads";
  const returnResultLabel = hasAssessmentFlow ? "Return to assessment result" : "Back to application";
  const processingLabel = hasAssessmentFlow ? "Go to processing tracker" : "Go to application";
  const introCopy = hasAssessmentFlow
    ? "After document check approval, complete payment to move your application into processing."
    : "Complete payment to confirm your application and start processing.";

  const handlePayment = async () => {
    if (!referenceNumber || isAlreadyPaid) return;
    if (isRejected) {
      setError("This application has been rejected and cannot proceed to payment. Please contact support.");
      return;
    }
    if (!consentsAccepted) {
      setError("Please accept all required consents before continuing.");
      return;
    }

    setError("");
    setPaying(true);

    try {
      const orderPayload = await createFullPaymentOrder(referenceNumber);
      redirectToStripeCheckout(getStripeCheckoutUrl(orderPayload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  if (confirmingReturn) {
    return (
      <div className="min-h-[100svh] flex flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-28 pb-20">
          <div className="w-full max-w-md rounded-3xl border border-[#d7e5fb] bg-white p-8 text-center shadow-[0_18px_48px_rgba(30,74,135,0.08)]">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-base font-semibold text-[#0F1F3D]">Confirming your payment…</p>
            <p className="mt-1 text-sm text-slate-600">Taking you to document upload.</p>
            {error ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            ) : null}
          </div>
        </main>
        <Footer />
        <CookieBanner />
      </div>
    );
  }

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
              <h1 className="mt-3 text-3xl font-heading font-bold text-[#0F1F3D]">Complete Full Service Payment</h1>
              <p className="mt-2 text-sm text-slate-600">{introCopy}</p>

              {loading ? (
                <div className="mt-8 flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading payment summary...
                </div>
              ) : (
                <>
                  <div className="mt-7 rounded-2xl border border-slate-200 bg-[#fbfdff] p-5">
                    <h2 className="text-lg font-semibold text-[#0F1F3D]">Payment Summary</h2>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p className="flex justify-between"><span>Reference</span><strong className="text-[#0F1F3D]">{referenceNumber || "-"}</strong></p>
                      <p className="flex justify-between"><span>Service ({summary.serviceLabel})</span><strong className="text-[#0F1F3D]">£{summary.serviceFee.toFixed(2)}</strong></p>
                      {showAssessmentCredit ? (
                        <p className="flex justify-between">
                          <span>Assessment credit</span>
                          <strong className="text-[#0F1F3D]">- £{summary.auditCredit.toFixed(2)}</strong>
                        </p>
                      ) : null}
                      <p className="flex justify-between border-t border-slate-200 pt-2 text-base text-[#0F1F3D]">
                        <span className="font-semibold">Total due</span>
                        <strong>£{summary.totalDue.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>

                  {isRejected ? (
                    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      This application was marked as rejected after document review and cannot proceed to full payment. Please contact support.
                    </div>
                  ) : isAlreadyPaid ? (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Full payment is already confirmed for this application.
                    </div>
                  ) : (
                    <div className="mt-6">
                      <ConsentCheckboxes mode="payment" onAcceptanceChange={setConsentsAccepted} />
                    </div>
                  )}

                  {error ? (
                    <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => router.push(resumeHref)}>
                      {backLabel}
                    </Button>
                    {isRejected ? (
                      <Button variant="outline" onClick={() => router.push(resumeHref)}>
                        {returnResultLabel}
                      </Button>
                    ) : isAlreadyPaid ? (
                      <Button onClick={() => router.push(resumeHref)}>
                        {processingLabel}
                      </Button>
                    ) : (
                      <Button onClick={() => void handlePayment()} isLoading={paying} disabled={!consentsAccepted || !referenceNumber}>
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
