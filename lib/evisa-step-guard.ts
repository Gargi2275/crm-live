type ResumeLike = {
  next_step?: string;
  resume_url?: string;
  application_data?: {
    email_confirmed?: boolean;
    payment_confirmed?: boolean;
    current_stage?: string;
    application_status?: string;
  };
};

function buildCaseUrl(path: string, caseNumber: string): string {
  return `${path}?case=${encodeURIComponent(caseNumber)}`;
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function routeFromNextStep(nextStepRaw: string, caseNumber: string): string {
  const nextStep = (nextStepRaw || "").trim().toLowerCase();

  if (["registration", "confirm_email"].includes(nextStep)) {
    return buildCaseUrl("/indian-e-visa", caseNumber);
  }
  if (nextStep === "payment") {
    return buildCaseUrl("/indian-e-visa/payment", caseNumber);
  }
  if (nextStep === "upload_documents") {
    return buildCaseUrl("/indian-e-visa/upload", caseNumber);
  }
  if (["review_submit", "in_preparation"].includes(nextStep)) {
    return buildCaseUrl("/indian-e-visa/review", caseNumber);
  }
  if (nextStep === "track") {
    return buildCaseUrl("/track", caseNumber);
  }

  return buildCaseUrl("/indian-e-visa", caseNumber);
}

export function resolveCanonicalEVisaRoute(resume: ResumeLike | null | undefined, caseNumber: string): string {
  const safeCase = (caseNumber || "").trim().toUpperCase();
  if (!safeCase) {
    return "/indian-e-visa";
  }

  const resumeUrl = (resume?.resume_url || "").trim();
  if (resumeUrl.startsWith("/")) {
    const hasCase = /[?&]case=/i.test(resumeUrl);
    return hasCase ? resumeUrl : `${resumeUrl}${resumeUrl.includes("?") ? "&" : "?"}case=${encodeURIComponent(safeCase)}`;
  }

  const app = resume?.application_data;
  if (app) {
    const stage = String(app.current_stage || "").toLowerCase();
    const status = String(app.application_status || "").toLowerCase();

    if (!app.email_confirmed) {
      return buildCaseUrl("/indian-e-visa", safeCase);
    }
    if (!app.payment_confirmed) {
      return buildCaseUrl("/indian-e-visa/payment", safeCase);
    }
    if (["paid", "correction_requested", "document_upload_pending", "pending_docs"].includes(stage) || ["correction_requested", "pending_docs"].includes(status)) {
      return buildCaseUrl("/indian-e-visa/upload", safeCase);
    }
    if (["audit_pending", "docs_received", "in_preparation", "under_review", "review_pending", "reuploaded_pending_review"].includes(stage) || ["under_review", "reuploaded_pending_review"].includes(status)) {
      return buildCaseUrl("/indian-e-visa/review", safeCase);
    }
  }

  return routeFromNextStep(String(resume?.next_step || ""), safeCase);
}

export function isCurrentPathAllowed(pathname: string, targetRoute: string): boolean {
  const targetPath = normalizePath(targetRoute.split("?")[0] || "");
  const currentPath = normalizePath(pathname || "");
  return currentPath === targetPath;
}

export function isMissingCaseError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("invalid case") ||
    message.includes("invalid reference") ||
    (message.includes("case") && message.includes("missing"))
  );
}

export function resolveMissingCaseRedirect(isLoggedIn: boolean): string {
  return isLoggedIn ? "/dashboard" : "/indian-e-visa";
}
