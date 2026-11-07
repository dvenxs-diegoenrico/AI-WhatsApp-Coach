import { createHash, randomUUID } from "node:crypto";
import { db, PHOTOS_BUCKET } from "@/lib/supabase/server";
import type { MessageRow, RiskFlag, UserRow } from "@/lib/supabase/types";
import type { IncomingMessage } from "@/lib/whatsapp/parse";
import { downloadMedia, markReadWithTyping, sendText } from "@/lib/whatsapp/client";
import { chatReply, photoReply, transcribeAudio, type AiReply, type ChatTurn } from "@/lib/ai/claude";
import { prepareImage } from "@/lib/ai/image";
import { addCosts, type Cost } from "@/lib/ai/pricing";
import { buildSystemPrompt, PHOTO_INSTRUCTIONS, SAFETY_RETRY_NOTE } from "@/lib/ai/prompts";
import { screenMessage } from "@/lib/safety/screening";
import { filterReply, labelAsEstimate } from "@/lib/safety/output-filter";
import { t } from "@/lib/i18n/es";
import { countryFromWaId, DEFAULT_TIMEZONE } from "@/lib/i18n/countries";
import { getEnv } from "@/lib/env";
import { parseAudienceCode } from "./audience";
import { detectCommand, DELETE_CONFIRM_WINDOW_MS } from "./commands";
import { currentQuestion, runOnboarding } from "./onboarding";
import { LIMIT_WINDOW_MS, limitState, shouldNotify } from "./limits";
import { accessFor, demoLeft, PAYWALL_NOTICE_EVERY_MS, type Access } from "@/lib/billing/access";
import { billingEnabled } from "@/lib/billing/stripe";
import { cancelSubscriptionNow, getSubscription, payLink, portalLink } from "@/lib/billing/subscriptions";

