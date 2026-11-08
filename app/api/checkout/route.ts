import { type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { verifyLink } from "@/lib/billing/links";
import { appUrl, billingEnabled, linksKey, priceFor, stripe, type Plan } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/billing/subscriptions";
import { site } from "@/lib/site";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

/** Tags our sessions in the Stripe Dashboard (Checkout → filter by integration). */
const INTEGRATION_ID = "whatupcoach-suscripcion-qkmvrtla";
export const dynamic = "force-dynamic";

/** GET /api/checkout?t=<signed link>&plan=mensual|anual → creates a Stripe Checkout and redirects to it. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const plan: Plan = req.nextUrl.searchParams.get("plan") === "anual" ? "anual" : "mensual";
  const back = `${appUrl()}/pagar?t=${encodeURIComponent(token ?? "")}`;

  if (!billingEnabled()) return Response.redirect(`${appUrl()}/`, 303);
  const userId = verifyLink(token, "pay", linksKey());
  if (!userId) return Response.redirect(back, 303); // the page explains the link expired

  const { data: user } = await db().from("users").select("*").eq("id", userId).maybeSingle();
  if (!user || (user as UserRow).onboarding_step !== "done") return Response.redirect(back, 303);
  const u = user as UserRow;

  const existing = await getSubscription(u.id);
  if (existing?.status && ["trialing", "active", "past_due"].includes(existing.status)) {
    return Response.redirect(`${appUrl()}/gracias?ya=1`, 303);
  }

  const trial = !u.trial_used_at;
  // Stripe Tax: only when you have an active tax registration in Stripe (see docs/STRIPE_PLAN.md).
  // Prices are IVA-inclusive, so the customer still pays $199 / $1,490 and the tax is shown inside it.
  const tax = getEnv().STRIPE_AUTOMATIC_TAX;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceFor(plan), quantity: 1 }],
    customer: existing?.stripe_customer_id ?? undefined,
    client_reference_id: u.id,
    metadata: { user_id: u.id },
    subscription_data: {
      metadata: { user_id: u.id },
      ...(trial ? { trial_period_days: site.prices.trialDays } : {}),
    },
    payment_method_collection: "always", // card required even for the free trial
    locale: "es-419",
    allow_promotion_codes: true,
    integration_identifier: INTEGRATION_ID,
    ...(tax
      ? {
          automatic_tax: { enabled: true },
          ...(existing?.stripe_customer_id ? { customer_update: { address: "auto" as const }, billing_address_collection: "required" as const } : {}),
        }
      : {}),
    success_url: `${appUrl()}/gracias`,
    cancel_url: back,
  });

  return Response.redirect(session.url!, 303);
}
