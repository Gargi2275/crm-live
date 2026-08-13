/** Customer/staff-facing labels for what must happen next — never a bare count. */

type ActionHint = {
  application_status?: string | null;
  current_stage?: string | null;
  quote_status?: string | null;
  pending_misc_charge_count?: number | null;
};

function statusKeys(app: ActionHint) {
  return {
    status: String(app.application_status || "").toLowerCase(),
    stage: String(app.current_stage || "").toLowerCase(),
    quote: String(app.quote_status || "").toUpperCase(),
  };
}

export function customerActionNeeded(app: ActionHint): string | null {
  if (Number(app.pending_misc_charge_count || 0) > 0) return "Pay extra charge";
  const { status, stage, quote } = statusKeys(app);
  if (status === "correction_requested" || stage === "correction_requested") {
    return "Re-upload corrected documents";
  }
  if (status === "reuploaded_pending_review") return "Wait — staff is reviewing your reupload";
  if (status === "quoted" || quote === "QUOTED") return "Pay quoted fee";
  if (status.includes("payment") || stage.includes("payment")) return "Complete payment";
  if (status.includes("upload") && !status.includes("reupload")) return "Upload required documents";
  if (status.includes("reject")) return "Application rejected — contact FlyOCI";
  return null;
}

export function staffActionNeeded(app: ActionHint): string | null {
  if (Number(app.pending_misc_charge_count || 0) > 0) return "Chase extra-charge payment";
  const { status, stage, quote } = statusKeys(app);
  if (status === "correction_requested" || stage === "correction_requested") {
    return "Waiting on customer document re-upload";
  }
  if (status === "reuploaded_pending_review") return "Review customer reupload";
  if (status === "quoted" || quote === "QUOTED") return "Waiting on quoted payment";
  if (status.includes("payment") || stage.includes("payment")) return "Collect payment";
  if (status.includes("upload") && !status.includes("reupload")) return "Waiting on document upload";
  if (status.includes("reject")) return "Handle rejected application";
  return null;
}
