import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed links sent in WhatsApp (pay / manage subscription). The link says which user it is for
 * and expires, and nobody can change it without the secret. No login or password needed.
 */
export type LinkPurpose = "pay" | "portal" | "panel" | "session" | "steps";

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString();

/** Derives a separate key for links from an existing secret, so you don't need one more variable. */
export function linkKey(baseSecret: string): string {
  return createHash("sha256").update(`signed-links:v1:${baseSecret}`).digest("hex");
}

export function signLink(userId: string, purpose: LinkPurpose, key: string, ttlMs: number, now = Date.now()): string {
  const payload = b64(`${userId}|${purpose}|${now + ttlMs}`);
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyLink(token: string | null | undefined, purpose: LinkPurpose, key: string, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", key).update(payload).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  const [userId, p, exp] = unb64(payload).split("|");
  if (p !== purpose || !userId || !(Number(exp) > now)) return null;
  return userId;
}

export const PAY_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PORTAL_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const PANEL_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** The iPhone Shortcut link lasts 2 years; it can be revoked by bumping users.steps_token_version. */
export const STEPS_LINK_TTL_MS = 730 * 24 * 60 * 60 * 1000;
