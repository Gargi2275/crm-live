"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentMode = "payment" | "upload";

type ConsentCheckboxesProps = {
  mode: ConsentMode;
  showMinorConsent?: boolean;
  onAcceptanceChange?: (accepted: boolean) => void;
  className?: string;
};

export function ConsentCheckboxes({ mode, showMinorConsent = false, onAcceptanceChange, className = "" }: ConsentCheckboxesProps) {
  const [paymentConsents, setPaymentConsents] = useState({
    terms: false,
    refundPolicy: false,
    paymentProcessing: false,
  });
  const [uploadConsents, setUploadConsents] = useState({
    privacyPolicy: false,
    documentsProcessing: false,
    minorAuthority: false,
  });

  const accepted = useMemo(() => {
    if (mode === "payment") {
      return Object.values(paymentConsents).every(Boolean);
    }

    const required = [uploadConsents.privacyPolicy, uploadConsents.documentsProcessing];
    if (showMinorConsent) {
      required.push(uploadConsents.minorAuthority);
    }
    return required.every(Boolean);
  }, [mode, paymentConsents, showMinorConsent, uploadConsents]);

  useEffect(() => {
    onAcceptanceChange?.(accepted);
  }, [accepted, onAcceptanceChange]);

  if (mode === "payment") {
    return (
      <div className={`space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
        <ConsentItem checked={paymentConsents.terms} onChange={(checked) => setPaymentConsents((prev) => ({ ...prev, terms: checked }))}>
          I confirm that I have read and agree to FlyOCI’s Terms and Conditions, Refund Policy and Privacy Policy.
        </ConsentItem>
        <ConsentItem checked={paymentConsents.refundPolicy} onChange={(checked) => setPaymentConsents((prev) => ({ ...prev, refundPolicy: checked }))}>
          I understand the refund policy and cancellation terms.
        </ConsentItem>
        <ConsentItem checked={paymentConsents.paymentProcessing} onChange={(checked) => setPaymentConsents((prev) => ({ ...prev, paymentProcessing: checked }))}>
          I consent to the payment being processed.
        </ConsentItem>
      </div>
    );
  }

  return (
    <div className={`space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <ConsentItem checked={uploadConsents.privacyPolicy} onChange={(checked) => setUploadConsents((prev) => ({ ...prev, privacyPolicy: checked }))}>
        I agree to the Privacy Policy.
      </ConsentItem>
      <ConsentItem checked={uploadConsents.documentsProcessing} onChange={(checked) => setUploadConsents((prev) => ({ ...prev, documentsProcessing: checked }))}>
        I consent to my documents being processed and stored for the service.
      </ConsentItem>
      {showMinorConsent ? (
        <ConsentItem checked={uploadConsents.minorAuthority} onChange={(checked) => setUploadConsents((prev) => ({ ...prev, minorAuthority: checked }))}>
          Where the applicant is a child, I confirm that I have parental responsibility, legal authority or appropriate consent to provide the child’s information and documents to FlyOCI.
        </ConsentItem>
      ) : null}
    </div>
  );
}

function ConsentItem({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
      />
      <span className="leading-6">{children}</span>
    </label>
  );
}