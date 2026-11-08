import { describe, expect, it } from "vitest";
import { linkKey, signLink, verifyLink } from "@/lib/billing/links";
import { accessFor, demoLeft } from "@/lib/billing/access";
import { detectCommand } from "@/lib/conversation/commands";
import { t } from "@/lib/i18n/es";

const key = linkKey("app-secret");
const HOUR = 3600_000;

describe("signed links", () => {
  it("round-trips the user id", () => {
    expect(verifyLink(signLink("user-1", "pay", key, HOUR), "pay", key)).toBe("user-1");
  });
  it("rejects another purpose", () => expect(verifyLink(signLink("user-1", "pay", key, HOUR), "portal", key)).toBeNull());
  it("rejects expired links", () => {
    const token = signLink("user-1", "pay", key, HOUR, Date.now() - 2 * HOUR);
    expect(verifyLink(token, "pay", key)).toBeNull();
  });
  it("rejects tampering", () => {
    const token = signLink("user-1", "pay", key, HOUR);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(`user-2|pay|${Date.now() + HOUR}`).toString("base64url")}.${sig}`;
    expect(verifyLink(forged, "pay", key)).toBeNull();
    expect(verifyLink(token, "pay", linkKey("other-secret"))).toBeNull();
    expect(verifyLink("garbage", "pay", key)).toBeNull();
    expect(verifyLink(null, "pay", key)).toBeNull();
  });
});

describe("access", () => {
  const base = { billingEnabled: true, status: null, kind: "text" as const, demoUsed: { photos: 0, questions: 0 }, demoLimits: { photos: 1, questions: 3 } };

  it("everyone has full access while billing is off", () => expect(accessFor({ ...base, billingEnabled: false, demoUsed: { photos: 9, questions: 9 } })).toBe("full"));
  it("trial, active and past_due have full access", () => {
    for (const status of ["trialing", "active", "past_due"] as const) expect(accessFor({ ...base, status })).toBe("full");
  });
  it("new users get the demo", () => {
    expect(accessFor(base)).toBe("demo");
    expect(accessFor({ ...base, kind: "photo" })).toBe("demo");
  });
  it("photo used up but questions left", () => {
    const used = { photos: 1, questions: 1 };
    expect(accessFor({ ...base, kind: "photo", demoUsed: used })).toBe("paywall");
    expect(accessFor({ ...base, kind: "text", demoUsed: used })).toBe("demo");
  });
  it("demo finished or subscription ended → paywall", () => {
    expect(accessFor({ ...base, demoUsed: { photos: 1, questions: 3 } })).toBe("paywall");
    expect(accessFor({ ...base, status: "canceled", demoUsed: { photos: 1, questions: 3 } })).toBe("paywall");
  });
  it("counts what is left, never negative", () => expect(demoLeft({ photos: 2, questions: 1 }, { photos: 1, questions: 3 })).toEqual({ photos: 0, questions: 2 }));
});

describe("account command", () => {
  it.each(["MI CUENTA", "mi cuenta", "Planes", "cancelar suscripción", "Suscribirme"])("%s", (text) =>
    expect(detectCommand(text)).toBe("account"),
  );
  it("ignores sentences", () => expect(detectCommand("¿cómo cancelo mi suscripción?")).toBeNull());
});

describe("billing messages", () => {
  it("mentions the free trial only when available", () => {
    expect(t.paywall("L", true, "text", 0)).toContain("3 días gratis");
    expect(t.paywall("L", false, "text", 0)).not.toContain("3 días gratis");
    expect(t.paywall("L", true, "photo", 2)).toContain("2 preguntas");
  });
  it("demo counters read naturally", () => {
    expect(t.demoLeft(0, 1)).toContain("te queda 1 pregunta y 0 fotos");
    expect(t.demoIntro(1, 3)).toContain("1 análisis de foto");
  });
});
