import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta signs every webhook POST with your App Secret:
 *   X-Hub-Signature-256: sha256=<hex HMAC of the raw body>
 * Reject anything that doesn't match, so nobody else can fake messages.
 */
export function isValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function sign(rawBody: string, appSecret: string): string {
  return "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
}
