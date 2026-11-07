import { createHash, randomUUID } from "node:crypto";
import { db, PHOTOS_BUCKET } from "@/lib/supabase/server";
import type { MessageRow, RiskFlag, UserRow } from "@/lib/supabase/types";
import type { IncomingMessage } from "@/lib/whatsapp/parse";
import { downloadMedia, markReadWithTyping, sendText } from "@/lib/whatsapp/client";
import { chatReply, photoReply, transcribeAudio, type AiReply, type ImageMediaType } from "@/lib/ai/claude";
import { buildSystemPrompt, PHOTO_INSTRUCTIONS, SAFETY_RETRY_NOTE } from "@/lib/ai/prompts";
import { screenMessage } from "@/lib/safety/screening";
import { filterReply, labelAsEstimate } from "@/lib/safety/output-filter";
import { t } from "@/lib/i18n/es-MX";
import { parseAudienceCode } from "./audience";
import { detectCommand, DELETE_CONFIRM_WINDOW_MS } from "./commands";
import { currentQuestion, runOnboarding } from "./onboarding";

const HISTORY_LIMIT = 16;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

type ChatTurn = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------------------
// Entry point: one incoming WhatsApp message
// ---------------------------------------------------------------------------
export async function handleIncoming(msg: IncomingMessage): Promise<void> {
  const found = await findOrCreateUser(msg);
  let user = found.user;
  const isNew = found.isNew;

  // Store the inbound message first. Meta retries webhooks, so a duplicate id means "already handled".
  const stored = await storeInbound(user, msg);
  if (!stored) return;

  void markReadWithTyping(msg.id);
  await db().from("users").update({ last_inbound_at: new Date().toISOString() }).eq("id", user.id);

  if (isNew) {
    if (msg.kind === "text" && screenMessage(msg.text).crisis) await reply(user, t.crisis);
    await reply(user, t.welcome);
    return;
  }

  // Voice notes become text once transcription is connected; until then, ask the user to type.
  let text: string | null = msg.kind === "text" ? msg.text : null;
  if (msg.kind === "audio") {
    text = await transcribeAudio(() => downloadMedia(msg.mediaId));
    if (text === null) {
      await reply(user, t.audioNotSupportedYet);
      return;
    }
  }

  // Crisis language gets a fixed, safe answer for everyone, before anything else.
  if (text && screenMessage(text).crisis) {
    await reply(user, t.crisis);
    return;
  }

  // Commands work at any step.
  const command = text ? detectCommand(text) : null;
  if (command === "delete_request") {
    await db().from("users").update({ pending_deletion_at: new Date().toISOString() }).eq("id", user.id);
    await reply(user, t.deleteConfirmRequest);
    return;
  }
  if (command === "delete_confirm") {
    const pendingAt = user.pending_deletion_at ? new Date(user.pending_deletion_at).getTime() : 0;
    if (Date.now() - pendingAt > DELETE_CONFIRM_WINDOW_MS) {
      await reply(user, t.deleteNothingPending);
      return;
    }
    await deleteAllUserData(user);
    await sendText(user.wa_id, t.deleteDone); // not stored: the user no longer exists
    return;
  }
  if (command === "stop_reminders") {
    await db()
      .from("users")
      .update({ reminders_opt_out_at: new Date().toISOString(), reminders_opt_in_at: null })
      .eq("id", user.id);
    await reply(user, t.remindersStopped);
    return;
  }

  // Onboarding: age → consent → personality. Nothing else happens until it's done.
  if (user.onboarding_step !== "done") {
    if (text === null) {
      const q = currentQuestion(user.onboarding_step);
      await reply(user, user.onboarding_step === "blocked_minor" ? t.minorStillBlocked : `${t.finishOnboardingFirst}\n\n${q}`);
      return;
    }
    const result = runOnboarding(user.onboarding_step, text);
    if (Object.keys(result.update).length) {
      const { error } = await db().from("users").update(result.update).eq("id", user.id);
      if (error) throw new Error(`onboarding update failed: ${error.message}`);
    }
    if (result.purgeMessages) await db().from("messages").delete().eq("user_id", user.id);
    await reply(user, result.reply, null, result.purgeMessages);
    return;
  }

  if (msg.kind === "image") {
    await handlePhoto(user, msg, stored);
    return;
  }
  if (text !== null) {
    user = await applyScreening(user, text);
    await handleChat(user, text, msg.id);
    return;
  }
  await reply(user, t.unsupportedType);
}

