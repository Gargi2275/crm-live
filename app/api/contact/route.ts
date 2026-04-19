import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with the API key from environment variables
// Note: In a real app, ensure this key is properly set in .env.local
const resendApiKey = process.env.RESEND_API_KEY || "re_test_placeholder";
const resend = new Resend(resendApiKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, country, service, message } = body;

    if (!name || !email || !service || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "FlyOCI Contact Form <onboarding@resend.dev>", // Replace with verified domain in production
      to: ["support@flyoci.com"], // Your support email
      subject: `New Inquiry: ${service} from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Country: ${country}
        Service: ${service}
        
        Message:
        ${message}
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "An error occurred while sending the email." },
      { status: 500 }
    );
  }
}
