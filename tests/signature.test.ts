import { describe, expect, it } from "vitest";
import { isValidSignature, sign } from "@/lib/whatsapp/signature";

describe("webhook signature", () => {
  const secret = "app-secret";
  const body = JSON.stringify({ hello: "mundo" });

  it("accepts a correct signature", () => expect(isValidSignature(body, sign(body, secret), secret)).toBe(true));
  it("rejects a wrong secret", () => expect(isValidSignature(body, sign(body, "other"), secret)).toBe(false));
  it("rejects a modified body", () => expect(isValidSignature(body + " ", sign(body, secret), secret)).toBe(false));
  it("rejects a missing header", () => expect(isValidSignature(body, null, secret)).toBe(false));
  it("rejects garbage", () => expect(isValidSignature(body, "sha256=zz", secret)).toBe(false));
});
