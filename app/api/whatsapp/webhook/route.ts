import { after, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { isValidSignature } from "@/lib/whatsapp/signature";
import { parseWebhook } from "@/lib/whatsapp/parse";
import { handleIncoming } from "@/lib/conversation/handle-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Time allowed for the background work after we answer Meta (AI + photo can take a while).
export const maxDuration = 60;

/**
 * GET: Meta calls this once when you click "Verify and save" in the WhatsApp → Configuration page.
 * We must echo back hub.challenge if the verify token matches.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === getEnv().WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST: every incoming message (and delivery receipt).
 * We verify Meta's signature, answer 200 right away (Meta retries if we're slow),
 * and do the real work in `after()`, which keeps running once the response is sent.
 */
export async function POST(req: NextRequest) {
  const env = getEnv();
  const raw = await req.text();

  if (!isValidSignature(raw, req.headers.get("x-hub-signature-256"), env.WHATSAPP_APP_SECRET)) {
    console.warn("WhatsApp webhook: invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const messages = parseWebhook(payload, env.WHATSAPP_PHONE_NUMBER_ID);
  if (messages.length > 0) {
    // In parallel: when Meta batches several messages, each is stored right away,
    // so the short reply delay can group them into a single answer.
    after(async () => {
      const results = await Promise.allSettled(messages.map((msg) => handleIncoming(msg)));
      results.forEach((r, i) => {
        if (r.status === "rejected") console.error(`Failed to handle WhatsApp message ${messages[i].id}`, r.reason);
      });
    });
  }

  return new Response("OK", { status: 200 });
}
