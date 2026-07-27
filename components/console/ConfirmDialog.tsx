"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const confirmClass =
    tone === "danger"
      ? "bg-[#B42318] hover:bg-[#912018] text-white"
      : "bg-[#009877] hover:bg-[#007B61] text-white";

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full rounded-t-[16px] border border-[#D9E1EA] bg-white shadow-[0_24px_48px_rgba(15,42,67,0.2)] sm:max-w-md sm:rounded-[14px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E5EAF0] px-4 py-3">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                tone === "danger" ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F7F3] text-[#009877]"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-base font-heading font-semibold text-[#102A43]">
                {title}
              </h2>
              <p id="confirm-dialog-description" className="mt-1 text-sm leading-relaxed text-[#627D98]">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full p-1.5 text-[#829AB1] hover:bg-[#F5F7FA] hover:text-[#486581] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
