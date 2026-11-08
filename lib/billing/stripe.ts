import Stripe from "stripe";
import { getEnv } from "@/lib/env";
import { linkKey } from "./links";

let client: Stripe | null | undefined;

/** Payments are on only when all four Stripe values are set in Vercel. Until then everyone gets full access. */
export function billingEnabled(): boolean {
  const e = getEnv();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && e.STRIPE_PRICE_MONTHLY && e.STRIPE_PRICE_YEARLY);
}

export function stripe(): Stripe {
  if (client) return client;
  const key = getEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key, { maxNetworkRetries: 2 });
  return client;
}

export type Plan = "mensual" | "anual";

export function priceFor(plan: Plan): string {
  const e = getEnv();
  const price = plan === "anual" ? e.STRIPE_PRICE_YEARLY : e.STRIPE_PRICE_MONTHLY;
  if (!price) throw new Error(`Stripe price for ${plan} is not set`);
  return price;
}

export function planForPrice(priceId: string | null | undefined): Plan | null {
  const e = getEnv();
  if (priceId && priceId === e.STRIPE_PRICE_YEARLY) return "anual";
  if (priceId && priceId === e.STRIPE_PRICE_MONTHLY) return "mensual";
  return null;
}

/** Public base URL for links (e.g. https://whatupcoach.vercel.app). */
export function appUrl(): string {
  const e = getEnv();
  if (e.APP_URL) return e.APP_URL.replace(/\/$/, "");
  if (e.VERCEL_PROJECT_PRODUCTION_URL) return `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function linksKey(): string {
  return linkKey(getEnv().WHATSAPP_APP_SECRET);
}
