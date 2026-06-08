import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : request.ip || "").trim();
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return NextResponse.next();
  }

  try {
    const statusUrl = new URL(`${API_BASE_URL}/security/ip-status/`);
    const response = await fetch(statusUrl.toString(), {
      method: "GET",
      headers: {
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
      },
      cache: "no-store",
    });
    if (response.ok) {
      const body = (await response.json()) as { data?: { blocked?: boolean } };
      if (body?.data?.blocked) {
        return new NextResponse("Access denied. Your IP address has been blocked.", { status: 403 });
      }
    }
  } catch {
    // Allow request if status check fails (avoid taking site offline)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt|sitemap.xml).*)"],
};
