/**
 * Public website settings. Values come from NEXT_PUBLIC_* variables in Vercel
 * (Settings → Environment Variables), so you can change them without touching code.
 * Changing them needs a Redeploy, because they are built into the pages.
 */

const env = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const site = {
  name: "Coach de nutrición con IA",
  shortName: "Coach IA",
  /** WhatsApp number in international format, digits only, e.g. 5215512345678 */
  whatsappNumber: env(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  /** Legal data for the privacy notice and terms */
  legalName: env(process.env.NEXT_PUBLIC_LEGAL_NAME),
  contactEmail: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  prices: { monthly: 199, yearly: 1490, currency: "MXN", trialDays: 3 },
  demo: { photos: 1, questions: 3 },
} as const;

/** The website's button sends "Hola D" so these users are counted as audience D (web / organic). */
export const WEB_AUDIENCE_CODE = "D";

export function whatsappLink(code: string = WEB_AUDIENCE_CODE): string | null {
  if (!site.whatsappNumber) return null;
  return `https://wa.me/${site.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${code}`)}`;
}

/** True while the legal data hasn't been filled in: pages then show a "draft" notice. */
export const legalIsDraft = !site.legalName || !site.contactEmail || !site.address;

export const formatMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
