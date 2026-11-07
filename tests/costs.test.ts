import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { addCosts, costOf } from "@/lib/ai/pricing";
import { prepareImage } from "@/lib/ai/image";
import { limitState, shouldNotify } from "@/lib/conversation/limits";

describe("pricing", () => {
  it("haiku text reply", () => {
    // 2,500 in × $0.10/M + 400 out × $0.50/M = $0.00045
    expect(costOf("claude-haiku-5-5", { input_tokens: 2500, output_tokens: 400 }).costUsd).toBeCloseTo(0.00045, 6);
  });
  it("sonnet photo reply", () => {
    // 2,500 in × $2/M + 900 out × $10/M = $0.014
    expect(costOf("claude-sonnet-5-5", { input_tokens: 2500, output_tokens: 900 }).costUsd).toBeCloseTo(0.014, 6);
  });
  it("counts cache tokens", () => {
    const c = costOf("claude-sonnet-5-5", { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 1000 });
    expect(c.inputTokens).toBe(1100);
    expect(c.costUsd).toBeCloseTo(0.0004, 6);
  });
  it("unknown models cost 0 instead of crashing", () => expect(costOf("other", { input_tokens: 1, output_tokens: 1 }).costUsd).toBe(0));
  it("adds retries", () => {
    const a = costOf("claude-haiku-5-5", { input_tokens: 1000, output_tokens: 100 });
    expect(addCosts(a, a)?.inputTokens).toBe(2000);
    expect(addCosts(null, a)).toBe(a);
  });
});

describe("prepareImage", () => {
  it("shrinks a big photo to max 1024 px JPEG", async () => {
    const big = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#c84" } }).png().toBuffer();
    const out = await prepareImage(big);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBe(1024);
  });
  it("never enlarges small photos", async () => {
    const small = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    expect((await sharp(await prepareImage(small)).metadata()).width).toBe(640);
  });
});

describe("limits", () => {
  const limits = { messages: 60, photos: 5 };
  it("allows normal use", () => expect(limitState({ messages: 60, photos: 5 }, limits, true)).toBe("ok"));
  it("stops after the message limit", () => expect(limitState({ messages: 61, photos: 0 }, limits, false)).toBe("messages"));
  it("stops photos after the photo limit but not text", () => {
    expect(limitState({ messages: 10, photos: 6 }, limits, true)).toBe("photos");
    expect(limitState({ messages: 10, photos: 6 }, limits, false)).toBe("ok");
  });
  it("notifies once per 24 h", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(shouldNotify(null, now)).toBe(true);
    expect(shouldNotify("2026-11-07T08:00:00Z", now)).toBe(false);
    expect(shouldNotify("2026-11-06T08:00:00Z", now)).toBe(true);
  });
});
