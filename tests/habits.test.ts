import { describe, expect, it, vi } from "vitest";

process.env.WHATSAPP_ACCESS_TOKEN = "x";
process.env.WHATSAPP_PHONE_NUMBER_ID = "1";
process.env.WHATSAPP_APP_SECRET = "secret-for-tests";
process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
process.env.ANTHROPIC_API_KEY = "x";
process.env.APP_URL = "https://whatupcoach.vercel.app";

vi.mock("@/lib/supabase/server", () => ({ db: () => { throw new Error("no db in unit tests"); }, PHOTOS_BUCKET: "photos" }));
const { parseSteps, describeDay } = await import("@/lib/coach/habits");
const { stepsUrl, verifyStepsToken } = await import("@/lib/coach/steps-link");
const { runTool } = await import("@/lib/coach/tools");
const { detectCommand } = await import("@/lib/conversation/commands");
const { COACH_CORE } = await import("@/lib/ai/prompts");

describe("parseSteps", () => {
  it.each([[8432, 8432], ["8,432", 8432], ["8.432", 8432], ["8432 pasos", 8432], ["0", 0]])("%s → %s", (raw, n) => expect(parseSteps(raw)).toBe(n));
  it.each([[-5], ["abc"], ["1234567"], [null], [{}]])("rejects %s", (raw) => expect(parseSteps(raw)).toBeNull());
});

describe("iPhone Shortcut link", () => {
  it("round-trips user and version", () => {
    const url = new URL(stepsUrl({ id: "user-1", steps_token_version: 3 }));
    expect(url.pathname).toBe("/api/health/steps");
    expect(verifyStepsToken(url.searchParams.get("t"))).toEqual({ userId: "user-1", version: 3 });
  });
  it("rejects garbage", () => expect(verifyStepsToken("nope")).toBeNull());
});

describe("habit tools validation", () => {
  const user = { id: "u", timezone: "America/Mexico_City", restricted_mode: false } as never;
  it.each([
    [{ metric: "pasos", value: -1, mode: "set" }],
    [{ metric: "heroina", value: 1, mode: "add" }],
    [{ metric: "agua_ml", value: 250, mode: "sumar" }],
  ])("rejects %j", async (input) => expect((await runTool({ user }, "log_habit", input)).isError).toBe(true));
  it("rejects more than 3 focus habits", async () =>
    expect((await runTool({ user }, "set_focus_habits", { habits: ["pasos", "agua_ml", "sueno_h", "cigarros"] })).isError).toBe(true));
});

describe("PASOS command and prompt", () => {
  it.each(["PASOS", "conectar pasos", "Mis pasos"])("%s", (t) => expect(detectCommand(t)).toBe("steps"));
  it("does not treat a toast or a question as a command", () => {
    expect(detectCommand("salud")).toBeNull();
    expect(detectCommand("¿cuántos pasos debo dar?")).toBeNull();
  });
  it("covers habits and vices", () => {
    for (const w of ["log_habit", "Alcohol", "Smoking", "Sleep", "Sugary drinks", "National Weight Control Registry"]) expect(COACH_CORE).toContain(w);
  });
  it("describes a day", () => expect(describeDay({ pasos: 8432, agua_ml: 1500 })).toBe("Pasos: 8,432 pasos · Agua: 1.5 L"));
});
