import { normalize } from "./normalize";
import { MAX_WEEKLY_LOSS_KG, minDailyCalories, type Sex } from "./limits";

/**
 * Checks every AI reply before it is sent. Code, not the prompt, has the last word:
 *  - never present the assistant as a nutriólogo / médico
 *  - never suggest a daily intake below the calorie floor
 *  - never suggest losing more than 1 kg per week
 *  - never suggest crash diets
 */

const SELF_AS_PROFESSIONAL =
  /\b(soy|como) (tu |un |una )?(nutri[oó]log[oa]|nutricionista|dietista|m[eé]dic[oa]|doctor(a)?)\b/gi;

const NUM = String.raw`(\d{1,2}[.,]\d{3}|\d+(?:[.,]\d+)?)`;
const DAILY_KCAL = new RegExp(String.raw`${NUM}(?:\s*(?:-|a|y)\s*${NUM})?\s*(?:kcal|calorias|cal)\b`, "g");
// "daily" must sit right next to the number, so a single meal's calories ("este plato tiene 650 kcal") don't count.
const DAY_AFTER = /^.{0,15}(al dia|por dia|diari|cada dia|a diario)/;
const DAY_BEFORE = /(dieta de|consum\w* (solo )?|comer solo|come solo|limit\w* a|no pases de|maximo de?)\s*$/;
// Weight units: kg, or pounds (common for Spanish speakers in the US).
const UNIT = String.raw`(kg|kilos?|kilogramos?|lbs?|libras?)`;
const WEEKLY_LOSS = new RegExp(
  String.raw`${NUM}(?:\s*(?:-|a|y)\s*${NUM})?\s*${UNIT}\s*(?:a la semana|por semana|cada semana|semanal|en una semana|en 1 semana)`,
  "g",
);
const LOSS_OVER_TIME = new RegExp(
  String.raw`${NUM}\s*${UNIT}\s*en\s*(\d+|un|una|dos|tres|cuatro)\s*(dias?|semanas?|mes(?:es)?)`,
  "g",
);
const CRASH_DIET = [
  /\bayun(o|ar|es)\s+(de\s+)?(\d+|dos|tres|varios)\s+dias/,
  /\bdieta (de|a base de) (jugos|licuados|sopa|toronja|agua|manzana)/,
  /\b(solo|solamente|unicamente) (agua|liquidos|jugos|licuados)\b/,
  /\bdetox\b/,
];

const WORD_NUM: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  // "1,200" / "1.200" = thousands separator; "0.5" / "0,5" = decimal
  const s = /^\d{1,2}[.,]\d{3}$/.test(raw) ? raw.replace(/[.,]/, "") : raw.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toKg(unit: string): number {
  return unit.startsWith("l") ? 0.4536 : 1;
}

export interface FilterResult {
  safe: boolean;
  text: string;
  reasons: string[];
}

export function filterReply(reply: string, opts: { sex?: Sex | null } = {}): FilterResult {
  const reasons: string[] = [];

  // 1) Identity: rewrite instead of blocking.
  const text = reply.replace(SELF_AS_PROFESSIONAL, (m) =>
    m.toLowerCase().startsWith("como") ? "como tu coach de nutrición con IA" : "soy tu coach de nutrición con IA",
  );
  const n = normalize(text);

  // 2) Daily calories below the floor.
  const floor = minDailyCalories(opts.sex ?? null);
  for (const m of n.matchAll(DAILY_KCAL)) {
    const start = m.index ?? 0;
    const before = n.slice(Math.max(0, start - 25), start);
    const after = n.slice(start + m[0].length, start + m[0].length + 20);
    if (!DAY_AFTER.test(after) && !DAY_BEFORE.test(before)) continue;
    const values = [toNumber(m[1]), toNumber(m[2])].filter((v): v is number => v !== null);
    if (values.some((v) => v >= 300 && v < floor)) reasons.push(`daily_kcal_below_${floor}`);
  }

  // 3) Weekly loss above the limit.
  for (const m of n.matchAll(WEEKLY_LOSS)) {
    const factor = toKg(m[3]);
    const values = [toNumber(m[1]), toNumber(m[2])].filter((v): v is number => v !== null);
    if (values.some((v) => v * factor > MAX_WEEKLY_LOSS_KG)) reasons.push("weekly_loss_above_limit");
  }
  for (const m of n.matchAll(LOSS_OVER_TIME)) {
    const amount = toNumber(m[1]);
    const qty = WORD_NUM[m[3]] ?? toNumber(m[3]);
    if (amount === null || !qty) continue;
    const kg = amount * toKg(m[2]);
    const unit = m[4];
    const weeks = unit.startsWith("dia") ? qty / 7 : unit.startsWith("semana") ? qty : qty * 4.33;
    if (kg / weeks > MAX_WEEKLY_LOSS_KG) reasons.push("loss_rate_above_limit");
  }

  // 4) Crash diets.
  if (CRASH_DIET.some((re) => re.test(n))) reasons.push("crash_diet");

  return { safe: reasons.length === 0, text, reasons };
}

/** Photo calories must always be labeled as an estimate. Applied in code to every photo reply. */
export function labelAsEstimate(reply: string, header: string, footer: string): string {
  return `${header}\n\n${reply.trim()}\n\n${footer}`;
}
