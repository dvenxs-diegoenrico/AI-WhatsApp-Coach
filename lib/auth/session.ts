import { cookies } from "next/headers";
import { PANEL_LINK_TTL_MS, SESSION_TTL_MS, signLink, verifyLink } from "@/lib/billing/links";
import { appUrl, linksKey } from "@/lib/billing/stripe";

/**
 * Dashboard login without passwords: the user writes PANEL in WhatsApp, gets a personal
 * 7-day link, and opening it stores a signed 30-day session cookie in their browser.
 */
export const SESSION_COOKIE = "wuc_session";

export function panelLink(userId: string): string {
  return `${appUrl()}/panel/entrar?t=${signLink(userId, "panel", linksKey(), PANEL_LINK_TTL_MS)}`;
}

export function newSessionToken(userId: string): string {
  return signLink(userId, "session", linksKey(), SESSION_TTL_MS);
}

/** The logged-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyLink(token, "session", linksKey());
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
