import { describe, expect, it } from "vitest";
import { adaptiveTdee, bmrMifflin, computeTargets, referenceWeightKg, weightSlopePerDay, weightTrend } from "@/lib/coach/nutrition";

const woman = { sex: "mujer" as const, age: 30, heightCm: 165, weightKg: 70, goal: "bajar" as const, activity: "sedentario" as const };
const man = { sex: "hombre" as const, age: 40, heightCm: 180, weightKg: 120, goal: "bajar" as const, activity: "moderado" as const };

describe("energy", () => {
  it("Mifflin-St Jeor", () => {
    expect(bmrMifflin(woman)).toBeCloseTo(1420.25, 2);
    expect(bmrMifflin(man)).toBeCloseTo(2130, 2);
  });

  it("moderate loss for a 70 kg woman", () => {
    const t = computeTargets(woman);
    expect(t.tdee).toBe(1704);
    expect(t.calories).toBe(1320);
    expect(t.weeklyChangeKg).toBeCloseTo(-0.35, 2); // 0.5 % of body weight
    expect(t.proteinG).toBe(112); // 1.6 g/kg
    expect(t.fatG).toBe(42);
    expect(t.carbsG).toBe(124);
    expect(t.fiberG).toBe(25);
    expect(t.waterMl).toBe(2450);
    expect(t.method).toBe("ecuacion");
  });

  it("uses BMI-25 weight for protein with obesity", () => {
    expect(referenceWeightKg(man)).toBe(81);
    const t = computeTargets(man);
    expect(t.calories).toBe(2640);
    expect(t.proteinG).toBe(130);
  });

  it("never goes below the calorie floor or above the loss limit", () => {
    const small = { ...woman, age: 70, heightCm: 148, weightKg: 48 };
    const t = computeTargets(small);
    expect(t.calories).toBeGreaterThanOrEqual(1200);
    expect(-t.weeklyChangeKg).toBeLessThanOrEqual(0.48);
    const big = computeTargets({ ...man, weightKg: 200, activity: "muy_activo" });
    expect(-big.weeklyChangeKg).toBeLessThanOrEqual(1);
    expect(big.calories).toBeGreaterThan(big.tdee * 0.75 - 5);
  });

  it("macros add up to the calories", () => {
    for (const p of [woman, man, { ...woman, goal: "subir" as const }, { ...man, goal: "mantener" as const }]) {
      const t = computeTargets(p);
      expect(Math.abs(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9 - t.calories)).toBeLessThanOrEqual(10);
    }
  });

  it("gain is slow and maintain keeps maintenance", () => {
    expect(computeTargets({ ...woman, goal: "subir" }).weeklyChangeKg).toBeLessThanOrEqual(0.25);
    expect(computeTargets({ ...woman, goal: "mantener" }).calories).toBe(1705);
  });
});

describe("weight trend and adaptive expenditure", () => {
  const days = (n: number, start = "2026-10-01") =>
    Array.from({ length: n }, (_, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

  it("trend smooths daily noise", () => {
    const t = weightTrend([
      { date: "2026-10-01", kg: 70 },
      { date: "2026-10-02", kg: 71.5 },
      { date: "2026-10-03", kg: 69.8 },
    ]);
    expect(t[1].trend).toBeLessThan(71);
    expect(t.at(-1)!.trend).toBeGreaterThan(69.8);
  });

  it("slope in kg/day", () => {
    const w = days(15).map((date, i) => ({ date, kg: 80 - i * 0.05 }));
    expect(weightSlopePerDay(w)).toBeCloseTo(-0.05, 5);
  });

  it("needs enough data", () => {
    expect(adaptiveTdee(2000, days(5).map((date) => ({ date, kcal: 1800 })), [])).toBeNull();
  });

  it("finds a higher expenditure when weight drops faster than expected", () => {
    const intake = days(21).map((date) => ({ date, kcal: 1800 }));
    const weights = days(21).filter((_, i) => i % 3 === 0).map((date, i) => ({ date, kg: 80 - i * 0.15 })); // −0.05 kg/day
    const est = adaptiveTdee(2000, intake, weights)!;
    // observed = 1800 + 0.05 × 7700 = 2185 → blended toward it
    expect(est).toBeGreaterThan(2000);
    expect(est).toBeLessThan(2185);
  });

  it("never trusts data beyond ±25 % of the formula", () => {
    const intake = days(28).map((date) => ({ date, kcal: 600 })); // clearly under-logged
    const weights = days(28).filter((_, i) => i % 4 === 0).map((date) => ({ date, kg: 80 }));
    expect(adaptiveTdee(2000, intake, weights)!).toBeGreaterThanOrEqual(1500);
  });
});
