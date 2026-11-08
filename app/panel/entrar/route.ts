import { type NextRequest, NextResponse } from "next/server";
import { verifyLink } from "@/lib/billing/links";
import { linksKey } from "@/lib/billing/stripe";
import { newSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /panel/entrar?t=<link from WhatsApp> → sets the session cookie → /panel */
export async function GET(req: NextRequest) {
  const userId = verifyLink(req.nextUrl.searchParams.get("t"), "panel", linksKey());
  const res = NextResponse.redirect(new URL(userId ? "/panel" : "/panel?vencido=1", req.url), 303);
  if (userId) res.cookies.set(SESSION_COOKIE, newSessionToken(userId), sessionCookieOptions);
  return res;
}
