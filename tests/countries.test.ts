import { describe, expect, it } from "vitest";
import { countryFromWaId } from "@/lib/i18n/countries";
import { t } from "@/lib/i18n/es";
import { buildSystemPrompt } from "@/lib/ai/prompts";

describe("countryFromWaId", () => {
  it.each([
    ["5215512345678", "MX"], ["5491112345678", "AR"], ["573001234567", "CO"], ["34612345678", "ES"],
    ["17875551234", "PR"], ["18095551234", "DO"], ["13055551234", "US"], ["50688887777", "CR"], ["59312345678", "EC"],
  ])("%s → %s", (waId, code) => expect(countryFromWaId(waId)?.code).toBe(code));

  it("unknown prefixes return null", () => expect(countryFromWaId("4915112345678")).toBeNull());
});

describe("crisis message", () => {
  it("uses the local line when known", () => {
    expect(t.crisis(countryFromWaId("5215512345678"))).toContain("800 911 2000");
    expect(t.crisis(countryFromWaId("34612345678"))).toContain("024");
  });
  it("never shows the Mexican line elsewhere", () => {
    const msg = t.crisis(countryFromWaId("5491112345678"));
    expect(msg).not.toContain("800 911 2000");
    expect(msg).toContain("número de emergencias de tu país");
    expect(t.crisis(null)).toContain("número de emergencias de tu país");
  });
});

describe("system prompt", () => {
  it("includes the user's country and is not Mexico-only", () => {
    const p = buildSystemPrompt({ personality: "amigable", restricted_mode: false, age: 30, display_name: null, wa_id: "573001234567" });
    expect(p).toContain("Colombia");
    expect(p).not.toContain("800 911 2000");
  });
});
