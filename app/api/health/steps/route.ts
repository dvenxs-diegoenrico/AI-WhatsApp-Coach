import { type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { verifyStepsToken } from "@/lib/coach/steps-link";
import { parseSteps, saveMetric } from "@/lib/coach/habits";
import { localDate } from "@/lib/coach/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/health/steps?t=<personal token>
 * Body (JSON): {"pasos": 8432}  (also accepts "steps", text like "8,432", or a plain-text body)
 * Optional "fecha": "YYYY-MM-DD" (today or the 3 previous days). Called by the user's iPhone Shortcut.
 */
export async function POST(req: NextRequest) {
  const auth = verifyStepsToken(req.nextUrl.searchParams.get("t"));
  if (!auth) return Response.json({ ok: false, error: "enlace inválido o vencido: escribe PASOS en WhatsApp para obtener uno nuevo" }, { status: 401 });

  const { data } = await db().from("users").select("id, timezone, steps_token_version, steps_target, onboarding_step").eq("id", auth.userId).maybeSingle();
  const user = data as Pick<UserRow, "id" | "timezone" | "steps_token_version" | "steps_target" | "onboarding_step"> | null;
  if (!user || user.steps_token_version !== auth.version || user.onboarding_step !== "done")
    return Response.json({ ok: false, error: "enlace revocado" }, { status: 401 });

  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw.trim().startsWith("{") ? JSON.parse(raw) : { pasos: raw };
  } catch {
    body = { pasos: raw };
  }
  const steps = parseSteps(body.pasos ?? body.steps ?? body.Pasos ?? body.value);
  if (steps === null) return Response.json({ ok: false, error: "no encontré el número de pasos" }, { status: 400 });

  const today = localDate(new Date(), user.timezone);
  let day = today;
  if (typeof body.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
    const diff = (Date.parse(today) - Date.parse(body.fecha)) / 86_400_000;
    if (diff < 0 || diff > 3) return Response.json({ ok: false, error: "fecha fuera de rango" }, { status: 400 });
    day = body.fecha;
  }

  await saveMetric(user.id, day, "pasos", steps, "set", "atajo_ios");
  return Response.json({ ok: true, fecha: day, pasos: steps, meta: user.steps_target ?? 8000 });
}
