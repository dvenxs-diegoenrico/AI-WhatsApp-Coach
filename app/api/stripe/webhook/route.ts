import type Stripe from "stripe";
import { db } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import { billingEnabled, stripe } from "@/lib/billing/stripe";
import { payLink, portalLink, syncSubscription, userIdForCustomer } from "@/lib/billing/subscriptions";
import { notifyUser } from "@/lib/conversation/notify";
import { t } from "@/lib/i18n/es";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Stripe → our app. Configure in Stripe: Developers → Webhooks → Add endpoint
 * https://YOUR-DOMAIN/api/stripe/webhook with the events listed in docs/SETUP.md.
 */
export async function POST(req: Request) {
  if (!billingEnabled()) return new Response("Billing not configured", { status: 503 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", getEnv().STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Stripe can deliver the same event twice: handle each id once.
  const seen = await db().from("stripe_events").insert({ id: event.id, type: event.type });
  if (seen.error?.code === "23505") return new Response("OK (duplicate)");
  if (seen.error) return new Response("DB error", { status: 500 }); // Stripe will retry

  try {
    await handle(event);
  } catch (err) {
    console.error(`Stripe event ${event.id} (${event.type}) failed`, err);
    await db().from("stripe_events").delete().eq("id", event.id); // let Stripe's retry process it again
    return new Response("Error", { status: 500 });
  }
  return new Response("OK");
}

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Checkout finished. Card payments and free trials arrive here already settled;
    // delayed payment methods settle later in async_payment_succeeded.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe().subscriptions.retrieve(subId);
      const userId = await syncSubscription(sub, session.client_reference_id);
      if (!userId) return;
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return; // wait for the async event
      if (sub.status === "trialing" && sub.trial_end) {
        await notifyUser(userId, t.trialStarted(await formatDate(userId, sub.trial_end)));
      } else {
        const plan = sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensual";
        await notifyUser(userId, t.subscriptionActive(plan));
      }
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object);
      return;

    case "customer.subscription.deleted": {
      const userId = await syncSubscription(event.data.object);
      if (userId) await notifyUser(userId, t.subscriptionEnded(payLink(userId)));
      return;
    }

    // Renewals: refresh status and the new period end from the subscription itself.
    case "invoice.paid": {
      const subId = subscriptionIdOf(event.data.object);
      if (subId) await syncSubscription(await stripe().subscriptions.retrieve(subId));
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      if (!invoice.customer) return;
      const userId = await userIdForCustomer(typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id);
      if (userId) await notifyUser(userId, t.paymentFailed(portalLink(userId)));
      return;
    }

    // Risk events: money already moved or is at risk. Logged loudly for the owner
    // (Vercel → Logs) and Stripe also emails them; act from the Stripe Dashboard.
    case "charge.refunded":
    case "charge.dispute.created":
    case "radar.early_fraud_warning.created": {
      const obj = event.data.object as { id: string; charge?: string | { id: string } | null; customer?: string | { id: string } | null };
      const chargeId = event.type === "charge.refunded" ? obj.id : typeof obj.charge === "string" ? obj.charge : obj.charge?.id;
      let customer = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      if (!customer && chargeId) {
        const charge = await stripe().charges.retrieve(chargeId);
        customer = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      }
      const userId = customer ? await userIdForCustomer(customer) : null;
      console.warn(`STRIPE ACTION NEEDED: ${event.type} charge=${chargeId ?? "?"} customer=${customer ?? "?"} user=${userId ?? "?"}`);
      return;
    }

    default:
      return;
  }
}

/** The subscription an invoice belongs to (API 2025+ moved it under invoice.parent). */
function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const s = invoice.parent?.subscription_details?.subscription;
  return typeof s === "string" ? s : s?.id ?? null;
}

async function formatDate(userId: string, unixSeconds: number): Promise<string> {
  const { data } = await db().from("users").select("timezone").eq("id", userId).maybeSingle();
  return new Date(unixSeconds * 1000).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: (data?.timezone as string | undefined) ?? "America/Mexico_City",
  });
}
