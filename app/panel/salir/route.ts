import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/panel?salir=1", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
