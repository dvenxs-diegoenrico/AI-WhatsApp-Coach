import { STEPS_LINK_TTL_MS, signLink, verifyLink } from "@/lib/billing/links";
import { appUrl, linksKey } from "@/lib/billing/stripe";
import type { UserRow } from "@/lib/supabase/types";

/**
 * Personal URL the iPhone Shortcut calls every night with the day's steps.
 * The signed token names the user and a version; bumping users.steps_token_version revokes it.
 */
export function stepsUrl(user: Pick<UserRow, "id" | "steps_token_version">): string {
  const subject = `${user.id}.${user.steps_token_version ?? 1}`;
  return `${appUrl()}/api/health/steps?t=${signLink(subject, "steps", linksKey(), STEPS_LINK_TTL_MS)}`;
}

export function verifyStepsToken(token: string | null): { userId: string; version: number } | null {
  const subject = verifyLink(token, "steps", linksKey());
  if (!subject) return null;
  const [userId, version] = subject.split(".");
  return userId && Number(version) > 0 ? { userId, version: Number(version) } : null;
}
