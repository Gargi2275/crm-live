"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { RECAPTCHA_DEV_TOKEN, RECAPTCHA_SITE_KEY, isRecaptchaConfigured } from "@/lib/recaptcha";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        },
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    __flyociRecaptchaScriptLoading?: Promise<void>;
  }
}

type RecaptchaFieldProps = {
  onChange: (token: string) => void;
  className?: string;
  error?: string;
};

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (window.__flyociRecaptchaScriptLoading) return window.__flyociRecaptchaScriptLoading;

  window.__flyociRecaptchaScriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-flyoci-recaptcha="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load reCAPTCHA")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.flyociRecaptcha = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });

  return window.__flyociRecaptchaScriptLoading;
}

/**
 * Compulsory Google reCAPTCHA v2 checkbox.
 * When NEXT_PUBLIC_RECAPTCHA_SITE_KEY is empty, shows a local stand-in checkbox
 * so forms still require captcha until real keys are added.
 */
export function RecaptchaField({ onChange, className = "", error }: RecaptchaFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const [devChecked, setDevChecked] = useState(false);
  const [loadError, setLoadError] = useState("");
  const reactId = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const reset = useCallback(() => {
    if (isRecaptchaConfigured && widgetIdRef.current != null && window.grecaptcha) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
    setDevChecked(false);
    onChangeRef.current("");
  }, []);

  useEffect(() => {
    if (!isRecaptchaConfigured) {
      onChangeRef.current("");
      return;
    }

    let cancelled = false;
    void loadRecaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (cancelled || !containerRef.current || widgetIdRef.current != null) return;
          containerRef.current.innerHTML = "";
          widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token: string) => onChangeRef.current(token),
            "expired-callback": () => onChangeRef.current(""),
            "error-callback": () => {
              onChangeRef.current("");
              setLoadError("Captcha failed to load. Please refresh.");
            },
            theme: "light",
          });
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Captcha failed to load. Please refresh.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Expose reset via DOM dataset for parent forms that need to clear after submit.
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    (el as HTMLElement & { __recaptchaReset?: () => void }).__recaptchaReset = reset;
  }, [reset]);

  if (!isRecaptchaConfigured) {
    return (
      <div className={className} data-recaptcha-field={reactId}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d6e4f4] bg-[#f8fbff] px-3.5 py-3">
          <input
            type="checkbox"
            checked={devChecked}
            onChange={(e) => {
              const next = e.target.checked;
              setDevChecked(next);
              onChange(next ? RECAPTCHA_DEV_TOKEN : "");
            }}
            className="mt-0.5 h-4 w-4 rounded border-[#9ab0c8] text-[#1c69dd] focus:ring-[#1c69dd]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#0d1f3c]">I&apos;m not a robot</span>
            <span className="mt-0.5 block text-xs text-[#627d98]">
              Google reCAPTCHA keys not set yet — complete this checkbox (required).
            </span>
          </span>
        </label>
        {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={className} data-recaptcha-field={reactId}>
      <div ref={containerRef} />
      {loadError ? <p className="mt-1.5 text-sm text-red-600">{loadError}</p> : null}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function requireCaptchaToken(token: string): string | null {
  if (!(token || "").trim()) return "Please complete the captcha.";
  return null;
}
