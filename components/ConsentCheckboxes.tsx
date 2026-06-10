"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConsentMode = "payment" | "upload";

type ConsentCheckboxesProps = {
  mode: ConsentMode;
  showMinorConsent?: boolean;
  includeAuditFeeAcknowledgement?: boolean;
  onAcceptanceChange?: (accepted: boolean) => void;
  className?: string;
};

export function ConsentCheckboxes({
  mode,
  showMinorConsent = false,
  includeAuditFeeAcknowledgement = false,
  onAcceptanceChange,
  className = "",
}: ConsentCheckboxesProps) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    onAcceptanceChange?.(accepted);
  }, [accepted, onAcceptanceChange]);

  const title =
    mode === "payment"
      ? "Payment and service confirmations"
      : "Document upload confirmations";

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <p className="text-sm font-semibold text-primary">{title}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {mode === "payment" ? (
          <>
            <li>
              I have read and agree to FlyOCI’s{" "}
              <Link href="/terms-and-conditions" className="font-semibold text-primary hover:underline">
                Terms and Conditions
              </Link>
              ,{" "}
              <Link href="/refund-policy" className="font-semibold text-primary hover:underline">
                Refund Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </li>
            <li>I understand the refund policy and cancellation terms.</li>
            <li>I consent to the payment being processed securely.</li>
            {includeAuditFeeAcknowledgement ? (
              <li>
                I acknowledge the audit fee and understand it is credited against my final service fee if I proceed with
                an OCI service (New OCI, OCI Renewal, or OCI Update) within 30 days of payment. Audit credit does not apply
                to e-Visa or Passport Renewal.
              </li>
            ) : null}
          </>
        ) : (
          <>
            <li>
              I agree to the{" "}
              <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </li>
            <li>I consent to my documents being processed and stored securely for this service.</li>
            {showMinorConsent ? (
              <li>
                Where the applicant is a child, I confirm that I have parental responsibility, legal authority or
                appropriate consent to provide the child’s information and documents to FlyOCI.
              </li>
            ) : null}
          </>
        )}
      </ul>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/30"
        />
        <span className="font-medium leading-6">
          I confirm that I have read, understood and agree to all of the above.
        </span>
      </label>
    </div>
  );
}