// ---------------------------------------------------------------------------
// Text chat
// ---------------------------------------------------------------------------
async function handleChat(user: UserRow, text: string, currentWaId: string): Promise<void> {
  const system = buildSystemPrompt(user);
  const messages = [...(await loadHistory(user.id, currentWaId)), { role: "user" as const, content: text }];

  let ai: AiReply;
  try {
    ai = await chatReply(system, messages);
    if (ai.refused) return void (await reply(user, t.refusal, ai.model));

    let checked = filterReply(ai.text, { sex: user.sex });
    if (!checked.safe) {
      console.warn("unsafe reply blocked, retrying", checked.reasons);
      ai = await chatReply(`${system}\n\n${SAFETY_RETRY_NOTE}`, messages);
      checked = filterReply(ai.text, { sex: user.sex });
      if (ai.refused || !checked.safe) return void (await reply(user, t.unsafeReplyFallback, ai.model));
    }

    let out = checked.text;
    if (user.restricted_mode && /kcal|calor[ií]a/i.test(out)) out += `\n\n${t.restrictedFooter}`;
    await reply(user, out, ai.model);
  } catch (err) {
    console.error("chat reply failed", err);
    await reply(user, t.aiError);
  }
}

// ---------------------------------------------------------------------------
// Food photos
// ---------------------------------------------------------------------------
async function handlePhoto(
  user: UserRow,
  msg: Extract<IncomingMessage, { kind: "image" }>,
  inbound: MessageRow,
): Promise<void> {
  try {
    const media = await downloadMedia(msg.mediaId);
    const mediaType = media.mimeType.split(";")[0].trim() as ImageMediaType;
    if (!IMAGE_TYPES.includes(mediaType)) return void (await reply(user, t.unsupportedType));
    if (media.data.length > MAX_IMAGE_BYTES) return void (await reply(user, t.imageTooLarge));

    // Save the photo in the private bucket: <user_id>/<uuid>.<ext>
    const path = `${user.id}/${randomUUID()}.${mediaType.split("/")[1].replace("jpeg", "jpg")}`;
    const upload = await db().storage.from(PHOTOS_BUCKET).upload(path, media.data, { contentType: mediaType });
    if (upload.error) throw new Error(`photo upload failed: ${upload.error.message}`);
    await db().from("photos").insert({ user_id: user.id, storage_path: path, wa_media_id: msg.mediaId, mime_type: mediaType, kind: "meal" });
    await db().from("messages").update({ media_path: path }).eq("id", inbound.id);

    // Screen the caption too (e.g. "estoy embarazada, ¿esto está bien?").
    if (msg.caption) user = await applyScreening(user, msg.caption);

    let instructions = PHOTO_INSTRUCTIONS;
    if (user.restricted_mode)
      instructions =
        "The user sent a photo. Describe the foods you see and give one general healthy-habit tip. Do NOT give calorie or macro numbers.";
    if (msg.caption) instructions += `\n\nThe user's caption: "${msg.caption}"`;

    const ai = await photoReply(buildSystemPrompt(user), await loadHistory(user.id, msg.id, 6), { base64: media.data.toString("base64"), mediaType }, instructions);
    if (ai.refused) return void (await reply(user, t.refusal, ai.model));

    const checked = filterReply(ai.text, { sex: user.sex });
    if (!checked.safe) return void (await reply(user, t.unsafeReplyFallback, ai.model));

    // Photo calories are ALWAYS labeled as estimates, in code.
    const out = user.restricted_mode ? checked.text : labelAsEstimate(checked.text, t.photoHeader, t.photoFooter);
    await reply(user, out, ai.model);
  } catch (err) {
    console.error("photo reply failed", err);
    await reply(user, t.aiError);
  }
}

