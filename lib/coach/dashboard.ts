/**
 * Everything the dashboard shows, in one plain object (easy to render, test and fake for the demo).
 */
import type { UserRow } from "@/lib/supabase/types";
import { getProgress, latestWeight, missingProfileFields, targetsOf, type Progress } from "./data";

export interface DashboardData {
  name: string | null;
  dateLabel: string;
  restricted: boolean;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; waterMl: number; steps: number; tdee: number; method: string; weeklyChangeKg: number } | null;
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  meals: Array<{ id: string; time: string; type: string; description: string; kcal: number | null; protein: number | null; photoUrl: string | null }>;
  days: Array<{ date: string; label: string; kcal: number; isToday: boolean }>;
  weights: Array<{ date: string; kg: number; trend: number }>;
  weightChange7d: number | null;
  goalWeightKg: number | null;
  goal: string | null;
  workouts: Array<{ label: string; kind: string; minutes: number | null }>;
  trainingDays: number | null;
  activeDays: boolean[]; // last 7 days, oldest first
  missingProfile: string[];
  personality: string | null;
}

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "");

export async function loadDashboard(user: UserRow): Promise<DashboardData> {
  const [p, weight] = await Promise.all([getProgress(user, { withPhotoUrls: true }), latestWeight(user.id)]);
  return toDashboard(user, p, weight);
}

export function toDashboard(user: UserRow, p: Progress, weight: number | null): DashboardData {
  const tz = user.timezone;
  const time = (iso: string) => new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  const activeSet = new Set<string>();
  p.days.forEach((d) => d.meals > 0 && activeSet.add(d.date));
  p.workoutsThisWeek.forEach((w) => activeSet.add(new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(w.performed_at))));
  p.weights.forEach((w) => activeSet.add(w.date));

  return {
    name: user.display_name,
    dateLabel: new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date()),
    restricted: user.restricted_mode,
    targets: targetsOf(user),
    totals: p.todayTotals,
    meals: p.todayMeals.map((m) => ({
      id: m.id,
      time: time(m.eaten_at),
      type: m.meal_type ?? "comida",
      description: m.description,
      kcal: m.calories,
      protein: m.protein_g === null ? null : Math.round(Number(m.protein_g)),
      photoUrl: m.photoUrl ?? null,
    })),
    days: p.days.map((d) => ({ date: d.date, label: dayLabel(d.date), kcal: d.kcal, isToday: d.date === p.today })),
    weights: p.weights.slice(-30),
    weightChange7d: p.weightChange7d,
    goalWeightKg: user.goal_weight_kg ? Number(user.goal_weight_kg) : null,
    goal: user.goal,
    workouts: p.workoutsThisWeek.map((w) => ({
      label: dayLabel(new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(w.performed_at))),
      kind: w.kind,
      minutes: w.duration_min,
    })),
    trainingDays: user.training_days,
    activeDays: p.days.map((d) => activeSet.has(d.date)),
    missingProfile: missingProfileFields(user, weight),
    personality: user.personality,
  };
}

/** 1–2 gentle, concrete suggestions computed from the data (no AI call, instant). */
export function insights(d: DashboardData, hour = new Date().getHours()): string[] {
  const tips: string[] = [];
  if (d.missingProfile.length) tips.push(`Para calcular tus metas, cuéntale a tu coach tu ${d.missingProfile.slice(0, 2).join(" y ")}.`);
  if (d.restricted) {
    tips.push("Sigue registrando cómo te sientes y lo que comes; tu médico o nutricionista puede usarlo para guiarte.");
    return tips.slice(0, 2);
  }
  if (d.targets) {
    const proteinLeft = d.targets.proteinG - d.totals.protein;
    if (hour >= 15 && proteinLeft > d.targets.proteinG * 0.4)
      tips.push(`Te faltan ~${proteinLeft} g de proteína: en la cena agrega pollo, huevo, atún, frijoles o queso fresco.`);
    if (d.totals.fiber > 0 && d.totals.fiber < d.targets.fiberG * 0.4 && hour >= 15)
      tips.push("Suma fibra: una porción de verduras, frijoles o una fruta entera.");
  }
  const trained = d.workouts.length;
  if (d.trainingDays && trained < d.trainingDays)
    tips.push(`Llevas ${trained} de ${d.trainingDays} entrenamientos esta semana. ¡Uno más y vas al día!`);
  if (d.activeDays.filter(Boolean).length >= 5) tips.push("¡5 o más días activos esta semana! La constancia es lo que más resultados da. 💚");
  if (!tips.length) tips.push("Manda una foto de tu siguiente comida y tu coach la registra por ti.");
  return tips.slice(0, 2);
}

/** Sample data for /panel/demo (marketing and testing). */
export function demoDashboard(): DashboardData {
  const today = new Date();
  const iso = (offset: number) => new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  const weights = Array.from({ length: 24 }, (_, i) => {
    const kg = 78.4 - i * 0.07 + Math.sin(i * 1.7) * 0.45;
    return { date: iso(23 - i), kg: Math.round(kg * 10) / 10, trend: 0 };
  });
  let trend = weights[0].kg;
  for (const w of weights) {
    trend = trend + 0.25 * (w.kg - trend);
    w.trend = Math.round(trend * 100) / 100;
  }
  const kcals = [1620, 1780, 1540, 1700, 1910, 1650, 1180];
  return {
    name: "Ana",
    dateLabel: new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(today),
    restricted: false,
    targets: { calories: 1700, proteinG: 112, carbsG: 175, fatG: 53, fiberG: 25, waterMl: 2450, steps: 8000, tdee: 2100, method: "adaptativo", weeklyChangeKg: -0.35 },
    totals: { kcal: 1180, protein: 71, carbs: 128, fat: 39, fiber: 17 },
    meals: [
      { id: "1", time: "08:10", type: "desayuno", description: "Huevos a la mexicana con 2 tortillas y papaya", kcal: 430, protein: 22, photoUrl: null },
      { id: "2", time: "14:30", type: "comida", description: "Pechuga asada, arroz, frijoles de olla y ensalada", kcal: 620, protein: 43, photoUrl: null },
      { id: "3", time: "17:45", type: "colacion", description: "Yogur natural con fresas", kcal: 130, protein: 6, photoUrl: null },
    ],
    days: kcals.map((kcal, i) => ({ date: iso(6 - i), label: dayLabel(iso(6 - i)), kcal, isToday: i === 6 })),
    weights,
    weightChange7d: -0.4,
    goalWeightKg: 72,
    goal: "bajar",
    workouts: [
      { label: dayLabel(iso(5)), kind: "Cuerpo completo en casa", minutes: 35 },
      { label: dayLabel(iso(3)), kind: "Caminata", minutes: 45 },
      { label: dayLabel(iso(1)), kind: "Cuerpo completo en casa", minutes: 40 },
    ],
    trainingDays: 3,
    activeDays: [true, true, false, true, true, true, true],
    missingProfile: [],
    personality: "balanceado",
  };
}
