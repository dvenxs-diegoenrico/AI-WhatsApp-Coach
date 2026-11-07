import { describe, expect, it } from "vitest";
import { parseWebhook } from "@/lib/whatsapp/parse";

function payload(messages: unknown[], phoneNumberId = "123") {
  return {
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: {
      metadata: { phone_number_id: phoneNumberId },
      contacts: [{ wa_id: "5215512345678", profile: { name: "Ana" } }],
      messages,
    } }] }],
  };
}

describe("parseWebhook", () => {
  it("parses text, image and audio", () => {
    const out = parseWebhook(payload([
      { id: "m1", from: "5215512345678", timestamp: "1", type: "text", text: { body: "Hola A" } },
      { id: "m2", from: "5215512345678", timestamp: "2", type: "image", image: { id: "img1", mime_type: "image/jpeg", caption: "mi comida" } },
      { id: "m3", from: "5215512345678", timestamp: "3", type: "audio", audio: { id: "aud1", mime_type: "audio/ogg; codecs=opus" } },
      { id: "m4", from: "5215512345678", timestamp: "4", type: "location", location: {} },
      { id: "m5", from: "5215512345678", timestamp: "5", type: "sticker", sticker: { id: "s" } },
      { id: "m6", from: "5215512345678", timestamp: "6", type: "reaction", reaction: { emoji: "👍" } },
    ]), "123");
    expect(out.map((m) => m.kind)).toEqual(["text", "image", "audio", "other"]);
    expect(out[0]).toMatchObject({ text: "Hola A", name: "Ana" });
    expect(out[1]).toMatchObject({ mediaId: "img1", caption: "mi comida" });
  });

  it("ignores other phone numbers and status-only events", () => {
    expect(parseWebhook(payload([{ id: "m1", from: "1", type: "text", text: { body: "x" } }], "999"), "123")).toEqual([]);
    expect(parseWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{}] } }] }] }, "123")).toEqual([]);
    expect(parseWebhook({ object: "page" }, "123")).toEqual([]);
  });
});