// ---------------------------------------------------------------------------
// Safety screening → restricted mode (sticky)
// ---------------------------------------------------------------------------
async function applyScreening(user: UserRow, text: string): Promise<UserRow> {
  const { flags } = screenMessage(text);
  const newFlags = flags.filter((f) => !user.risk_flags.includes(f));
  if (newFlags.length === 0) return user;

  const risk_flags: RiskFlag[] = [...user.risk_flags, ...newFlags];
  const wasRestricted = user.restricted_mode;
  await db().from("users").update({ risk_flags, restricted_mode: true }).eq("id", user.id);
  if (!wasRestricted) await reply(user, t.restrictedNotice);
  return { ...user, risk_flags, restricted_mode: true };
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------
async function findOrCreateUser(msg: IncomingMessage): Promise<{ user: UserRow; isNew: boolean }> {
  const existing = await db().from("users").select("*").eq("wa_id", msg.from).maybeSingle();
  if (existing.error) throw new Error(`user lookup failed: ${existing.error.message}`);
  if (existing.data) return { user: existing.data as UserRow, isNew: false };

  // First message ever: store the audience code ("Hola A/B/C/D") with the new user.
  const firstText = msg.kind === "text" ? msg.text : msg.kind === "image" ? msg.caption ?? "" : "";
  const created = await db()
    .from("users")
    .insert({
      wa_id: msg.from,
      display_name: msg.name,
      audience_code: parseAudienceCode(firstText),
      first_message: firstText.slice(0, 500) || `[${msg.kind}]`,
    })
    .select("*")
    .single();

  if (created.error?.code === "23505") {
    // Two messages arrived at once and the other one created the user first.
    const again = await db().from("users").select("*").eq("wa_id", msg.from).single();
    if (again.error) throw new Error(`user lookup failed: ${again.error.message}`);
    return { user: again.data as UserRow, isNew: false };
  }
  if (created.error) throw new Error(`user create failed: ${created.error.message}`);
  return { user: created.data as UserRow, isNew: true };
}

/** Returns the stored row, or null if this WhatsApp message id was already handled. */
async function storeInbound(user: UserRow, msg: IncomingMessage): Promise<MessageRow | null> {
  const body =
    user.onboarding_step === "blocked_minor"
      ? null // don't keep minors' messages
      : msg.kind === "text"
        ? msg.text
        : msg.kind === "image"
          ? `[foto]${msg.caption ? ` ${msg.caption}` : ""}`
          : msg.kind === "audio"
            ? "[nota de voz]"
            : `[${msg.type}]`;

  const res = await db()
    .from("messages")
    .insert({
      user_id: user.id,
      direction: "in",
      wa_message_id: msg.id,
      type: msg.kind === "other" ? "other" : msg.kind,
      body,
    })
    .select("*")
    .single();

  if (res.error?.code === "23505") return null;
  if (res.error) throw new Error(`message insert failed: ${res.error.message}`);
  return res.data as MessageRow;
}

/** Sends a reply and stores it. `skipStore` is used right after purging a minor's messages. */
async function reply(user: UserRow, text: string, model: string | null = null, skipStore = false): Promise<void> {
  const ids = await sendText(user.wa_id, text);
  if (skipStore) return;
  const { error } = await db()
    .from("messages")
    .insert({ user_id: user.id, direction: "out", wa_message_id: ids[0] ?? null, type: "text", body: text, model });
  if (error) console.error("outbound message insert failed", error.message);
}

/** Recent conversation as alternating user/assistant turns (Claude requires them to alternate and start with user). */
async function loadHistory(userId: string, excludeWaId: string, limit = HISTORY_LIMIT): Promise<ChatTurn[]> {
  const { data, error } = await db()
    .from("messages")
    .select("direction, body, wa_message_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (error) throw new Error(`history load failed: ${error.message}`);

  const rows = (data as Pick<MessageRow, "direction" | "body" | "wa_message_id">[])
    .filter((r) => r.wa_message_id !== excludeWaId && r.body)
    .reverse();
  return toTurns(rows);
}

export function toTurns(rows: Array<{ direction: "in" | "out"; body: string | null }>): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const r of rows) {
    if (!r.body) continue;
    const role = r.direction === "in" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${r.body}`;
    else turns.push({ role, content: r.body });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  // The caller appends the current user message, so history must end with the assistant.
  if (turns.length && turns[turns.length - 1].role === "user") turns.pop();
  return turns;
}

async function deleteAllUserData(user: UserRow): Promise<void> {
  // 1) Photo files in storage (rows are removed by the cascade below).
  const bucket = db().storage.from(PHOTOS_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(user.id, { limit: 100 });
    if (error) throw new Error(`photo list failed: ${error.message}`);
    if (!files?.length) break;
    const removed = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (removed.error) throw new Error(`photo delete failed: ${removed.error.message}`);
  }
  // 2) The user row; every other table cascades.
  const del = await db().from("users").delete().eq("id", user.id);
  if (del.error) throw new Error(`user delete failed: ${del.error.message}`);
  // 3) Anonymous proof of deletion.
  await db().from("deletion_log").insert({
    wa_id_hash: createHash("sha256").update(user.wa_id).digest("hex"),
    audience_code: user.audience_code,
    requested_at: user.pending_deletion_at ?? new Date().toISOString(),
  });
}
