import type { SubscriptionStatus } from "@/lib/supabase/types";

/**
 * Who can use the coach right now. Pure function: no database or Stripe calls, easy to test.
 *  - full:    paying, in the 3-day trial, or billing not configured yet
 *  - demo:    free tries left (photos / questions)
 *  - paywall: needs to subscribe
 * past_due keeps access: Stripe retries the card and cancels the subscription if it keeps failing.
 */
export type Access = "full" | "demo" | "paywall";

const PAID: SubscriptionStatus[] = ["trialing", "active", "past_due"];

export function accessFor(input: {
  billingEnabled: boolean;
  status: SubscriptionStatus | null;
  kind: "text" | "photo";
  demoUsed: { photos: number; questions: number };
  demoLimits: { photos: number; questions: number };
}): Access {
  if (!input.billingEnabled) return "full";
  if (input.status && PAID.includes(input.status)) return "full";
  const left = demoLeft(input.demoUsed, input.demoLimits);
  return (input.kind === "photo" ? left.photos : left.questions) > 0 ? "demo" : "paywall";
}

export function demoLeft(used: { photos: number; questions: number }, limits: { photos: number; questions: number }) {
  return { photos: Math.max(0, limits.photos - used.photos), questions: Math.max(0, limits.questions - used.questions) };
}

/** We remind about the subscription at most once an hour, so we don't pay for repeated messages. */
export const PAYWALL_NOTICE_EVERY_MS = 60 * 60 * 1000;
