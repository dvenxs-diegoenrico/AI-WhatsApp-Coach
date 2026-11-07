import { describe, expect, it } from "vitest";
import { parseAge, parseConsent, parsePersonality, runOnboarding } from "@/lib/conversation/onboarding";
import { detectCommand } from "@/lib/conversation/commands";
import { t } from "@/lib/i18n/es";

describe("onboarding", () => {
  it("parses age", () => {
    expect(parseAge("32")).toBe(32);
    expect(parseAge("tengo 45 años")).toBe(45);
    expect(parseAge("treinta")).toBeNull();
  });

  it("blocks minors and purges their messages", () => {
    const r = runOnboarding("age", "16");
    expect(r.update.onboarding_step).toBe("blocked_minor");
    expect(r.purgeMessages).toBe(true);
    expect(r.reply).toBe(t.minorBlocked);
  });

  it("accepts 18 and moves to consent", () => {
    expect(runOnboarding("age", "18").update).toEqual({ age: 18, onboarding_step: "consent" });
  });

  it("rejects silly ages", () => expect(runOnboarding("age", "300").update).toEqual({}));

  it("requires explicit consent", () => {
    expect(parseConsent("ACEPTO")).toBe("yes");
    expect(parseConsent("Sí, acepto")).toBe("yes");
    expect(parseConsent("no acepto")).toBe("no");
    expect(parseConsent("No")).toBe("no");
    expect(parseConsent("tal vez")).toBeNull();
    const r = runOnboarding("consent", "acepto", new Date("2026-11-07T00:00:00Z"));
    expect(r.update).toMatchObject({ onboarding_step: "personality", health_consent_at: "2026-11-07T00:00:00.000Z" });
    expect(runOnboarding("consent", "no").update).toEqual({});
  });

  it("parses personality", () => {
    expect(parsePersonality("1")).toBe("amigable");
    expect(parsePersonality("Estricta")).toBe("estricto");
    expect(parsePersonality("3")).toBe("balanceado");
    expect(parsePersonality("4")).toBeNull();
    expect(runOnboarding("personality", "2").update).toEqual({ personality: "estricto", onboarding_step: "done" });
  });

  it("keeps minors blocked", () => expect(runOnboarding("blocked_minor", "ya tengo 18").update).toEqual({}));
});

describe("commands", () => {
  it.each([
    ["BORRAR MIS DATOS", "delete_request"], ["borrar mis datos.", "delete_request"], ["Eliminar mis datos", "delete_request"],
    ["CONFIRMO BORRAR", "delete_confirm"], ["ALTO", "stop_reminders"], ["Stop", "stop_reminders"],
  ])("%s → %s", (text, cmd) => expect(detectCommand(text)).toBe(cmd));

  it("ignores normal sentences", () => {
    expect(detectCommand("¿puedo borrar mis datos después?")).toBeNull();
    expect(detectCommand("me dio un alto en el camino")).toBeNull();
  });
});