/** Messages of context sent with a text question (fewer = cheaper; 10 is enough for a WhatsApp chat). */
const CHAT_HISTORY = 10;
/** Messages of context sent with a photo (the photo itself is the main input). */
const PHOTO_HISTORY = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Entry point: one incoming WhatsApp message
// ---------------------------------------------------------------------------
export async function handleIncoming(msg: IncomingMessage): Promise<void> {
  const found = await findOrCreateUser(msg);
  let user = found.user;

  // Store the inbound message first. Meta retries webhooks, so a duplicate id means "already handled".
  const stored = await storeInbound(user, msg);
  if (!stored) return;

  void markReadWithTyping(msg.id);
  await db().from("users").update({ last_inbound_at: new Date().toISOString() }).eq("id", user.id);
  const country = countryFromWaId(user.wa_id);

  if (found.isNew) {
    const crisis = msg.kind === "text" && screenMessage(msg.text).crisis;
    await reply(user, crisis ? `${t.crisis(country)}\n\n${t.welcome}` : t.welcome);
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
    await db().from("messages").update({ body: text }).eq("id", stored.id); // history shows the transcript
  }

  // Crisis language gets a fixed, safe answer for everyone, before anything else.
  if (text && screenMessage(text).crisis) {
    await reply(user, t.crisis(country));
    return;
  }

  // Commands work at any step, and are never blocked by limits.
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
    if (billingEnabled()) {
      try {
        await cancelSubscriptionNow(user.id); // never keep charging someone whose data we deleted
      } catch (err) {
        console.error("subscription cancel before deletion failed", err);
        await reply(user, t.deleteCancelFailed);
        return;
      }
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

  if (command === "account") {
    if (!billingEnabled()) return void (await reply(user, t.billingOff));
    if (user.onboarding_step !== "done") return void (await reply(user, `${t.finishOnboardingFirst}\n\n${currentQuestion(user.onboarding_step)}`));
    const sub = await getSubscription(user.id);
    await reply(user, sub?.stripe_customer_id ? t.account(portalLink(user.id)) : t.accountNoSubscription(payLink(user.id)));
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
    let replyText = result.reply;
    if (result.update.onboarding_step === "done" && billingEnabled()) {
      const env = getEnv();
      replyText += `\n\n${t.demoIntro(env.DEMO_PHOTOS, env.DEMO_QUESTIONS)}`;
    }
    await reply(user, replyText, { skipStore: result.purgeMessages });
    return;
  }

  if (msg.kind === "other") {
    await reply(user, t.unsupportedType);
    return;
  }

  // Payments: subscribed / free demo / subscribe to continue.
  const access = await checkAccess(user, msg.kind === "image" ? "photo" : "text");
  if (access === "paywall") return;
  const demo = access === "demo";

  // Fair-use limits (rolling 24 h). Past the limit we answer once, then stay quiet: every reply costs money.
  if (!(await withinLimits(user, msg.kind === "image"))) return;

  // Safety screening on what the user wrote. A first-time flag adds a notice to the same reply (1 message, not 2).
  const screened = await applyScreening(user, msg.kind === "image" ? msg.caption : text);
  user = screened.user;

  if (msg.kind === "image") {
    await handlePhoto(user, msg, stored, screened.notice, demo);
    return;
  }
  await handleChat(user, stored, screened.notice, demo);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
async function checkAccess(user: UserRow, kind: "text" | "photo"): Promise<Access> {
  if (!billingEnabled()) return "full";
  const env = getEnv();
  const sub = await getSubscription(user.id);
  const limits = { photos: env.DEMO_PHOTOS, questions: env.DEMO_QUESTIONS };
  const used = { photos: user.demo_photos_used, questions: user.demo_questions_used };
  const access = accessFor({ billingEnabled: true, status: sub?.status ?? null, kind, demoUsed: used, demoLimits: limits });
  if (access !== "paywall") return access;

  // At most one reminder per hour: every WhatsApp message we send costs money.
  const last = user.paywall_notice_at ? new Date(user.paywall_notice_at).getTime() : 0;
  if (Date.now() - last > PAYWALL_NOTICE_EVERY_MS) {
    await db().from("users").update({ paywall_notice_at: new Date().toISOString() }).eq("id", user.id);
    await reply(user, t.paywall(payLink(user.id), !user.trial_used_at, kind, demoLeft(used, limits).questions));
  }
  return "paywall";
}

/** Counts one free try and adds what's left (or the invitation to subscribe) to the same reply. */
async function consumeDemo(user: UserRow, kind: "text" | "photo", text: string): Promise<string> {
  const env = getEnv();
  const used = {
    photos: user.demo_photos_used + (kind === "photo" ? 1 : 0),
    questions: user.demo_questions_used + (kind === "text" ? 1 : 0),
  };
  await db().from("users").update({ demo_photos_used: used.photos, demo_questions_used: used.questions }).eq("id", user.id);
  const left = demoLeft(used, { photos: env.DEMO_PHOTOS, questions: env.DEMO_QUESTIONS });
  if (left.photos + left.questions === 0) return `${text}\n\n${t.demoFinished(payLink(user.id), !user.trial_used_at)}`;
  return `${text}\n\n${t.demoLeft(left.photos, left.questions)}`;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------
async function withinLimits(user: UserRow, isPhoto: boolean): Promise<boolean> {
  const env = getEnv();
  const since = new Date(Date.now() - LIMIT_WINDOW_MS).toISOString();
  const base = () =>
    db().from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("direction", "in").gte("created_at", since);
  const [all, photos] = await Promise.all([base(), isPhoto ? base().eq("type", "image") : Promise.resolve({ count: 0 })]);

  const state = limitState(
    { messages: all.count ?? 0, photos: photos.count ?? 0 },
    { messages: env.DAILY_MESSAGE_LIMIT, photos: env.DAILY_PHOTO_LIMIT },
    isPhoto,
  );
  if (state === "ok") return true;

  const column = state === "messages" ? "message_limit_notice_at" : "photo_limit_notice_at";
  if (shouldNotify(user[column])) {
    await db().from("users").update({ [column]: new Date().toISOString() }).eq("id", user.id);
    await reply(user, state === "messages" ? t.messageLimit(env.DAILY_MESSAGE_LIMIT) : t.photoLimit(env.DAILY_PHOTO_LIMIT));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Text chat
// ---------------------------------------------------------------------------
async function handleChat(user: UserRow, current: MessageRow, notice: string | null, demo = false): Promise<void> {
  // Wait a moment: if the user keeps typing, only the last message's handler answers, covering all of them.
  // 3 quick messages → 1 AI call and 1 WhatsApp message instead of 3.
  const debounce = getEnv().REPLY_DEBOUNCE_MS;
  if (debounce > 0) {
    await sleep(debounce);
    const latest = await db()
      .from("messages")
      .select("id")
      .eq("user_id", user.id)
      .eq("direction", "in")
      .eq("type", "text")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.data && latest.data.id !== current.id) return; // a newer message will answer
    // Reload the user: an earlier message in the burst may have turned on restricted mode.
    const fresh = await db().from("users").select("*").eq("id", user.id).single();
    if (fresh.data) user = fresh.data as UserRow;
  }

  const system = buildSystemPrompt(user);
  const messages = await loadTurns(user.id, CHAT_HISTORY, "user");
  if (messages.length === 0) return; // already answered (e.g. a webhook retry)

  let ai: AiReply | null = null;
  let cost: Cost | null = null;
  try {
    ai = await chatReply(system, messages);
    cost = ai.cost;
    if (ai.refused) return void (await reply(user, withNotice(notice, t.refusal), { model: ai.model, cost }));

    let checked = filterReply(ai.text, { sex: user.sex });
    if (!checked.safe) {
      console.warn("unsafe reply blocked, retrying", checked.reasons);
      ai = await chatReply(`${system}\n\n${SAFETY_RETRY_NOTE}`, messages);
      cost = addCosts(cost, ai.cost);
      checked = filterReply(ai.text, { sex: user.sex });
      if (ai.refused || !checked.safe)
        return void (await reply(user, withNotice(notice, t.unsafeReplyFallback), { model: ai.model, cost }));
    }

    let out = checked.text;
    if (user.restricted_mode && !notice && /kcal|calor[ií]a/i.test(out)) out += `\n\n${t.restrictedFooter}`;
    if (demo) out = await consumeDemo(user, "text", out);
    await reply(user, withNotice(notice, out), { model: ai.model, cost });
  } catch (err) {
    console.error("chat reply failed", err);
    await reply(user, withNotice(notice, t.aiError), { model: ai?.model ?? null, cost });
  }
}

// ---------------------------------------------------------------------------
// Food photos
// ---------------------------------------------------------------------------
async function handlePhoto(
  user: UserRow,
  msg: Extract<IncomingMessage, { kind: "image" }>,
  inbound: MessageRow,
  notice: string | null,
  demo = false,
): Promise<void> {
  try {
    const media = await downloadMedia(msg.mediaId);
    let jpeg: Buffer;
    try {
      jpeg = await prepareImage(media.data); // ~1024 px JPEG: ~60% fewer tokens, smaller storage
    } catch {
      return void (await reply(user, withNotice(notice, t.unsupportedType)));
    }

    // Save the (resized) photo in the private bucket: <user_id>/<uuid>.jpg
    const path = `${user.id}/${randomUUID()}.jpg`;
    const upload = await db().storage.from(PHOTOS_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
    if (upload.error) throw new Error(`photo upload failed: ${upload.error.message}`);
    await db().from("photos").insert({ user_id: user.id, storage_path: path, wa_media_id: msg.mediaId, mime_type: "image/jpeg", kind: "meal" });
    await db().from("messages").update({ media_path: path }).eq("id", inbound.id);

    let instructions = PHOTO_INSTRUCTIONS;
    if (user.restricted_mode)
      instructions =
        "The user sent a photo. Describe the foods you see and give one general healthy-habit tip. Do NOT give calorie or macro numbers.";
    if (msg.caption) instructions += `\n\nThe user's caption: "${msg.caption}"`;

    const history = await loadTurns(user.id, PHOTO_HISTORY, "assistant", inbound.id);
    const ai = await photoReply(buildSystemPrompt(user), history, jpeg.toString("base64"), instructions);
    if (ai.refused) return void (await reply(user, withNotice(notice, t.refusal), { model: ai.model, cost: ai.cost }));

    const checked = filterReply(ai.text, { sex: user.sex });
    if (!checked.safe) return void (await reply(user, withNotice(notice, t.unsafeReplyFallback), { model: ai.model, cost: ai.cost }));

    // Photo calories are ALWAYS labeled as estimates, in code.
    let out = user.restricted_mode ? checked.text : labelAsEstimate(checked.text, t.photoHeader, t.photoFooter);
    if (demo) out = await consumeDemo(user, "photo", out);
    await reply(user, withNotice(notice, out), { model: ai.model, cost: ai.cost });
  } catch (err) {
    console.error("photo reply failed", err);
    await reply(user, withNotice(notice, t.aiError));
  }
}

// ---------------------------------------------------------------------------
// Safety screening → restricted mode (sticky)
// ---------------------------------------------------------------------------
async function applyScreening(user: UserRow, text: string | null): Promise<{ user: UserRow; notice: string | null }> {
  if (!text) return { user, notice: null };
  const { flags } = screenMessage(text);
  const newFlags = flags.filter((f) => !user.risk_flags.includes(f));
  if (newFlags.length === 0) return { user, notice: null };

  const risk_flags: RiskFlag[] = [...user.risk_flags, ...newFlags];
  await db().from("users").update({ risk_flags, restricted_mode: true }).eq("id", user.id);
  return { user: { ...user, risk_flags, restricted_mode: true }, notice: user.restricted_mode ? null : t.restrictedNotice };
}

function withNotice(notice: string | null, text: string): string {
  return notice ? `${notice}\n\n${text}` : text;
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
      timezone: countryFromWaId(msg.from)?.timezone ?? DEFAULT_TIMEZONE,
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

/** Sends a reply and stores it with its AI cost. `skipStore` is used right after purging a minor's messages. */
async function reply(
  user: UserRow,
  text: string,
  opts: { model?: string | null; cost?: Cost | null; skipStore?: boolean } = {},
): Promise<void> {
  const ids = await sendText(user.wa_id, text);
  if (opts.skipStore) return;
  const { error } = await db().from("messages").insert({
    user_id: user.id,
    direction: "out",
    wa_message_id: ids[0] ?? null,
    type: "text",
    body: text,
    model: opts.model ?? null,
    input_tokens: opts.cost?.inputTokens ?? null,
    output_tokens: opts.cost?.outputTokens ?? null,
    ai_cost_usd: opts.cost?.costUsd ?? null,
  });
  if (error) console.error("outbound message insert failed", error.message);
}

/** Recent conversation as Claude turns. `endWith: "user"` keeps the pending user messages as the question. */
async function loadTurns(userId: string, limit: number, endWith: "user" | "assistant", excludeId?: string): Promise<ChatTurn[]> {
  const { data, error } = await db()
    .from("messages")
    .select("id, direction, body")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (error) throw new Error(`history load failed: ${error.message}`);
  const rows = (data as Pick<MessageRow, "id" | "direction" | "body">[]).filter((r) => r.id !== excludeId).reverse();
  return toTurns(rows, endWith);
}

/** Claude needs alternating turns that start with the user. Consecutive messages from one side are merged. */
export function toTurns(rows: Array<{ direction: "in" | "out"; body: string | null }>, endWith: "user" | "assistant"): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const r of rows) {
    if (!r.body) continue;
    const role = r.direction === "in" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${r.body}`;
    else turns.push({ role, content: r.body });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (endWith === "assistant" && turns.length && turns[turns.length - 1].role === "user") turns.pop();
  if (endWith === "user" && turns.length && turns[turns.length - 1].role === "assistant") return []; // nothing pending
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
