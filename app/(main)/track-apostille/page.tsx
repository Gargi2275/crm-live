"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

import { ApostilleTimeline } from "@/components/apostille/ApostilleTimeline";
import { Button } from "@/components/ui/Button";
import {
  createApostillePaymentOrder,
  downloadApostilleDocument,
  sendApostilleCustomerMessage,
  submitApostilleCorrectionUpload,
  submitApostilleFinalDetails,
  trackApostilleCase,
  type ApostilleFlaggedDocument,
  type ApostilleTrackCaseResponse,
} from "@/lib/api";
import {
  apostilleStatusTone,
  downloadApostilleCaseSummaryPdf,
  formatApostilleStatus,
  getApostilleCustomerStatusMessage,
  isApostilleSubmittedPhase,
  openRazorpayCheckout,
  resolveApostilleTimelineIndex,
} from "@/lib/apostille-ui";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default function TrackApostillePage() {
  const searchParams = useSearchParams();
  const [fileNumber, setFileNumber] = useState(searchParams.get("file") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [caseData, setCaseData] = useState<ApostilleTrackCaseResponse | null>(null);
  const [lookupError, setLookupError] = useState("");

  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryLine2, setDeliveryLine2] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("United Kingdom");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [messageText, setMessageText] = useState("");
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  const pendingDocuments = useMemo(() => {
    if (!caseData) return [] as ApostilleFlaggedDocument[];
    const reuploadedKeys = new Set(
      (caseData.reuploaded_documents || [])
        .concat((caseData.flagged_documents || []).filter((doc) => doc.status === "reuploaded" || doc.reuploaded))
        .map((doc) => `${doc.document_type || ""}:${doc.document_name || ""}`.toLowerCase()),
    );
    const isStillPending = (doc: ApostilleFlaggedDocument) => {
      if (doc.status === "reuploaded" || doc.reuploaded) return false;
      const key = `${doc.document_type || ""}:${doc.document_name || ""}`.toLowerCase();
      return !reuploadedKeys.has(key);
    };
    if (caseData.pending_documents?.length) {
      return caseData.pending_documents.filter(isStillPending);
    }
    return (caseData.flagged_documents || []).filter(isStillPending);
  }, [caseData]);

  const reuploadedDocuments = useMemo(() => {
    if (!caseData) return [] as ApostilleFlaggedDocument[];
    if (caseData.reuploaded_documents?.length) return caseData.reuploaded_documents;
    return (caseData.flagged_documents || []).filter((doc) => doc.status === "reuploaded" || doc.reuploaded);
  }, [caseData]);

  const timelineIndex = useMemo(
    () => (caseData ? resolveApostilleTimelineIndex(caseData) : 0),
    [caseData],
  );

  const caseSummary = useMemo(() => caseData?.case_summary, [caseData]);
  const isSubmittedPhase = useMemo(() => (caseData ? isApostilleSubmittedPhase(caseData) : false), [caseData]);
  const statusMessage = useMemo(
    () => (caseData ? getApostilleCustomerStatusMessage(caseData) : null),
    [caseData],
  );

  const canPay = caseData && ["approved", "payment_pending"].includes((caseData.status || "").toLowerCase()) && !caseData.payment_verified;
  const showFinalForm = caseData?.payment_verified && !caseData.final_submission_completed;
  const showCorrection = ["rejected", "correction_requested"].includes((caseData?.status || "").toLowerCase());

  const loadCase = useCallback(async (fn?: string, em?: string) => {
    const lookupFile = (fn ?? fileNumber).trim();
    const lookupEmail = (em ?? email).trim().toLowerCase();
    if (!lookupFile || !lookupEmail) {
      setLookupError("Enter your file number and email.");
      return;
    }
    setLoading(true);
    setLookupError("");
    try {
      const data = await trackApostilleCase(lookupFile, lookupEmail);
      setCaseData(data);
      setDeliveryName((prev) => prev || data.full_name || "");
    } catch (error) {
      setCaseData(null);
      setLookupError(error instanceof Error ? error.message : "Case not found.");
    } finally {
      setLoading(false);
    }
  }, [email, fileNumber]);

  useEffect(() => {
    const presetFile = searchParams.get("file");
    const presetEmail = searchParams.get("email");
    if (presetFile && presetEmail) {
      setFileNumber(presetFile);
      setEmail(presetEmail);
      void loadCase(presetFile, presetEmail);
    }
  }, [loadCase, searchParams]);

  const handlePayment = async () => {
    if (!caseData) return;
    setPaying(true);
    try {
      const order = await createApostillePaymentOrder(caseData.file_number, email);
      await openRazorpayCheckout(
        {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "FlyOCI Apostille",
          description: `Apostille service — ${caseData.file_number}`,
          order_id: order.order_id,
          prefill: { email, name: caseData.full_name },
        },
        async (payment) => {
          const { verifyApostillePayment } = await import("@/lib/api");
          await verifyApostillePayment(
            caseData.file_number,
            email,
            payment.razorpay_order_id,
            payment.razorpay_payment_id,
            payment.razorpay_signature,
          );
          toast.success("Payment successful.");
          await loadCase();
        },
      );
    } catch (error) {
      if (error instanceof Error && error.message !== "Payment cancelled.") {
        toast.error(error.message);
      }
    } finally {
      setPaying(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!caseData) return;
    if (!deliveryName.trim() || !deliveryLine1.trim() || !deliveryCity.trim() || !deliveryPostcode.trim()) {
      toast.error("Please complete delivery details.");
      return;
    }
    setSubmittingFinal(true);
    try {
      const formData = new FormData();
      formData.append("file_number", caseData.file_number);
      formData.append("email", email);
      formData.append("delivery_name", deliveryName.trim());
      formData.append("delivery_address_line1", deliveryLine1.trim());
      formData.append("delivery_address_line2", deliveryLine2.trim());
      formData.append("delivery_city", deliveryCity.trim());
      formData.append("delivery_postcode", deliveryPostcode.trim());
      formData.append("delivery_country", deliveryCountry.trim());
      formData.append("delivery_special_instructions", deliveryInstructions.trim());
      if (supportingDoc) formData.append("supporting_document", supportingDoc);
      if (idDoc) formData.append("identification_document", idDoc);
      await submitApostilleFinalDetails(formData);
      toast.success("Final submission received.");
      await loadCase();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit final details.");
    } finally {
      setSubmittingFinal(false);
    }
  };

  const handleCorrectionUpload = async (doc: ApostilleFlaggedDocument, file: File) => {
    if (!caseData) return;
    const docKey = `${doc.document_type || ""}:${doc.document_name || ""}`;
    setUploadingDocKey(docKey);
    try {
      const formData = new FormData();
      formData.append("file_number", caseData.file_number);
      formData.append("email", email);
      formData.append("flagged_document_type", doc.document_type || "other");
      formData.append("flagged_document_name", doc.document_name || doc.document_type || "Document");
      formData.append("document", file);
      const updated = await submitApostilleCorrectionUpload(formData);
      setCaseData(updated);
      toast.success(
        updated.all_corrections_submitted
          ? "All requested documents uploaded. We will review shortly."
          : "Document uploaded. Please upload remaining items if listed.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingDocKey(null);
    }
  };

  const handleSendMessage = async () => {
    if (!caseData || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      await sendApostilleCustomerMessage(caseData.file_number, email, messageText.trim());
      setMessageText("");
      toast.success("Message sent.");
      await loadCase();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDocumentDownload = async (docId: number, fileName?: string) => {
    if (!caseData) return;
    setDownloadingDocId(docId);
    try {
      await downloadApostilleDocument(caseData.file_number, email, docId, fileName);
      toast.success("Download started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download document.");
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadCaseSummary = async () => {
    if (!caseData) return;
    setDownloadingSummary(true);
    try {
      await downloadApostilleCaseSummaryPdf(caseData);
      toast.success("Case summary PDF is downloading.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download case summary.");
    } finally {
      setDownloadingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_60%)]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/apostille-services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d6fd1] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Apostille Services
          </Link>
          <Link href="/apostille-pre-check" className="text-sm font-semibold text-[#486581] hover:text-[#1d6fd1]">
            New pre-check →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-[#d7e5f9] bg-white p-5 shadow-[0_14px_36px_rgba(20,60,106,0.1)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1d6fd1]">Track Apostille</p>
                  <h1 className="mt-1 font-heading text-2xl font-bold text-primary sm:text-3xl">Check Your Application Status</h1>
                  <p className="mt-1 text-sm text-[#627d98]">Use your FlyOCI file number and the email used during pre-check.</p>
                </div>
                {caseData ? (
                  <button
                    type="button"
                    onClick={() => void loadCase()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#c9ddff] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-[#1d6fd1] hover:bg-[#eef5ff]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  placeholder="File number e.g. FO-AP-..."
                  className="rounded-xl border border-[#d8e6fc] px-4 py-3 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email used at submission"
                  className="rounded-xl border border-[#d8e6fc] px-4 py-3 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15"
                />
                <Button onClick={() => void loadCase()} isLoading={loading} className="w-full sm:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Track
                </Button>
              </div>
              {lookupError ? <p className="mt-3 text-sm font-medium text-rose-600">{lookupError}</p> : null}
            </div>

            <AnimatePresence mode="wait">
              {caseData ? (
                <motion.div
                  key={caseData.file_number}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-5"
                >
                  <div className="rounded-3xl border border-[#d7e5f9] bg-white p-5 shadow-[0_12px_30px_rgba(20,60,106,0.08)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#1d6fd1]">Case summary</p>
                        <p className="mt-1 font-mono text-xl font-bold text-[#0d1f3c]">{caseData.file_number}</p>
                        <p className="mt-1 text-sm text-[#486581]">{caseData.full_name}</p>
                        {(caseSummary?.reference_number || caseData.reference_number) ? (
                          <p className="mt-1 text-sm text-[#627d98]">
                            Reference: <span className="font-semibold text-[#243b53]">{caseSummary?.reference_number || caseData.reference_number}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${apostilleStatusTone(caseData.status)}`}>
                          {statusMessage?.title || caseSummary?.stage_label || formatApostilleStatus(caseData.status)}
                        </span>
                        {isSubmittedPhase ? (
                          <button
                            type="button"
                            onClick={() => void handleDownloadCaseSummary()}
                            disabled={downloadingSummary}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#c9ddff] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-[#1d6fd1] hover:bg-[#eef5ff] disabled:opacity-60"
                          >
                            {downloadingSummary ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download PDF
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isSubmittedPhase && statusMessage ? (
                      <>
                        <div className="mt-5 rounded-2xl border border-[#cfe2ff] bg-[#f8fbff] px-4 py-4">
                          <p className="text-sm font-bold text-[#1d4d81]">{statusMessage.title}</p>
                          <p className="mt-2 text-sm leading-relaxed text-[#486581]">{statusMessage.message}</p>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#e8eef8] bg-[#fafcff] px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#627d98]">{statusMessage.submittedLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-[#243b53]">{statusMessage.submittedValue}</p>
                          </div>
                          <div className="rounded-xl border border-[#e8eef8] bg-[#fafcff] px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#627d98]">{statusMessage.deliveryLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-[#243b53]">{statusMessage.deliveryValue}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#e8eef8] bg-[#fafcff] px-3 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#627d98]">Status</p>
                          <p className="mt-1 text-sm font-semibold text-[#243b53]">
                            {caseSummary?.stage_label || formatApostilleStatus(caseData.status)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#e8eef8] bg-[#fafcff] px-3 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#627d98]">Quoted fee</p>
                          <p className="mt-1 text-sm font-semibold text-[#243b53]">
                            {caseData.quoted_fee ? `${caseData.quote_currency} ${caseData.quoted_fee}` : "Pending review"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {caseData.review_note && !isSubmittedPhase ? (
                    <div className="rounded-2xl border border-[#cfe2ff] bg-[#f8fbff] p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#1d4d81]">
                        <BadgeCheck className="h-4 w-4 text-[#1d6fd1]" />
                        Review note from FlyOCI
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#486581] whitespace-pre-wrap">{caseData.review_note}</p>
                    </div>
                  ) : null}

                  {canPay ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                            <CreditCard className="h-4 w-4" />
                            Payment required to continue
                          </p>
                          <p className="mt-1 text-sm text-amber-800">
                            Approved fee: <strong>{caseData.quote_currency} {caseData.quoted_fee}</strong>
                          </p>
                        </div>
                        <Button onClick={() => void handlePayment()} isLoading={paying}>
                          Pay Securely
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {showCorrection ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5">
                      <p className="text-sm font-bold text-rose-800">Documents requested by FlyOCI</p>
                      <p className="mt-1 text-sm text-rose-700">
                        Upload each corrected document below. Names and instructions match what our team requested.
                      </p>
                      {reuploadedDocuments.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Already uploaded</p>
                          {reuploadedDocuments.map((doc, index) => {
                            const docLabel = doc.document_name || doc.document_type?.replace(/_/g, " ") || `Document ${index + 1}`;
                            const docKey = `done:${doc.document_type || ""}:${doc.document_name || ""}:${index}`;
                            return (
                              <div key={docKey} className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-semibold text-[#0d1f3c]">{docLabel}</p>
                                  <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                    Uploaded
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {pendingDocuments.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {pendingDocuments.map((doc, index) => {
                            const docLabel = doc.document_name || doc.document_type?.replace(/_/g, " ") || `Document ${index + 1}`;
                            const docKey = `${doc.document_type || ""}:${doc.document_name || ""}:${index}`;
                            const isUploading = uploadingDocKey === `${doc.document_type || ""}:${doc.document_name || ""}`;
                            const alreadyUploaded = doc.status === "reuploaded" || doc.reuploaded;
                            return (
                              <div key={docKey} className="rounded-xl border border-rose-200/80 bg-white p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#0d1f3c]">{docLabel}</p>
                                    {doc.issue_reason ? (
                                      <p className="mt-1 text-sm text-[#486581]">
                                        <span className="font-medium">Issue:</span> {doc.issue_reason}
                                      </p>
                                    ) : null}
                                    {doc.required_action ? (
                                      <p className="mt-1 text-sm text-[#627d98]">
                                        <span className="font-medium">Action:</span> {doc.required_action}
                                      </p>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      alreadyUploaded
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-amber-200 bg-amber-50 text-amber-800"
                                    }`}
                                  >
                                    {alreadyUploaded ? "Uploaded" : "Upload required"}
                                  </span>
                                </div>
                                {!alreadyUploaded ? (
                                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1d6fd1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1558c0]">
                                    <Upload className="h-3.5 w-3.5" />
                                    {isUploading ? "Uploading..." : `Upload ${docLabel}`}
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      disabled={isUploading}
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) void handleCorrectionUpload(doc, file);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                  </label>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-rose-700">
                          Please review the note above and upload corrected documents using final submission if payment is already complete.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {showFinalForm ? (
                    <div className="rounded-3xl border border-[#d7e5f9] bg-white p-5 shadow-[0_10px_28px_rgba(20,60,106,0.08)] sm:p-6">
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-[#1d6fd1]" />
                        <h2 className="font-heading text-xl font-bold text-primary">Complete Final Submission</h2>
                      </div>
                      <p className="mt-1 text-sm text-[#627d98]">Payment received. Add delivery details and any supporting documents.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Delivery name *</span>
                          <input value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Address line 1 *</span>
                          <input value={deliveryLine1} onChange={(e) => setDeliveryLine1(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Address line 2</span>
                          <input value={deliveryLine2} onChange={(e) => setDeliveryLine2(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">City *</span>
                          <input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Postcode *</span>
                          <input value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Country</span>
                          <input value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value)} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Special instructions</span>
                          <textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} rows={2} className="w-full rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">Supporting document</span>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSupportingDoc(e.target.files?.[0] || null)} className="block w-full text-xs text-[#486581] file:mr-2 file:rounded-lg file:border-0 file:bg-[#eef5ff] file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-[#1d6fd1]" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#486581]">ID document</span>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setIdDoc(e.target.files?.[0] || null)} className="block w-full text-xs text-[#486581] file:mr-2 file:rounded-lg file:border-0 file:bg-[#eef5ff] file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-[#1d6fd1]" />
                        </label>
                      </div>
                      <div className="mt-4">
                        <Button onClick={() => void handleFinalSubmit()} isLoading={submittingFinal}>
                          Submit Final Details
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!isSubmittedPhase ? (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#d7e5f9] bg-white p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0d1f3c]">
                        <FileText className="h-4 w-4 text-[#1d6fd1]" />
                        Uploaded documents
                      </div>
                      {caseData.documents.length ? (
                        <ul className="mt-3 space-y-2">
                          {caseData.documents.map((doc) => (
                            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e8eef8] bg-[#fafcff] px-3 py-2 text-sm text-[#486581]">
                              <div className="flex min-w-0 items-start gap-2">
                                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1d6fd1]" />
                                <div className="min-w-0">
                                  <p className="font-medium text-[#243b53]">{doc.document_type_label || doc.name || `Document #${doc.id}`}</p>
                                  {doc.name && doc.document_type_label ? (
                                    <p className="truncate text-xs text-[#627d98]">{doc.name}</p>
                                  ) : null}
                                  {doc.uploaded_at ? (
                                    <p className="text-[11px] text-[#8fa3bc]">Uploaded {formatDate(doc.uploaded_at)}</p>
                                  ) : null}
                                </div>
                              </div>
                              {doc.downloadable !== false ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDocumentDownload(doc.id, doc.name)}
                                  disabled={downloadingDocId === doc.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#c9ddff] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1d6fd1] hover:bg-[#eef5ff] disabled:opacity-60"
                                >
                                  {downloadingDocId === doc.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                  Download
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-[#627d98]">No documents listed yet.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#d7e5f9] bg-white p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0d1f3c]">
                        <Clock3 className="h-4 w-4 text-[#1d6fd1]" />
                        Activity log
                      </div>
                      {caseData.status_logs.length ? (
                        <ul className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                          {caseData.status_logs.slice().reverse().map((log, index) => (
                            <li key={`${log.timestamp}-${index}`} className="rounded-lg border border-[#e8eef8] bg-[#fafcff] px-3 py-2">
                              <p className="text-xs font-semibold text-[#243b53]">{log.action.replace(/_/g, " ")}</p>
                              <p className="text-[11px] text-[#627d98]">{formatDate(log.timestamp)}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-[#627d98]">No activity yet.</p>
                      )}
                    </div>
                  </div>
                  ) : null}

                  <div className="rounded-2xl border border-[#d7e5f9] bg-white p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0d1f3c]">
                      <MessageCircle className="h-4 w-4 text-[#1d6fd1]" />
                      Messages with FlyOCI
                    </div>
                    {caseData.messages.length ? (
                      <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                        {caseData.messages.map((msg, index) => (
                          <div
                            key={`${msg.created_at}-${index}`}
                            className={`rounded-xl px-3 py-2 text-sm ${
                              msg.sender === "customer"
                                ? "ml-8 border border-[#d8e6fc] bg-[#f8fbff] text-[#486581]"
                                : "mr-8 border border-[#dce8fa] bg-white text-[#243b53]"
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#627d98]">{msg.sender}</p>
                            <p className="mt-1 whitespace-pre-wrap">{msg.message}</p>
                            <p className="mt-1 text-[10px] text-[#8fa3bc]">{formatDate(msg.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#627d98]">No messages yet. Ask our team a question below.</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-xl border border-[#d8e6fc] px-3 py-2.5 text-sm outline-none focus:border-[#1d6fd1] focus:ring-2 focus:ring-[#1d6fd1]/15"
                      />
                      <Button onClick={() => void handleSendMessage()} isLoading={sendingMessage} disabled={!messageText.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : loading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center rounded-2xl border border-[#d7e5f9] bg-white py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1d6fd1]" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#d7e5f9] bg-white p-5 shadow-[0_10px_28px_rgba(20,60,106,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1d6fd1]">Case progress</p>
              <div className="mt-3">
                <ApostilleTimeline activeIndex={timelineIndex} compact />
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7e5f9] bg-[#f8fbff] p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[#243b53]">
                <ShieldCheck className="h-4 w-4 text-[#1d6fd1]" />
                What you can do here
              </div>
              <ul className="mt-3 space-y-2 text-[#486581]">
                <li>• View submitted status and expected delivery</li>
                <li>• Download your case summary PDF</li>
                <li>• Pay securely after approval</li>
                <li>• Message our team about your case</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#d7e5f9] bg-white p-4 text-sm text-[#627d98]">
              Need help? <Link href="/contact-apostille-support" className="font-semibold text-[#1d6fd1] hover:underline">Contact Apostille support</Link>
              {" "}or read the <Link href="/apostille-faq" className="font-semibold text-[#1d6fd1] hover:underline">FAQ</Link>.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
