/**
 * Hard safety limits. These numbers are enforced in code (and in the database),
 * not just suggested to the AI. Confirmed by the product owner; review with a
 * nutrition professional before changing them.
 */

export const MIN_DAILY_KCAL = { mujer: 1200, hombre: 1500 } as const;
/** When we don't know the user's sex yet, use the lower floor for detection and the higher one is never undercut. */
export const MIN_DAILY_KCAL_UNKNOWN = 1200;

/** Max weekly loss: 1% of body weight, and never more than 1 kg. */
export const MAX_WEEKLY_LOSS_PCT = 0.01;
export const MAX_WEEKLY_LOSS_KG = 1.0;

export const MIN_AGE = 18;

export type Sex = "mujer" | "hombre";

export function minDailyCalories(sex: Sex | null | undefined): number {
  return sex ? MIN_DAILY_KCAL[sex] : MIN_DAILY_KCAL_UNKNOWN;
}

export function maxWeeklyLossKg(weightKg: number): number {
  const byPct = Math.round(weightKg * MAX_WEEKLY_LOSS_PCT * 100) / 100;
  return Math.min(byPct, MAX_WEEKLY_LOSS_KG);
}

/** Use this whenever the app sets a calorie target (milestone 2): never below the floor. */
export function clampCalorieTarget(targetKcal: number, sex: Sex): number {
  return Math.max(Math.round(targetKcal), MIN_DAILY_KCAL[sex]);
}

/** Use this whenever the app sets a weekly loss goal: never faster than the limit. */
export function clampWeeklyLoss(requestedKg: number, weightKg: number): number {
  return Math.min(Math.max(requestedKg, 0), maxWeeklyLossKg(weightKg));
}
