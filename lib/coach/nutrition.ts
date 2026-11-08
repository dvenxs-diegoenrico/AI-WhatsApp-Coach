/**
 * Nutrition engine: every number the coach gives about energy and macros comes from here,
 * never from the AI. Evidence and choices are explained in docs/COACH_KNOWLEDGE.md.
 */
import { MAX_WEEKLY_LOSS_KG, clampCalorieTarget, maxWeeklyLossKg, type Sex } from "@/lib/safety/limits";

export type Goal = "bajar" | "mantener" | "subir";
export type ActivityLevel = "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2, // desk job, little walking
  ligero: 1.375, // 1–3 light workouts or lots of walking
  moderado: 1.55, // 3–5 workouts per week
  activo: 1.725, // 6–7 workouts or physical job
  muy_activo: 1.9, // athletes, very physical job + training
};

export const KCAL_PER_KG = 7700;
/** Default loss pace: 0.5 % of body weight per week (moderate, sustainable). */
export const DEFAULT_LOSS_PCT = 0.005;
/** Never cut more than 25 % below maintenance. */
export const MAX_DEFICIT_PCT = 0.25;

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: ActivityLevel;
}

export interface Targets {
  tdee: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  waterMl: number;
  steps: number;
  /** Expected change per week (negative = loss) */
  weeklyChangeKg: number;
  method: "ecuacion" | "adaptativo";
}

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function bmrMifflin(p: Pick<Profile, "sex" | "age" | "heightCm" | "weightKg">): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "hombre" ? 5 : -161);
}

export function formulaTdee(p: Profile): number {
  return Math.round(bmrMifflin(p) * ACTIVITY_FACTORS[p.activity]);
}

/** Weight used for protein targets: with BMI > 30, the weight at BMI 25 (avoids inflated targets). */
export function referenceWeightKg(p: Pick<Profile, "heightCm" | "weightKg">): number {
  const h = p.heightCm / 100;
  const bmi = p.weightKg / (h * h);
  return bmi > 30 ? Math.round(25 * h * h * 10) / 10 : p.weightKg;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Daily targets. `tdeeOverride` = adaptive expenditure from the user's own data. */
export function computeTargets(p: Profile, tdeeOverride?: number | null): Targets {
  const tdee = Math.round(tdeeOverride ?? formulaTdee(p));
  let calories = tdee;
  let weeklyChangeKg = 0;

  if (p.goal === "bajar") {
    const weeklyLoss = Math.min(p.weightKg * DEFAULT_LOSS_PCT, maxWeeklyLossKg(p.weightKg), MAX_WEEKLY_LOSS_KG);
    const deficit = Math.min((weeklyLoss * KCAL_PER_KG) / 7, tdee * MAX_DEFICIT_PCT);
    calories = clampCalorieTarget(tdee - deficit, p.sex);
    weeklyChangeKg = -Math.round((((tdee - calories) * 7) / KCAL_PER_KG) * 100) / 100;
  } else if (p.goal === "subir") {
    const surplus = Math.min(tdee * 0.1, 350); // slow gain = more muscle, less fat
    calories = tdee + surplus;
    weeklyChangeKg = Math.round(((surplus * 7) / KCAL_PER_KG) * 100) / 100;
  }
  calories = Math.max(round5(calories), clampCalorieTarget(0, p.sex));

  const ref = referenceWeightKg(p);
  const proteinG = Math.round(Math.min(ref * (p.goal === "mantener" ? 1.4 : 1.6), ref * 2.2));
  let fatG = Math.round(Math.max((calories * 0.28) / 9, ref * 0.6));
  let carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  if (carbsG < 50) {
    // very low calorie targets: keep protein, trim fat down to its floor first
    fatG = Math.round(Math.max(ref * 0.5, (calories - proteinG * 4 - 50 * 4) / 9));
    carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  }

  return {
    tdee,
    calories,
    proteinG,
    fatG,
    carbsG,
    fiberG: Math.max(25, Math.round((calories / 1000) * 14)),
    waterMl: Math.min(3500, Math.max(1500, round5(p.weightKg * 35))),
    steps: p.activity === "sedentario" ? 7000 : 8000,
    weeklyChangeKg,
    method: tdeeOverride ? "adaptativo" : "ecuacion",
  };
}

// ---------------------------------------------------------------------------
// Weight trend and adaptive expenditure
// ---------------------------------------------------------------------------

export interface WeightPoint {
  date: string; // YYYY-MM-DD
  kg: number;
}
export interface IntakeDay {
  date: string; // YYYY-MM-DD
  kcal: number;
}

const DAY_MS = 86_400_000;
const dayIndex = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY_MS);

/** Exponential moving average of daily weights (smooths water/salt noise). */
export function weightTrend(points: WeightPoint[], alpha = 0.25): Array<WeightPoint & { trend: number }> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let trend: number | null = null;
  return sorted.map((p) => {
    trend = trend === null ? p.kg : trend + alpha * (p.kg - trend);
    return { ...p, trend: Math.round(trend * 100) / 100 };
  });
}

/** Least-squares slope of weight over time, in kg per day. */
export function weightSlopePerDay(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => dayIndex(p.date));
  const ys = points.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? null : num / den;
}

/**
 * Expenditure from the user's own data (like adaptive apps):
 * TDEE ≈ average intake − (weight slope × 7,700 kcal/kg).
 * Needs ≥14 days span, ≥10 logged days and ≥4 weigh-ins over ≥10 days.
 * Blended with the formula (more weight the more data) and kept within ±25 % of it,
 * because under-logging is common and would otherwise push targets too low.
 */
export function adaptiveTdee(formula: number, intake: IntakeDay[], weights: WeightPoint[]): number | null {
  if (intake.length < 10 || weights.length < 4) return null;
  const intakeSpan = dayIndex(intake[intake.length - 1].date) - dayIndex(intake[0].date);
  const weightDays = weights.map((w) => dayIndex(w.date));
  const weightSpan = Math.max(...weightDays) - Math.min(...weightDays);
  if (intakeSpan < 13 || weightSpan < 10) return null;

  const slope = weightSlopePerDay(weights);
  if (slope === null) return null;
  const avgIntake = intake.reduce((s, d) => s + d.kcal, 0) / intake.length;
  const observed = avgIntake - slope * KCAL_PER_KG;
  const bounded = Math.min(formula * 1.25, Math.max(formula * 0.75, observed));
  const weight = Math.min(0.8, intake.length / 28); // up to 80 % trust after ~4 weeks of logging
  return Math.round(formula * (1 - weight) + bounded * weight);
}
