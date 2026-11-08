import { z } from "zod";

/**
 * All environment variables, checked once on first use.
 * If one is missing, the error names it so you know what to paste in Vercel / .env.local.
 */
const schema = z.object({
  // Meta WhatsApp Cloud API
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_API_VERSION: z.string().default("v23.0"),
  // "true" = log replies instead of sending them (local testing without Meta)
  WHATSAPP_DRY_RUN: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // Supabase
  SUPABASE_URL: z
    .string()
    .url()
    .refine((u) => new URL(u).hostname.endsWith(".supabase.co"), "must be your project URL, like https://xxxx.supabase.co"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Claude
  ANTHROPIC_API_KEY: z.string().min(1),
  CLAUDE_CHAT_MODEL: z.string().default("claude-haiku-5-5"),
  // Sonnet 5.5 costs about half of Opus 5.5 per photo. Switch back to claude-opus-5-5 if estimates look worse.
  CLAUDE_VISION_MODEL: z.string().default("claude-sonnet-5-5"),
  CLAUDE_VISION_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),

  // Fair-use limits per user, rolling 24 h (counts messages the user sends).
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(60),
  DAILY_PHOTO_LIMIT: z.coerce.number().int().positive().default(5),
  // Wait this long after a text before answering, so 3 quick messages get 1 reply (1 WhatsApp charge).
  REPLY_DEBOUNCE_MS: z.coerce.number().int().min(0).max(15000).default(3000),

  // Stripe (milestone 3, optional for now)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),

  // Public address of the app, used in payment links. Optional on Vercel (it uses the production domain).
  APP_URL: z.string().url().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  // Free demo before asking for a card
  DEMO_PHOTOS: z.coerce.number().int().min(0).default(1),
  DEMO_QUESTIONS: z.coerce.number().int().min(0).default(3),

  // Vercel Cron (milestone 4, optional for now)
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}. See docs/SETUP.md`);
  }
  cached = parsed.data;
  return cached;
}
