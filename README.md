# AI WhatsApp Coach

A *coach de nutrición con IA* (AI nutrition and fitness coach) for Spanish-speaking adults in Mexico. Users chat with it on WhatsApp, and a small web dashboard comes later.

**Stack:** Next.js (App Router, TypeScript) on Vercel · Supabase (Postgres + Storage) · Meta WhatsApp Cloud API · Claude API · Stripe (milestone 3) · Vercel Cron (milestone 4)

👉 **First time? Follow [docs/SETUP.md](docs/SETUP.md).**

## How a message flows

```
WhatsApp ──► Meta ──► POST /api/whatsapp/webhook
                         │ 1. verify X-Hub-Signature-256 (App Secret)
                         │ 2. answer 200 immediately
                         ▼ 3. after(): handleIncoming()
          find/create user (stores audience code "Hola A/B/C/D" on first message)
          store inbound message (unique WhatsApp id → never reply twice)
          crisis check → commands (BORRAR MIS DATOS, CONFIRMO BORRAR, ALTO)
          onboarding: age (18+) → health-data consent → personality
          text  → safety screening → Claude (fast model) → output filter → reply
          photo → save to private bucket → Claude (vision model) → filter → "estimate" label → reply
          audio → (transcription slot, not connected yet) → asks user to type
```

## Where the product rules are enforced

| Rule | Code | Database |
|---|---|---|
| 18+, age asked first | `lib/conversation/onboarding.ts` | `users.age` check ≥ 18; `done` requires age + consent + personality |
| Calorie floor 1,200 (mujer) / 1,500 (hombre); max 1 kg or 1% body weight per week; no crash diets | `lib/safety/limits.ts`, `lib/safety/output-filter.ts` (every reply checked, one retry, then a safe fallback) | `calorie_floor` and `weekly_loss_target_kg` checks |
| Eating disorder / pregnancy / diabetes / kidney / heart → general guidance only | `lib/safety/screening.ts` → `restricted_mode` (permanent) + prompt + footer | `users.risk_flags`, `users.restricted_mode` |
| Never a "nutriólogo" | `output-filter.ts` rewrites self-identification | — |
| Photo calories are estimates | `labelAsEstimate()` on every photo reply | `meals.photo_meals_are_estimates` check |
| Health-data consent; delete all my data | onboarding + `BORRAR MIS DATOS` → `CONFIRMO BORRAR` | `health_consent_at`, `consent_version`; cascade deletes; `deletion_log` |
| Reminders only after opt-in; one reply stops them | `ALTO` / `STOP` command (sending comes in milestone 4) | `reminders_opt_in_at`, `reminders_opt_out_at` |
| Audience code from first message | `lib/conversation/audience.ts` | `audience_code` is write-once (trigger) |
| Mexican Spanish, 3 personalities | `lib/i18n/es-MX.ts`, `lib/ai/prompts.ts` | `users.personality` |

## Commands

```bash
npm run dev        # local server
npm test           # unit tests (safety, parsing, onboarding, signature)
npm run typecheck
npm run build
npm run simulate -- "Hola A"   # send a signed fake WhatsApp message to localhost
```

## Roadmap

1. ✅ **Milestone 1:** scaffold, schema, WhatsApp webhook, onboarding, AI replies, photo estimates, delete command
2. Profile (sex, height, weight, goal), safe calorie targets, logging meals, weights and workouts, voice-note transcription
3. Stripe subscriptions ($199 MXN/month, $1,490 MXN/year, 3-day trial, card required)
4. Reminders with opt-in (Vercel Cron + approved WhatsApp templates)
5. Web dashboard
