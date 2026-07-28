/** Google reCAPTCHA v2 — site key from env (empty until you add keys). */

export const RECAPTCHA_SITE_KEY = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim();

export const isRecaptchaConfigured = Boolean(RECAPTCHA_SITE_KEY);

/** Dev fallback token when site key is not configured yet. */
export const RECAPTCHA_DEV_TOKEN = "dev-recaptcha-pending-keys";
