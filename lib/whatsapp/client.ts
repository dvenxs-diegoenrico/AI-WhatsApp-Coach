import { getEnv } from "@/lib/env";

const MAX_WHATSAPP_TEXT = 4096;

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${getEnv().WHATSAPP_API_VERSION}/${path}`;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getEnv().WHATSAPP_ACCESS_TOKEN}` };
}

/**
 * Mexican numbers arrive from WhatsApp as 521 + 10 digits, but the Cloud API
 * (and the test-number "allowed list") expects 52 + 10 digits when sending.
 * Without this fix you get error 131030 "Recipient phone number not in allowed list".
 */
export function toRecipient(waId: string): string {
  if (waId.startsWith("521") && waId.length === 13) return "52" + waId.slice(3);
  return waId;
}

/** Splits long replies so none goes over WhatsApp's 4,096-character limit. */
export function splitForWhatsApp(text: string, max = MAX_WHATSAPP_TEXT - 96): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** Sends a text message. Returns the WhatsApp message ids (one per chunk). */
export async function sendText(waId: string, body: string): Promise<string[]> {
  const env = getEnv();
  const ids: string[] = [];
  for (const chunk of splitForWhatsApp(body)) {
    if (env.WHATSAPP_DRY_RUN) {
      console.log(`[dry-run] → ${waId}:\n${chunk}\n`);
      ids.push(`dry-run-${Date.now()}-${ids.length}`);
      continue;
    }
    const res = await fetch(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toRecipient(waId),
        type: "text",
        text: { body: chunk, preview_url: false },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: unknown };
    if (!res.ok) {
      throw new Error(`WhatsApp send failed (${res.status}): ${JSON.stringify(json.error ?? json)}`);
    }
    if (json.messages?.[0]?.id) ids.push(json.messages[0].id);
  }
  return ids;
}

/** Marks the user's message as read (blue ticks) and shows "escribiendo…" while we think. Best effort. */
export async function markReadWithTyping(messageId: string): Promise<void> {
  const env = getEnv();
  if (env.WHATSAPP_DRY_RUN) return;
  try {
    await fetch(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    });
  } catch (err) {
    console.warn("markReadWithTyping failed", err);
  }
}

/** Downloads a media file (photo or audio) that a user sent. Two steps: get the temporary URL, then the bytes. */
export async function downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
  const meta = await fetch(graphUrl(mediaId), { headers: authHeaders() });
  if (!meta.ok) throw new Error(`WhatsApp media lookup failed (${meta.status})`);
  const info = (await meta.json()) as { url: string; mime_type: string };

  const file = await fetch(info.url, { headers: authHeaders() });
  if (!file.ok) throw new Error(`WhatsApp media download failed (${file.status})`);
  return { data: Buffer.from(await file.arrayBuffer()), mimeType: info.mime_type };
}
