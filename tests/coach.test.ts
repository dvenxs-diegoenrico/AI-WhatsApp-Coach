import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ db: () => { throw new Error("db must not be called for invalid input"); }, PHOTOS_BUCKET: "photos" }));
const { runTool, COACH_TOOLS } = await import("@/lib/coach/tools");
const { insights, demoDashboard } = await import("@/lib/coach/dashboard");
const { detectCommand } = await import("@/lib/conversation/commands");
const { COACH_CORE, buildUserContext } = await import("@/lib/ai/prompts");

const user = { id: "u1", restricted_mode: false, timezone: "America/Mexico_City", wa_id: "5215512345678" } as never;

describe("coach tools", () => {
  it("every tool has a JSON schema object", () => {
    for (const t of COACH_TOOLS) expect(t.input_schema.type).toBe("object");
    expect(COACH_TOOLS.map((t) => t.name)).toEqual(
      expect.arrayContaining(["update_profile", "log_meal", "correct_last_meal", "log_weight", "log_workout", "get_progress", "save_coach_note"]),
    );
  });

  it("rejects impossible values before touching the database", async () => {
    const bad = [
      ["log_meal", { description: "x", meal_type: "comida", calories: -50, protein_g: 1, carbs_g: 1, fat_g: 1 }],
      ["log_weight", { weight_kg: 900 }],
      ["update_profile", { height_cm: 20 }],
      ["update_profile", { goal: "adelgazar mucho" }],
      ["log_workout", { kind: "" }],
    ] as const;
    for (const [name, input] of bad) {
      const r = await runTool({ user }, name, input);
      expect(r.isError).toBe(true);
    }
  });

  it("unknown tools are errors", async () => expect((await runTool({ user }, "drop_tables", {})).isError).toBe(true));
});

describe("PANEL command", () => {
  it.each(["PANEL", "mi panel", "Mi progreso", "resumen"])("%s", (t) => expect(detectCommand(t)).toBe("panel"));
});

describe("dashboard insights", () => {
  it("suggests protein in the evening when far from target", () => {
    const d = demoDashboard();
    d.totals.protein = 20;
    expect(insights(d, 19).join(" ")).toMatch(/proteína/);
  });
  it("asks to complete the profile first", () => {
    const d = { ...demoDashboard(), missingProfile: ["estatura", "peso actual"] };
    expect(insights(d)[0]).toMatch(/estatura y peso actual/);
  });
  it("never shows numbers in restricted mode", () => {
    const d = { ...demoDashboard(), restricted: true };
    expect(insights(d, 20).join(" ")).not.toMatch(/\d+\s*g/);
  });
});

describe("coach prompt", () => {
  it("keeps the identity and safety rules", () => {
    expect(COACH_CORE).toMatch(/coach de nutrición con IA/);
    expect(COACH_CORE).toMatch(/1200|1,200/);
    expect(COACH_CORE).toMatch(/log_meal/);
  });
  it("tells the model what is missing for targets", () => {
    const ctx = buildUserContext({ ...(user as object), personality: "estricto", age: 30, restricted_mode: false } as never, {
      now: new Date("2026-11-07T18:00:00Z"),
      missingProfile: ["estatura", "peso actual"],
    });
    expect(ctx).toMatch(/Missing: estatura, peso actual/);
    expect(ctx).toMatch(/STRICT/);
  });
});
