/** Turns Meta's webhook payload into a flat list of incoming messages we care about. */

export type IncomingMessage =
  | { kind: "text"; id: string; from: string; name: string | null; timestamp: number; text: string }
  | { kind: "image"; id: string; from: string; name: string | null; timestamp: number; mediaId: string; mimeType: string; caption: string | null }
  | { kind: "audio"; id: string; from: string; name: string | null; timestamp: number; mediaId: string; mimeType: string }
  | { kind: "other"; id: string; from: string; name: string | null; timestamp: number; type: string };

/* Minimal shape of the parts of the payload we read. Everything is optional because Meta sends many variants. */
interface WebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string; caption?: string };
          audio?: { id?: string; mime_type?: string };
        }>;
      };
    }>;
  }>;
}

export function parseWebhook(payload: unknown, ourPhoneNumberId: string): IncomingMessage[] {
  const p = payload as WebhookPayload;
  if (p?.object !== "whatsapp_business_account") return [];
  const out: IncomingMessage[] = [];

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      // Ignore events for other phone numbers on the same app.
      if (value?.metadata?.phone_number_id && value.metadata.phone_number_id !== ourPhoneNumberId) continue;

      for (const m of value?.messages ?? []) {
        if (!m.id || !m.from) continue;
        const contact = value?.contacts?.find((c) => c.wa_id === m.from) ?? value?.contacts?.[0];
        const base = {
          id: m.id,
          from: m.from,
          name: contact?.profile?.name ?? null,
          timestamp: Number(m.timestamp ?? 0),
        };

        if (m.type === "text" && m.text?.body) {
          out.push({ ...base, kind: "text", text: m.text.body });
        } else if (m.type === "image" && m.image?.id) {
          out.push({
            ...base,
            kind: "image",
            mediaId: m.image.id,
            mimeType: m.image.mime_type ?? "image/jpeg",
            caption: m.image.caption ?? null,
          });
        } else if (m.type === "audio" && m.audio?.id) {
          out.push({ ...base, kind: "audio", mediaId: m.audio.id, mimeType: m.audio.mime_type ?? "audio/ogg" });
        } else {
          out.push({ ...base, kind: "other", type: m.type ?? "unknown" });
        }
      }
      // value.statuses (sent/delivered/read receipts) are ignored for now.
    }
  }
  return out;
}
