/**
 * Tools the coach (Claude) can call during a conversation. The AI decides WHEN to use them;
 * the code validates every value, does all the math and enforces the safety rules.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { MIN_AGE } from "@/lib/safety/limits";
import { dayFor, recentMetrics, saveMetric } from "./habits";
import { getProgress, insertMeal, insertWeight, insertWorkout, lastMeal, latestWeight, missingProfileFields, recomputeTargets, targetsOf } from "./data";

export const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: "update_profile",
    description:
      "Save facts the user told you about themselves (only what they said; never guess). Call it as soon as you learn any of these. " +
      "When the profile becomes complete, the system calculates their daily targets and returns them so you can explain them.",
    input_schema: {
      type: "object",
      properties: {
        sex: { type: "string", enum: ["mujer", "hombre"] },
        height_cm: { type: "number", description: "Height in cm (convert from feet/inches if needed)" },
        weight_kg: { type: "number", description: "Current body weight in kg (convert from lb if needed)" },
        goal: { type: "string", enum: ["bajar", "mantener", "subir"], description: "bajar = lose fat, subir = gain muscle/weight" },
        goal_weight_kg: { type: "number" },
        activity_level: {
          type: "string",
          enum: ["sedentario", "ligero", "moderado", "activo", "muy_activo"],
          description: "sedentario: desk job and little walking; ligero: walks or 1-3 light workouts/week; moderado: 3-5 workouts/week; activo: 6-7 workouts or physical job; muy_activo: athlete or very physical job plus training",
        },
        training_days: { type: "integer", description: "Days per week they can train (0-7)" },
        equipment: { type: "string", enum: ["ninguno", "casa", "gimnasio", "parque"] },
        experience: { type: "string", enum: ["principiante", "intermedio", "avanzado"] },
        diet_style: { type: "string", description: "e.g. vegetariana, menos carbohidratos, sin lácteos, flexible" },
        food_dislikes: { type: "string", description: "Foods they dislike or are allergic to" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "log_meal",
    description:
      "Record something the user ate or drank (from a description or a photo of THEIR meal). Estimate realistic portions for their country. " +
      "Call it once per meal. Do not log photos that are not the user's food or meals they only plan to eat.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Short description in Spanish, e.g. '3 tacos de pastor con piña'" },
        meal_type: { type: "string", enum: ["desayuno", "comida", "cena", "colacion", "otro"] },
        calories: { type: "number", description: "Best estimate in kcal (middle of your range)" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        fiber_g: { type: "number" },
      },
      required: ["description", "meal_type", "calories", "protein_g", "carbs_g", "fat_g"],
      additionalProperties: false,
    },
  },
  {
    name: "correct_last_meal",
    description:
      "Fix or delete the most recently logged meal when the user corrects you (e.g. 'eran 2 tacos', 'no era mío', 'sin tortilla'). Send only the fields that change.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["update", "delete"] },
        description: { type: "string" },
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        fiber_g: { type: "number" },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "log_weight",
    description: "Record the user's body weight when they report it. Returns the smoothed trend (do not judge a single weigh-in).",
    input_schema: {
      type: "object",
      properties: { weight_kg: { type: "number" } },
      required: ["weight_kg"],
      additionalProperties: false,
    },
  },
  {
    name: "log_workout",
    description: "Record exercise the user did (gym, run, walk, sport, class...).",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", description: "e.g. 'pierna en gimnasio', 'caminata', 'fútbol'" },
        duration_min: { type: "integer" },
        intensity: { type: "string", enum: ["suave", "moderada", "intensa"] },
        notes: { type: "string", description: "Exercises, sets, loads or how they felt" },
      },
      required: ["kind"],
      additionalProperties: false,
    },
  },
  {
    name: "get_progress",
    description: "Get today's totals vs targets, the last 7 days, weight trend and workouts this week. Use it before giving a summary or check-in.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "log_habit",
    description:
      "Record a daily habit or vice: steps (pasos), water in ml (agua_ml), hours of sleep (sueno_h), alcoholic drinks (alcohol_bebidas), cigarettes (cigarros), sugary drinks/glasses of soda (refrescos). " +
      "Use mode 'add' for things counted during the day (a beer, a glass of water) and 'set' for totals (steps of the day, hours slept). " +
      "Also use it (pasos, set) when the user sends a screenshot of their step counter.",
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["pasos", "agua_ml", "sueno_h", "alcohol_bebidas", "cigarros", "refrescos"] },
        value: { type: "number" },
        mode: { type: "string", enum: ["set", "add"] },
        day: { type: "string", enum: ["hoy", "ayer"], description: "Default hoy. Sleep usually refers to last night → hoy." },
      },
      required: ["metric", "value", "mode"],
      additionalProperties: false,
    },
  },
  {
    name: "set_focus_habits",
    description:
      "Save the 1–3 habits the user agreed to work on (e.g. drink more water, sleep 7 h, fewer sodas, quit smoking). Only after they agree.",
    input_schema: {
      type: "object",
      properties: {
        habits: { type: "array", items: { type: "string", enum: ["pasos", "agua_ml", "sueno_h", "alcohol_bebidas", "cigarros", "refrescos"] }, maxItems: 3 },
      },
      required: ["habits"],
      additionalProperties: false,
    },
  },
  {
    name: "save_coach_note",
    description:
      "Remember something important for future conversations: injuries, schedule, preferences, what motivates them, a small commitment they made. One short sentence.",
    input_schema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
      additionalProperties: false,
    },
  },
];

export interface ToolContext {
  user: UserRow;
  /** Set when the current message is a photo: meals logged now are linked to it. */
  photoId?: string | null;
}

