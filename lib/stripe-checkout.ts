export type StripePaymentKind = "audit" | "full" | "cart_full" | "passport-quote" | "apostille" | "evisa" | "easyfly";

export function getStripeCheckoutUrl(payload: {
  checkout_url?: string | null;
  order?: { url?: string | null };
}): string {
  return String(payload.checkout_url || payload.order?.url || "").trim();
}

export function redirectToStripeCheckout(checkoutUrl: string): void {
  const url = String(checkoutUrl || "").trim();
  if (!url) {
    throw new Error("Stripe checkout URL is missing.");
  }
  window.location.assign(url);
}

export function readStripeReturnParams(): {
  sessionId: string | null;
  paymentKind: StripePaymentKind | null;
  reference: string | null;
} {
  if (typeof window === "undefined") {
    return { sessionId: null, paymentKind: null, reference: null };
  }

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("stripe_session_id") || params.get("session_id");
  const paymentKind = params.get("payment_kind") as StripePaymentKind | null;
  const reference = params.get("reference");

  return {
    sessionId: sessionId?.trim() || null,
    paymentKind: paymentKind || null,
    reference: reference?.trim() || null,
  };
}

export function clearStripeReturnParams(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("stripe_session_id");
  url.searchParams.delete("session_id");
  url.searchParams.delete("payment_kind");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
