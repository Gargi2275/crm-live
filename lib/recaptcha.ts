/** Google reCAPTCHA v2 — site key from env. */

export const RECAPTCHA_SITE_KEY = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim();

export const isRecaptchaConfigured = Boolean(RECAPTCHA_SITE_KEY);

/**
 * Local/dev bypass: skip widget + client validation.
 * Live production builds keep captcha required.
 * Optional override: NEXT_PUBLIC_BYPASS_RECAPTCHA=1
 */
export const isRecaptchaBypassed =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_BYPASS_RECAPTCHA === "1";

/** Dev / bypass token accepted by backend when DEBUG or secret empty. */
export const RECAPTCHA_DEV_TOKEN = "dev-recaptcha-bypass";
