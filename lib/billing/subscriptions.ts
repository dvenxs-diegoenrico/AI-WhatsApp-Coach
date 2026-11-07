import type Stripe from "stripe";
import { db } from "@/lib/supabase/server";
import type { SubscriptionRow, SubscriptionStatus } from "@/lib/supabase/types";
import { appUrl, linksKey, planForPrice, stripe } from "./stripe";
import { PAY_LINK_TTL_MS, PORTAL_LINK_TTL_MS, signLink } from "./links";

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await db().from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`subscription lookup failed: ${error.message}`);
  return (data as SubscriptionRow | null) ?? null;
}

export async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { data } = await db().from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

const toIso = (sec: number | null | undefined) => (sec ? new Date(sec * 1000).toISOString() : null);
const customerId = (c: string | Stripe.Customer | Stripe.DeletedCustomer) => (typeof c === "string" ? c : c.id);

/** Copies a Stripe subscription into our subscriptions table (one row per user). */
export async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string | null): Promise<string | null> {
  const customer = customerId(sub.customer);
  const userId = userIdHint ?? sub.metadata?.user_id ?? (await userIdForCustomer(customer));
  if (!userId) {
    console.warn(`Stripe subscription ${sub.id} has no matching user`);
    return null;
  }
  const item = sub.items.data[0];
  const row = {
    user_id: userId,
    stripe_customer_id: customer,
    stripe_subscription_id: sub.id,
    status: sub.status as SubscriptionStatus,
    price_id: item?.price.id ?? null,
    plan: planForPrice(item?.price.id),
    trial_end: toIso(sub.trial_end),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
  };
  const { error } = await db().from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`subscription upsert failed: ${error.message}`);
  if (sub.trial_end) await db().from("users").update({ trial_used_at: new Date().toISOString() }).eq("id", userId).is("trial_used_at", null);
  return userId;
}

/** Link to choose a plan and pay (valid 7 days). */
export function payLink(userId: string): string {
  return `${appUrl()}/pagar?t=${signLink(userId, "pay", linksKey(), PAY_LINK_TTL_MS)}`;
}

/** Link to the Stripe customer portal: change plan, update card, cancel (valid 24 h). */
export function portalLink(userId: string): string {
  return `${appUrl()}/api/cuenta?t=${signLink(userId, "portal", linksKey(), PORTAL_LINK_TTL_MS)}`;
}

/** Cancels right away (used when the user deletes all their data). */
export async function cancelSubscriptionNow(userId: string): Promise<void> {
  const sub = await getSubscription(userId);
  if (!sub?.stripe_subscription_id) return;
  if (!sub.status || !["trialing", "active", "past_due", "unpaid", "incomplete", "paused"].includes(sub.status)) return;
  await stripe().subscriptions.cancel(sub.stripe_subscription_id);
}
