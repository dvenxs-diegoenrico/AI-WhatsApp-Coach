import { describe, expect, it } from "vitest";
import { screenMessage } from "@/lib/safety/screening";
import { filterReply, labelAsEstimate } from "@/lib/safety/output-filter";
import { clampCalorieTarget, clampWeeklyLoss, maxWeeklyLossKg, minDailyCalories } from "@/lib/safety/limits";

describe("limits", () => {
  it("calorie floors", () => {
    expect(minDailyCalories("mujer")).toBe(1200);
    expect(minDailyCalories("hombre")).toBe(1500);
    expect(clampCalorieTarget(900, "mujer")).toBe(1200);
    expect(clampCalorieTarget(1300, "hombre")).toBe(1500);
    expect(clampCalorieTarget(1800, "mujer")).toBe(1800);
  });
  it("weekly loss is min(1% body weight, 1 kg)", () => {
    expect(maxWeeklyLossKg(70)).toBe(0.7);
    expect(maxWeeklyLossKg(130)).toBe(1);
    expect(clampWeeklyLoss(2, 80)).toBe(0.8);
  });
});

describe("screening", () => {
  it.each([
    ["Estoy embarazada de 3 meses", "pregnancy"],
    ["tengo diabetes tipo 2", "diabetes"],
    ["Me inyecto insulina", "diabetes"],
    ["tengo insuficiencia renal", "kidney"],
    ["me dio un infarto el año pasado", "heart"],
    ["tengo problemas del corazón", "heart"],
    ["a veces me provoco el vómito después de comer", "eating_disorder"],
    ["tomo laxantes para bajar", "eating_disorder"],
  ])("%s → %s", (text, flag) => expect(screenMessage(text).flags).toContain(flag));

  it("normal messages have no flags", () => {
    expect(screenMessage("quiero bajar de peso y comer más verduras").flags).toEqual([]);
    expect(screenMessage("¿cuántas calorías tiene un taco al pastor?").flags).toEqual([]);
  });

  it("detects crisis language", () => {
    expect(screenMessage("ya no quiero vivir").crisis).toBe(true);
    expect(screenMessage("quiero vivir mejor").crisis).toBe(false);
  });
});

describe("output filter", () => {
  it("rewrites self-identification as a professional", () => {
    const r = filterReply("Como nutrióloga te recomiendo más agua. Soy tu nutricionista.");
    expect(r.text).not.toMatch(/nutri[oó]log|nutricionista/i);
    expect(r.text).toContain("coach de nutrición con IA");
    expect(r.safe).toBe(true);
  });

  it("allows recommending a nutriólogo", () => {
    expect(filterReply("Te recomiendo consultar a un nutriólogo.").text).toContain("nutriólogo");
  });

  it.each([
    "Te sugiero comer 800 kcal al día.",
    "Una dieta de 1000 calorías te ayudará.",
    "Puedes consumir 900-1100 calorías diarias.",
    "Podrías bajar 2 kg por semana.",
    "Es posible bajar 1 a 1.5 kilos a la semana.",
    "Puedes bajar 10 kilos en un mes.",
    "Haz un ayuno de 3 días.",
    "Prueba una dieta de jugos.",
  ])("blocks unsafe advice: %s", (text) => expect(filterReply(text).safe).toBe(false));

  it("uses the male floor when known", () => {
    expect(filterReply("Come 1,300 kcal al día.", { sex: "hombre" }).safe).toBe(false);
    expect(filterReply("Come 1,300 kcal al día.", { sex: "mujer" }).safe).toBe(true);
  });

  it.each([
    "Este plato tiene unas 650 kcal.",
    "Tu meta podría ser 1,600 kcal al día.",
    "Lo sano es bajar entre 0.5 y 1 kg por semana.",
    "Unos tacos de 450 calorías están bien para la comida.",
    "Bajar 4 kilos en un mes es un buen ritmo.",
  ])("allows safe advice: %s", (text) => expect(filterReply(text).safe).toBe(true));

  it("labels photo estimates", () => {
    const out = labelAsEstimate("Unas 600 kcal", "HEADER", "FOOTER");
    expect(out.startsWith("HEADER")).toBe(true);
    expect(out.endsWith("FOOTER")).toBe(true);
  });
});
