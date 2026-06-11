import type { ApostilleTrackCaseResponse } from "@/lib/api";

export type ApostilleTimelineStep = {
  key: string;
  label: string;
  hint: string;
};

export const APOSTILLE_TIMELINE: ApostilleTimelineStep[] = [
  { key: "precheck", label: "Pre-Check", hint: "Documents submitted for free review" },
  { key: "review", label: "Expert Review", hint: "FlyOCI checks route and readiness" },
  { key: "approval", label: "Approval & Quote", hint: "Service fee confirmed before payment" },
  { key: "payment", label: "Secure Payment", hint: "Pay only after approval" },
  { key: "final", label: "Final Details", hint: "Delivery and supporting documents" },
  { key: "processing", label: "Processing", hint: "Apostille handled with status updates" },
  { key: "completed", label: "Completed", hint: "Case closed or dispatched" },
];

export const APOSTILLE_DOCUMENT_TYPES = [
  "Birth Certificate",
  "Marriage Certificate",
  "Death Certificate",
  "Degree Certificate",
  "Diploma / Transcript",
  "Affidavit",
  "Police Clearance Certificate",
  "Power of Attorney",
  "Single Status Certificate",
  "Other",
];

export function formatApostilleStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    under_review: "Under Review",
    approved: "Approved",
    payment_pending: "Payment Required",
    final_submission_pending: "Final Submission Required",
    processing: "Processing",
    completed: "Completed",
    dispatched: "Dispatched",
    rejected: "Correction Required",
    correction_requested: "Correction Required",
  };
  return map[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function apostilleStatusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (["completed", "dispatched"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (["payment_pending", "approved", "final_submission_pending"].includes(normalized)) {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (["rejected", "correction_requested"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (normalized === "processing") {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  return "bg-[#eef5ff] text-[#1d4d81] border-[#c9ddff]";
}

export function resolveApostilleTimelineIndex(caseData: ApostilleTrackCaseResponse): number {
  const summary = caseData.case_summary;
  const status = (caseData.status || "").toLowerCase();
  if (["completed", "dispatched"].includes(status) || summary?.delivered_at) return 6;
  if (status === "processing" || summary?.final_submission_at) return 5;
  if (caseData.payment_verified && !caseData.final_submission_completed) return 4;
  if (caseData.payment_verified || status === "final_submission_pending") return 4;
  if (["payment_pending", "approved"].includes(status)) return 3;
  if (status === "under_review") return 1;
  if (status === "draft") return 0;
  if (["rejected", "correction_requested"].includes(status)) return 1;
  return 2;
}

export function isApostilleSubmittedPhase(caseData: ApostilleTrackCaseResponse): boolean {
  const status = (caseData.status || "").toLowerCase();
  const summary = caseData.case_summary;
  return (
    caseData.final_submission_completed ||
    ["processing", "completed", "dispatched"].includes(status) ||
    Boolean(summary?.government_submitted_at || summary?.final_submission_at || summary?.delivered_at)
  );
}

export type ApostilleCustomerStatusMessage = {
  title: string;
  message: string;
  submittedLabel: string;
  submittedValue: string;
  deliveryLabel: string;
  deliveryValue: string;
};

export function getApostilleCustomerStatusMessage(caseData: ApostilleTrackCaseResponse): ApostilleCustomerStatusMessage {
  const summary = caseData.case_summary;
  const status = (caseData.status || "").toLowerCase();
  const submittedAt = summary?.government_submitted_at || summary?.final_submission_at;
  const expectedDelivery = summary?.expected_delivery_at;
  const deliveredAt = summary?.delivered_at;
  const submittedDisplay = formatApostilleSummaryDate(submittedAt);
  const expectedDisplay = formatApostilleSummaryDateOnly(expectedDelivery);
  const deliveredDisplay = formatApostilleSummaryDate(deliveredAt);

  if (deliveredAt || status === "dispatched" || status === "completed") {
    return {
      title: "Delivered",
      message: deliveredAt
        ? `Your apostille was delivered on ${deliveredDisplay}.`
        : "Your apostille has been completed and dispatched.",
      submittedLabel: "Submitted",
      submittedValue: submittedDisplay,
      deliveryLabel: "Delivered",
      deliveryValue: deliveredDisplay,
    };
  }

  if (summary?.government_submitted_at) {
    return {
      title: "Submitted",
      message: expectedDelivery
        ? `Your case was submitted on ${formatApostilleSummaryDateOnly(summary.government_submitted_at)}. Expected delivery around ${expectedDisplay}.`
        : `Your case was submitted on ${formatApostilleSummaryDateOnly(summary.government_submitted_at)}. We will confirm your expected delivery date shortly.`,
      submittedLabel: "Submitted",
      submittedValue: formatApostilleSummaryDate(summary.government_submitted_at),
      deliveryLabel: "Expected delivery",
      deliveryValue: expectedDisplay,
    };
  }

  if (caseData.final_submission_completed || summary?.final_submission_at) {
    return {
      title: "Processing",
      message: expectedDelivery
        ? `We have received your final details and your apostille is being processed. Expected delivery around ${expectedDisplay}.`
        : "We have received your final details and your apostille is being processed. We will confirm your expected delivery date shortly.",
      submittedLabel: "Final details submitted",
      submittedValue: formatApostilleSummaryDate(summary?.final_submission_at),
      deliveryLabel: "Expected delivery",
      deliveryValue: expectedDisplay,
    };
  }

  return {
    title: summary?.stage_label || formatApostilleStatus(caseData.status),
    message: "Track your case here for updates on review, payment, and delivery.",
    submittedLabel: "Submitted",
    submittedValue: formatApostilleSummaryDate(summary?.precheck_submitted_at || caseData.created_at),
    deliveryLabel: "Expected delivery",
    deliveryValue: "To be confirmed",
  };
}

export async function downloadApostilleCaseSummaryPdf(caseData: ApostilleTrackCaseResponse): Promise<void> {
  const summary = caseData.case_summary;
  const statusMessage = getApostilleCustomerStatusMessage(caseData);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = 56;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FlyOCI Apostille Case Summary", 48, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(93, 112, 137);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 48, y);
  y += 28;

  const rows: Array<[string, string]> = [
    ["File number", caseData.file_number],
    ["Reference", summary?.reference_number || caseData.reference_number || "—"],
    ["Applicant", caseData.full_name],
    ["Status", summary?.stage_label || formatApostilleStatus(caseData.status)],
    [statusMessage.submittedLabel, statusMessage.submittedValue],
    [statusMessage.deliveryLabel, statusMessage.deliveryValue],
  ];

  if (summary?.government_reference) {
    rows.push(["Government reference", summary.government_reference]);
  }

  doc.setTextColor(31, 53, 88);
  doc.setFontSize(12);

  rows.forEach(([label, value]) => {
    if (y > 760) {
      doc.addPage();
      y = 56;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 48, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value || "—", 380);
    doc.text(wrapped, 220, y);
    y += Math.max(22, wrapped.length * 14);
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Update", 48, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  const messageLines = doc.splitTextToSize(statusMessage.message, 500);
  doc.text(messageLines, 48, y);
  y += messageLines.length * 14 + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 127, 153);
  doc.text("FlyOCI is an independent private service provider.", 48, 800);

  const safeFile = (caseData.file_number || "case").replace(/[^\w.-]+/g, "-");
  doc.save(`flyoci-apostille-summary-${safeFile}.pdf`);
}

function formatApostilleSummaryDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function formatApostilleSummaryDateOnly(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

