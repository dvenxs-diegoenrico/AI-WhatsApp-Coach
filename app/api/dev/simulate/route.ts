import { randomUUID } from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { deleteAllUserData, handleIncoming } from "@/lib/conversation/handle-message";
import type { IncomingMessage } from "@/lib/whatsapp/parse";
import { SIM_WA_ID, simulation } from "@/lib/sim/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * QA conversation simulator. Runs ONE incoming message through the real bot (real AI, real database,
 * real free-trial rules) but captures the replies instead of sending them to WhatsApp.
 * - Disabled unless SIMULATOR_SECRET is set; requires header x-sim-secret.
 * - Only fake numbers 999… are accepted, so real users can never be touched.
 * Body: { wa_id, name?, kind: "text"|"image"|"audio"|"other", text?, image_b64?, caption?, type? }
 *       or { action: "cleanup" } to delete every simulated user (999…).
 */
export async function POST(req: Request) {
  const secret = getEnv().SIMULATOR_SECRET;
  const given = req.headers.get("x-sim-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
    return new Response("Not found", { status: 404 });

  const body = (await req.json()) as Record<string, string | undefined>;

  if (body.action === "cleanup") {
    const { data } = await db().from("users").select("*").like("wa_id", "999%");
    for (const u of (data ?? []) as UserRow[]) if (SIM_WA_ID.test(u.wa_id)) await deleteAllUserData(u);
    return Response.json({ deleted: data?.length ?? 0 });
  }

  const waId = body.wa_id ?? "";
  if (!SIM_WA_ID.test(waId)) return Response.json({ error: "wa_id must be a fake 999… number" }, { status: 400 });

  const base = { id: `wamid.sim.${randomUUID()}`, from: waId, name: body.name ?? null, timestamp: Math.floor(Date.now() / 1000) };
  const ctx = { outbox: [] as string[], images: new Map<string, { data: Buffer; mimeType: string }>() };
  let msg: IncomingMessage;
  if (body.kind === "image") {
    const mediaId = `sim-media-${randomUUID()}`;
    ctx.images.set(mediaId, { data: Buffer.from(body.image_b64 ?? "", "base64"), mimeType: "image/jpeg" });
    msg = { ...base, kind: "image", mediaId, mimeType: "image/jpeg", caption: body.caption ?? null };
  } else if (body.kind === "audio") {
    msg = { ...base, kind: "audio", mediaId: `sim-audio-${randomUUID()}`, mimeType: "audio/ogg" };
  } else if (body.kind === "other") {
    msg = { ...base, kind: "other", type: body.type ?? "location" };
  } else {
    msg = { ...base, kind: "text", text: body.text ?? "" };
  }

  const started = Date.now();
  await simulation.run(ctx, () => handleIncoming(msg));
  const { data: user } = await db()
    .from("users")
    .select("onboarding_step, audience_code, restricted_mode, risk_flags, demo_photos_used, demo_questions_used, daily_calorie_target, protein_target_g, focus_habits")
    .eq("wa_id", waId)
    .maybeSingle();
  return Response.json({ replies: ctx.outbox, ms: Date.now() - started, user });
}
