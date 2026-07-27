import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with the secret key from environment variables
// Note: In a real app, ensure this key is properly set in .env.local
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { returnUrl, amountPence } = body as { returnUrl?: string; amountPence?: number };

    // The base URL for the application
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const originUrl = returnUrl || `${baseUrl}/document-audit`;
    const unitAmount =
      typeof amountPence === "number" && Number.isFinite(amountPence) && amountPence > 0
        ? Math.round(amountPence)
        : 0;
    if (!unitAmount) {
      return NextResponse.json(
        { error: "Early assessment is not currently offered." },
        { status: 400 },
      );
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "FlyOCI Early Assessment (Pre-Check)",
              description: "Expert review of all your documents before you apply.",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${originUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originUrl}?canceled=true`,
      metadata: {
        service: "Early Assessment",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    return NextResponse.json(
      { error: error.message || "An error occurred during checkout." },
      { status: error.statusCode || 500 }
    );
  }
}
