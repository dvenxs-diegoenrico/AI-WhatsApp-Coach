/**
 * Fair-use limits per user in a rolling 24 h window, so one very heavy user can't cost more
 * than they pay. Defaults can be changed in Vercel with DAILY_MESSAGE_LIMIT / DAILY_PHOTO_LIMIT.
 */
export const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type LimitState = "ok" | "messages" | "photos";

export function limitState(
  counts: { messages: number; photos: number },
  limits: { messages: number; photos: number },
  isPhoto: boolean,
): LimitState {
  if (counts.messages > limits.messages) return "messages";
  if (isPhoto && counts.photos > limits.photos) return "photos";
  return "ok";
}

/** We only send the "you reached the limit" notice once per window (each WhatsApp message costs money). */
export function shouldNotify(lastNoticeAt: string | null, now = Date.now()): boolean {
  return !lastNoticeAt || now - new Date(lastNoticeAt).getTime() > LIMIT_WINDOW_MS;
}
