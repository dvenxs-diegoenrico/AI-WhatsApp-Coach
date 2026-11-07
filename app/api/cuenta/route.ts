import { type NextRequest } from "next/server";
import { verifyLink } from "@/lib/billing/links";
import { appUrl, billingEnabled, linksKey, stripe } from "@/lib/billing/stripe";
import { getSubscription, payLink } from "@/lib/billing/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cuenta?t=<signed link> → opens the Stripe customer portal (change plan, card, cancel). */
export async function GET(req: NextRequest) {
  if (!billingEnabled()) return Response.redirect(`${appUrl()}/`, 303);
  const userId = verifyLink(req.nextUrl.searchParams.get("t"), "portal", linksKey());
  if (!userId) return Response.redirect(`${appUrl()}/gracias?vencido=1`, 303);

  const sub = await getSubscription(userId);
  if (!sub?.stripe_customer_id) return Response.redirect(payLink(userId), 303);

  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    locale: "es-419",
    return_url: `${appUrl()}/gracias?cuenta=1`,
  });
  return Response.redirect(portal.url, 303);
}
