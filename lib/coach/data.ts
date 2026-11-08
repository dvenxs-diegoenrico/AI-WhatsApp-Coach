/**
 * Reads and writes the coach's data (meals, weights, workouts, targets).
 * Used by the AI tools (WhatsApp) and by the web dashboard, so both always agree.
 */
import { db, PHOTOS_BUCKET } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { adaptiveTdee, computeTargets, formulaTdee, weightTrend, type Profile, type Targets } from "./nutrition";

export type MealType = "desayuno" | "comida" | "cena" | "colacion" | "otro";

export interface MealRow {
  id: string;
  eaten_at: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  meal_type: MealType | null;
  source: "text" | "photo" | "manual";
  is_estimate: boolean;
  photo_id: string | null;
}

/** "YYYY-MM-DD" of a moment in the user's time zone. */
export function localDate(at: Date | string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

// ---------------------------------------------------------------------------
// Profile and targets
// ---------------------------------------------------------------------------

export const PROFILE_FIELDS = ["sex", "age", "height_cm", "weight", "goal", "activity_level"] as const;

/** Latest weight in kg, or null. */
export async function latestWeight(userId: string): Promise<number | null> {
  const { data } = await db().from("weights").select("weight_kg").eq("user_id", userId).order("measured_at", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.weight_kg) : null;
}

export function toProfile(user: UserRow, weightKg: number | null): Profile | null {
  if (!user.sex || !user.age || !user.height_cm || !weightKg || !user.goal || !user.activity_level) return null;
  return { sex: user.sex, age: user.age, heightCm: Number(user.height_cm), weightKg, goal: user.goal, activity: user.activity_level };
}

export function missingProfileFields(user: UserRow, weightKg: number | null): string[] {
  const missing: string[] = [];
  if (!user.sex) missing.push("sexo");
  if (!user.height_cm) missing.push("estatura");
  if (!weightKg) missing.push("peso actual");
  if (!user.goal) missing.push("objetivo (bajar, mantener o subir)");
  if (!user.activity_level) missing.push("nivel de actividad");
  return missing;
}

/**
 * Recomputes and saves daily targets. Uses the user's own intake and weight data when there
 * is enough (adaptive), otherwise the equation. Restricted users never get numeric targets.
 */
export async function recomputeTargets(user: UserRow): Promise<Targets | null> {
  if (user.restricted_mode) return null;
  const weight = await latestWeight(user.id);
  const profile = toProfile(user, weight);
  if (!profile) return null;

  const since = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const [{ data: meals }, { data: weights }] = await Promise.all([
    db().from("meals").select("eaten_at, calories").eq("user_id", user.id).gte("eaten_at", since),
    db().from("weights").select("measured_at, weight_kg").eq("user_id", user.id).gte("measured_at", since).order("measured_at"),
  ]);

  // Only "complete" days count for intake (≥ 800 kcal logged), the rest are probably partial logs.
  const byDay = new Map<string, number>();
  for (const m of meals ?? []) {
    const d = localDate(m.eaten_at as string, user.timezone);
    byDay.set(d, (byDay.get(d) ?? 0) + num(m.calories));
  }
  const today = localDate(new Date(), user.timezone);
  const intake = [...byDay.entries()]
    .filter(([d, kcal]) => d !== today && kcal >= 800)
    .map(([date, kcal]) => ({ date, kcal }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weightPoints = (weights ?? []).map((w) => ({ date: localDate(w.measured_at as string, user.timezone), kg: Number(w.weight_kg) }));

  const adaptive = adaptiveTdee(formulaTdee(profile), intake, weightPoints);
  const t = computeTargets(profile, adaptive);

  const { error } = await db()
    .from("users")
    .update({
      tdee_estimate: t.tdee,
      daily_calorie_target: t.calories,
      protein_target_g: t.proteinG,
      carbs_target_g: t.carbsG,
      fat_target_g: t.fatG,
      fiber_target_g: t.fiberG,
      water_target_ml: t.waterMl,
      steps_target: t.steps,
      weekly_loss_target_kg: t.weeklyChangeKg < 0 ? -t.weeklyChangeKg : 0,
      targets_method: t.method,
      targets_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(`targets update failed: ${error.message}`);
  return t;
}

export function targetsOf(user: UserRow) {
  if (user.restricted_mode || !user.daily_calorie_target) return null;
  return {
    calories: user.daily_calorie_target,
    proteinG: user.protein_target_g ?? 0,
    carbsG: user.carbs_target_g ?? 0,
    fatG: user.fat_target_g ?? 0,
    fiberG: user.fiber_target_g ?? 0,
    waterMl: user.water_target_ml ?? 0,
    steps: user.steps_target ?? 0,
    tdee: user.tdee_estimate ?? 0,
    method: user.targets_method ?? "ecuacion",
    weeklyChangeKg: user.goal === "bajar" ? -Number(user.weekly_loss_target_kg ?? 0) : 0,
  };
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export async function insertMeal(userId: string, m: Omit<MealRow, "id" | "eaten_at" | "photo_id"> & { photo_id?: string | null }) {
  const { data, error } = await db()
    .from("meals")
    .insert({ user_id: userId, ...m })
    .select("*")
    .single();
  if (error) throw new Error(`meal insert failed: ${error.message}`);
  return data as MealRow;
}

export async function lastMeal(userId: string): Promise<MealRow | null> {
  const { data } = await db().from("meals").select("*").eq("user_id", userId).order("eaten_at", { ascending: false }).limit(1).maybeSingle();
  return (data as MealRow | null) ?? null;
}

export async function insertWeight(userId: string, kg: number) {
  const { error } = await db().from("weights").insert({ user_id: userId, weight_kg: kg });
  if (error) throw new Error(`weight insert failed: ${error.message}`);
}

export async function insertWorkout(userId: string, w: { kind: string; duration_min: number | null; intensity: string | null; notes: string | null; est_calories: number | null }) {
  const { error } = await db().from("workouts").insert({ user_id: userId, ...w });
  if (error) throw new Error(`workout insert failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Progress summary (tools + dashboard)
// ---------------------------------------------------------------------------

export interface Progress {
  today: string;
  todayMeals: Array<MealRow & { photoUrl?: string | null }>;
  todayTotals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  days: Array<{ date: string; kcal: number; protein: number; meals: number }>; // last 7 days, oldest first
  weights: Array<{ date: string; kg: number; trend: number }>; // last 60 days
  weightChange7d: number | null; // trend change over 7 days
  workoutsThisWeek: Array<{ performed_at: string; kind: string; duration_min: number | null; intensity: string | null }>;
  activeDaysThisWeek: number; // days with any log in the last 7
}

export async function getProgress(user: UserRow, opts: { withPhotoUrls?: boolean } = {}): Promise<Progress> {
  const tz = user.timezone;
  const now = new Date();
  const today = localDate(now, tz);
  const since7 = new Date(now.getTime() - 8 * 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();

  const [{ data: meals }, { data: weights }, { data: workouts }] = await Promise.all([
    db().from("meals").select("*").eq("user_id", user.id).gte("eaten_at", since7).order("eaten_at"),
    db().from("weights").select("measured_at, weight_kg").eq("user_id", user.id).gte("measured_at", since60).order("measured_at"),
    db().from("workouts").select("performed_at, kind, duration_min, intensity").eq("user_id", user.id).gte("performed_at", since7).order("performed_at"),
  ]);

  const dayKeys = Array.from({ length: 7 }, (_, i) => localDate(new Date(now.getTime() - (6 - i) * 86_400_000), tz));
  const days = dayKeys.map((date) => ({ date, kcal: 0, protein: 0, meals: 0 }));
  const todayMeals: Progress["todayMeals"] = [];
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const active = new Set<string>();

  for (const m of (meals ?? []) as MealRow[]) {
    const d = localDate(m.eaten_at, tz);
    const slot = days.find((x) => x.date === d);
    if (slot) {
      slot.kcal += num(m.calories);
      slot.protein += num(m.protein_g);
      slot.meals += 1;
      active.add(d);
    }
    if (d === today) {
      todayMeals.push(m);
      totals.kcal += num(m.calories);
      totals.protein += num(m.protein_g);
      totals.carbs += num(m.carbs_g);
      totals.fat += num(m.fat_g);
      totals.fiber += num(m.fiber_g);
    }
  }

  const weekWorkouts = (workouts ?? []).filter((w) => dayKeys.includes(localDate(w.performed_at as string, tz)));
  weekWorkouts.forEach((w) => active.add(localDate(w.performed_at as string, tz)));

  // One weight per day (the last one), then the smoothed trend.
  const perDay = new Map<string, number>();
  for (const w of weights ?? []) perDay.set(localDate(w.measured_at as string, tz), Number(w.weight_kg));
  perDay.forEach((_, d) => dayKeys.includes(d) && active.add(d));
  const trend = weightTrend([...perDay.entries()].map(([date, kg]) => ({ date, kg })));
  let weightChange7d: number | null = null;
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const weekAgo = [...trend].reverse().find((p) => p.date <= dayKeys[0]) ?? trend[0];
    if (weekAgo !== last) weightChange7d = Math.round((last.trend - weekAgo.trend) * 10) / 10;
  }

  if (opts.withPhotoUrls) {
    const photoIds = todayMeals.map((m) => m.photo_id).filter((x): x is string => Boolean(x));
    if (photoIds.length) {
      const { data: photos } = await db().from("photos").select("id, storage_path").in("id", photoIds);
      const paths = (photos ?? []).map((p) => p.storage_path as string);
      const { data: signed } = await db().storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
      for (const m of todayMeals) {
        const path = photos?.find((p) => p.id === m.photo_id)?.storage_path;
        m.photoUrl = signed?.find((s) => s.path === path)?.signedUrl ?? null;
      }
    }
  }

  const round = (n: number) => Math.round(n);
  return {
    today,
    todayMeals,
    todayTotals: { kcal: round(totals.kcal), protein: round(totals.protein), carbs: round(totals.carbs), fat: round(totals.fat), fiber: round(totals.fiber) },
    days: days.map((d) => ({ ...d, kcal: round(d.kcal), protein: round(d.protein) })),
    weights: trend,
    weightChange7d,
    workoutsThisWeek: weekWorkouts as Progress["workoutsThisWeek"],
    activeDaysThisWeek: active.size,
  };
}
