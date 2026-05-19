"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createApostillePaymentOrder,
  sendApostilleCustomerMessage,
  submitApostilleFinalDetails,
  trackApostilleCase,
  verifyApostillePayment,
  type ApostilleTrackCaseResponse,
} from "@/lib/api";
const STORAGE_KEY = "apostille_track_credentials";

function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser"));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay load error")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.dataset.razorpay = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Razorpay load error"));
    document.body.appendChild(s);
  });
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "under_review" || s === "draft") return "bg-amber-100 text-amber-900 border-amber-200";
  if (s === "approved" || s === "completed") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (s.includes("payment") || s === "paid") return "bg-sky-100 text-sky-900 border-sky-200";
  if (s === "processing" || s === "dispatched") return "bg-indigo-100 text-indigo-900 border-indigo-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

const STEPS = ["Pre-Check", "Under Review", "Approved", "Payment", "Processing", "Completed"];

export default function TrackApostillePage() {
  const [fileNumber, setFileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApostilleTrackCaseResponse | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { file_number?: string; email?: string };
      if (parsed.file_number) setFileNumber(parsed.file_number);
      if (parsed.email) setEmail(parsed.email);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((fn: string, em: string) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ file_number: fn, email: em }));
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!fileNumber.trim() || !email.trim()) return;
    const d = await trackApostilleCase(fileNumber.trim(), email.trim());
    setData(d);
  }, [fileNumber, email]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setData(null);
    try {
      setLoading(true);
      persist(fileNumber.trim(), email.trim());
      const d = await trackApostilleCase(fileNumber.trim(), email.trim());
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load case.");
    } finally {
      setLoading(false);
    }
  };

  const onSendMessage = async () => {
    if (!data || !messageDraft.trim()) return;
    try {
      await sendApostilleCustomerMessage(fileNumber.trim(), email.trim(), messageDraft.trim());
      setMessageDraft("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message.");
    }
  };

  const onPay = async () => {
    if (!data) return;
    try {
      setPaying(true);
      const order = await createApostillePaymentOrder(fileNumber.trim(), email.trim());
      await loadRazorpay();
      const RZ = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
      const instance = new RZ({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "FlyOCI",
        description: `Apostille ${data.file_number}`,
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyApostillePayment(
              fileNumber.trim(),
              email.trim(),
              payment.razorpay_order_id,
              payment.razorpay_payment_id,
              payment.razorpay_signature,
            );
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
        prefill: { email: email.trim() },
        theme: { color: "#0B69B7" },
      });
      instance.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
    } finally {
      setPaying(false);
    }
  };

  const onFinalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.append("file_number", fileNumber.trim());
    fd.append("email", email.trim());
    try {
      await submitApostilleFinalDetails(fd);
      form.reset();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    }
  };

  const stepIndex = (() => {
    if (!data) return 0;
    const s = data.status.toLowerCase();
    if (s === "under_review" || s === "draft") return 1;
    if (s === "approved") return 2;
    if (s.includes("payment") || s === "paid" || s === "payment_received") return 3;
    if (s === "final_submission_pending") return 4;
    if (s === "processing" || s === "dispatched") return 4;
    if (s === "completed") return 5;
    return 1;
  })();

  return (
    <section className="min-h-[70vh] bg-bg-page px-4 pb-24 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-heading font-bold text-primary">Track Apostille</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your file number and the email used on the pre-check form.</p>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit}>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600">File number</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              placeholder="FLY-APO-2026-AB12"
              required
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full bg-[#0B69B7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        {data ? (
          <div className="mt-10 space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.status)}`}>{data.status.replace(/_/g, " ")}</span>
              <span className="text-sm text-slate-600">Updated {data.updated_at ? new Date(data.updated_at).toLocaleString() : "—"}</span>
            </div>

            <div className="rounded-2xl border border-[#dce8fa] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      i <= stepIndex ? "bg-[#0B69B7] text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-[#dce8fa] bg-white p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">File number</p>
                <p className="font-mono font-semibold text-slate-900">{data.file_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Name on file</p>
                <p className="text-slate-900">{data.full_name}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500">Review note</p>
                <p className="text-slate-800">{data.review_note || "—"}</p>
              </div>
              {data.quoted_fee ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Quoted fee</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {data.quote_currency} {data.quoted_fee}
                  </p>
                </div>
              ) : null}
            </div>

            {(data.status === "payment_pending" || data.status === "approved") && data.quoted_fee && !data.payment_verified ? (
              <button
                type="button"
                disabled={paying}
                onClick={() => void onPay()}
                className="rounded-full bg-[#0B69B7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paying ? "Opening…" : "Pay now"}
              </button>
            ) : null}

            {data.status === "final_submission_pending" && data.payment_verified && !data.final_submission_completed ? (
              <form onSubmit={onFinalSubmit} className="space-y-3 rounded-2xl border border-[#dce8fa] bg-white p-5">
                <h2 className="text-lg font-semibold text-primary">Delivery details</h2>
                <input name="delivery_name" required placeholder="Full name" className="w-full rounded-lg border px-3 py-2" />
                <input name="delivery_address_line1" required placeholder="Address line 1" className="w-full rounded-lg border px-3 py-2" />
                <input name="delivery_address_line2" placeholder="Address line 2" className="w-full rounded-lg border px-3 py-2" />
                <input name="delivery_city" required placeholder="City" className="w-full rounded-lg border px-3 py-2" />
                <input name="delivery_postcode" required placeholder="Postcode" className="w-full rounded-lg border px-3 py-2" />
                <input name="delivery_country" required placeholder="Country" className="w-full rounded-lg border px-3 py-2" />
                <textarea name="delivery_special_instructions" placeholder="Special instructions" className="w-full rounded-lg border px-3 py-2" rows={2} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Supporting document (optional)
                    <input name="supporting_document" type="file" className="mt-1 w-full text-xs" />
                  </label>
                  <label className="text-xs text-slate-600">
                    ID document (optional)
                    <input name="identification_document" type="file" className="mt-1 w-full text-xs" />
                  </label>
                </div>
                <button type="submit" className="rounded-full bg-[#0B69B7] px-5 py-2 text-sm font-semibold text-white">
                  Submit final details
                </button>
              </form>
            ) : null}

            <div>
              <h2 className="text-lg font-semibold text-primary">Documents</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                {data.documents.map((d) => (
                  <li key={d.id}>{d.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-primary">Status log</h2>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                {data.status_logs.slice(-20).map((log, i) => (
                  <li key={`${log.timestamp}-${i}`}>
                    <span className="font-semibold text-slate-800">{log.action}</span> — {log.timestamp} ({log.actor})
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-primary">Messages</h2>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {data.messages.map((m, idx) => {
                  const fromCustomer = (m.sender || "").toLowerCase() === "customer";
                  return (
                    <div key={`${m.created_at}-${idx}`} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          fromCustomer ? "bg-[#0B69B7] text-white" : "bg-white text-slate-800 border border-slate-200"
                        }`}
                      >
                        {m.subject ? <p className="text-xs font-semibold opacity-90">{m.subject}</p> : null}
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        <p className={`mt-1 text-[10px] ${fromCustomer ? "text-blue-100" : "text-slate-400"}`}>
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Write a message to the team…"
                  className="min-h-[72px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void onSendMessage()}
                  className="self-end rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
