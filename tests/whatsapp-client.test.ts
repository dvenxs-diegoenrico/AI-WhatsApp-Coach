import { describe, expect, it } from "vitest";
import { splitForWhatsApp, toRecipient } from "@/lib/whatsapp/client";

describe("toRecipient", () => {
  it("removes the extra 1 from Mexican mobile numbers", () => expect(toRecipient("5215512345678")).toBe("525512345678"));
  it("leaves other numbers alone", () => {
    expect(toRecipient("525512345678")).toBe("525512345678");
    expect(toRecipient("14155550123")).toBe("14155550123");
  });
});

describe("splitForWhatsApp", () => {
  it("keeps short text whole", () => expect(splitForWhatsApp("hola")).toEqual(["hola"]));
  it("splits long text under the limit", () => {
    const parts = splitForWhatsApp("palabra ".repeat(1500));
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(4000);
  });
});