const pos = (max: number) => z.number().finite().min(0).max(max);

const schemas = {
  update_profile: z
    .object({
      sex: z.enum(["mujer", "hombre"]),
      height_cm: z.number().min(120).max(230),
      weight_kg: z.number().min(30).max(300),
      goal: z.enum(["bajar", "mantener", "subir"]),
      goal_weight_kg: z.number().min(30).max(300),
      activity_level: z.enum(["sedentario", "ligero", "moderado", "activo", "muy_activo"]),
      training_days: z.number().int().min(0).max(7),
      equipment: z.enum(["ninguno", "casa", "gimnasio", "parque"]),
      experience: z.enum(["principiante", "intermedio", "avanzado"]),
      diet_style: z.string().max(120),
      food_dislikes: z.string().max(300),
    })
    .partial(),
  log_meal: z.object({
    description: z.string().min(1).max(300),
    meal_type: z.enum(["desayuno", "comida", "cena", "colacion", "otro"]),
    calories: pos(5000),
    protein_g: pos(400),
    carbs_g: pos(800),
    fat_g: pos(400),
    fiber_g: pos(150).optional(),
  }),
  correct_last_meal: z.object({
    action: z.enum(["update", "delete"]),
    description: z.string().max(300).optional(),
    calories: pos(5000).optional(),
    protein_g: pos(400).optional(),
    carbs_g: pos(800).optional(),
    fat_g: pos(400).optional(),
    fiber_g: pos(150).optional(),
  }),
  log_weight: z.object({ weight_kg: z.number().min(30).max(300) }),
  log_workout: z.object({
    kind: z.string().min(1).max(120),
    duration_min: z.number().int().min(1).max(600).optional(),
    intensity: z.enum(["suave", "moderada", "intensa"]).optional(),
    notes: z.string().max(500).optional(),
  }),
  get_progress: z.object({}).passthrough(),
  save_coach_note: z.object({ note: z.string().min(1).max(300) }),
  log_habit: z.object({
    metric: z.enum(["pasos", "agua_ml", "sueno_h", "alcohol_bebidas", "cigarros", "refrescos"]),
    value: z.number().finite().min(0).max(100000),
    mode: z.enum(["set", "add"]),
    day: z.enum(["hoy", "ayer"]).optional(),
  }),
  set_focus_habits: z.object({
    habits: z.array(z.enum(["pasos", "agua_ml", "sueno_h", "alcohol_bebidas", "cigarros", "refrescos"])).max(3),
  }),
};

