/**
 * Habits and vices the coach tracks day by day (one value per user, day and metric).
 * Steps can arrive automatically from an iPhone Shortcut (Apple Health), from a screenshot
 * of the step counter (any phone) or from the chat.
 */
import { db } from "@/lib/supabase/server";
import { localDate } from "./data";

export type Metric = "pasos" | "agua_ml" | "sueno_h" | "alcohol_bebidas" | "cigarros" | "refrescos";
export type MetricSource = "chat" | "foto" | "atajo_ios" | "manual";

export const METRICS: Record<Metric, { label: string; unit: string; emoji: string; better: "more" | "less"; max: number }> = {
  pasos: { label: "Pasos", unit: "pasos", emoji: "👟", better: "more", max: 100000 },
  agua_ml: { label: "Agua", unit: "ml", emoji: "💧", better: "more", max: 10000 },
  sueno_h: { label: "Sueño", unit: "h", emoji: "😴", better: "more", max: 24 },
  alcohol_bebidas: { label: "Alcohol", unit: "bebidas", emoji: "🍺", better: "less", max: 50 },
  cigarros: { label: "Cigarros", unit: "cigarros", emoji: "🚭", better: "less", max: 100 },
  refrescos: { label: "Refrescos", unit: "vasos", emoji: "🥤", better: "less", max: 30 },
};
export const METRIC_NAMES = Object.keys(METRICS) as Metric[];

/** Parses "8,432", "8.432", "8432 pasos" or 8432 → 8432. Returns null if it isn't a sane number. */
export function parseSteps(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 && raw <= 100000 ? Math.round(raw) : null;
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || digits.length > 6) return null;
  const n = Number(digits);
  return n <= 100000 ? n : null;
}

/** Saves a value for a day: "set" replaces it (steps, sleep), "add" sums it (a glass of water, a beer). */
export async function saveMetric(
  userId: string,
  day: string,
  metric: Metric,
  value: number,
  mode: "set" | "add",
  source: MetricSource,
): Promise<number> {
  let final = value;
  if (mode === "add") {
    const { data } = await db().from("daily_metrics").select("value").eq("user_id", userId).eq("day", day).eq("metric", metric).maybeSingle();
    final = Number(data?.value ?? 0) + value;
  }
  final = Math.min(Math.max(0, Math.round(final * 10) / 10), METRICS[metric].max);
  const { error } = await db()
    .from("daily_metrics")
    .upsert({ user_id: userId, day, metric, value: final, source, updated_at: new Date().toISOString() }, { onConflict: "user_id,day,metric" });
  if (error) throw new Error(`metric save failed: ${error.message}`);
  return final;
}

export interface MetricDay {
  day: string;
  values: Partial<Record<Metric, number>>;
}

/** Last `days` days (oldest first) with whatever was recorded each day. */
export async function recentMetrics(userId: string, tz: string, days = 7): Promise<MetricDay[]> {
  const now = Date.now();
  const keys = Array.from({ length: days }, (_, i) => localDate(new Date(now - (days - 1 - i) * 86_400_000), tz));
  const { data } = await db().from("daily_metrics").select("day, metric, value").eq("user_id", userId).gte("day", keys[0]);
  return keys.map((day) => {
    const values: MetricDay["values"] = {};
    for (const r of data ?? []) if (r.day === day) values[r.metric as Metric] = Number(r.value);
    return { day, values };
  });
}

/** Resolves "hoy"/"ayer" to a date in the user's time zone. */
export function dayFor(which: "hoy" | "ayer" | undefined, tz: string): string {
  return localDate(new Date(Date.now() - (which === "ayer" ? 86_400_000 : 0)), tz);
}

/** "8,432 pasos · 💧 1.5 L · 😴 7 h" style summary for the AI context. */
export function describeDay(values: MetricDay["values"]): string {
  return (Object.entries(values) as Array<[Metric, number]>)
    .map(([m, v]) => `${METRICS[m].label}: ${m === "agua_ml" ? `${(v / 1000).toFixed(1)} L` : `${new Intl.NumberFormat("es-MX").format(v)} ${METRICS[m].unit}`}`)
    .join(" · ");
}
