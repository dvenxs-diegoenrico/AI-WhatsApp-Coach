# WhatUpCoach

**WhatUpCoach** is a *coach de nutrición con IA* (AI nutrition and fitness coach) for Spanish-speaking adults (Latin America, the US, Spain…), starting with Mexico. Users chat with it on WhatsApp, and a small web dashboard comes later.

**Stack:** Next.js (App Router, TypeScript) on Vercel · Supabase (Postgres + Storage) · Meta WhatsApp Cloud API · Claude API · Stripe (milestone 3) · Vercel Cron (milestone 4)

👉 **First time? Follow [docs/SETUP.md](docs/SETUP.md).** Marketing plan and video scripts: [docs/MARKETING.md](docs/MARKETING.md).

**Website:** `/` landing page (its button opens WhatsApp with "Hola D"), `/privacidad` privacy notice, `/terminos` terms. Configure with the `NEXT_PUBLIC_*` variables in `.env.example`.

## How a message flows

```
WhatsApp ──► Meta ──► POST /api/whatsapp/webhook
                         │ 1. verify X-Hub-Signature-256 (App Secret)
                         │ 2. answer 200 immediately
                         ▼ 3. after(): handleIncoming()
          find/create user (stores audience code "Hola A/B/C/D" on first message)
          store inbound message (unique WhatsApp id → never reply twice)
          crisis check (local crisis line by country) → commands (BORRAR MIS DATOS, CONFIRMO BORRAR, ALTO)
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
| Free demo, then 3-day trial with card (once per number) | `lib/billing/access.ts`, `app/api/checkout` | `users.demo_*_used`, `users.trial_used_at` |
| Deleting data also cancels the subscription | `handle-message.ts` → `cancelSubscriptionNow()` | — |
| Reminders only after opt-in; one reply stops them | `ALTO` / `STOP` command (sending comes in milestone 4) | `reminders_opt_in_at`, `reminders_opt_out_at` |
| Audience code from first message | `lib/conversation/audience.ts` | `audience_code` is write-once (trigger) |
| Neutral Spanish for any Spanish speaker; foods, time zone and crisis line adapted to the country of the phone number; 3 personalities | `lib/i18n/es.ts`, `lib/i18n/countries.ts`, `lib/ai/prompts.ts` | `users.personality`, `users.timezone` |

## Commands

```bash
npm run dev        # local server
npm test           # unit tests (safety, parsing, onboarding, signature)
npm run typecheck
npm run build
npm run simulate -- "Hola A"   # send a signed fake WhatsApp message to localhost
```

## Cost controls

| What | How it saves money |
|---|---|
| Reply delay (`REPLY_DEBOUNCE_MS`, 3 s) | A burst of messages ("hola" / "una pregunta" / "¿qué ceno?") gets **one** AI call and **one** WhatsApp message |
| Notices merged into the reply | Safety notices are added to the answer instead of being sent as a separate message |
| Reactions and stickers ignored | No paid reply to a 👍 |
| Daily limits (`DAILY_MESSAGE_LIMIT` 60, `DAILY_PHOTO_LIMIT` 5) | One friendly notice, then silence until the 24 h window frees up; commands always work |
| Photos resized to 1024 px JPEG | ~60% fewer image tokens and less storage |
| Photos on `claude-sonnet-5-5` | About half the price of Opus |
| Chat on `claude-haiku-5-5` at low effort, 10 messages of history | A text answer costs a fraction of a cent |
| Short answers (≈90 words) | Fewer output tokens; never split into several WhatsApp messages |

Every AI reply stores `input_tokens`, `output_tokens` and `ai_cost_usd` in `messages`. The `usage_daily` view adds them up per user and day, plus an estimate of the WhatsApp cost.

## Expert coach (milestone 2)

The coach is Claude with **tools**: it logs meals (text or photo), weight and workouts, saves the profile and personal notes, and reads progress. All numbers come from code:

- `lib/coach/nutrition.ts`: Mifflin-St Jeor × activity, 0.5 %/week default loss (max 1 % / 1 kg), protein 1.4–1.6 g/kg (BMI-25 reference weight with obesity), fiber, water, steps; **adaptive expenditure** from the user's own intake and weight trend after ~2 weeks.
- `lib/coach/tools.ts`: tool definitions + zod validation; restricted users never get numbers.
- `lib/ai/prompts.ts`: stable expert instructions (cached) + per-user context (profile, targets, today's log, notes, weekly check-in).
- Evidence and decisions: [docs/COACH_KNOWLEDGE.md](docs/COACH_KNOWLEDGE.md).

**Dashboard:** the user writes `PANEL` → personal 7-day link → 30-day session cookie → `/panel` (today ring and macros, meals with photos, week calories, weight trend, consistency, plan). Example with fake data: `/panel/demo`.

## Roadmap

1. ✅ **Milestone 1:** scaffold, schema, WhatsApp webhook, onboarding, AI replies, photo estimates, delete command
2. Profile (sex, height, weight, goal), safe calorie targets, logging meals, weights and workouts, voice-note transcription
3. ✅ Stripe: free demo (1 photo + 3 questions) → 3-day trial with card → $199 MXN/month or $1,490 MXN/year; `MI CUENTA` opens the customer portal
4. Reminders with opt-in (Vercel Cron + approved WhatsApp templates)
5. Web dashboard