type ToolName = keyof typeof schemas;

/** Runs one tool call. Always returns a short JSON string for the model (errors included). */
export async function runTool(ctx: ToolContext, name: string, input: unknown): Promise<{ result: string; isError: boolean }> {
  if (!(name in schemas)) return { result: JSON.stringify({ error: `unknown tool ${name}` }), isError: true };
  const parsed = schemas[name as ToolName].safeParse(input);
  if (!parsed.success) {
    return { result: JSON.stringify({ error: "invalid input", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }), isError: true };
  }
  try {
    const out = await handlers[name as ToolName](ctx, parsed.data as never);
    return { result: JSON.stringify(out), isError: false };
  } catch (err) {
    console.error(`tool ${name} failed`, err);
    return { result: JSON.stringify({ error: "the tool failed, tell the user you could not save it this time" }), isError: true };
  }
}

/** Numbers are hidden in "general guidance only" mode. */
function safeTargets(user: UserRow) {
  return user.restricted_mode ? { note: "general guidance only: do not mention calorie or macro numbers" } : targetsOf(user);
}

const handlers: { [K in ToolName]: (ctx: ToolContext, input: z.infer<(typeof schemas)[K]>) => Promise<unknown> } = {
  async update_profile(ctx, input) {
    const { weight_kg, ...fields } = input;
    if (Object.keys(fields).length) {
      const { data, error } = await db().from("users").update(fields).eq("id", ctx.user.id).select("*").single();
      if (error) throw new Error(error.message);
      ctx.user = data as UserRow;
    }
    if (weight_kg) await insertWeight(ctx.user.id, weight_kg);

    const weight = weight_kg ?? (await latestWeight(ctx.user.id));
    const missing = missingProfileFields(ctx.user, weight);
    if (ctx.user.age && ctx.user.age < MIN_AGE) return { saved: true };
    if (missing.length) return { saved: true, still_missing: missing };

    const t = await recomputeTargets(ctx.user);
    if (!t) return { saved: true, targets: safeTargets(ctx.user) };
    const fresh = await db().from("users").select("*").eq("id", ctx.user.id).single();
    if (fresh.data) ctx.user = fresh.data as UserRow;
    return {
      saved: true,
      targets_calculated: {
        calories: t.calories,
        protein_g: t.proteinG,
        carbs_g: t.carbsG,
        fat_g: t.fatG,
        fiber_g: t.fiberG,
        water_ml: t.waterMl,
        steps: t.steps,
        maintenance_kcal: t.tdee,
        expected_weekly_change_kg: t.weeklyChangeKg,
        how: "Mifflin-St Jeor x activity factor; adjusts automatically with their real weight and food logs after ~2 weeks",
      },
    };
  },

  async log_meal(ctx, input) {
    const fromPhoto = Boolean(ctx.photoId);
    await insertMeal(ctx.user.id, {
      description: input.description,
      meal_type: input.meal_type,
      calories: Math.round(input.calories),
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      fiber_g: input.fiber_g ?? null,
      source: fromPhoto ? "photo" : "text",
      is_estimate: true,
      photo_id: ctx.photoId ?? null,
    });
    ctx.photoId = null; // one meal per photo
    const p = await getProgress(ctx.user);
    const t = safeTargets(ctx.user);
    if (ctx.user.restricted_mode) return { saved: true, meals_today: p.todayMeals.length, ...t };
    return { saved: true, today_total: p.todayTotals, targets: t, meals_today: p.todayMeals.length };
  },

  async correct_last_meal(ctx, input) {
    const meal = await lastMeal(ctx.user.id);
    if (!meal) return { error: "there is no logged meal to correct" };
    if (input.action === "delete") {
      await db().from("meals").delete().eq("id", meal.id);
      return { deleted: meal.description };
    }
    const { action: _a, ...changes } = input;
    if (changes.calories !== undefined) changes.calories = Math.round(changes.calories);
    await db().from("meals").update(changes).eq("id", meal.id);
    const p = await getProgress(ctx.user);
    return { updated: true, today_total: ctx.user.restricted_mode ? undefined : p.todayTotals };
  },

  async log_weight(ctx, input) {
    await insertWeight(ctx.user.id, input.weight_kg);
    const p = await getProgress(ctx.user);
    // Re-check targets weekly with the new data.
    const stale = !ctx.user.targets_updated_at || Date.now() - Date.parse(ctx.user.targets_updated_at) > 6 * 86_400_000;
    const t = stale ? await recomputeTargets(ctx.user) : null;
    return {
      saved: true,
      trend_kg: p.weights.at(-1)?.trend ?? input.weight_kg,
      trend_change_7d_kg: p.weightChange7d,
      weigh_ins_last_60d: p.weights.length,
      targets_recalculated: t && !ctx.user.restricted_mode ? { calories: t.calories, protein_g: t.proteinG, method: t.method } : undefined,
      reminder: "single weigh-ins fluctuate with water and salt; talk about the trend",
    };
  },

  async log_workout(ctx, input) {
    await insertWorkout(ctx.user.id, {
      kind: input.kind,
      duration_min: input.duration_min ?? null,
      intensity: input.intensity ?? null,
      notes: input.notes ?? null,
      est_calories: null,
    });
    const p = await getProgress(ctx.user);
    return { saved: true, workouts_last_7_days: p.workoutsThisWeek.length, planned_days_per_week: ctx.user.training_days };
  },

  async get_progress(ctx) {
    const p = await getProgress(ctx.user);
    const base = {
      today: p.today,
      meals_today: p.todayMeals.map((m) => m.description),
      workouts_last_7_days: p.workoutsThisWeek.map((w) => `${w.kind}${w.duration_min ? ` ${w.duration_min} min` : ""}`),
      active_days_last_7: p.activeDaysThisWeek,
      weight_trend_kg: p.weights.at(-1)?.trend ?? null,
      weight_change_7d_kg: p.weightChange7d,
    };
    if (ctx.user.restricted_mode) return { ...base, note: "general guidance only: no calorie or macro numbers" };
    return { ...base, today_total: p.todayTotals, last_7_days_kcal: p.days.map((d) => ({ date: d.date, kcal: d.kcal, protein: d.protein })), targets: targetsOf(ctx.user) };
  },

  async log_habit(ctx, input) {
    const fromPhoto = Boolean(ctx.photoId) && input.metric === "pasos";
    if (fromPhoto) ctx.photoId = null; // a step screenshot is not a meal
    const day = dayFor(input.day, ctx.user.timezone);
    const value = await saveMetric(ctx.user.id, day, input.metric, input.value, input.mode, fromPhoto ? "foto" : "chat");
    const week = await recentMetrics(ctx.user.id, ctx.user.timezone, 7);
    const series = week.map((d) => d.values[input.metric] ?? null);
    return {
      saved: true,
      day,
      total_that_day: value,
      last_7_days: series,
      steps_target: input.metric === "pasos" ? ctx.user.steps_target ?? 8000 : undefined,
    };
  },

  async set_focus_habits(ctx, input) {
    await db().from("users").update({ focus_habits: input.habits }).eq("id", ctx.user.id);
    ctx.user = { ...ctx.user, focus_habits: input.habits };
    return { saved: true, focus_habits: input.habits };
  },

  async save_coach_note(ctx, input) {
    const notes = `${ctx.user.coach_notes ? `${ctx.user.coach_notes}\n` : ""}- ${input.note.trim()}`.slice(-1900);
    await db().from("users").update({ coach_notes: notes }).eq("id", ctx.user.id);
    ctx.user = { ...ctx.user, coach_notes: notes };
    return { saved: true };
  },
};
